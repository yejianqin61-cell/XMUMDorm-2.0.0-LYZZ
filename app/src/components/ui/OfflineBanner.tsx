/**
 * OfflineBanner（T04）—— 离线 / 弱网横幅（组件定义 §2.4；宪法 10.6）
 *
 * **"离线优先"是数据层的事，不是一张横幅的事**：横幅只负责把**数据的真实来源**如实标出来。
 * 因此两个变体的语义是**不同**的：
 *   - `offline`：当前确实没有网络（请求发不出去）
 *   - `stale`：**正在展示缓存数据**（可能已经过时）—— 这是 10.6 的可见化，⛔ 不是错误态
 *
 * ⛔ 警告/离线必须**图标 + 文案双通道**（宪法 2.1.1）：只给一条黄边用户看不出是什么意思。
 * ⛔ `stale` **不得**渲染成 `T02 ErrorState`：有缓存可看时把整屏换成错误页，正是 10.6 要避免的。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import CloudOff from 'lucide-react-native/icons/cloud-off';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { Icon, type IconComponent } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type OfflineVariant = 'offline' | 'stale';

type VariantSpec = {
  icon: IconComponent;
  fill: DarkColorTokenName;
  onFill: DarkColorTokenName;
};

const VARIANT: Record<OfflineVariant, VariantSpec> = {
  // 无网络：用危险色（真的做不了事）
  offline: { icon: WifiOff, fill: 'state-danger', onFill: 'text-on-state' },
  // 缓存数据：用警告色（能看，但要知道可能过时）
  stale: { icon: CloudOff, fill: 'state-warning', onFill: 'text-on-state' },
};

export type OfflineBannerProps = {
  variant: OfflineVariant;
  /** 一句话说明（≤30 汉字） */
  message: string;
  /** 可选动作（如"重试"）；⛔ 最多一个 */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function OfflineBanner({
  variant,
  message,
  actionLabel,
  onAction,
  style,
  testID,
}: OfflineBannerProps): React.ReactElement {
  const theme = useTheme();
  const spec = VARIANT[variant];

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space('space_4'),
          paddingVertical: theme.space('space_2'),
          backgroundColor: theme.color[spec.fill].value,
        },
        style,
      ]}
    >
      <Icon source={spec.icon} size="body" tint="onFill" />
      <View style={{ flex: 1 }}>
        <Text role="caption" colorToken={spec.onFill} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityLabel={actionLabel}>
          <Text role="label" emphasis="strong" colorToken={spec.onFill}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
