/**
 * P2A-02 · viewer 真源与发布中心接线 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯映射：后端行 → viewer（fail-closed）、降级原因、响应形状归一化；
 *   S-1 渲染：发布中心用真 viewer 渲染条目（替换掉 Phase 0 的 PHASE0_VIEWER）。
 *
 * 依据：`docs/app/task/phase-2/P2A-02-viewer真源与发布中心接线.md`、宪法 4.9.5-3。
 */
import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { SessionProvider } from '@/features/auth/session';
import { clearToken, saveToken } from '@/features/auth/tokenStore';
import { visibleEntries } from '@/features/publish/registry';
import {
  canManageClubFrom,
  isOrgMemberFrom,
  normalizeClubRows,
  normalizeOrgRows,
  resolveViewer,
} from '@/features/publish/viewer';

/* ── 接口打桩：两个真源 ─────────────────────────────────────────────── */
jest.mock('../../../shared/api/clubs', () => ({ listMyClubs: jest.fn() }));
jest.mock('../../../shared/api/organizations', () => ({ getMyOrganizations: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

const api = {
  clubs: require('../../../shared/api/clubs') as { listMyClubs: jest.Mock },
  orgs: require('../../../shared/api/organizations') as { getMyOrganizations: jest.Mock },
};

const PublishCenter = require('../app/publish-center').default as () => React.ReactElement;

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>{node}</SessionProvider>
);

beforeEach(async () => {
  api.clubs.listMyClubs.mockReset();
  api.orgs.getMyOrganizations.mockReset();
  await clearToken();
});

describe('P2A-02 viewer 真源', () => {
  describe('TC-P2A-02-1A · 未登录：一条都不显示，且不算"源拿不到"', () => {
    it('viewer 全 false，可见条目 0 条', () => {
      const { viewer, degraded } = resolveViewer({
        signedIn: false,
        clubRows: null,
        orgRows: null,
        termsAccepted: null,
      });
      expect(viewer.signedIn).toBe(false);
      expect(viewer.canManageClub).toBe(false);
      expect(viewer.isOrgMember).toBe(false);
      expect(visibleEntries(viewer)).toEqual([]);
      // 未登录时**不拉**那两个接口 → 不该报"源拿不到"
      expect(degraded).not.toContain('clubs-unavailable');
      expect(degraded).not.toContain('orgs-unavailable');
    });
  });

  describe('TC-P2A-02-2A · 后端 role=admin → canManageClub', () => {
    it('5 条可见，且第 5 条是社团活动', () => {
      const { viewer, degraded } = resolveViewer({
        signedIn: true,
        clubRows: [{ role: 'member' }, { role: 'admin' }],
        orgRows: [],
        termsAccepted: true,
      });
      expect(viewer.canManageClub).toBe(true);
      expect(visibleEntries(viewer).map((e) => e.id)).toEqual([
        'wall',
        'confession',
        'clubActivity',
        'marketplace',
        'errand',
      ]);
      expect(degraded).toEqual([]);
    });

    it('⛔ 只看后端字段：member 不是 admin，空列表也不是', () => {
      expect(canManageClubFrom([{ role: 'member' }])).toBe(false);
      expect(canManageClubFrom([])).toBe(false);
      expect(canManageClubFrom(null)).toBe(false);
      expect(canManageClubFrom([{ role: 'admin' }])).toBe(true);
    });
  });

  describe('TC-P2A-02-3A · clubs 源拿不到 → fail-closed + 降级原因', () => {
    it('拿不到就当没有权限（4 条），并把原因报出来', () => {
      const { viewer, degraded } = resolveViewer({
        signedIn: true,
        clubRows: null,
        orgRows: [],
        termsAccepted: true,
      });
      expect(viewer.canManageClub).toBe(false);
      expect(visibleEntries(viewer).map((e) => e.id)).toEqual([
        'wall',
        'confession',
        'marketplace',
        'errand',
      ]);
      expect(degraded).toContain('clubs-unavailable');
    });
  });

  describe('TC-P2A-02-4A · 组织真源', () => {
    it('取到空数组 = 不是成员且**无降级**；拿不到 = 不是成员 + 降级', () => {
      const empty = resolveViewer({
        signedIn: true,
        clubRows: [],
        orgRows: [],
        termsAccepted: true,
      });
      expect(empty.viewer.isOrgMember).toBe(false);
      expect(empty.degraded).not.toContain('orgs-unavailable');

      const failed = resolveViewer({
        signedIn: true,
        clubRows: [],
        orgRows: null,
        termsAccepted: true,
      });
      expect(failed.viewer.isOrgMember).toBe(false);
      expect(failed.degraded).toContain('orgs-unavailable');
      expect(isOrgMemberFrom([{ can_post: false }])).toBe(true); // 是成员，只是不能发
    });
  });

  describe('TC-P2A-02-5A · 条款源缺失（缺口 G4）', () => {
    it('acceptedTerms 缺失时**不写这个键**（宿主据此走放行分支），并报 terms-source-missing', () => {
      const { viewer, degraded } = resolveViewer({
        signedIn: true,
        clubRows: [],
        orgRows: [],
        termsAccepted: null,
      });
      expect(viewer.acceptedTerms).toBeUndefined();
      expect('acceptedTerms' in viewer).toBe(false);
      expect(degraded).toContain('terms-source-missing');

      const known = resolveViewer({
        signedIn: true,
        clubRows: [],
        orgRows: [],
        termsAccepted: false,
      });
      expect(known.viewer.acceptedTerms).toBe(false);
      expect(known.degraded).not.toContain('terms-source-missing');
    });

    it('响应形状：clubs 是 `{list}`，organizations 是裸数组，形状不对当空', () => {
      expect(normalizeClubRows({ list: [{ role: 'admin' }] })).toEqual([{ role: 'admin' }]);
      expect(normalizeClubRows([{ role: 'admin' }])).toEqual([{ role: 'admin' }]);
      expect(normalizeClubRows({ unexpected: 1 })).toEqual([]);
      expect(normalizeClubRows(null)).toEqual([]);
      expect(normalizeOrgRows([{ can_post: true }])).toEqual([{ can_post: true }]);
      expect(normalizeOrgRows({ list: [] })).toEqual([]);
    });
  });

  describe('TC-P2A-02-6A · 发布中心 渲染：真 viewer 驱动条目', () => {
    it('已登录 + 无社团管理权 → 4 条（社团活动不显示，⛔ 也不显示为禁用占位）', async () => {
      api.clubs.listMyClubs.mockResolvedValue({ list: [{ id: 1, role: 'member' }] });
      api.orgs.getMyOrganizations.mockResolvedValue([]);
      await saveToken('p2a-02-token');

      const view = await renderApp(withProviders(<PublishCenter />));

      await waitFor(() => expect(view.getByTestId('publish-entry-wall')).toBeTruthy());
      expect(view.getByTestId('publish-entry-confession')).toBeTruthy();
      expect(view.getByTestId('publish-entry-marketplace')).toBeTruthy();
      expect(view.getByTestId('publish-entry-errand')).toBeTruthy();
      expect(view.queryByTestId('publish-entry-clubActivity')).toBeNull();
      expect(api.clubs.listMyClubs).toHaveBeenCalledTimes(1);
      expect(api.orgs.getMyOrganizations).toHaveBeenCalledTimes(1);
    });
  });
});
