/**
 * Button（C01）—— 行动控件（组件定义 §2.2 / §5.2）
 *
 * ⛔ **`primary` 是全 App 唯一允许的 Neo-Brutalism CTA**（组件定义 §5.2 白名单第 1 类）：
 *    `action-primary` 填充 + `border-strong` **2px** + 右下**硬偏移**（加粗，不是阴影）。
 *    其余变体一律不做 NB 处理 —— NB 的稀缺性就是它的作用。
 *
 * 三条纪律：
 *   - 文案 ≤6 汉字（§3.6），⛔ 不写说明性句子；
 *   - a11y：`role=button`，必须暴露 `disabled` 与 **`busy`**（§7.3）——`loading` 时**不得**只转圈不说话；
 *   - `loading` 期间**防重复提交**（`onPress` 不触发），但⛔ 不整屏变灰（§3.2.5-④ 的按钮版）。
 */

import * as React from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import type { SpaceKey } from '@/design-system/px';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

type VariantSpec = {
  fill: DarkColorTokenName | null;
  label: DarkColorTokenName;
  /** 是否走 Neo-Brutalism（2px 描边 + 硬偏移）——**只有 `primary` 是 true** */
  brutal: boolean;
  bordered: boolean;
};

const VARIANT: Record<ButtonVariant, VariantSpec> = {
  primary: { fill: 'action-primary', label: 'text-on-fill', brutal: true, bordered: true },
  secondary: { fill: 'bg-sunken', label: 'text-primary', brutal: false, bordered: true },
  ghost: { fill: null, label: 'text-primary', brutal: false, bordered: false },
  danger: { fill: 'state-danger', label: 'text-on-state', brutal: false, bordered: false },
  link: { fill: null, label: 'text-brand', brutal: false, bordered: false },
};

type SizeSpec = { paddingH: SpaceKey; paddingV: SpaceKey };

const SIZE: Record<ButtonSize, SizeSpec> = {
  small: { paddingH: 'space_3', paddingV: 'space_2' },
  medium: { paddingH: 'space_4', paddingV: 'space_3' },
  large: { paddingH: 'space_6', paddingV: 'space_4' },
};

export type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** 占满整行（表单主行动常用） */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  variant = 'primary',
  size = 'medium',
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  testID,
}: ButtonProps): React.ReactElement {
  const theme = useTheme();
  const spec = VARIANT[variant];
  const spacing = SIZE[size];
  // loading 期间不可再点（防重复提交），但**视觉上不禁用**（禁用会把标签变灰、看起来像坏掉）
  const interactive = !disabled && !loading;

  const brutto = theme.borderWidth('border_width_brutal');
  const hairline = theme.borderWidth('border_width_hairline');

  return (
    <Pressable
      testID={testID}
      // ⛔ 两道保险：既不给 handler，**handler 内部也再判一次** ——
      //    "loading 时不得提交"是防重复提交的核心承诺，不能只靠"没传函数"
      onPress={() => {
        if (!interactive) return;
        onPress?.();
      }}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space(spacing.paddingH),
          paddingVertical: theme.space(spacing.paddingV),
          borderRadius: theme.radius('radius_medium'),
          ...(fullWidth ? { alignSelf: 'stretch' } : null),
        },
        spec.fill === null ? null : { backgroundColor: theme.color[spec.fill].value },
        spec.bordered
          ? {
              borderWidth: spec.brutal ? brutto : hairline,
              borderColor: theme.color[
                spec.brutal ? 'border-strong' : 'border-subtle'
              ].value,
            }
          : null,
        // NB 硬偏移：右下加粗（**不是阴影**，故不违反 2.4-3）
        spec.brutal ? { borderRightWidth: brutto * 2, borderBottomWidth: brutto * 2 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={theme.color[spec.label].value}
          // 转圈是装饰，语义由 accessibilityState.busy 表达
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <Text role="label" emphasis="strong" colorToken={spec.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
