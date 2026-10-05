/**
 * P0-04 · 唯一安全区容器 —— 纯函数与源码扫描用例（TC-P0-04-1A … 7A）
 *
 * ⚠️ 口径说明：**"`SafeAreaProvider` 恰好 1 处"** 这条断言的对象是**根布局**，
 *    而根布局属 P0-05 的交付物 → 该断言写在 P0-05 的用例里（本文件只断言"当前 ≤1 且不在页面里"）。
 *
 * 依据：App 设计宪法 第 17 条（S1–S8）· 骨架规范 §6.1/§6.2/§6.5。
 */
import * as fs from 'fs';
import * as path from 'path';

import { readCode, walkSource } from './helpers/sourceScan';

import {
  LARGE_SCREEN_MIN_WIDTH,
  buildEmbeddedInsetCss,
  resolveInsets,
  resolveOverlayInsets,
  type Insets,
} from '@/design-system/safe-area';

const SRC_ROOT = path.resolve(__dirname, '..');

/** 机型矩阵的真实 insets 取值（骨架规范 §6.4 的十项形态抽象） */
const DEVICES: Array<{ name: string; insets: Insets }> = [
  { name: 'Android 无挖孔 + 手势导航', insets: { top: 24, bottom: 0, left: 0, right: 0 } },
  { name: 'Android 中置挖孔', insets: { top: 28, bottom: 0, left: 0, right: 0 } },
  { name: 'Android 三键导航', insets: { top: 24, bottom: 48, left: 0, right: 0 } },
  { name: 'Android 曲面屏', insets: { top: 24, bottom: 0, left: 12, right: 12 } },
  { name: '折叠屏展开 sw>=600', insets: { top: 32, bottom: 24, left: 0, right: 0 } },
  { name: 'Android 横屏', insets: { top: 0, bottom: 21, left: 47, right: 47 } },
  { name: 'iOS 刘海', insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  { name: 'iOS 灵动岛', insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'iPad 分屏', insets: { top: 24, bottom: 20, left: 0, right: 0 } },
];

describe('P0-04 安全区解析（唯一 insets 计算点）', () => {
  describe('TC-P0-04-1A · 机型矩阵逐台断言', () => {
    it.each(DEVICES)('$name：顶栏偏移 = 真实顶部 inset（S1）', ({ insets }) => {
      const out = resolveInsets({
        insets,
        topMode: 'topbar',
        bottomMode: 'tabbar',
        tabBarHeight: 56,
      });
      expect(out.headerPaddingTop).toBe(insets.top);
    });

    it.each(DEVICES)('$name：左右 insets 生效（17.2 第 3 类）', ({ insets }) => {
      const out = resolveInsets({ insets, topMode: 'none', bottomMode: 'none' });
      expect(out.contentPaddingLeft).toBe(insets.left);
      expect(out.contentPaddingRight).toBe(insets.right);
    });

    it('topMode=none 时不产生顶部偏移', () => {
      const out = resolveInsets({
        insets: { top: 59, bottom: 34, left: 0, right: 0 },
        topMode: 'none',
        bottomMode: 'none',
      });
      expect(out.headerPaddingTop).toBe(0);
    });

    it('iOS 灵动岛：顶部 inset 更高时标题不会被压（偏移跟着变）', () => {
      const notch = resolveInsets({
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
        topMode: 'topbar',
        bottomMode: 'tabbar',
      });
      const island = resolveInsets({
        insets: { top: 59, bottom: 34, left: 0, right: 0 },
        topMode: 'topbar',
        bottomMode: 'tabbar',
      });
      expect(island.headerPaddingTop).toBeGreaterThan(notch.headerPaddingTop);
    });
  });

  describe('TC-P0-04-2A · S5 底部留白归属唯一（无双倍空白）', () => {
    it('bottomMode=tabbar 且 insets.bottom=48 时，内容底部留白**不含** 48', () => {
      const out = resolveInsets({
        insets: { top: 24, bottom: 48, left: 0, right: 0 },
        topMode: 'topbar',
        bottomMode: 'tabbar',
        tabBarHeight: 56,
      });
      expect(out.contentBottomPadding).toBe(56);
      // 双倍空白 = 56 + 48 = 104，这里必须不是它
      expect(out.contentBottomPadding).not.toBe(104);
    });

    it('bottomMode=own（粘性底栏）时才叠加 insets.bottom —— 这是唯一叠加处', () => {
      const out = resolveInsets({
        insets: { top: 24, bottom: 48, left: 0, right: 0 },
        topMode: 'none',
        bottomMode: 'own',
      });
      expect(out.contentBottomPadding).toBe(48);
    });

    it('bottomMode=none 时不留白', () => {
      const out = resolveInsets({
        insets: { top: 24, bottom: 48, left: 0, right: 0 },
        topMode: 'none',
        bottomMode: 'none',
      });
      expect(out.contentBottomPadding).toBe(0);
    });
  });

  describe('TC-P0-04-3A · S6 键盘与 insets 合并计算（⛔ 不相加）', () => {
    it('keyboardHeight=336 且 insets.bottom=34 → keyboardPadding 恰为 336', () => {
      const out = resolveInsets({
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
        topMode: 'topbar',
        bottomMode: 'tabbar',
        tabBarHeight: 56,
        keyboardHeight: 336,
      });
      expect(out.keyboardPadding).toBe(336);
      // 370 = 336 + 34 —— 这正是 S6 要防的"悬空/顶出"
      expect(out.keyboardPadding).not.toBe(370);
    });

    it('键盘收起时避让量为 0', () => {
      const out = resolveInsets({
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
        topMode: 'topbar',
        bottomMode: 'none',
        keyboardHeight: 0,
      });
      expect(out.keyboardPadding).toBe(0);
    });

    it('负数 / NaN 的 insets 不会产生负留白', () => {
      const out = resolveInsets({
        insets: { top: Number.NaN, bottom: -5, left: -1, right: -1 },
        topMode: 'topbar',
        bottomMode: 'own',
      });
      expect(out.headerPaddingTop).toBe(0);
      expect(out.contentBottomPadding).toBe(0);
      expect(out.contentPaddingLeft).toBe(0);
      expect(out.contentPaddingRight).toBe(0);
    });
  });

  describe('TC-P0-04-4A · 大屏自适应（17.2 第 4 类 / 宪法 5.3）', () => {
    it('sw < 600 不限制宽度', () => {
      const out = resolveInsets({
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        topMode: 'none',
        bottomMode: 'none',
        contentWidth: LARGE_SCREEN_MIN_WIDTH - 1,
      });
      expect(out.maxContentWidth).toBeNull();
    });

    it('sw >= 600 时收敛内容宽度（⛔ 不是把竖屏布局拉伸）', () => {
      const out = resolveInsets({
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        topMode: 'none',
        bottomMode: 'none',
        contentWidth: 900,
      });
      expect(out.maxContentWidth).not.toBeNull();
      expect(out.maxContentWidth as number).toBeGreaterThan(0);
      expect(out.maxContentWidth as number).toBeLessThanOrEqual(900);
    });

    it('大屏 + 横屏左右 inset 时，可用宽度扣掉 inset 后仍为正', () => {
      const out = resolveInsets({
        insets: { top: 0, bottom: 21, left: 47, right: 47 },
        topMode: 'none',
        bottomMode: 'none',
        contentWidth: 844,
      });
      expect(out.maxContentWidth as number).toBeGreaterThan(0);
      expect(out.maxContentWidth as number).toBeLessThanOrEqual(844 - 94);
    });
  });

  describe('S7 覆盖层与内嵌页 insets', () => {
    it('覆盖层自己拿到 top/bottom（不复用页面结果）', () => {
      const out = resolveOverlayInsets({ top: 59, bottom: 34, left: 12, right: 12 });
      expect(out).toEqual({ paddingTop: 59, paddingBottom: 34, paddingLeft: 12, paddingRight: 12 });
    });

    it('buildEmbeddedInsetCss 把 insets 写成内部 CSS 变量（17.3）', () => {
      const css = buildEmbeddedInsetCss({ insets: { top: 24, bottom: 48, left: 0, right: 0 } });
      expect(css).toContain('--dorm-inset-top');
      expect(css).toContain('24px');
      expect(css).toContain('--dorm-inset-bottom');
      expect(css).toContain('48px');
      expect(css.trim().endsWith('true;')).toBe(true);
    });
  });

  describe('TC-P0-04-5A / 6A / 7A · 源码扫描（S1 / S3 / S4 / S7）', () => {
    const files = walkSource(SRC_ROOT);

    it('⛔ 0 处 RN 内置 SafeAreaView 导入（S3）', () => {
      const importRe = /(?:import|require)\b[^;\n]*\bSafeAreaView\b/;
      const hits = files.filter((f) => importRe.test(readCode(f)));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    // ⚠️ 下面两条**先剥注释**（P1-07 修复；见 helpers/sourceScan.ts 的说明）：
    //    组件注释里写"本文件不调 useSafeAreaInsets()"是在**记录规则**，不是在调用它。
    it('SafeAreaProvider 出现 ≤1 次，且**不在** components/ui 里（S4：只在根布局挂一次）', () => {
      const hits = files.filter((f) => /SafeAreaProvider/.test(readCode(f)));
      expect(hits.length).toBeLessThanOrEqual(1);
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).not.toContain(
        path.join('components', 'ui', 'Screen.tsx')
      );
    });

    it('useSafeAreaInsets() 调用点 ≤2（S2：Screen 与根布局各一处）', () => {
      const hits = files.filter((f) => /useSafeAreaInsets\s*\(/.test(readCode(f)));
      expect(hits.length).toBeLessThanOrEqual(2);
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toContain(
        path.join('components', 'ui', 'Screen.tsx')
      );
    });

    it('⛔ 0 处写死的 paddingXxx: <数字>（S1）', () => {
      const re = /padding(Top|Bottom|Left|Right)\s*:\s*\d/;
      const hits = files.filter((f) => re.test(readCode(f)));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('⛔ 0 处 StatusBar.currentHeight 当布局依据（S1）', () => {
      const hits = files.filter((f) => /StatusBar\.currentHeight/.test(readCode(f)));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('S8：容器显式统一 iOS/Android 的滚动内容内边距行为', () => {
      const screenSrc = fs.readFileSync(
        path.join(SRC_ROOT, 'components', 'ui', 'Screen.tsx'),
        'utf8'
      );
      expect(screenSrc).toContain('contentInsetAdjustmentBehavior="never"');
    });
  });
});
