/**
 * 广场上部收起的**纯规则**（阶段4-01 结论 §1/§5；验收矩阵 A2-02）
 *
 * 拆成纯函数的原因：手势与布局在无设备时不可验，但"滚到哪 → 收起多少""什么时候才算
 * 回顶下拉"这两件事是纯算术，必须能被表驱动断言（0 / 0.5 / 1 三档）。
 *
 * 三条规则（⛔ 改动前先读 A2-02b/c）：
 * 1. **只在下滑时更新进度**，反向轻滚**冻结** —— 否则稍微往回滚上部就闪回来。
 * 2. **到顶不等于展开**：回到顶部后必须继续下拉（iOS 负偏移 / 安卓到顶后再拉）才展开。
 * 3. 未测量到上部高度时进度恒 0 —— 避免首帧闪缩。
 */

/** 到顶判定（dp）。滚动位置小于等于它即视为在顶部 */
export const SQUARE_COLLAPSE_TOP = 0;

/** 夹到 0…1；非数字一律按 0 处理（滚动事件是原生来的，不能假设干净） */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export type CollapseStepInput = {
  /** 当前进度（0…1） */
  current: number;
  /** 本帧纵向滚动位置（dp，iOS 回弹可为负） */
  offsetY: number;
  /** 上部自然高度（dp，由 onLayout 测量） */
  headerHeight: number;
  /** 本帧是否在向下滚（由相邻两帧位置比较得出） */
  movingDown: boolean;
};

/**
 * 下一帧的收起进度。
 * ⚠️ 展开**不在这里**发生：它由 `shouldExpandOnPull` / `shouldExpandOnOffset` 判定后直接置 0。
 */
export function nextCollapseProgress(input: CollapseStepInput): number {
  const header = Number.isFinite(input.headerHeight) && input.headerHeight > 0
    ? input.headerHeight
    : 0;
  if (header <= 0) return 0;
  const current = clampProgress(input.current);
  const offset = Number.isFinite(input.offsetY) ? input.offsetY : 0;
  // iOS 回弹到负值 = 已经在回顶下拉 → 展开
  if (offset < SQUARE_COLLAPSE_TOP) return 0;
  // 反向轻滚：冻结（A2-02c「中途反向轻滚不展开」）
  if (!input.movingDown) return current;
  // 到顶但没继续下拉：保持原状
  if (offset <= SQUARE_COLLAPSE_TOP) return current;
  return clampProgress(offset / header);
}

export type CollapseLayout = {
  /** 外层裁剪高度（dp） */
  height: number;
  /** 内层位移（dp，向上为负） */
  translateY: number;
};

/** 进度 → 布局数字（外层裁剪高度 + 内层位移）。⛔ 不在这里碰动画/样式 */
export function collapseLayout(input: { progress: number; headerHeight: number }): CollapseLayout {
  const header = Number.isFinite(input.headerHeight) && input.headerHeight > 0
    ? input.headerHeight
    : 0;
  const progress = clampProgress(input.progress);
  return {
    height: header * (1 - progress),
    // 避免 -0：`progress === 0` 时返回正 0，断言与序列化都干净
    translateY: progress > 0 ? -progress * header : 0,
  };
}

export type ExpandPullInput = {
  /** 本次手势开始时的滚动位置 */
  beginOffsetY: number;
  /** 松手时的滚动位置 */
  endOffsetY: number;
  /** 当前是否已完全收起 */
  collapsed: boolean;
};

/**
 * 回顶下拉的展开判定（安卓路径：到顶不产生负偏移）。
 * 只有"整段手势都没离开顶部"才算继续下拉 —— 甩到顶就松手不算。
 */
export function shouldExpandOnPull(input: ExpandPullInput): boolean {
  if (!input.collapsed) return false;
  return input.beginOffsetY <= SQUARE_COLLAPSE_TOP && input.endOffsetY <= SQUARE_COLLAPSE_TOP;
}

/** iOS 路径：回弹期负偏移即视为回顶下拉 */
export function shouldExpandOnOffset(offsetY: number): boolean {
  return Number.isFinite(offsetY) && offsetY < SQUARE_COLLAPSE_TOP;
}
