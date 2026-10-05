/**
 * Select（C07）—— 互斥单选、**>7 项**（组件定义 §2.2 / §3.1）
 *
 * ⚠️ **选型边界（§3.1，review 直接判负的反例）**：
 *   · 2–5 项互斥 → 用 `C14 SegmentedControl`（⛔ 不要藏进 Select，多一次点击）；
 *   · 6–7 项互斥且在表单内 → 用 `C10 Checkbox` group（⛔ 不要复活已删除的 `C13/C11 RadioGroup`）；
 *   · **>7 项** → 才是本组件。
 *
 * ⚠️ **presentation 的现状（如实标注）**：§3.1 规定 `C07` 的平台形态是
 *    **`O07 PickerSheet`（底部列表/滚轮）**，而 `O07` **尚未落地**（不在 P1-07 的 O 层批次里）。
 *    因此本版实现的是**就地展开的选项列表**（accordion），⛔ **不是自绘下拉浮层**
 *    （§3.1 明令禁止浮层形态）。等 `O07` 落地后只换内部呈现，**调用点形状不变**。
 *
 * a11y（§7.3）：`role=combobox`，必须暴露 `expanded` 与 `selected`，
 * 且**"当前选中：X"必须可播报** —— 所以就是把选中项写进 `accessibilityLabel`。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { SearchField } from './SearchField';
import { Text } from './Text';

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  label: string;
  options: readonly SelectOption[];
  value: string | null;
  onChange?: (next: string) => void;
  /**
   * 展开态。**受控/非受控两用**（都不传 = 非受控，内部自己管）：
   * 表单 DSL（`K01 Form`）与筛选面板需要从外部控制展开，故这里必须留这个口。
   */
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  /** >15 项时打开就地搜索（§3.1） */
  withSearch?: boolean;
  placeholder?: string;
  errorText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 当前选中项的可播报文案（纯函数，供测试） */
export function selectedAnnouncement(
  label: string,
  options: readonly SelectOption[],
  value: string | null,
  placeholder: string
): string {
  const found = options.find((option) => option.value === value);
  return `${label}：${found ? found.label : placeholder}`;
}

/** 就地过滤（`withSearch` 用；纯函数，供测试） */
export function filterOptions(
  options: readonly SelectOption[],
  keyword: string
): readonly SelectOption[] {
  const q = keyword.trim().toLowerCase();
  if (q === '') return options;
  return options.filter((option) => option.label.toLowerCase().includes(q));
}

export function Select({
  label,
  options,
  value,
  onChange,
  open,
  onOpenChange,
  withSearch = false,
  placeholder = '请选择',
  errorText,
  disabled = false,
  style,
  testID,
}: SelectProps): React.ReactElement {
  const theme = useTheme();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState('');
  // 受控优先；非受控时用内部状态
  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean): void => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const visible = filterOptions(options, keyword);

  return (
    <View style={[{ gap: theme.space('space_1') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {label}
      </Text>
      <Pressable
        testID={testID}
        onPress={disabled ? undefined : () => setOpen(!isOpen)}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityLabel={
          hasError
            ? `${selectedAnnouncement(label, options, value, placeholder)}，${errorText}`
            : selectedAnnouncement(label, options, value, placeholder)
        }
        accessibilityState={{ expanded: isOpen, disabled }}
        style={{
          minHeight: theme.touchTarget,
          paddingHorizontal: theme.space('space_3'),
          borderRadius: theme.radius('radius_medium'),
          borderWidth: theme.borderWidth('border_width_hairline'),
          borderColor: theme.color[hasError ? 'state-danger' : 'border-subtle'].value,
          backgroundColor: theme.color['bg-sunken'].value,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text role="body" colorToken={value === null ? 'text-muted' : 'text-primary'} numberOfLines={1}>
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </Text>
        {/* 展开指示用**第 1 层图标**（⛔ 不用 ▾ / ▴ 这类文本字符：
            字符既不是我们的图标体系，也会撞上 R5 的"下拉式溢出"源码扫描） */}
        <Icon source={isOpen ? ChevronUp : ChevronDown} size="body" tint="secondary" />
      </Pressable>

      {isOpen && !disabled ? (
        <View
          style={{
            borderRadius: theme.radius('radius_medium'),
            borderWidth: theme.borderWidth('border_width_hairline'),
            borderColor: theme.color['border-subtle'].value,
            backgroundColor: theme.color['bg-surface'].value,
            overflow: 'hidden',
          }}
        >
          {withSearch ? (
            <View style={{ padding: theme.space('space_2') }}>
              <SearchField
                value={keyword}
                onChangeText={setKeyword}
                placeholder="搜索"
                testID={testID ? `${testID}-search` : undefined}
              />
            </View>
          ) : null}
          {visible.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange?.(option.value);
                  setOpen(false);
                  setKeyword('');
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                style={{
                  minHeight: theme.touchTarget,
                  paddingHorizontal: theme.space('space_3'),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text role="body" colorToken={isSelected ? 'text-brand' : 'text-primary'}>
                  {option.label}
                </Text>
                {/* 选中态**不得只靠颜色**：同时给一个图标 */}
                {isSelected ? <Icon source={Check} size="body" tint="brand" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
