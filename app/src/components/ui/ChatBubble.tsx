/**
 * ChatBubble（`D05`）—— 二手私信的**气泡**（组件定义 §2.6；原型 `P5`）
 *
 * 两条硬要求：
 *   1. **`read` 是它的状态**，不是独立组件 —— `D07 ReadReceipt` 已被并入（组件定义 §0.6 第 6 行）；
 *   2. **不许只靠颜色区分"我发的/对方发的"**（宪法 7.x）：所以除了底色，还有
 *      **对齐方向**与**发送者标签**，读屏也能听出来。
 *
 * ⛔ 组件内 0 文案：所有文字（发送者名、时间、已读）由**页面**传入。
 * ⛔ 本组件属于组件层，⛔ 不许 import `features/**` 的类型（依赖方向只能是 页面 → 组件）。
 */

import * as React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type ChatBubbleProps = {
  /** 是不是我发的（决定方向与底色） */
  mine: boolean;
  content: string;
  /** 对方的显示名（`mine` 时通常不传） */
  senderLabel?: string;
  /** 时间（页面格式化好的字符串；⛔ 组件不猜格式） */
  timeLabel?: string;
  /** 已读回执（`D07` 已并入本组件） */
  read?: boolean;
  /** 已读文案（页面给词条；`read` 为真时必传才显示） */
  readLabel?: string;
  /** 发送中（乐观显示的那一条） */
  pending?: boolean;
  testID?: string;
};

export function ChatBubble({
  mine,
  content,
  senderLabel,
  timeLabel,
  read = false,
  readLabel,
  pending = false,
  testID,
}: ChatBubbleProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        paddingHorizontal: theme.space('space_4'),
        paddingVertical: theme.space('space_1'),
      }}
    >
      <View
        // 方向本身就是一层非颜色区分；读屏靠下面的标签与文本
        accessibilityRole="text"
        accessibilityState={{ busy: pending }}
        style={{
          maxWidth: '80%',
          gap: theme.space('space_1'),
          paddingHorizontal: theme.space('space_3'),
          paddingVertical: theme.space('space_2'),
          borderRadius: theme.radius('radius_medium'),
          backgroundColor: mine
            ? theme.color['action-primary'].value
            : theme.color['bg-surface'].value,
          borderWidth: mine ? 0 : theme.borderWidth('border_width_hairline'),
          borderColor: theme.color['border-subtle'].value,
        }}
      >
        {!mine && senderLabel ? (
          <Text role="label" colorToken="text-secondary">
            {senderLabel}
          </Text>
        ) : null}
        <Text role="body" colorToken={mine ? 'text-on-fill' : 'text-primary'}>
          {content}
        </Text>
        {timeLabel ? (
          <Text role="label" colorToken={mine ? 'text-on-fill' : 'text-secondary'}>
            {timeLabel}
          </Text>
        ) : null}
        {mine && read && readLabel ? (
          <Text role="label" colorToken="text-on-fill" testID={testID ? `${testID}-read` : undefined}>
            {readLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
