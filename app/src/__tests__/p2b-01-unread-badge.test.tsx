/**
 * P2B-01 · 未读真源与顶栏角标 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：汇总载荷 → 未读总数（**拿不到 ≠ 0**）、同一令牌只拉一次、换令牌重拉、登出清零；
 *   S-5 源码扫描：四个一级 Tab 都用同一个 hook，且没有人写死角标。
 *
 * 依据：`docs/app/task/phase-2/P2B-01-未读真源与顶栏角标.md`、宪法 4.7-3/4。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { act, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { Text } from '@/components/ui/Text';
import { clearToken, readTokenSync, saveToken } from '@/features/auth/tokenStore';
import { totalUnread, unreadStore, type UnreadState } from '@/features/mailbox/unread';
import { useUnread } from '@/features/mailbox/useUnread';

jest.mock('../../../shared/api/notifications', () => ({ getUnreadSummary: jest.fn() }));

const api = require('../../../shared/api/notifications') as { getUnreadSummary: jest.Mock };

const SRC_ROOT = path.resolve(__dirname, '..');
const TAB_PAGES = ['index.tsx', 'tools.tsx', 'campus.tsx', 'me.tsx'];

/**
 * 一个一级 Tab 的**屏幕源码**：路由文件本身，或它一行转发到的页面组合。
 * ⚠️ 为什么需要：本仓约定"路由文件只做转发"（`me.tsx` 就是这样），
 *    而"四屏一致"这条不变量盯的是**屏幕**，不是文件名 —— 否则把逻辑搬进 `features/`
 *    就会让这条守卫假红（它曾经就红过一次）。
 */
function tabScreenSource(file: string): string {
  const routeFile = path.join(SRC_ROOT, 'app', '(tabs)', file);
  const routeText = fs.readFileSync(routeFile, 'utf8');
  const forwarded = routeText.match(/from '@\/([^']+)'/);
  if (!forwarded) return routeText;
  const target = path.join(SRC_ROOT, `${forwarded[1]}.tsx`);
  return fs.existsSync(target) ? `${routeText}\n${fs.readFileSync(target, 'utf8')}` : routeText;
}

let probe: { current: (UnreadState & { refresh: () => void }) | null } = { current: null };

function UnreadProbe(): React.ReactElement {
  const state = useUnread();
  probe.current = state;
  return <Text testID="unread-total">{state.total === null ? 'none' : String(state.total)}</Text>;
}

beforeEach(async () => {
  api.getUnreadSummary.mockReset();
  unreadStore.reset();
  await clearToken();
  probe = { current: null };
});

describe('P2B-01 未读真源与顶栏角标', () => {
  describe('TC-P2B-01-1A · 汇总载荷 → 未读总数（拿不到 ≠ 0）', () => {
    it('正常载荷取 total；缺 total / 非对象 / 负数一律 null', () => {
      expect(totalUnread({ total: 3, byType: { like: 3 } })).toBe(3);
      expect(totalUnread({ total: 0, byType: {} })).toBe(0);
      expect(totalUnread({ total: '7' })).toBe(7);
      expect(totalUnread({ total: 2.9 })).toBe(2);
      // ⛔ 以下都是"拿不到"，不是"0 条"
      expect(totalUnread({})).toBeNull();
      expect(totalUnread(null)).toBeNull();
      expect(totalUnread(undefined)).toBeNull();
      expect(totalUnread('nope')).toBeNull();
      expect(totalUnread({ total: -1 })).toBeNull();
      expect(totalUnread({ total: 'abc' })).toBeNull();
    });
  });

  describe('TC-P2B-01-2A · 未登录：一个请求都不发', () => {
    it('没有令牌就不拉未读（也不显示角标）', async () => {
      expect(readTokenSync()).toBeNull();
      const view = await renderApp(<UnreadProbe />);
      expect(api.getUnreadSummary).not.toHaveBeenCalled();
      expect(view.getByTestId('unread-total').props.children).toBe('none');
    });
  });

  describe('TC-P2B-01-3A · 请求失败：不主张 0', () => {
    it('失败后 total 为 null（角标不显示），⛔ 不是 0', async () => {
      api.getUnreadSummary.mockRejectedValue(new Error('boom'));
      await saveToken('p2b-01-token');

      const view = await renderApp(<UnreadProbe />);

      await waitFor(() => expect(api.getUnreadSummary).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(probe.current?.total).toBeNull());
      expect(view.getByTestId('unread-total').props.children).toBe('none');
    });
  });

  describe('TC-P2B-01-4A · 单一真源：同一令牌只拉一次，refresh 才重拉', () => {
    it('第二次读取复用同一份；refresh() 后更新为新值', async () => {
      api.getUnreadSummary.mockResolvedValue({ total: 2, byType: { like: 2 } });
      await saveToken('p2b-01-token');

      await renderApp(<UnreadProbe />);
      await waitFor(() => expect(probe.current?.total).toBe(2));
      expect(api.getUnreadSummary).toHaveBeenCalledTimes(1);

      // 再读一次（模拟另一个 Tab 页挂载）→ 不该再发请求
      await unreadStore.load('p2b-01-token', async () => ({ total: 2 }));
      expect(api.getUnreadSummary).toHaveBeenCalledTimes(1);

      api.getUnreadSummary.mockResolvedValue({ total: 5, byType: { like: 5 } });
      await act(async () => {
        probe.current?.refresh();
      });
      await waitFor(() => expect(probe.current?.total).toBe(5));
      expect(api.getUnreadSummary).toHaveBeenCalledTimes(2);
    });

    it('换令牌（换账号）必须重拉，⛔ 不把上一个账号的未读留给下一个', async () => {
      api.getUnreadSummary.mockResolvedValue({ total: 4, byType: {} });
      await saveToken('token-a');
      await unreadStore.load('token-a', api.getUnreadSummary);
      expect(unreadStore.get().total).toBe(4);

      unreadStore.reset();
      expect(unreadStore.get().total).toBeNull();
      api.getUnreadSummary.mockResolvedValue({ total: 1, byType: {} });
      const next = await unreadStore.load('token-b', api.getUnreadSummary);
      expect(next).toBe(1);
    });
  });

  describe('TC-P2B-01-5A · 源码扫描：四屏一致', () => {
    it('四个一级 Tab 页都接了同一个 hook（含"一行转发壳"的写法）', () => {
      for (const file of TAB_PAGES) {
        const code = stripComments(tabScreenSource(file));
        expect({ file, uses: code.includes('useMailboxBadge') }).toEqual({ file, uses: true });
        expect({ file, spreads: code.includes('{...badge}') }).toEqual({ file, spreads: true });
      }
    });

    it('⛔ 没有页面写死角标（未读只能来自真源）', () => {
      const walk = (dir: string, out: string[] = []): string[] => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === '__tests__') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full, out);
          else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
        }
        return out;
      };
      const offenders = walk(SRC_ROOT)
        .filter((file) => /unreadCount=\{?\s*\d/.test(stripComments(fs.readFileSync(file, 'utf8'))))
        .map((file) => path.relative(SRC_ROOT, file));
      expect(offenders).toEqual([]);
    });

    it('信箱路由与顶栏动作指向同一个目的地', () => {
      expect(require('@/features/navigation/tabConfig').MAILBOX_ROUTE).toBe('/mailbox');
    });
  });
});
