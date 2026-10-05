/**
 * LoadingState（T03）—— 加载态：**先给东西看**（组件定义 §2.4；宪法 10.3 / 10.5）
 *
 * ⛔ **不配任何文字** —— 没有「加载中…」这类无信息量文案（宪法 10.5-5）。
 *    想知道"在加载什么"应该靠**骨架的形状**表达（列表骨架 vs 卡片骨架），不是靠句子。
 * ⛔ 指示器必须**持续在动**：`skeleton` 用静态占位会看起来像"加载完了但是空的"，
 *    所以 `skeleton` 与 `spinner` 都是持续动效；`determinate` 走 `A11 Progress`（有确定进度）。
 *
 * ⚠️ reduced-motion：本组件**不声明降级**。骨架/转圈表达的是"进行中"这一**状态**，
 *    不是装饰性动效；关掉它会让用户分不清"在加载"与"加载完但为空"。这一判断写在
 *    §7.4 的语境里（那里列的降级项是**页面进退**与**点赞缩放**，不含加载指示器）。
 */

import * as React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { ProgressBar } from './Progress';
import { Skeleton } from './Skeleton';

export type LoadingVariant = 'skeleton' | 'spinner' | 'determinate';

/** 骨架默认铺几行（结构性的行数，不是尺寸；⛔ 与令牌无关） */
const DEFAULT_SKELETON_ROWS = 3;

export type LoadingStateProps = {
  variant?: LoadingVariant;
  /** `skeleton` 的行数（默认 3） */
  rows?: number;
  /** `determinate` 的进度（0–1） */
  value?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function LoadingState({
  variant = 'skeleton',
  rows = DEFAULT_SKELETON_ROWS,
  value = 0,
  style,
  testID,
}: LoadingStateProps): React.ReactElement {
  const theme = useTheme();

  if (variant === 'spinner') {
    return (
      <View
        testID={testID}
        style={[{ alignItems: 'center', justifyContent: 'center', padding: theme.space('space_6') }, style]}
      >
        <ActivityIndicator
          size="large"
          color={theme.color['icon-secondary'].value}
          accessibilityRole="progressbar"
        />
      </View>
    );
  }

  if (variant === 'determinate') {
    return (
      <View
        testID={testID}
        style={[{ padding: theme.space('space_4') }, style]}
      >
        <ProgressBar value={value} />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      style={[{ gap: theme.space('space_2'), padding: theme.space('space_4') }, style]}
    >
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <Skeleton key={`skeleton-${index}`} kind={index === 0 ? 'card' : 'text'} />
      ))}
    </View>
  );
}
