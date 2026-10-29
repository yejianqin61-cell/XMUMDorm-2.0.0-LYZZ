/**
 * 「我的」资料取数 —— **单一取数点**（阶段2-02 / J2-2）
 *
 * ## 为什么要有这个 hook
 * 修前 `MeScreen` 挂载就 `getMe()`（无会话门、无缓存、无重试联动），`EditProfileScreen`
 * 又自己拉一次 —— 两个取数点、两种失败口径。冷启动时它会在**令牌还没水合**时发请求，
 * 401 后页面停在"加载失败"，而会话变 `signedIn` 也不会自动重取 → 用户看到的就是
 * "每次进入报错、刷新才恢复"。
 *
 * 现在：**会话就绪才取**、**失败保留上一次成功的数据**、**保存后显式失效**、
 * **登出/过期由会话层清缓存**（`session.tsx` 的 `logout`/`markExpired`/`login`/`register`）。
 *
 * ⛔ 本文件不 import 任何 UI 组件；页面只消费返回值。
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { getMe } from '../../../../shared/api/users';
import { normalizeProfile, type MeProfile } from './profile';

/** 资料 query 的唯一 key（⛔ 不把账号名编进 key 当隔离；隔离由会话变更清缓存保证） */
export const ME_PROFILE_QUERY_KEY = ['me', 'profile'] as const;

export type MeProfileLoadable = {
  /** 服务端原始载荷（编辑页回填要它，归一化后的 profile 不含 show_* 开关） */
  raw: Record<string, unknown> | null;
  /** 页面展示用（缺字段给空，⛔ 不抛） */
  profile: MeProfile | null;
  /** 会话就绪且首次取数未完成 */
  loading: boolean;
  /** 最近一次取数失败（**旧数据仍保留**，页面只标失败 + 给重试） */
  failed: boolean;
  /** 重试（失败提示上的动作） */
  refresh: () => Promise<void>;
  /** 保存资料后显式失效（`EditProfileScreen` 用） */
  invalidate: () => Promise<void>;
};

export function useMeProfile(): MeProfileLoadable {
  const session = useSession();
  const queryClient = useQueryClient();
  const enabled = session.status === 'signedIn';

  const query = useQuery({
    queryKey: ME_PROFILE_QUERY_KEY,
    queryFn: async () => {
      const payload = await getMe();
      return (payload ?? null) as Record<string, unknown> | null;
    },
    enabled,
    // 回到前台按需重取：根布局把 AppState 接到了 focusManager（`shared/queryClient.ts`），
    // 但全局默认 `refetchOnWindowFocus:false` —— 「我的」是**常驻挂载**的页面，只有显式打开它
    // 才能在"后台恢复"时自愈，所以逐 query 覆盖。
    refetchOnWindowFocus: true,
  });

  // 未登录时**不展示缓存**（哪怕登出路径没清干净）：会话状态是展示的唯一门。
  const raw = enabled ? ((query.data ?? null) as Record<string, unknown> | null) : null;

  return {
    raw,
    profile: raw === null ? null : normalizeProfile(raw),
    loading: enabled && query.isPending,
    // 既有数据时后台重取失败，TanStack 保留数据并把错误放在 `error` 上（`isError` 不一定翻）；
    // 用 `error` 直接判，避免"失败但页面不说"。
    failed: query.error !== null,
    refresh: async () => {
      await query.refetch();
    },
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_PROFILE_QUERY_KEY });
    },
  };
}
