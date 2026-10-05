/**
 * Progress（A11）—— 确定性进度（组件定义 §2.1）
 *
 * 形态：`bar`（水平条）· `ring`（环形，用 `react-native-svg`，⛔ 不自造 Canvas）。
 * ⚠️ 组件定义还列了 `segmented`（分段）—— **P1-04 不做**：无消费者，⛔ 不铺开空 API。
 *
 * 三条纪律：
 *   - 进度值**只收 0–1 的比率**，组件内部夹紧（⛔ 不收百分比数字，避免调用点各写各的换算）；
 *   - 进度**不是**"仅靠色彩传达状态"的场景，但也**不得**只靠颜色区分"已完成/未完成"
 *     → 调用方应在旁边给出文字（组件定义 §7.2）；
 *   - `bar` 的轨道高度取间距令牌，⛔ 不写裸数字。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';

/** 把任意输入夹到 [0, 1]（`NaN` → 0）。⛔ 不抛：进度在渲染路径上 */
export function clampProgress(value: number | undefined | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export type ProgressBarProps = {
  value: number;
  /** 轨道高度档位（默认 `space_1` = 4） */
  thickness?: SpaceKey;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ProgressBar({
  value,
  thickness = 'space_1',
  style,
  testID,
}: ProgressBarProps): React.ReactElement {
  const theme = useTheme();
  const ratio = clampProgress(value);
  const height = theme.space(thickness);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={[
        {
          height,
          borderRadius: theme.radius('radius_full'),
          backgroundColor: theme.color['bg-sunken'].value,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* 宽度用百分比字符串：这是布局比率，不是令牌数值 */}
      <View
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          borderRadius: theme.radius('radius_full'),
          backgroundColor: theme.color['action-primary'].value,
        }}
      />
    </View>
  );
}

export type ProgressRingProps = {
  value: number;
  /** 直径档位（默认 `space_12` = 48） */
  size?: SpaceKey;
  /** 线宽档位（默认 `space_1` = 4） */
  thickness?: SpaceKey;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ProgressRing({
  value,
  size = 'space_12',
  thickness = 'space_1',
  style,
  testID,
}: ProgressRingProps): React.ReactElement {
  const theme = useTheme();
  const ratio = clampProgress(value);
  const diameter = theme.space(size);
  const stroke = theme.space(thickness);
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={[{ width: diameter, height: diameter }, style]}
    >
      <Svg width={diameter} height={diameter}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.color['bg-sunken'].value}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.color['action-primary'].value}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          // 12 点方向起步（SVG 默认从 3 点起）
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
      </Svg>
    </View>
  );
}
