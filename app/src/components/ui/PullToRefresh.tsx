/**
 * PullToRefresh（T06）—— 下拉刷新（组件定义 §2.4：**手势交原生**）
 *
 * 为什么做成"返回 `RefreshControl` 的组件"而不是包一层 `ScrollView`：
 * 列表容器是 `K05 ListScreen`（P1-09）的事，它用的是虚拟化列表（`FlashList`）。
 * 本组件只负责**把原生 `RefreshControl` 按令牌配好**，由列表把它挂到自己的
 * `refreshControl` 属性上 —— 这样手势、惯性、指示器全是**原生的**（⛔ 不自绘下拉）。
 *
 * 用法：`<FlashList refreshControl={<PullToRefresh refreshing={r} onRefresh={f} />} … />`
 *
 * ⚠️ **为什么把配置抽成纯函数 `refreshControlProps`**：测试渲染器里 `RCTRefreshControl`
 *    的 props 是**空的**（原生组件不经 JS 树暴露），所以"颜色是不是来自令牌"没法靠渲染断言。
 *    抽成纯函数后，这条规则**可测**，组件本身只剩"取主题 → 调用 → 渲染"三步。
 *
 * ⛔ 颜色只给令牌：`tintColor`（iOS）/ `colors`（Android）都必须来自主题层。
 */

import * as React from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/design-system/theme';

export type RefreshControlSpec = {
  refreshing: boolean;
  onRefresh: () => void;
  /** iOS 指示器色 */
  tint: string;
  /** Android 指示器色 */
  spinner: string;
  /** Android 指示器背板色 */
  background: string;
  testID?: string;
};

/** 令牌 → 原生 `RefreshControl` 属性（纯函数，可测） */
export function refreshControlProps(spec: RefreshControlSpec): RefreshControlProps {
  return {
    refreshing: spec.refreshing,
    onRefresh: spec.onRefresh,
    testID: spec.testID,
    // iOS
    tintColor: spec.tint,
    // Android
    colors: [spec.spinner],
    progressBackgroundColor: spec.background,
  };
}

export type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
  testID?: string;
};

export function PullToRefresh({
  refreshing,
  onRefresh,
  testID,
}: PullToRefreshProps): React.ReactElement {
  const theme = useTheme();

  return (
    <RefreshControl
      {...refreshControlProps({
        refreshing,
        onRefresh,
        tint: theme.color['icon-secondary'].value,
        spinner: theme.color['action-primary'].value,
        background: theme.color['bg-surface'].value,
        testID,
      })}
    />
  );
}
