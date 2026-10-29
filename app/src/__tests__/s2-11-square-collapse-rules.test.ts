/**
 * 阶段4-03 · 收起进度的纯规则（表驱动）
 *
 * 验收矩阵 A2-02 的"五种情形"里，凡是能脱离真机判断的都在这里：
 * 进度 0/0.5/1 的映射、反向冻结、到顶不下拉不展开、回顶下拉才展开。
 */
import {
  collapseLayout,
  nextCollapseProgress,
  shouldExpandOnOffset,
  shouldExpandOnPull,
} from '@/features/square/squareCollapse';

const HEADER = 200;
const step = (overrides: Partial<Parameters<typeof nextCollapseProgress>[0]>) => ({
  current: 0,
  offsetY: 0,
  headerHeight: HEADER,
  movingDown: true,
  ...overrides,
});

describe('收起进度映射', () => {
  it('顶部为 0，半屏为 0.5，超过上部高度为 1', () => {
    expect(nextCollapseProgress(step({ offsetY: 0 }))).toBe(0);
    expect(nextCollapseProgress(step({ offsetY: 100 }))).toBe(0.5);
    expect(nextCollapseProgress(step({ offsetY: HEADER }))).toBe(1);
    expect(nextCollapseProgress(step({ offsetY: 900 }))).toBe(1);
  });

  it('反向轻滚冻结：不得因为往上滚就把上部放回来', () => {
    expect(nextCollapseProgress(step({ current: 1, offsetY: 120, movingDown: false }))).toBe(1);
    expect(nextCollapseProgress(step({ current: 0.5, offsetY: 10, movingDown: false }))).toBe(0.5);
  });

  it('到顶但没继续下拉时不展开（否则滚回去就等于展开）', () => {
    expect(nextCollapseProgress(step({ current: 1, offsetY: 0, movingDown: true }))).toBe(1);
  });

  it('回顶继续下拉（iOS 负偏移）才回到展开', () => {
    expect(nextCollapseProgress(step({ current: 1, offsetY: -24, movingDown: true }))).toBe(0);
  });

  it('未测量到上部高度时不收起（避免首帧闪缩）', () => {
    expect(nextCollapseProgress(step({ offsetY: 300, headerHeight: 0 }))).toBe(0);
  });
});

describe('收起布局换算', () => {
  it('外层高度 = H·(1-p)，内层位移 = -p·H', () => {
    expect(collapseLayout({ progress: 0, headerHeight: HEADER })).toEqual({
      height: HEADER,
      translateY: 0,
    });
    expect(collapseLayout({ progress: 0.5, headerHeight: HEADER })).toEqual({
      height: 100,
      translateY: -100,
    });
    expect(collapseLayout({ progress: 1, headerHeight: HEADER })).toEqual({
      height: 0,
      translateY: -HEADER,
    });
  });

  it('越界进度被夹住，不会出现负高度', () => {
    expect(collapseLayout({ progress: 3, headerHeight: HEADER }).height).toBe(0);
    expect(collapseLayout({ progress: -2, headerHeight: HEADER }).height).toBe(HEADER);
  });
});

describe('回顶下拉的展开判定', () => {
  it('手势起点与结束都在顶部、且已收起 → 展开', () => {
    expect(shouldExpandOnPull({ beginOffsetY: 0, endOffsetY: 0, collapsed: true })).toBe(true);
  });

  it('起点不在顶部（甩动到顶后松手）→ 不展开', () => {
    expect(shouldExpandOnPull({ beginOffsetY: 400, endOffsetY: 0, collapsed: true })).toBe(false);
  });

  it('未收起时下拉不重复触发', () => {
    expect(shouldExpandOnPull({ beginOffsetY: 0, endOffsetY: 0, collapsed: false })).toBe(false);
  });

  it('iOS 回弹负偏移直接视为展开', () => {
    expect(shouldExpandOnOffset(-1)).toBe(true);
    expect(shouldExpandOnOffset(0)).toBe(false);
    expect(shouldExpandOnOffset(24)).toBe(false);
  });
});
