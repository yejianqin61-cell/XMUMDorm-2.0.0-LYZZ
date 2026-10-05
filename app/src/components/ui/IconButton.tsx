/**
 * 图标按钮（C02）—— 品牌位（第 1 层），Lucide 图标由调用方**逐图标子路径**传入。
 *
 * 纪律：
 * - 16.5-1 ⛔ 禁止 barrel 导入 → 调用方写 `import Mail from 'lucide-react-native/icons/mail'`
 * - 16.5-2 ⛔ 调用点**不得**传 `strokeWidth` —— 全局在根布局的 `LucideProvider` 设一次
 * - 7.1 命中区 ≥44pt / ≥48dp（视觉图标可以更小，命中区不得更小）
 * - 16.2-4 / 7.2 纯图标按钮**必须有可读标签**
 */

import * as React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type IconButtonProps = {
  /** 已逐图标导入的 Lucide 组件 */
  Icon: IconComponent;
  /** 必填：读屏读到的动作名（⛔ 不能只靠图标） */
  accessibilityLabel: string;
  onPress?: () => void;
  /** 未读角标（口径与"我的"里的次要入口必须同源，宪法 4.7-4） */
  badgeCount?: number;
  disabled?: boolean;
  testID?: string;
};

export function IconButton({
  Icon,
  accessibilityLabel,
  onPress,
  badgeCount,
  disabled = false,
  testID,
}: IconButtonProps): React.ReactElement {
  const theme = useTheme();
  const iconColor = disabled
    ? theme.color['icon-disabled'].value
    : theme.color['icon-primary'].value;
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;
  const label = showBadge ? `${accessibilityLabel} · ${badgeCount}` : accessibilityLabel;

  const hitArea: ViewStyle = {
    minWidth: theme.touchTarget,
    minHeight: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={theme.space('space_2')}
      style={hitArea}
    >
      <Icon size={theme.space('space_6')} color={iconColor} />
      {showBadge ? (
        <View
          style={{
            position: 'absolute',
            top: theme.space('space_1'),
            right: theme.space('space_1'),
            minWidth: theme.space('space_4'),
            paddingHorizontal: theme.space('space_1'),
            borderRadius: theme.radius('radius_full'),
            backgroundColor: theme.color['state-danger'].value,
          }}
        >
          <Text
            role="caption"
            emphasis="strong"
            colorToken="text-on-state"
            align="center"
            numberOfLines={1}
          >
            {badgeCount > 99 ? '99+' : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
