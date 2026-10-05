/**
 * StarRating（D10）—— 线性评分展示/输入（组件定义 §2.6）
 *
 * 用途：**课评**的"评分 + 难度"两组（各 1–5）、菜品评分展示。
 * ⛔ **不得用来代替 `D11 RatingScale`**：食堂 5 档是非线性权重（10/7/4/1/−1），
 *   用等距星表达会毁掉榜单的排序口径（见 `RatingScale.tsx` 的说明）。
 *
 * `groups` 形态是为了课评：`rating`（评分）与 `difficulty`（难度）**方向相反**
 *   （评分越高越好、难度越高越难），所以两组**各自有标签**，⛔ 不共用一句话。
 *
 * a11y：`adjustable` + `value`（`min`/`max` 固定 1–5），值变化必须可播报（§7.3）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Star from 'lucide-react-native/icons/star';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export const STAR_MIN = 1;
export const STAR_MAX = 5;

/** 夹到 1–5 的整数；非数字 → `null`（⛔ 不把"没评"变成 0 分） */
export function clampStars(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < STAR_MIN) return STAR_MIN;
  if (rounded > STAR_MAX) return STAR_MAX;
  return rounded;
}

export type StarRatingGroup = {
  key: string;
  label: string;
  value: number | null;
  onChange?: (next: number) => void;
};

export type StarRatingProps = {
  /** 单组用法 */
  value?: number | null;
  onChange?: (next: number) => void;
  label?: string;
  /** 多组用法（课评：评分 + 难度）；给了它就用它，忽略上面的单组 props */
  groups?: readonly StarRatingGroup[];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function StarRating({
  value = null,
  onChange,
  label,
  groups,
  disabled = false,
  style,
  testID,
}: StarRatingProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const list: readonly StarRatingGroup[] =
    groups ?? [{ key: 'single', label: label ?? '', value, onChange }];

  return (
    <View style={[{ gap: theme.space('space_2') }, style]} testID={testID}>
      {list.map((group) => {
        const filled = clampStars(group.value) ?? 0;
        const interactive = group.onChange !== undefined && !disabled;
        return (
          <View
            key={group.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}
          >
            {group.label ? (
              <Text role="label" colorToken="text-secondary" numberOfLines={1}>
                {group.label}
              </Text>
            ) : null}
            <View
              style={{ flexDirection: 'row', gap: theme.space('space_1') }}
              // ⚠️ `accessible` 必须显式给：RN 的 `View` 默认不是无障碍元素，
              //    不给的话 `accessibilityRole/Label/Value` 都不会被暴露（读屏与 `getByRole` 都看不到）
              accessible
              accessibilityRole="adjustable"
              // 值变化必须播报：把"几分/共几分"写进 label（§7.3）
              // ⚠️ 组合标签走词条：⛔ 不在代码里拼中文（英文界面会串语言）
              accessibilityLabel={
                group.label
                  ? t('a11y.starRating', { label: group.label, filled, max: STAR_MAX })
                  : t('a11y.starRatingBare', { filled })
              }
              accessibilityValue={{ min: STAR_MIN, max: STAR_MAX, now: filled }}
            >
              {Array.from({ length: STAR_MAX }, (_, index) => {
                const starValue = index + 1;
                const isOn = starValue <= filled;
                return (
                  <Pressable
                    key={`${group.key}-star-${starValue}`}
                    onPress={interactive ? () => group.onChange?.(starValue) : undefined}
                    disabled={!interactive}
                    accessibilityLabel={`${starValue}`}
                    accessibilityState={{ selected: isOn, disabled: !interactive }}
                    style={{
                      minWidth: theme.space('space_6'),
                      minHeight: theme.touchTarget,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* 实心/空心用**两层图标语义**表达（⛔ 不只靠颜色深浅）：
                        已选 → 实心（onFill 色）；未选 → 描边（secondary 色） */}
                    <Icon
                      source={Star}
                      size="body"
                      tint={isOn ? 'warning' : 'disabled'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
