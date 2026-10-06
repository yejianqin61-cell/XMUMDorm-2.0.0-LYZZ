/**
 * ExpBar（`K16`）—— 经验进度条（当前 / 下一级阈值；组件定义 §2.3）
 *
 * ⛔ **不重画进度条**：消费 `A11 ProgressBar`（宪法 9.14-①：同语义不多层）。
 * 本组件只负责"进度 + 文字"这一层组合与**夹紧**（⛔ 不出现 `NaN`、不越界）。
 *
 * ⛔ 组件内 0 文案：`text` 由页面给（后端 `levelProgress.progressText` 就是 `"12/200"` 这种纯文本）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { ProgressBar } from './Progress';
import { Text } from './Text';

/** 进度夹紧：非数 → 0；越界 → 0 或 1（⛔ 不让进度条溢出或显示 NaN） */
export function clampProgress(progress: unknown): number {
  const value = Number(progress);
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export type ExpBarVariant = 'compact' | 'full';

export type ExpBarProps = {
  /** 0–1（后端 `levelProgress.progress`） */
  progress: number;
  /** 进度文字，如 `"12/200"`（后端 `progressText`；⛔ 组件不自己拼） */
  text?: string;
  variant?: ExpBarVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ExpBar({
  progress,
  text,
  variant = 'compact',
  style,
  testID,
}: ExpBarProps): React.ReactElement {
  const theme = useTheme();
  const value = clampProgress(progress);
  const isFull = variant === 'full';

  return (
    <View
      testID={testID}
      style={[
        { gap: theme.space('space_1'), alignSelf: 'stretch' },
        style,
      ]}
    >
      <ProgressBar
        value={value}
        thickness={isFull ? 'space_2' : 'space_1'}
        testID={testID ? `${testID}-bar` : undefined}
      />
      {text ? (
        <Text
          role="caption"
          colorToken="text-secondary"
          testID={testID ? `${testID}-text` : undefined}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}
