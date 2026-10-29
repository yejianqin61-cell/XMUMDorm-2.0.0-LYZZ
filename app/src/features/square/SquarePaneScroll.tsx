/**
 * SquarePaneScroll —— 广场壳与内容 pane 之间的**唯一**滚动上报接缝
 * （开发设计文档-甲 J2-6；阶段4-01 结论 §1、阶段4-02 契约）。
 *
 * 为什么需要它：广场的"上部收起、五 Tab 吸顶"必须知道**当前内容滚到哪了**，
 * 但内容 pane 分属乙/丙/丁，壳不能去读别人的滚动容器。于是约定成一条**纯回调**：
 *
 *   pane ──上报(offsetY / beginDrag / endDrag)──▶ 广场壳（唯一持有收起进度）
 *
 * 三条硬规则：
 * 1. **无 Provider 时 `useSquarePaneScroll()` 返回 `null`** —— `ListScreen` 被 26 个页面复用，
 *    没有广场 Provider 时必须与今天完全一致（不改变任何现有行为）。
 * 2. **pane 只上报数字**，⛔ 不自己算收起进度、⛔ 不自己渲染 Tab 条（宪法 4.8：二级导航只有一处）。
 * 3. `collapsed` 由壳算好下发：消费方（`ListScreen`）据此让出下拉刷新，
 *    避免"下拉展开"和"下拉刷新"同时触发（A2-02c 末句）。
 *
 * ⛔ 本文件不含任何视觉；尺寸与样式都在广场壳。
 */

import * as React from 'react';

export type SquarePaneScrollHandle = {
  /** 所属二级 Tab 键（`SQUARE_TABS[].key`），用于把上报归到正确的 pane */
  tab: string;
  /** 上部是否已完全收起。消费方据此让出下拉刷新（见 UI 侧注释） */
  collapsed: boolean;
  /** 纵向滚动位置（dp） */
  reportOffset: (offsetY: number) => void;
  /** 手指按下开始拖动（安卓到顶不产生负偏移，展开判定要用到手势边界） */
  beginDrag: () => void;
  /** 拖动结束时的纵向位置（仍在顶部即视为"回顶继续下拉"） */
  endDrag: (offsetY: number) => void;
};

const SquarePaneScrollContext = React.createContext<SquarePaneScrollHandle | null>(null);

/**
 * 内容 pane 侧：取本 pane 的上报句柄。
 * ⚠️ 返回 `null` 是**正常情况**（不在广场里，例如单独打开的列表页），不是错误。
 */
export function useSquarePaneScroll(): SquarePaneScrollHandle | null {
  return React.useContext(SquarePaneScrollContext);
}

export type SquarePaneScrollScopeProps = {
  handle: SquarePaneScrollHandle;
  children: React.ReactNode;
};

/** 广场壳侧：为每个 pane 包一层，句柄由壳 `useMemo` 稳定住（⛔ 不要每帧新建） */
export function SquarePaneScrollScope({
  handle,
  children,
}: SquarePaneScrollScopeProps): React.ReactElement {
  return (
    <SquarePaneScrollContext.Provider value={handle}>{children}</SquarePaneScrollContext.Provider>
  );
}
