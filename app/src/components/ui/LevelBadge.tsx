/**
 * LevelBadge（`K15`）—— 等级徽章（6 级；组件定义 §2.3）
 *
 * ⛔ **不渲染后端的 `badgeEmoji`**：那是 Emoji，宪法明令 Emoji 不得当图标（两层图标体系，
 *    第 1 层 Lucide / 第 2 层平台图标）。等级由**数字 + 词条名 + 一个 Lucide 图标**表达。
 *    ⚠️ 后端 `/api/users/me` 里确实有 `badgeEmoji`（`routes/users.js:162` 起的 `formatAuthorLevel`）——
 *    它**只作数据存在**，⛔ 不进界面。
 *
 * ⛔ 组件内 0 文案：等级名由页面给词条（6 级名在词条表里，不在组件里）。
 * ⛔ 视觉只来自令牌。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Award from 'lucide-react-native/icons/award';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** 6 级（`constants/levelThresholds.js:2-11` 的 BADGES 有 6 档） */
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 6;

/** 等级夹紧：越界/非数一律回到 1..6（⛔ 不显示 Lv0 / Lv7 / NaN） */
export function clampLevel(level: unknown): number {
  const value = Number(level);
  if (!Number.isFinite(value)) return LEVEL_MIN;
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.floor(value)));
}

export type LevelBadgeVariant = 'icon' | 'iconWithName';

export type LevelBadgeProps = {
  level: number;
  /** 等级名（页面给词条）；`icon` 形态下不显示 */
  name?: string;
  variant?: LevelBadgeVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function LevelBadge({
  level,
  name,
  variant = 'icon',
  style,
  testID,
}: LevelBadgeProps): React.ReactElement {
  const theme = useTheme();
  const shown = clampLevel(level);

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_1'),
          paddingHorizontal: theme.space('space_2'),
          paddingVertical: theme.space('space_1'),
          borderRadius: theme.radius('radius_full'),
          backgroundColor: theme.color['bg-sunken'].value,
        },
        style,
      ]}
    >
      {/* 装饰性图标：语义由旁边的数字与名字承担（⛔ 图标不承担唯一语义） */}
      <Icon source={Award} size="inline" tint="brand" />
      <Text
        role="label"
        emphasis="strong"
        colorToken="text-primary"
        testID={testID ? `${testID}-level` : undefined}
      >
        {String(shown)}
      </Text>
      {variant === 'iconWithName' && name ? (
        <Text
          role="label"
          colorToken="text-secondary"
          testID={testID ? `${testID}-name` : undefined}
        >
          {name}
        </Text>
      ) : null}
    </View>
  );
}
