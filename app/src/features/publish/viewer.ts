/**
 * viewer 真源 —— **权限判据的唯一推断处**（纯函数，可测）
 *
 * 宪法 4.9.5-3 要求"**权限过滤由后端布尔字段驱动**，⛔ UI 不得自行推断"。
 * 现状（2026-10-06 实测）后端**没有**给 App 任何能力布尔：
 *   · `GET /api/users/me` 不含 `canManageClub` / `isOrgMember` / `acceptedTerms`（`routes/users.js:146-164`）；
 *   · 能拿到的最接近真源是两个列表：
 *       `GET /api/clubs/me/clubs` → 每行有 `role`（`routes/clubs.js:1000-1033`）
 *       `GET /api/organizations/me` → 每行有 `can_post`（`routes/organizations.js:30-56`）
 *   · `acceptedTerms` 来自 `GET /api/users/me/terms`；请求失败或响应缺字段时保持源缺失。
 *
 * 所以本文件的职责是**把后端字段翻译成 viewer**，且：
 *   1. **只在这里翻译**（别处再判断一次就是"UI 自行推断"）；
 *   2. **拿不到就 false**（fail-closed）—— 宁可不显示条目，也不给一个点不动的入口；
 *   3. **把"源缺失"显式报出来**（`degraded`），而不是和"真的没有权限"混成一个 false。
 */

import type { Viewer } from './registry';

/** `GET /api/clubs/me/clubs` 的行（只关心 role） */
export type ClubRoleRow = { role?: string | null };

/** `GET /api/organizations/me` 的行（只关心 can_post） */
export type OrgMembershipRow = { can_post?: boolean };

/** 降级原因：源拿不到 / 源根本不存在。⛔ 与"确实没有权限"是两回事 */
export type ViewerDegradedReason =
  | 'clubs-unavailable'
  | 'orgs-unavailable'
  | 'terms-source-missing';

export type ViewerSources = {
  signedIn: boolean;
  /** `null` = 请求失败（源拿不到）；`[]` = 取到了但没有 */
  clubRows: readonly ClubRoleRow[] | null;
  orgRows: readonly OrgMembershipRow[] | null;
  /** `null` = 后端暂无此真源（G4）；`true`/`false` = 后端明确回答 */
  termsAccepted: boolean | null;
};

/** `GET /api/users/me/terms` 的响应已经由 request() 拆出 data。 */
export function normalizeTermsAccepted(payload: unknown): boolean | null {
  if (payload === null || typeof payload !== 'object') return null;
  const accepted = (payload as { accepted?: unknown }).accepted;
  return typeof accepted === 'boolean' ? accepted : null;
}

export type ResolvedViewer = {
  viewer: Viewer;
  degraded: readonly ViewerDegradedReason[];
};

/**
 * `GET /api/clubs/me/clubs` 的响应形状：`{ list: [...] }`（`get()` 已经把 `data` 拆出来）。
 * ⛔ 不猜形状：形状不对就当"没取到"（`[]` 只用于"取到了但为空"）。
 */
export function normalizeClubRows(payload: unknown): ClubRoleRow[] {
  if (Array.isArray(payload)) return payload as ClubRoleRow[];
  const list = (payload as { list?: unknown } | null | undefined)?.list;
  return Array.isArray(list) ? (list as ClubRoleRow[]) : [];
}

/** `GET /api/organizations/me` 的响应形状：**裸数组** */
export function normalizeOrgRows(payload: unknown): OrgMembershipRow[] {
  return Array.isArray(payload) ? (payload as OrgMembershipRow[]) : [];
}

/** 后端行 → 能否管理某个社团（fail-closed：拿不到就是 false） */
export function canManageClubFrom(rows: readonly ClubRoleRow[] | null): boolean {
  if (rows === null) return false;
  return rows.some((row) => row.role === 'admin');
}

/** 后端行 → 是否是某组织成员（fail-closed） */
export function isOrgMemberFrom(rows: readonly OrgMembershipRow[] | null): boolean {
  if (rows === null) return false;
  return rows.length > 0;
}

/** 真源 → viewer。只有服务端明确返回 true/false 时才写入 `acceptedTerms`。 */
export function resolveViewer(sources: ViewerSources): ResolvedViewer {
  const degraded: ViewerDegradedReason[] = [];
  // 未登录时不拉这两个接口 → 那不算"源拿不到"
  if (sources.signedIn && sources.clubRows === null) degraded.push('clubs-unavailable');
  if (sources.signedIn && sources.orgRows === null) degraded.push('orgs-unavailable');
  if (sources.termsAccepted === null) degraded.push('terms-source-missing');

  const viewer: Viewer = {
    signedIn: sources.signedIn,
    canManageClub: canManageClubFrom(sources.clubRows),
    isOrgMember: isOrgMemberFrom(sources.orgRows),
  };
  if (sources.termsAccepted !== null) {
    viewer.acceptedTerms = sources.termsAccepted;
  }

  return { viewer, degraded };
}
