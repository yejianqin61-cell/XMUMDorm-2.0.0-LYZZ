/**
 * ListItem（K06）—— 单列等宽行（组件定义 §2.3）
 *
 * 变体：`nav`（可进详情）· `action`（行尾动作）· `toggle`（即时开关）· `select`（勾选）· `danger`（危险行）
 *
 * **一条关键的可访问性设计**：`toggle` / `select` 两态的**整行就是那个控件** ——
 * 行本身带 `switch` / `checkbox` 角色与状态，内部的视觉开关/勾选框
 * **不进入无障碍树、也不接管点击**（`pointerEvents="none"`）。
 * 否则读屏会看到"两个开关"，且点视觉开关与点行尾会**各触发一次**（真机上的经典双重切换）。
 *
 * ⛔ 分隔线不在这里：列表的分隔由使用方决定（`Divider` 或 `Screen` 的分组），
 *    组件内部硬编码下边框会让"最后一行为什么有线"变成不可控。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';

import { useTheme } from '@/design-system/theme';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Switch } from './Switch';
import { Text } from './Text';

export type ListItemVariant = 'nav' | 'action' | 'toggle' | 'select' | 'danger';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  /** 行首：头像 / 图标 / `A06 Icon` */
  leading?: React.ReactNode;
  /** 行尾自定义内容（`action` 变体用它放图标按钮或文字动作） */
  trailing?: React.ReactNode;
  /** 行尾次要文案（如"已读"/"3 天前"） */
  meta?: string;
  variant?: ListItemVariant;
  onPress?: () => void;
  /** `toggle` 变体必填 */
  toggle?: { value: boolean; onValueChange: (next: boolean) => void };
  /** `select` 变体必填 */
  selected?: boolean;
  onToggleSelect?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  meta,
  variant = 'nav',
  onPress,
  toggle,
  selected = false,
  onToggleSelect,
  disabled = false,
  style,
  testID,
}: ListItemProps): React.ReactElement {
  const theme = useTheme();
  const isToggle = variant === 'toggle';
  const isSelect = variant === 'select';

  // 整行承载语义：toggle/select 时行本身就是那个控件
  const role = isToggle ? 'switch' : isSelect ? 'checkbox' : 'button';
  const state = isToggle
    ? { checked: toggle?.value === true, disabled }
    : isSelect
      ? { checked: selected, disabled }
      : { disabled };

  const handlePress = (): void => {
    if (disabled) return;
    if (isToggle) {
      toggle?.onValueChange(!(toggle?.value === true));
      return;
    }
    if (isSelect) {
      onToggleSelect?.();
      return;
    }
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={subtitle ? `${title}，${subtitle}` : title}
      accessibilityState={state}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: theme.space('space_3'),
          paddingHorizontal: theme.space('space_4'),
          paddingVertical: theme.space('space_2'),
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1, gap: theme.space('space_1') }}>
        <Text
          role="body"
          colorToken={variant === 'danger' ? 'text-danger' : disabled ? 'text-disabled' : 'text-primary'}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text role="caption" colorToken="text-secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {meta ? (
        <Text role="caption" colorToken="text-muted" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}

      {/* 视觉控件：不接管点击、不进无障碍树（语义都在行上） */}
      {isToggle && toggle ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Switch label={''} value={toggle.value} disabled={disabled} />
        </View>
      ) : null}
      {isSelect ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Checkbox label={''} state={selected ? 'checked' : 'unchecked'} disabled={disabled} />
        </View>
      ) : null}

      {trailing}
      {/* `nav` 变体默认给一个"可进入"的指示 —— 用第 1 层图标（⛔ 不用 › 文本字符） */}
      {variant === 'nav' && trailing === undefined ? (
        <Icon source={ChevronRight} size="body" tint="secondary" />
      ) : null}
    </Pressable>
  );
}
