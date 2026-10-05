/**
 * QuickActionGrid（K11）—— 入口网格（组件定义 §2.3）
 *
 * 消费页：`S-01`（五类服务）· `S-07` · `S-15` · `T-01` · `C-01` · `M-01` · `P-01`。
 *
 * ⚠️ **它与"模块化宫格入口页"不是一回事**：宪法 4.8 禁的是"用宫格替代二级导航"
 *   （子栏目必须用顶部 Tab 条）。本组件是**页面内的功能入口**（工具 Tab 的系统入口、
 *   广场的五类服务），两者不要混。
 *
 * 列数由**项数**决定（1–3 项一行，4 项 2×2，更多按 4 列），写成纯函数以便被测。
 * ⛔ 组件内不写文案：入口标题由页面传（它们来自注册表/词条表）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Badge } from './Badge';
import { Icon, type IconComponent } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type QuickActionVariant = 'grid' | 'list';

export type QuickAction = {
  key: string;
  label: string;
  /** 第 1 层 Lucide 组件（逐图标子路径导入，见 §16.2） */
  icon: IconComponent;
  /** 未读/数量角标（`A08` 的口径） */
  badgeCount?: number;
  onPress: () => void;
  disabled?: boolean;
};

/** 项数 → 列数（纯函数）。`list` 恒为 1 列 */
export function quickActionColumns(count: number, variant: QuickActionVariant): number {
  if (variant === 'list') return 1;
  if (count <= 0) return 0;
  if (count <= 3) return count;
  if (count === 4) return 2;
  return 4;
}

export type QuickActionGridProps = {
  actions: readonly QuickAction[];
  variant?: QuickActionVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function QuickActionGrid({
  actions,
  variant = 'grid',
  style,
  testID,
}: QuickActionGridProps): React.ReactElement {
  const theme = useTheme();
  const columns = quickActionColumns(actions.length, variant);
  if (columns === 0) return <View testID={testID} style={style} />;

  return (
    <View
      testID={testID}
      style={[{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.space('space_2'),
      }, style]}
    >
      {actions.map((action) => (
        <Pressable
          key={action.key}
          testID={testID ? `${testID}-${action.key}` : undefined}
          onPress={action.disabled ? undefined : action.onPress}
          disabled={action.disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: action.disabled === true }}
          style={{
            flexBasis: `${100 / columns}%`,
            flexGrow: 1,
            // 网格项：图标 + 标题纵排；`list` 时横排（行式入口）
            flexDirection: variant === 'list' ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: variant === 'list' ? 'flex-start' : 'center',
            gap: theme.space('space_2'),
            paddingVertical: theme.space('space_3'),
            paddingHorizontal: theme.space('space_2'),
            borderRadius: theme.radius('radius_medium'),
            backgroundColor: theme.color['bg-sunken'].value,
          }}
        >
          <Icon
            source={action.icon}
            size={variant === 'list' ? 'body' : 'large'}
            tint={action.disabled ? 'disabled' : 'brand'}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}>
            <Text
              role="label"
              colorToken={action.disabled ? 'text-disabled' : 'text-primary'}
              numberOfLines={1}
            >
              {action.label}
            </Text>
            {typeof action.badgeCount === 'number' && action.badgeCount > 0 ? (
              <Badge count={action.badgeCount} />
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
