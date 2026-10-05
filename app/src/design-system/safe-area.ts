/**
 * 安全区解析（**全 App 唯一的 insets 计算点**，纯函数）
 *
 * 宪法第 17 条八条铁律的落地：
 *   S1 每屏消费真实 insets（⛔ 不写死数值、不拿 `StatusBar` 的 `currentHeight` 当布局依据）
 *   S2 只有一个安全区容器，页面只声明**意图**（要/不要顶栏、底部留白归谁）
 *   S5 底部留白归属唯一：原生 Tab 栏自带安全区 → 我们**不再叠加** bottom inset
 *   S6 键盘与 insets **合并计算**（键盘已经盖住手势条区域，⛔ 不相加）
 *   S7 每个覆盖层自己处理 insets（模态/Sheet/Toast/WebView/启动页）
 *   S8 两端默认行为不同 → 一律走本层，不依赖平台默认
 * 17.2 四类 insets：顶部 / 底部 / 左右 / 大屏
 */

/** 真实 insets（来自 `react-native-safe-area-context`，⛔ 不接受手写值） */
export type Insets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** 顶部意图：要顶栏 / 覆盖层自己处理 / 不要 */
export type TopMode = 'topbar' | 'overlay' | 'none';

/** 底部留白归属：原生 Tab 栏自带 / 本屏自己的粘性底栏 / 不需要 */
export type BottomMode = 'tabbar' | 'own' | 'none';

export type ResolveInsetsInput = {
  insets: Insets;
  topMode: TopMode;
  bottomMode: BottomMode;
  /** 键盘高度；0 = 收起（S6） */
  keyboardHeight?: number;
  /** 原生 Tab 栏自身高度（不含 insets）—— 底栏已含安全区，故这里只留"不被压住"的量 */
  tabBarHeight?: number;
  /** 当前窗口宽度（用于大屏自适应，宪法 5.3） */
  contentWidth?: number;
};

export type ResolvedInsets = {
  /** 本次计算用的**真实 insets 原值**（已钳到非负）。覆盖层/内嵌页要拿原始值时必须从这里取（S7）。 */
  insets: Insets;
  /** 顶栏内容相对屏幕顶边的偏移（顶栏背景仍铺满到屏幕顶边） */
  headerPaddingTop: number;
  /** 内容区底部留白（S5：`tabbar` 模式下**不含** insets.bottom） */
  contentBottomPadding: number;
  contentPaddingLeft: number;
  contentPaddingRight: number;
  /** 键盘避让量（S6：与 bottom inset 合并，不相加） */
  keyboardPadding: number;
  /** 大屏时内容最大宽度；null = 不限制 */
  maxContentWidth: number | null;
  /** 覆盖层（S7）自用：顶部 / 底部 */
  overlayPaddingTop: number;
  overlayPaddingBottom: number;
};

/** 大屏起点：`sw ≥ 600dp` 是首发要求（宪法 5.3 / 骨架规范 §6.2 第 4 类） */
export const LARGE_SCREEN_MIN_WIDTH = 600;
/** 大屏下的内容最大宽度（【提案】，Phase 1 真机定稿） */
export const MAX_CONTENT_WIDTH = 560;

const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export function resolveInsets(input: ResolveInsetsInput): ResolvedInsets {
  const { insets, topMode, bottomMode } = input;
  const keyboardHeight = clampNonNegative(input.keyboardHeight ?? 0);
  const tabBarHeight = clampNonNegative(input.tabBarHeight ?? 0);
  const contentWidth = clampNonNegative(input.contentWidth ?? 0);

  // S1 / 17.2-1：顶栏内容从真实顶部 inset 之下开始
  const headerPaddingTop = topMode === 'none' ? 0 : clampNonNegative(insets.top);

  // S5：原生 Tab 栏自带安全区 → 内容底部只留"最后一项不被 Tab 栏压住"的量
  let contentBottomPadding = 0;
  if (bottomMode === 'tabbar') {
    contentBottomPadding = tabBarHeight;
  } else if (bottomMode === 'own') {
    contentBottomPadding = clampNonNegative(insets.bottom);
  }

  // S6：键盘高度已覆盖手势条区域 → 取键盘高度本身，**不加** bottom inset
  const keyboardPadding = keyboardHeight;

  const maxContentWidth =
    contentWidth >= LARGE_SCREEN_MIN_WIDTH
      ? Math.min(MAX_CONTENT_WIDTH, contentWidth - insets.left - insets.right)
      : null;

  return {
    insets: {
      top: clampNonNegative(insets.top),
      bottom: clampNonNegative(insets.bottom),
      left: clampNonNegative(insets.left),
      right: clampNonNegative(insets.right),
    },
    headerPaddingTop,
    contentBottomPadding,
    contentPaddingLeft: clampNonNegative(insets.left),
    contentPaddingRight: clampNonNegative(insets.right),
    keyboardPadding,
    maxContentWidth: maxContentWidth !== null && maxContentWidth > 0 ? maxContentWidth : null,
    // S7：覆盖层自己处理 —— 顶部/底部各自消费，不复用页面结果
    overlayPaddingTop: clampNonNegative(insets.top),
    overlayPaddingBottom: clampNonNegative(insets.bottom),
  };
}

/** 覆盖层（模态 / Sheet / Toast / 全屏 WebView）必须自己调用它（S7） */
export function resolveOverlayInsets(insets: Insets): {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
} {
  return {
    paddingTop: clampNonNegative(insets.top),
    paddingBottom: clampNonNegative(insets.bottom),
    paddingLeft: clampNonNegative(insets.left),
    paddingRight: clampNonNegative(insets.right),
  };
}

/**
 * 把 insets 转成传给**内嵌网页**的 CSS 变量（宪法 17.3）。
 * 为什么必须这样做：内嵌的第三方页面拿不到 `viewport-fit=cover`，
 * 页面里 `env(safe-area-inset-*)` 取值恒为 0（实测结论见 R3 结论文档）。
 */
export function buildEmbeddedInsetCss(input: {
  insets: Insets;
  topPadding?: number;
  bottomPadding?: number;
}): string {
  const top = clampNonNegative(input.topPadding ?? input.insets.top);
  const bottom = clampNonNegative(input.bottomPadding ?? input.insets.bottom);
  return [
    `document.documentElement.style.setProperty('--dorm-inset-top','${top}px');`,
    `document.documentElement.style.setProperty('--dorm-inset-bottom','${bottom}px');`,
    `document.documentElement.style.setProperty('--dorm-inset-left','${clampNonNegative(input.insets.left)}px');`,
    `document.documentElement.style.setProperty('--dorm-inset-right','${clampNonNegative(input.insets.right)}px');`,
    'true;',
  ].join('');
}
