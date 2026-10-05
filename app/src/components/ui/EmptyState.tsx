/**
 * EmptyState（T01）—— 空态，**分三类**（组件定义 §2.4；宪法 10.2）
 *
 * 三类不是装饰性区分，而是**用户处境不同、下一步不同**：
 *   - `firstRun`：从没有过内容 → 引导**首次动作**（"发布第一条"）
 *   - `noResult`：有内容但筛选/搜索没命中 → 提供**放宽条件**（"清除筛选"）
 *   - `broken`：本该有但坏了 → 提供**修复入口**（"重新加载"）
 *
 * ⛔ **只给一个动作**（宪法 10.4：一个错误/空态只给一个主行动）。
 *    因此 `actionLabel` / `onAction` 是**单个**，不是数组 —— 想给两个动作就得改这里的类型，
 *    那正是我们希望被拦住的地方。
 * ⛔ 组件内**不写任何文案**：标题与动作都由页面用词条传入（i18n 的唯一出处是页面/词条表）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import PackageOpen from 'lucide-react-native/icons/package-open';
import SearchX from 'lucide-react-native/icons/search-x';
import CircleAlert from 'lucide-react-native/icons/circle-alert';

import { useTheme } from '@/design-system/theme';
import { Button } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

export type EmptyKind = 'firstRun' | 'noResult' | 'broken';

/** 三类空态各自的图标（第 1 层；语义不同 → 图标不同，⛔ 不用同一个图标糊过去） */
export const EMPTY_ICON: Record<EmptyKind, IconComponent> = {
  firstRun: PackageOpen,
  noResult: SearchX,
  broken: CircleAlert,
};

export type EmptyStateProps = {
  kind: EmptyKind;
  /** 一句话说明（≤12 汉字，§3.6） */
  title: string;
  /** 可选补充（≤30 汉字）；⛔ 不写说明性旁白 */
  description?: string;
  /** 唯一的动作（动词开头，≤6 汉字） */
  actionLabel: string;
  onAction: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function EmptyState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space('space_3'),
          padding: theme.space('space_6'),
        },
        style,
      ]}
    >
      {/* 空态图标：装饰性（语义由 title 表达）→ 不进无障碍树 */}
      <Icon source={EMPTY_ICON[kind]} size="hero" tint="secondary" />
      <Text role="headline" emphasis="strong" colorToken="text-primary" align="center">
        {title}
      </Text>
      {description ? (
        <Text role="body" colorToken="text-secondary" align="center">
          {description}
        </Text>
      ) : null}
      <Button label={actionLabel} variant="primary" onPress={onAction} />
    </View>
  );
}
