/**
 * RatingScale（D11）—— 食堂 **5 档非线性**评级（组件定义 §2.6）
 *
 * ⛔ **不得被 `D10 StarRating` 代替**：那 5 档的**语义与权重都不是线性的**
 *   （`夯爆了/顶级/人上人/NPC/拉完了` → 权重 **10 / 7 / 4 / 1 / −1**）。
 *   用 1–5 星表达会把它压成等距刻度，直接毁掉排序口径 —— 而榜单正是靠这个权重算的。
 *
 * 权重来源于 §3.1 的**已核对枚举表**（"来自 5 份端点清单，不得凭记忆改写"）。
 * 标签走词条表（`canteen.rating.*`），⛔ 组件里不写死中文。
 *
 * a11y（§7.3 `C18`/`C19` 同族的"值变化必须播报"）：用 `adjustable` 角色 + `value`，
 * 并暴露 `min`/`max`（这里是**权重**的上下界，不是下标）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/zh';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type RatingTierKey = 'hot' | 'top' | 'above' | 'npc' | 'dead';

export type RatingTier = {
  key: RatingTierKey;
  /** **后端权重**（`routes/canteen.js` 的排序口径）—— 不是序号 */
  weight: number;
  labelKey: MessageKey;
  fill: DarkColorTokenName;
  onFill: DarkColorTokenName;
};

/**
 * 5 档（**顺序即展示顺序**：从最好到最差）。
 * 颜色只用令牌，且每一档**同时有文字** —— ⛔ 状态不得仅靠色块（宪法 2.1.1）。
 */
export const RATING_TIERS: readonly RatingTier[] = [
  { key: 'hot', weight: 10, labelKey: 'canteen.rating.hot', fill: 'action-accent', onFill: 'text-on-accent' },
  { key: 'top', weight: 7, labelKey: 'canteen.rating.top', fill: 'action-primary', onFill: 'text-on-fill' },
  { key: 'above', weight: 4, labelKey: 'canteen.rating.above', fill: 'bg-raised', onFill: 'text-primary' },
  { key: 'npc', weight: 1, labelKey: 'canteen.rating.npc', fill: 'bg-sunken', onFill: 'text-secondary' },
  { key: 'dead', weight: -1, labelKey: 'canteen.rating.dead', fill: 'state-danger', onFill: 'text-on-state' },
];

/** 权重 → 档位（纯函数；⛔ 不是 `weight/2` 这种线性换算） */
export function ratingTierForWeight(weight: number): RatingTier | undefined {
  return RATING_TIERS.find((tier) => tier.weight === weight);
}

/** 档位键 → 权重（纯函数） */
export function ratingWeightFor(key: RatingTierKey): number | undefined {
  return RATING_TIERS.find((tier) => tier.key === key)?.weight;
}

export type RatingScaleProps = {
  /** 当前选中的档位键（`undefined` = 未评） */
  value?: RatingTierKey | null;
  /** 传了就是**可写**（S-11 点评）；不传是**只读展示**（S-10 榜单） */
  onChange?: (key: RatingTierKey) => void;
  /** 只读时是否显示文字（紧凑场景可只留色块 + 权重，但**权重数字必须在**） */
  showLabels?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function RatingScale({
  value = null,
  onChange,
  showLabels = true,
  disabled = false,
  style,
  testID,
}: RatingScaleProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const readOnly = onChange === undefined;
  const current = value === null ? undefined : RATING_TIERS.find((tier) => tier.key === value);

  return (
    <View
      testID={testID}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }, style]}
    >
      {RATING_TIERS.map((tier) => {
        const isSelected = tier.key === value;
        const label = t(tier.labelKey);
        return (
          <Pressable
            key={tier.key}
            testID={testID ? `${testID}-${tier.key}` : undefined}
            onPress={readOnly || disabled ? undefined : () => onChange?.(tier.key)}
            disabled={readOnly || disabled}
            accessibilityRole={readOnly ? 'text' : 'radio'}
            // 档位名 + 权重都要能播报（权重是排序口径，读屏用户也要能理解）
            // ⚠️ 组合标签走词条：⛔ 不在代码里拼中文（英文界面会串语言）
            accessibilityLabel={t('a11y.ratingTier', { label, weight: tier.weight })}
            accessibilityState={{ checked: isSelected, disabled: disabled || readOnly }}
            style={{
              paddingHorizontal: theme.space('space_3'),
              paddingVertical: theme.space('space_2'),
              borderRadius: theme.radius('radius_full'),
              backgroundColor: isSelected
                ? theme.color[tier.fill].value
                : theme.color['bg-sunken'].value,
              borderWidth: isSelected
                ? theme.borderWidth('border_width_brutal')
                : theme.borderWidth('border_width_hairline'),
              borderColor: theme.color['border-subtle'].value,
            }}
          >
            <Text
              role="label"
              emphasis={isSelected ? 'strong' : 'regular'}
              colorToken={isSelected ? tier.onFill : 'text-secondary'}
            >
              {showLabels ? label : String(tier.weight)}
            </Text>
          </Pressable>
        );
      })}
      {/* 只读且未评：**不能什么都不显示**（否则页面会看起来像坏了） */}
      {readOnly && current === undefined ? (
        <Text role="caption" colorToken="text-muted">
          —
        </Text>
      ) : null}
    </View>
  );
}
