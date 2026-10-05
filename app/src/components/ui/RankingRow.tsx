/**
 * RankingRow（K12）—— 榜单行：名次 + 主体 + 指标（组件定义 §2.3）
 *
 * 两处容易做错的地方，这里都固化下来了：
 *   1. **名次数字永远可见** —— `medal` 变体只**额外**加一块奖牌色，⛔ 不用颜色替代名次
 *      （宪法 2.1.1：状态不得仅靠色块；前三名尤其容易被做成"只有颜色"）；
 *   2. `rank` **不是数组下标** —— 接口返回的 `rank` 由后端按排序给出（`routes/canteen.js` 的
 *      `rank = index + 1`），调用方直接传，⛔ 不要在客户端重算（同分时的稳定性由后端决定）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type RankingRowVariant = 'medal' | 'plain';
export type MedalTier = 'gold' | 'silver' | 'bronze';

/** 前三名的档位（纯函数，供测试）；第 4 名及以后返回 null */
export function medalTier(rank: number): MedalTier | null {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}

/** 奖牌档位 → 色块与承载文字（都取自主令牌；⛔ 不发明金色 hex） */
const MEDAL: Record<MedalTier, { fill: DarkColorTokenName; onFill: DarkColorTokenName }> = {
  gold: { fill: 'action-accent', onFill: 'text-on-accent' },
  silver: { fill: 'bg-raised', onFill: 'text-primary' },
  bronze: { fill: 'state-warning', onFill: 'text-on-state' },
};

export type RankingRowProps = {
  /** 后端给的名次（1 起） */
  rank: number;
  title: string;
  subtitle?: string;
  /** 右侧指标（如"评分 4.8 · 32 条"） */
  metric?: string;
  leading?: React.ReactNode;
  variant?: RankingRowVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function RankingRow({
  rank,
  title,
  subtitle,
  metric,
  leading,
  variant = 'plain',
  onPress,
  style,
  testID,
}: RankingRowProps): React.ReactElement {
  const theme = useTheme();
  const tier = variant === 'medal' ? medalTier(rank) : null;
  const medal = tier ? MEDAL[tier] : null;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityLabel={
        metric
          ? `第 ${rank} 名，${title}，${metric}`
          : `第 ${rank} 名，${title}`
      }
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_3'),
          paddingHorizontal: theme.space('space_4'),
          paddingVertical: theme.space('space_2'),
        },
        style,
      ]}
    >
      {/* 名次：奖牌只加**底色**，数字始终在 */}
      <View
        style={{
          minWidth: theme.space('space_8'),
          height: theme.space('space_8'),
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius('radius_small'),
          backgroundColor: medal ? theme.color[medal.fill].value : undefined,
        }}
      >
        <Text
          role="label"
          emphasis="strong"
          colorToken={medal ? medal.onFill : 'text-muted'}
          align="center"
        >
          {String(rank)}
        </Text>
      </View>

      {leading}
      <View style={{ flex: 1, gap: theme.space('space_1') }}>
        <Text role="body" colorToken="text-primary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text role="caption" colorToken="text-secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {metric ? (
        <Text role="label" colorToken="text-secondary" numberOfLines={1}>
          {metric}
        </Text>
      ) : null}
    </Pressable>
  );
}
