import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublishMedia } from './PublishMedia';
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
function mediaRender(max:number,allowGif:boolean): NonNullable<FormFieldDescriptor['render']> {
 return function renderPublishMedia(api) {return <PublishMedia {...api} max={max} allowGif={allowGif}/>;};
}
export function buildDescriptor(id: PublishId, t: Translate, options: readonly FormOption[] = []): PublishFormDescriptor | undefined {
  switch (id) {
    case 'wall': return createWallPublishDescriptor(t);
    case 'errand': return createErrandPublishDescriptor(t);
    case 'marketplace': return createMarketplacePublishDescriptor(t, { categories: options, renderMedia: mediaRender(4,false) });
    case 'confession': return createPostPublishDescriptor(t, { tags: options, renderMedia: mediaRender(3,true) });
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
      if (!result.every(row => row && typeof row === 'object' && (descriptor.id === 'confession' ? Number.isSafeInteger(row.id) && row.id > 0 : typeof (row.key ?? row.code ?? row.slug) === 'string') && typeof (row.name_zh ?? row.name_en) === 'string')) throw new Error('Invalid publication options');
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
