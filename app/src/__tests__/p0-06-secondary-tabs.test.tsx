/**
 * P0-06 · 二级顶部 Tab 条 —— 自动化用例
 *
 * 六条硬规则里可自动判的部分：
 *   R2 状态保持（store）· R3 一级格保留选中项（键含一级格）· R4 Tab 条与 Chips 是两个组件
 *   R5 无"更多 ▾" · R6 内容区无横向 PagerView · 无障碍角色与位置播报 · reduced-motion 降级
 *
 * ⚠️ RNTL 14 的 `render` 返回 Promise。
 */
import * as fs from 'fs';
import * as path from 'path';

import { readCode, walkSource } from './helpers/sourceScan';

import * as React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/design-system/theme';
import { I18nProvider } from '@/i18n';
import { FilterChips } from '@/components/ui/FilterChips';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import {
  EMPTY_SECONDARY_STATE,
  SECONDARY_TABS,
  SecondaryTabStore,
  assertNoOverflowMenu,
  getSecondaryTabs,
  resolveTransitionDuration,
} from '@/features/navigation/secondaryTabs';

const SRC_ROOT = path.resolve(__dirname, '..');

function withProviders(node: React.ReactElement): React.ReactElement {
  return (
    <ThemeProvider source="dark" systemScheme="dark">
      <I18nProvider locale="zh">{node}</I18nProvider>
    </ThemeProvider>
  );
}

const CAMPUS_TABS = getSecondaryTabs('campus');

describe('P0-06 二级顶部 Tab 条', () => {
  describe('TC-P0-06-1A · R2 每个二级 Tab 独立保持状态', () => {
    it('存 A 的状态 → 切到 B → 切回 A，逐字段不变', () => {
      const store = new SecondaryTabStore();
      store.update('square', 'canteen', {
        scrollOffset: 120,
        cursor: 'page-2',
        filters: { category: 'noodle' },
      });

      // 切到 B（读它，不应影响 A）
      expect(store.get('square', 'marketplace')).toEqual(EMPTY_SECONDARY_STATE);

      expect(store.get('square', 'canteen')).toEqual({
        scrollOffset: 120,
        cursor: 'page-2',
        filters: { category: 'noodle' },
      });
    });

    it('未存过的键返回空状态（不是 undefined，避免调用方到处判空）', () => {
      const store = new SecondaryTabStore();
      expect(store.get('tools', 'schedule')).toEqual(EMPTY_SECONDARY_STATE);
    });
  });

  describe('TC-P0-06-2A · R3 一级格保留自己的二级选中状态', () => {
    it('同样的二级键名在不同一级格下互不干扰', () => {
      const store = new SecondaryTabStore();
      store.update('square', 'wall', { scrollOffset: 10 });
      store.update('campus', 'wall', { scrollOffset: 999 });
      expect(store.get('square', 'wall').scrollOffset).toBe(10);
      expect(store.get('campus', 'wall').scrollOffset).toBe(999);
    });
  });

  describe('集合声明：已定的落库，未定的留空（C-03/C-04/C-05）', () => {
    it('「校园里」= 树洞 / 万能墙（宪法 4.1.1 已定）', () => {
      expect(CAMPUS_TABS.map((tab) => tab.key)).toEqual(['confession', 'wall']);
    });

    it('广场 / 工具 / 我的 暂为空（待所有者拍板，⛔ 不猜）', () => {
      expect(SECONDARY_TABS.square).toEqual([]);
      expect(SECONDARY_TABS.tools).toEqual([]);
      expect(SECONDARY_TABS.me).toEqual([]);
    });
  });

  describe('TC-P0-06-5A · 动效与 R5/R6 守卫', () => {
    it('reduceMotion 为真时切换时长归零（宪法 7.3）', () => {
      expect(resolveTransitionDuration(true, 220)).toBe(0);
      expect(resolveTransitionDuration(false, 220)).toBe(220);
    });

    it('⛔ 溢出菜单会让守卫显式失败（R5）', () => {
      expect(() => assertNoOverflowMenu(true)).toThrow(/R5/);
      expect(() => assertNoOverflowMenu(false)).not.toThrow();
    });

    it('⛔ 全仓 0 处 PagerView / 横向分页切 Tab（R6）', () => {
      const hits = walkSource(SRC_ROOT).filter((f) =>
        /PagerView|react-native-pager-view/.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('⛔ 0 处下拉菜单式溢出（R5）', () => {
      // ⚠️ **先剥注释再判**（P1-05 修复，现统一走 helpers/sourceScan）：
      //    宪法与骨架规范里这条规则本身就用「更多 ▾」描述，
      //    注释里写明它是在**记录规则**，不是"用了下拉菜单"。
      const hits = walkSource(SRC_ROOT).filter((f) => /(MoreMenu|▾)/.test(readCode(f)));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });
  });

  describe('TC-P0-06-6A · Tab 条渲染与无障碍', () => {
    it('渲染两个子栏目，选中项暴露 selected 状态', async () => {
      const view = await render(
        withProviders(
          <TopTabStrip tabs={CAMPUS_TABS} selectedKey="confession" onSelect={() => undefined} />
        )
      );
      expect(view.getByText('树洞')).toBeTruthy();
      expect(view.getByText('万能墙')).toBeTruthy();
      expect(view.getByTestId('top-tab-confession').props.accessibilityState.selected).toBe(true);
      expect(view.getByTestId('top-tab-wall').props.accessibilityState.selected).toBe(false);
    });

    it('角色是 tab（⛔ 不是 button），且标签里带位置播报', async () => {
      const view = await render(
        withProviders(
          <TopTabStrip tabs={CAMPUS_TABS} selectedKey="confession" onSelect={() => undefined} />
        )
      );
      const first = view.getByTestId('top-tab-confession');
      expect(first.props.accessibilityRole).toBe('tab');
      expect(String(first.props.accessibilityLabel)).toContain('1');
      expect(String(first.props.accessibilityLabel)).toContain('2');
    });

    it('没有子栏目时**不占位**（不渲染空条）', async () => {
      const view = await render(
        withProviders(<TopTabStrip tabs={[]} selectedKey="x" onSelect={() => undefined} />)
      );
      expect(view.toJSON()).toBeNull();
    });
  });

  describe('TC-P0-06-3A · R4 导航 Tab ≠ 筛选 Chips', () => {
    it('Chips 的角色是 button（不是 tab），且有 selected 状态', async () => {
      const view = await render(
        withProviders(
          <FilterChips
            options={[{ key: 'noodle', labelKey: 'secondary.wall' }]}
            selected={['noodle']}
            onToggle={() => undefined}
          />
        )
      );
      const chip = view.getByTestId('filter-chip-noodle');
      expect(chip.props.accessibilityRole).toBe('button');
      expect(chip.props.accessibilityState.selected).toBe(true);
    });

    it('Tab 条与 Chips 是两个文件、两个组件（导出面互不包含对方语义）', () => {
      const strip = fs.readFileSync(
        path.join(SRC_ROOT, 'components', 'ui', 'TopTabStrip.tsx'),
        'utf8'
      );
      const chips = fs.readFileSync(
        path.join(SRC_ROOT, 'components', 'ui', 'FilterChips.tsx'),
        'utf8'
      );
      // 导航侧：有指示器、无多选
      expect(strip).toMatch(/accessibilityRole="tab"/);
      expect(strip).not.toMatch(/multiSelect|onToggle/);
      // 筛选侧：可多选/可清除、**没有 tablist 与指示器**
      expect(chips).toMatch(/onToggle/);
      expect(chips).not.toMatch(/tablist/);
      expect(chips).not.toMatch(/accessibilityRole="tab"/);
    });

    it('R4：⛔ 两者不得互相复用（一个是导航单选用指示器，一个是筛选多选用药丸）', () => {
      const chips = fs.readFileSync(
        path.join(SRC_ROOT, 'components', 'ui', 'FilterChips.tsx'),
        'utf8'
      );
      const strip = fs.readFileSync(
        path.join(SRC_ROOT, 'components', 'ui', 'TopTabStrip.tsx'),
        'utf8'
      );
      expect(chips).not.toMatch(/import[^\n]*TopTabStrip/);
      expect(strip).not.toMatch(/import[^\n]*FilterChips/);
    });
  });
});
