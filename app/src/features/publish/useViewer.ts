/**
 * `useViewer` —— 把会话 + 两个后端列表接成 **viewer 真源**
 *
 * 三条纪律：
 *   1. 两个请求**并行且互不牵连**（`allSettled`）：一个挂了不能把另一个也判成"没权限"；
 *   2. 未登录**不发请求**（省两次往返，也让"未登录"这件事只有一种表现）；
 *   3. 失败**不抛给页面**：降级为 fail-closed 的 viewer + `degraded` 原因，
 *      发布中心仍要能进去（⛔ 不许整屏报错）。
 *
 * ⚠️ 后端今天没有能力布尔（见 `viewer.ts` 的头注），所以 `termsAccepted` 恒为 `null`
 *    → `viewer.acceptedTerms === undefined`，宿主按 Q2-A 走"源缺失=放行 + 标记"。
 */

import * as React from 'react';

import { listMyClubs } from '../../../../shared/api/clubs';
import { getMyOrganizations } from '../../../../shared/api/organizations';
import { useSession } from '@/features/auth/session';
import {
  normalizeClubRows,
  normalizeOrgRows,
  resolveViewer,
  type ClubRoleRow,
  type OrgMembershipRow,
  type ResolvedViewer,
} from './viewer';

export type ViewerState = ResolvedViewer & {
  /** 两个真源还在路上（首屏用；⛔ 不阻塞发布中心渲染） */
  loading: boolean;
};

const NO_ROWS: { clubs: readonly ClubRoleRow[] | null; orgs: readonly OrgMembershipRow[] | null } = {
  clubs: null,
  orgs: null,
};

export function useViewer(): ViewerState {
  const { isSignedIn } = useSession();
  const [rows, setRows] = React.useState<{
    clubs: readonly ClubRoleRow[] | null;
    orgs: readonly OrgMembershipRow[] | null;
  }>(NO_ROWS);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isSignedIn) {
      setRows(NO_ROWS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [clubs, orgs] = await Promise.allSettled([listMyClubs(), getMyOrganizations()]);
      if (cancelled) return;
      setRows({
        clubs: clubs.status === 'fulfilled' ? normalizeClubRows(clubs.value) : null,
        orgs: orgs.status === 'fulfilled' ? normalizeOrgRows(orgs.value) : null,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return React.useMemo<ViewerState>(
    () => ({
      ...resolveViewer({
        signedIn: isSignedIn,
        clubRows: rows.clubs,
        orgRows: rows.orgs,
        // 后端暂无此真源（缺口 G4）→ 恒 null；补齐后这一行换成真值即可
        termsAccepted: null,
      }),
      loading,
    }),
    [isSignedIn, rows, loading]
  );
}
