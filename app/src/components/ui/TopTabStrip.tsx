/**
 * 顶部 Tab 条 —— **二级导航的唯一形态**（宪法 4.8）。
 *
 * ⛔ 本条的核心禁令：**不得**用"宫格入口页 + push 子页面"作为子栏目的主要导航形态。
 *    所以子栏目的切换入口**只能是本组件**；一级格的"首屏摘要"允许存在（4.8-3），
 *    但不得承担导航。
 *
 * 六条硬规则的落点：
 *   R1 一律用本组件（同一级 Tab 内不得混用两套子栏目导航）
 *   R2 状态保持 → 由 `SecondaryTabStore` 负责（本组件**无状态**，只报选中键）
 *   R3 一级格保留自己的二级选中项 → 调用方用 `(一级格, 二级格)` 做键
 *   R4 与本组件并列的 `FilterChips` 是**另一个组件**（有指示器的是导航，可多选的是筛选）
 *   R5 溢出**横向可滚**，⛔ 无下拉菜单（`assertNoOverflowMenu` 会让它显式失败）
 *   R6 默认内容区不做横滑。**唯一例外**：所有者 2026-10-18 裁决「我的」四个内容 Tab
 *     提升到一级页后**要**横滑（C-05 + R-M4）→ 由 `MeScreen` 用 `PagerView` 承担，
 *     其余各处仍为 0（机器守卫 `p0-06` 会强制）。本组件只管 Tab 条，横滑由调用方各自负责
 */

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { assertNoOverflowMenu, resolveTransitionDuration } from '@/features/navigation/secondaryTabs';
import type { SecondaryTabDefinition, SecondaryTabKey } from '@/features/navigation/secondaryTabs';

export type TopTabStripProps = {
  tabs: readonly SecondaryTabDefinition[];
  selectedKey: SecondaryTabKey;
  onSelect: (key: SecondaryTabKey) => void;
  testID?: string;
};

export function TopTabStrip({
  tabs,
  selectedKey,
  onSelect,
  testID,
}: TopTabStripProps): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();
  const scrollRef = React.useRef<ScrollView>(null);
  const offsets = React.useRef<Record<string, number>>({});

  // R5：本组件**没有**溢出菜单这条路（有就抛）
  assertNoOverflowMenu(false);

  const duration = resolveTransitionDuration(theme.reduceMotion, theme.motionDuration('motion_duration_base'));

  // 无障碍（4.8.2）：横向滚动后**选中项必须自动滚入可见区**
  React.useEffect(() => {
    const x = offsets.current[selectedKey];
    if (typeof x !== 'number') return;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - theme.space('space_4')), animated: duration > 0 });
  }, [selectedKey, duration, theme]);

  if (tabs.length === 0) {
    // 没有子栏目就**不占位**（骨架规范 §2.1：不显示空条）
    return null;
  }

  return (
    <View
      testID={testID}
      // 4.8.2 / 4.5：Tab 条必须暴露 tablist 语义；本身不得低于 48dp
      accessibilityRole="tablist"
      style={{
        minHeight: theme.touchTarget,
        borderBottomWidth: theme.borderWidth('border_width_hairline'),
        borderBottomColor: theme.color['border-subtle'].value,
        backgroundColor: theme.color['bg-canvas'].value,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.space('space_2') }}
      >
        {tabs.filter((tab, i, all) => all.findIndex((x) => x.key === tab.key) === i).map((tab, index) => {
          const selected = tab.key === selectedKey;
          const label = tab.labelKey === undefined ? tab.label : t(tab.labelKey);
          return (
            <Pressable
              key={tab.key}
              testID={`top-tab-${tab.key}`}
              onLayout={(event) => {
                const x = event.nativeEvent.layout.x;
                offsets.current[tab.key] = x;
                // 初始深链接或字号/屏宽变化时，effect 可能早于布局测量。
                if (selected) scrollRef.current?.scrollTo({ x: Math.max(0, x - theme.space('space_4')), animated: false });
              }}
              onPress={() => onSelect(tab.key)}
              // 导航 Tab 的角色是 tab（⛔ 不是 button —— 那是筛选 Chips 的角色，R4）
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              // 读屏要播报**位置**，不得只念标签（4.8.2）
              accessibilityLabel={`${label} · ${t('a11y.tabPosition', {
                i: index + 1,
                n: tabs.length,
              })}`}
              style={{
                minHeight: theme.touchTarget,
                justifyContent: 'center',
                paddingHorizontal: theme.space('space_3'),
              }}
            >
              <Text
                role="label"
                emphasis={selected ? 'strong' : 'regular'}
                colorToken={selected ? 'text-brand' : 'text-secondary'}
              >
                {label}
              </Text>
              {/* 指示器：表达"当前在哪"。取值未冻结（宪法 15.4），此处用品牌色令牌 */}
              <View
                style={{
                  height: theme.borderWidth('border_width_brutal'),
                  marginTop: theme.space('space_1'),
                  borderRadius: theme.radius('radius_full'),
                  backgroundColor: selected
                    ? theme.color['border-brand'].value
                    : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
