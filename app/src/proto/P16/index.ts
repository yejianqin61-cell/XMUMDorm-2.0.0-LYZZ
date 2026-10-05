/**
 * `P16` 静态说明骨架 —— 落点入口。
 *
 * 依据 README §5-3：`StaticPage` 在组件定义里没有正式组件 ID，
 * 按 §1.2「原型骨架豁免 9.14-③」落在 `src/proto/P16`（宪法 15.4-3 要求收尾时回写 §2.7）。
 */
export {
  PROTO_ID,
  STATIC_CACHE_PREFIX,
  StaticPage,
  canCacheStatic,
  readCachedStatic,
  resolveStaticContent,
  resolveStaticState,
  shouldShowStaleNotice,
  staticCacheKey,
  useStaticDoc,
  writeCachedStatic,
} from './StaticPage';
export type {
  StaticDocState,
  StaticPageLabels,
  StaticPageProps,
  StaticSource,
  UseStaticDocOptions,
} from './StaticPage';
