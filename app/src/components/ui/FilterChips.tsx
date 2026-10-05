/**
 * 筛选 Chips —— **与顶部 Tab 条是两个组件**（宪法 4.8.1-R4 的正面落地）。
 *
 * 判据（R4）：导航用 Tab 条（**有指示器**、有位置播报、单选）；筛选用 Chips
 * （**可多选、可清除**、无指示器）。⛔ 两者不得互相冒充。
 * 最易出错的地方是二手页：它同时有子栏目与分类筛选。
 *
 * 无障碍（7.2 / 16.2-4）：每个 Chip 有可读标签；
 * 角色是 `button` + `selected` 状态（⛔ **不是** `tab` —— 那会让读屏误以为是导航）。
 */

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';

export type FilterChipOption = {
  key: string;
  labelKey: MessageKey;
};

export type FilterChipsProps = {
  options: readonly FilterChipOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** 有选中项时才显示"清除"（10.5：动作类文字，≤6 汉字） */
  onClear?: () => void;
  testID?: string;
};

export function FilterChips({
  options,
  selected,
  onToggle,
  onClear,
  testID,
}: FilterChipsProps): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();

  if (options.length === 0) return null;

  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.space('space_4') }}>
        {options.map((option) => {
          const isSelected = selected.includes(option.key);
          return (
            <Pressable
              key={option.key}
              testID={`filter-chip-${option.key}`}
              onPress={() => onToggle(option.key)}
              // R4：角色是 button + selected；⛔ 不是 tab，也**没有指示器**
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(option.labelKey)}
              style={{
                minHeight: theme.touchTarget,
                justifyContent: 'center',
                marginRight: theme.space('space_2'),
                paddingHorizontal: theme.space('space_3'),
                borderRadius: theme.radius('radius_full'),
                borderWidth: theme.borderWidth('border_width_hairline'),
                borderColor: isSelected
                  ? theme.color['border-brand'].value
                  : theme.color['border-default'].value,
                backgroundColor: isSelected
                  ? theme.color['bg-brand-soft'].value
                  : theme.color['bg-surface'].value,
              }}
            >
              <Text
                role="label"
                emphasis={isSelected ? 'strong' : 'regular'}
                colorToken={isSelected ? 'text-brand' : 'text-secondary'}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected.length > 0 && onClear ? (
        <Pressable
          testID="filter-chips-clear"
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={t('action.clear')}
          style={{
            minHeight: theme.touchTarget,
            justifyContent: 'center',
            paddingHorizontal: theme.space('space_3'),
          }}
        >
          <Text role="label" colorToken="text-brand">
            {t('action.clear')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
