/**
 * 发布中心的开关纪律（宪法 4.9.2 / 4.4.4）
 *
 * 三条硬要求（骨架规范 §3.2）：
 *   ① 点击 → 打开发布中心，**底栏选中态不变**
 *   ② 关闭 → 回到点击前的**一级 Tab + 二级 Tab + 滚动位置**
 *   ③ ⛔ **不得叠加**第二个发布中心（重复点击必须无副作用）
 *
 * 做成纯状态机而不是散在组件里的 `useState`：
 * 这样"重复点击不叠加"可以在 Jest 里被证明，而不是靠真机肉眼。
 */

export type PublishCenterState = {
  /** 发布中心是否已打开（真源） */
  open: boolean;
  /** 打开它时的来源（关闭后要回到这里） */
  openedFrom: { tab: string; secondary: string | null; scrollOffset: number } | null;
};

export const INITIAL_PUBLISH_CENTER_STATE: PublishCenterState = {
  open: false,
  openedFrom: null,
};

export type PublishCenterRequest = {
  tab: string;
  secondary?: string | null;
  scrollOffset?: number;
};

export type PublishCenterTransition = {
  next: PublishCenterState;
  /** 本次请求是否真的应该打开（false = 已被去重拦下） */
  shouldOpen: boolean;
};

/** 请求打开发布中心：已在打开状态时**不产生任何副作用**（4.4.4：不同时叠两个模态） */
export function requestOpenPublishCenter(
  state: PublishCenterState,
  request: PublishCenterRequest
): PublishCenterTransition {
  if (state.open) {
    return { next: state, shouldOpen: false };
  }
  return {
    next: {
      open: true,
      openedFrom: {
        tab: request.tab,
        secondary: request.secondary ?? null,
        scrollOffset: request.scrollOffset ?? 0,
      },
    },
    shouldOpen: true,
  };
}

export type PublishCenterCloseTransition = {
  next: PublishCenterState;
  /** 关闭后要回到的位置（null = 不在打开状态，无事发生） */
  restoreTo: PublishCenterState['openedFrom'];
};

/** 关闭发布中心：返回**进入前**的位置（一级 + 二级 + 滚动），⛔ 不重置到列表顶部 */
export function closePublishCenter(state: PublishCenterState): PublishCenterCloseTransition {
  if (!state.open) {
    return { next: state, restoreTo: null };
  }
  return { next: INITIAL_PUBLISH_CENTER_STATE, restoreTo: state.openedFrom };
}
