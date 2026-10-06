/**
 * P2A-03 · 二级 Tab 集合收成一处配置 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：`hasSecondaryTabs`、四条不变量（可注入坏集合验证会抛）；
 *   S-1 渲染：空集合**不占位**（不回退成空条）；
 *   S-5 源码扫描：集合与它的词条只声明在**一处**。
 *
 * 依据：`docs/app/task/phase-2/P2A-03-二级Tab集合收成一处配置.md`、骨架规范 §4.2 / §2.1。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import {
  SECONDARY_TABS,
  assertSecondaryTabInvariants,
  getSecondaryTabs,
  hasSecondaryTabs,
  type SecondaryTabRegistry,
} from '@/features/navigation/secondaryTabs';

const SRC_ROOT = path.resolve(__dirname, '..');
const DICT_KEYS = Object.keys(zh);

function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('P2A-03 二级 Tab 集合收成一处配置', () => {
  describe('TC-P2A-03-1A · 空集合 = 没有二级 Tab', () => {
    it('「我的」还没拍板（TO-CONFIRM C-05）→ 空集合、不占位', () => {
      expect(getSecondaryTabs('me')).toEqual([]);
      expect(hasSecondaryTabs('me')).toBe(false);
    });

    it('广场 / 工具在 C-03 / C-04 拍板前也是空集合（⛔ 不预占所有者的决定）', () => {
      expect(hasSecondaryTabs('square')).toBe(false);
      expect(hasSecondaryTabs('tools')).toBe(false);
    });

    it('不存在的格名不会静默变成"有二级 Tab"', () => {
      expect(hasSecondaryTabs('not-a-tab')).toBe(false);
    });
  });

  describe('TC-P2A-03-2A · 「校园里」是唯一已定集合', () => {
    it('恰好两项，顺序与宪法 4.1.1 一致（树洞 / 万能墙）', () => {
      expect(getSecondaryTabs('campus').map((tab) => tab.key)).toEqual(['confession', 'wall']);
      expect(hasSecondaryTabs('campus')).toBe(true);
    });

    it('现网集合整体通过不变量（含"第 5 格不得有二级 Tab"）', () => {
      expect(() => assertSecondaryTabInvariants(DICT_KEYS)).not.toThrow();
    });
  });

  describe('TC-P2A-03-3A · 注入坏集合必须抛（否则守卫是摆设）', () => {
    it('同一格下 key 重复 → 抛', () => {
      const bad: SecondaryTabRegistry = {
        campus: [
          { key: 'wall', labelKey: 'secondary.wall' },
          { key: 'wall', labelKey: 'secondary.confession' },
        ],
      };
      expect(() => assertSecondaryTabInvariants(DICT_KEYS, bad)).toThrow(/重复/);
    });

    it('labelKey 不在词条表 → 抛', () => {
      const bad: SecondaryTabRegistry = {
        campus: [{ key: 'wall', labelKey: 'secondary.nope' as never }],
      };
      expect(() => assertSecondaryTabInvariants(DICT_KEYS, bad)).toThrow(/词条表/);
    });

    it('挂在不存在的一级格上 → 抛', () => {
      const bad: SecondaryTabRegistry = {
        nowhere: [{ key: 'wall', labelKey: 'secondary.wall' }],
      };
      expect(() => assertSecondaryTabInvariants(DICT_KEYS, bad)).toThrow(/不存在的格/);
    });

    it('⛔ 动作型格位（第 5 格"发布"）不得有二级 Tab —— 它没有内容区', () => {
      const bad: SecondaryTabRegistry = {
        publish: [{ key: 'wall', labelKey: 'secondary.wall' }],
      };
      expect(() => assertSecondaryTabInvariants(DICT_KEYS, bad)).toThrow(/动作型格位/);
    });
  });

  describe('TC-P2A-03-4A · 渲染：空集合不占位', () => {
    it('空 tabs ⇒ 什么都不渲染（⛔ 不是一条空条）', async () => {
      const view = await renderApp(
        <TopTabStrip tabs={[]} selectedKey="wall" onSelect={() => undefined} testID="strip" />
      );
      expect(view.queryByTestId('strip')).toBeNull();
      // 连标签都不该出现（renderApp 总是包一层 SafeAreaProvider，所以不能断言整棵树为 null）
      expect(view.queryByText(zh['secondary.wall'])).toBeNull();
      expect(view.queryByText(zh['secondary.confession'])).toBeNull();
    });
  });

  describe('TC-P2A-03-5A · 源码扫描：集合只有一处定义', () => {
    it('只有 `secondaryTabs.ts` 声明 SECONDARY_TABS', () => {
      const declarers = walkSource(SRC_ROOT)
        .filter((file) => /SECONDARY_TABS\s*[:=]/.test(stripComments(fs.readFileSync(file, 'utf8'))))
        .map((file) => path.relative(SRC_ROOT, file));
      expect(declarers).toEqual([path.join('features', 'navigation', 'secondaryTabs.ts')]);
    });

    it('二级 Tab 的词条只出现在那一处（页面里不许各写一份集合）', () => {
      // ⛔ 词条表本身当然有这些 key —— 那是"词条定义处"，不是"第二份集合"
      const holders = walkSource(SRC_ROOT)
        .filter((file) => !file.includes(`${path.sep}i18n${path.sep}`))
        .filter((file) => stripComments(fs.readFileSync(file, 'utf8')).includes("'secondary."))
        .map((file) => path.relative(SRC_ROOT, file));
      expect(holders).toEqual([path.join('features', 'navigation', 'secondaryTabs.ts')]);
    });

    it('集合的形状是"一级格 → 数组"，且当前只有一格非空（未拍板期间不许偷偷加）', () => {
      const nonEmpty = Object.entries(SECONDARY_TABS)
        .filter(([, tabs]) => tabs.length > 0)
        .map(([primary]) => primary);
      expect(nonEmpty).toEqual(['campus']);
    });
  });
});
