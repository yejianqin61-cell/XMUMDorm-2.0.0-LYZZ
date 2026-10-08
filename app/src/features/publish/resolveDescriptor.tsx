import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MediaPicker } from '@/components/ui/MediaPicker';
import type { FormFieldDescriptor, FormOption } from '@/components/ui/FormField';
import { useI18n, type Translate } from '@/i18n';
import { createPostPublishDescriptor } from '@/features/campus/postPublishFields';
import { createWallPublishDescriptor } from '@/features/campus/publishFields';
import { createMarketplacePublishDescriptor } from '@/features/marketplace/publishFields';
import { createErrandPublishDescriptor } from '@/features/errand/publishFields';
import { getPostTagsList } from '../../../../shared/api/posts';
import { getMarketplaceCategories } from '../../../../shared/api/marketplace';
import type { PublishFormDescriptor } from './descriptor';
import type { PublishId } from './registry';

type RemoteOption = { id?: number; key?: string; code?: string; slug?: string; name_zh?: string; name_en?: string };
/** Text-only publication remains available while native image-picker approval is pending. */
function mediaRender(t: Translate): NonNullable<FormFieldDescriptor['render']> {
  return () => <MediaPicker value={null} onChange={() => {}} pickLabel={t('publish.bing.images')}
    unavailableLabel={t('publish.media.unavailable')} disabled />;
}
export function buildDescriptor(id: PublishId, t: Translate, options: readonly FormOption[] = []): PublishFormDescriptor | undefined {
  switch (id) {
    case 'wall': return createWallPublishDescriptor(t);
    case 'errand': return createErrandPublishDescriptor(t);
    case 'marketplace': return createMarketplacePublishDescriptor(t, { categories: options, renderMedia: mediaRender(t) });
    case 'confession': return createPostPublishDescriptor(t, { tags: options, renderMedia: mediaRender(t) });
    default: return undefined;
  }
}
export function useResolvedDescriptor(descriptor: PublishFormDescriptor, registered: boolean) {
  const { t, locale } = useI18n();
  const remote = registered && (descriptor.id === 'marketplace' || descriptor.id === 'confession');
  const query = useQuery({
    queryKey: ['publish', 'options', descriptor.id],
    enabled: remote,
    queryFn: async (): Promise<RemoteOption[]> => {
      const result = await (descriptor.id === 'marketplace' ? getMarketplaceCategories() : getPostTagsList());
      if (!Array.isArray(result)) throw new Error('Invalid publication options');
      return result;
    },
  });
  const resolved = React.useMemo(() => {
    if (!registered) return descriptor;
    const options = (query.data ?? []).filter(row => descriptor.id !== 'marketplace' || row.slug !== 'all').map(row => ({
      value: descriptor.id === 'confession' ? String(row.id) : String(row.key ?? row.code ?? row.slug ?? ''),
      label: locale === 'en' ? row.name_en || row.name_zh || '' : row.name_zh || row.name_en || '',
    }));
    return buildDescriptor(descriptor.id, t, options) ?? descriptor;
  }, [descriptor, registered, query.data, locale, t]);
  return { descriptor: resolved, loading: remote && query.isPending, error: remote ? query.error : null, retry: query.refetch };
}
