/**
 * 焦点陷阱纯逻辑测试 — M09 万能墙评论弹窗
 *
 * 覆盖 shared/utils/focusTrap.js：Tab / Shift+Tab 的环绕决策。
 * 真正的 querySelectorAll / focus() 在组件里，不在此覆盖范围。
 */
const { computeTabTargetIndex, FOCUSABLE_SELECTOR } = require('../../shared/utils/focusTrap');

describe('computeTabTargetIndex', () => {
  describe('中间位置交回浏览器', () => {
    it('正向且不在末尾 → null', () => {
      expect(computeTabTargetIndex(5, 0)).toBeNull();
      expect(computeTabTargetIndex(5, 1)).toBeNull();
      expect(computeTabTargetIndex(5, 3)).toBeNull();
    });

    it('反向且不在开头 → null', () => {
      expect(computeTabTargetIndex(5, 4, true)).toBeNull();
      expect(computeTabTargetIndex(5, 2, true)).toBeNull();
    });
  });

  describe('首尾环绕', () => {
    it('正向在末尾 → 回到 0', () => {
      expect(computeTabTargetIndex(5, 4)).toBe(0);
    });

    it('反向在开头 → 跳到末尾', () => {
      expect(computeTabTargetIndex(5, 0, true)).toBe(4);
    });

    it('只有一个可聚焦元素时，正反向都停在它自己', () => {
      expect(computeTabTargetIndex(1, 0)).toBe(0);
      expect(computeTabTargetIndex(1, 0, true)).toBe(0);
    });
  });

  describe('焦点不在容器内或无有效下标', () => {
    it('-1 表示焦点在容器外：正向给第一个', () => {
      expect(computeTabTargetIndex(3, -1)).toBe(0);
    });

    it('-1 且反向：给最后一个', () => {
      expect(computeTabTargetIndex(3, -1, true)).toBe(2);
    });

    it('下标越界按「不在容器内」处理', () => {
      expect(computeTabTargetIndex(3, 99)).toBe(0);
      expect(computeTabTargetIndex(3, 99, true)).toBe(2);
    });

    it('非数字下标按「不在容器内」处理', () => {
      expect(computeTabTargetIndex(3, undefined)).toBe(0);
      expect(computeTabTargetIndex(3, NaN, true)).toBe(2);
    });
  });

  describe('没有可聚焦元素', () => {
    it.each([0, -1, undefined, null, NaN])('count=%s → null', (count) => {
      expect(computeTabTargetIndex(count, 0)).toBeNull();
    });
  });
});

describe('FOCUSABLE_SELECTOR', () => {
  it('排除 disabled 控件与 tabindex="-1"', () => {
    expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('textarea:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it('覆盖按钮、链接、输入三类主要控件', () => {
    expect(FOCUSABLE_SELECTOR).toContain('button');
    expect(FOCUSABLE_SELECTOR).toContain('a[href]');
    expect(FOCUSABLE_SELECTOR).toContain('input');
  });
});
