/**
 * `useViewer` —— 把会话 + 两个后端列表接成 **viewer 真源**
 *
 * 三条纪律：
 *   1. 两个请求**并行且互不牵连**（`allSettled`）：一个挂了不能把另一个也判成"没权限"；
 *   2. 未登录**不发请求**（省两次往返，也让"未登录"这件事只有一种表现）；
 *   3. 失败**不抛给页面**：降级为 fail-closed 的 viewer + `degraded` 原因，
 *      发布中心仍要能进去（⛔ 不许整屏报错）。
 *
 * 条款状态也从服务端读取；请求失败时显式降级为源缺失，不能当作已接受。
 */

import * as React from 'react';

import { listMyClubs } from '../../../../shared/api/clubs';
import { getMyOrganizations } from '../../../../shared/api/organizations';
import { getMyTermsStatus } from '../../../../shared/api/users';
import { useSession } from '@/features/auth/session';
import {
  normalizeClubRows,
  normalizeOrgRows,
  normalizeTermsAccepted,
  resolveViewer,
  type ClubRoleRow,
  type OrgMembershipRow,
  type ResolvedViewer,
} from './viewer';

export type ViewerState = ResolvedViewer & {
  /** 两个真源还在路上（首屏用；⛔ 不阻塞发布中心渲染） */
  loading: boolean;
};

const NO_ROWS: {
  clubs: readonly ClubRoleRow[] | null;
  orgs: readonly OrgMembershipRow[] | null;
  terms: boolean | null;
} = {
  clubs: null,
  orgs: null,
  terms: null,
};

export function useViewer(): ViewerState {
  const { isSignedIn } = useSession();
  const [rows, setRows] = React.useState<{
    clubs: readonly ClubRoleRow[] | null;
    orgs: readonly OrgMembershipRow[] | null;
    terms: boolean | null;
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
      const [clubs, orgs, terms] = await Promise.allSettled([
        listMyClubs(),
        getMyOrganizations(),
        getMyTermsStatus(),
      ]);
      if (cancelled) return;
      setRows({
        clubs: clubs.status === 'fulfilled' ? normalizeClubRows(clubs.value) : null,
        orgs: orgs.status === 'fulfilled' ? normalizeOrgRows(orgs.value) : null,
        terms: terms.status === 'fulfilled' ? normalizeTermsAccepted(terms.value) : null,
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
        termsAccepted: rows.terms,
      }),
      loading,
    }),
    [isSignedIn, rows, loading]
  );
}
