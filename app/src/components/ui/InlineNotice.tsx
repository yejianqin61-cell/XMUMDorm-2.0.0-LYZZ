/**
 * InlineNotice（O02）—— 页内常驻状态说明（组件定义 §2.5；侵入度"低"）
 *
 * 与 `O01 Toast` 的分工（§2.5 的通知阶梯）：
 *   - **Toast = 刚刚那件事的回执**（2–4s 消失，⛔ 不承载需要阅读的说明）
 *   - **InlineNotice = 一个需要留在页面上的状态**（读完后仍在，直到状态改变）
 *
 * 典型用途（§2.5 点名）：**"校方系统会话已过期"** —— 它必须**常驻**，
 * 因为用户需要在**看到它的同时**去点"重新登录"，Toast 一晃就没了。
 *
 * ⛔ 语气色必须**图标 + 文案**双通道（宪法 2.1.1）；`warning` 尤其不得只给一块琥珀色。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Info from 'lucide-react-native/icons/info';
import Check from 'lucide-react-native/icons/check';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import CircleAlert from 'lucide-react-native/icons/circle-alert';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { Button } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

type ToneSpec = {
  icon: IconComponent;
  /** 文字色（用 `text-*` 系，它们都过了 textSafe） */
  text: DarkColorTokenName;
  /** 底色（浅底） */
  fill: DarkColorTokenName;
  border: DarkColorTokenName;
};

const TONE: Record<NoticeTone, ToneSpec> = {
  info: { icon: Info, text: 'text-secondary', fill: 'bg-sunken', border: 'border-subtle' },
  success: { icon: Check, text: 'text-success', fill: 'bg-success-soft', border: 'border-subtle' },
  // ⚠️ warning 必须双通道：55° 琥珀与美团黄同处暖色区，扫视下需要第二重区分（§4 规则③）
  warning: { icon: TriangleAlert, text: 'text-warning', fill: 'bg-warning-soft', border: 'border-subtle' },
  danger: { icon: CircleAlert, text: 'text-danger', fill: 'bg-danger-soft', border: 'border-subtle' },
};

export type InlineNoticeProps = {
  tone?: NoticeTone;
  message: string;
  /** 可选动作（如"重新登录"）；⛔ 最多一个 */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function InlineNotice({
  tone = 'info',
  message,
  actionLabel,
  onAction,
  style,
  testID,
}: InlineNoticeProps): React.ReactElement {
  const theme = useTheme();
  const spec = TONE[tone];

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space('space_3'),
          paddingVertical: theme.space('space_2'),
          backgroundColor: theme.color[spec.fill].value,
          borderWidth: theme.borderWidth('border_width_hairline'),
          borderColor: theme.color[spec.border].value,
          borderRadius: theme.radius('radius_medium'),
        },
        style,
      ]}
    >
      <Icon source={spec.icon} size="body" tint={tone === 'info' ? 'secondary' : tone} />
      <View style={{ flex: 1 }}>
        <Text role="caption" colorToken={spec.text} numberOfLines={3}>
          {message}
        </Text>
      </View>
      {actionLabel ? (
        <Button label={actionLabel} variant="link" size="small" onPress={onAction} />
      ) : null}
    </View>
  );
}
