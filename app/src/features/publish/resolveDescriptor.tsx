import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublishMedia } from './PublishMedia';
import type { FormFieldDescriptor, FormOption } from '@/components/ui/FormField';
import { useI18n, type Translate } from '@/i18n';
import { createPostPublishDescriptor } from '@/features/campus/postPublishFields';
import { createMarketplacePublishDescriptor } from '@/features/marketplace/publishFields';
import { createErrandPublishDescriptor } from '@/features/errand/publishFields';
import { createClubActivityPublishDescriptor, createClubPostPublishDescriptor } from '@/features/clubs/publishFields';
import { PostTopicPicker } from './PostTopicPicker';
import { createPostTag, getPostTagsList } from '../../../../shared/api/posts';
import { getMarketplaceCategories } from '../../../../shared/api/marketplace';
import { listMyClubs } from '../../../../shared/api/clubs';
import type { PublishFormDescriptor } from './descriptor';
import type { PublishId } from './registry';

type RemoteOption = { id?: number; key?: string; code?: string; slug?: string; name_zh?: string; name_en?: string };
function mediaRender(max:number,allowGif:boolean): NonNullable<FormFieldDescriptor['render']> {
 return function renderPublishMedia(api) {return <PublishMedia {...api} max={max} allowGif={allowGif}/>;};
}
export function buildDescriptor(
  id: PublishId,
  t: Translate,
  options: readonly FormOption[] = [],
  renderTags?: NonNullable<FormFieldDescriptor['render']>
): PublishFormDescriptor | undefined {
  switch (id) {
    // 万能墙：阶段 1 撤下旧六卡表单（自由帖阶段 2 / 招募帖阶段 5 再接回来）
    case 'errand': return createErrandPublishDescriptor(t);
    case 'marketplace': return createMarketplacePublishDescriptor(t, { categories: options, renderMedia: mediaRender(4,false) });
    case 'confession': return createPostPublishDescriptor(t, { tags: options, renderMedia: mediaRender(3,true), renderTags });
    case 'clubActivity': return createClubActivityPublishDescriptor(t, { clubs: options, renderMedia: mediaRender(4,false) });
    case 'clubPost': return createClubPostPublishDescriptor(t, { clubs: options, renderMedia: mediaRender(4,false) });
    default: return undefined;
  }
}
function managedClubOptions(value: unknown): RemoteOption[] {
  const list = value && typeof value === 'object' && Array.isArray((value as { list?: unknown }).list)
    ? (value as { list: unknown[] }).list
    : null;
  if (list === null) throw new Error('Invalid managed club options');
  const options: RemoteOption[] = [];
  for (const value of list) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid managed club option');
    const row = value as { id?: unknown; name?: unknown; role?: unknown };
    if (!Number.isSafeInteger(row.id) || Number(row.id) <= 0 || typeof row.name !== 'string' || !row.name.trim() || (row.role !== 'admin' && row.role !== 'member')) {
      throw new Error('Invalid managed club option');
    }
    if (row.role === 'admin') options.push({ id: Number(row.id), name_zh: row.name, name_en: row.name });
  }
  if (options.length === 0) throw new Error('No managed clubs available');
  return options;
}

function postTagOptions(value: unknown): RemoteOption[] {
  if (!Array.isArray(value)) throw new Error('Invalid publication options');
  if (!value.every(row => row && typeof row === 'object' && Number.isSafeInteger((row as RemoteOption).id) && Number((row as RemoteOption).id) > 0 && typeof ((row as RemoteOption).name_zh ?? (row as RemoteOption).name_en) === 'string')) {
    throw new Error('Invalid publication options');
  }
  return value as RemoteOption[];
}

function toFormOption(row: RemoteOption, locale: 'zh' | 'en'): FormOption {
  return {
    value: String(row.id),
    label: locale === 'en' ? row.name_en || row.name_zh || '' : row.name_zh || row.name_en || '',
  };
}

function mergePostTags(previous: readonly RemoteOption[], next: readonly RemoteOption[]): RemoteOption[] {
  const merged = new Map(previous.map(row => [row.id, row]));
  for (const row of next) merged.set(row.id, row);
  return [...merged.values()];
}

export function useResolvedDescriptor(descriptor: PublishFormDescriptor, registered: boolean) {
  const { t, locale } = useI18n();
  const isClubPublish = descriptor.id === 'clubActivity' || descriptor.id === 'clubPost';
  const isPostPublish = descriptor.id === 'confession';
  const remote = registered && (descriptor.id === 'marketplace' || isPostPublish || isClubPublish);
  const [tagSearch, setTagSearch] = React.useState('');
  const [knownPostTags, setKnownPostTags] = React.useState<RemoteOption[]>([]);
  const query = useQuery({
    queryKey: ['publish', 'options', isClubPublish ? 'managed-clubs' : descriptor.id, isPostPublish ? tagSearch : ''],
    enabled: remote,
    queryFn: async (): Promise<RemoteOption[]> => {
      if (isClubPublish) return managedClubOptions(await listMyClubs());
      const result = await (descriptor.id === 'marketplace' ? getMarketplaceCategories() : getPostTagsList({ q: tagSearch, limit: 20 }));
      if (isPostPublish) return postTagOptions(result);
      if (!Array.isArray(result)) throw new Error('Invalid publication options');
      if (!result.every(row => row && typeof row === 'object' && typeof (row.key ?? row.code ?? row.slug) === 'string' && typeof (row.name_zh ?? row.name_en) === 'string')) throw new Error('Invalid publication options');
      return result;
    },
  });
  React.useEffect(() => {
    if (isPostPublish && query.data) setKnownPostTags(previous => mergePostTags(previous, query.data));
  }, [isPostPublish, query.data]);
  const createTopic = React.useCallback(async (input: { name_zh: string; name_en: string }): Promise<FormOption> => {
    const [created] = postTagOptions([await createPostTag(input)]);
    setKnownPostTags(previous => mergePostTags(previous, [created]));
    return toFormOption(created, locale);
  }, [locale]);
  const currentPostTags = React.useMemo(
    () => (isPostPublish ? (query.data ?? []) : []),
    [isPostPublish, query.data]
  );
  const allPostTags = React.useMemo(
    () => (isPostPublish ? mergePostTags(knownPostTags, currentPostTags) : []),
    [currentPostTags, isPostPublish, knownPostTags]
  );
  const renderTags = React.useCallback<NonNullable<FormFieldDescriptor['render']>>(({ value, onChange, disabled }) => (
    <PostTopicPicker
      label={t('publish.bing.tags')}
      value={Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []}
      onChange={onChange}
      options={currentPostTags.map(row => toFormOption(row, locale))}
      selectedOptions={allPostTags.map(row => toFormOption(row, locale))}
      onSearch={setTagSearch}
      createTopic={createTopic}
      copy={{
        searchPlaceholder: t('publish.bing.tags.search'),
        nameZh: t('publish.bing.tags.nameZh'),
        nameEn: t('publish.bing.tags.nameEn'),
        create: t('publish.bing.tags.create'),
        createFailed: t('publish.bing.tags.createFailed'),
      }}
      disabled={disabled}
      testID="publish-post-tags"
    />
  ), [allPostTags, createTopic, currentPostTags, locale, t]);
  const resolved = React.useMemo(() => {
    if (!registered) return descriptor;
    const rows = isPostPublish ? allPostTags : (query.data ?? []);
    const options = rows.filter(row => descriptor.id !== 'marketplace' || row.slug !== 'all').map(row => ({
      value: isPostPublish || isClubPublish ? String(row.id) : String(row.key ?? row.code ?? row.slug ?? ''),
      label: locale === 'en' ? row.name_en || row.name_zh || '' : row.name_zh || row.name_en || '',
    }));
    return buildDescriptor(descriptor.id, t, options, isPostPublish ? renderTags : undefined) ?? descriptor;
  }, [allPostTags, descriptor, isPostPublish, isClubPublish, locale, query.data, registered, renderTags, t]);
  return { descriptor: resolved, loading: remote && query.isPending, error: remote ? query.error : null, retry: query.refetch };
}
