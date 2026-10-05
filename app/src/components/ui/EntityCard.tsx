/**
 * EntityCard（K17）—— **域卡片的唯一实现**（组件定义 §2.3）
 *
 * 这条设计是"组件库必须被消费"的关键：Web 侧同一个原型在不同域被**重复手写**
 * （`SquareCampusFeed` / `ConfessionWall` / `ClubPostDetail` 各写一套卡），
 * App 侧**一个 `EntityCard` + 域变体**，⛔ **不允许为某个域另写卡片**。
 *
 * 内测需要 5 个域变体：`post` · `food` · `review` · `listing` · `errand`
 * （其余 8 个变体等各自的消费者出现再加，⛔ 不预先铺开）。
 *
 * ⚠️ **null 是常态，不是异常**（接口调研 G17：`price`/`comprehensive_score`/`review_count`
 *    后端都可能返回 `null`）→ 一律走"暂无…"文案，⛔ **不得当成 0**
 *    （把"没有评分"显示成"0 分"是数据事故，不是显示瑕疵）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';
import { Surface } from './Surface';
import { Text } from './Text';

export type EntityCardDomain = 'post' | 'food' | 'review' | 'listing' | 'errand';

/** `price` / `reward` 为 null 时**不下结论** */
export function formatNullablePrice(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '暂无价格';
  return `¥${value}`;
}

/** 评分：null 走"暂无评分"，⛔ 不是 0 分 */
export function formatNullableScore(
  score: number | null | undefined,
  reviewCount?: number | null
): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return '暂无评分';
  const count =
    typeof reviewCount === 'number' && Number.isFinite(reviewCount) ? `（${reviewCount}）` : '';
  return `${score.toFixed(1)}${count}`;
}

/** 二手 / 跑腿的状态文案（⛔ ≤6 汉字，§3.6） */
export const ENTITY_STATUS_LABEL: Record<string, string> = {
  on_sale: '在售',
  sold: '已售',
  open: '待接',
  taken: '已接',
  done: '已完成',
};

export type EntityCardProps = {
  domain: EntityCardDomain;
  title: string;
  subtitle?: string;
  /** 主图（菜品 / 二手 / 帖子）；无图则整块不渲染 */
  mediaUri?: string | null;
  /** 角标区（如 `A08 Badge`） */
  badges?: React.ReactNode;
  /** 域指标数据（按 `domain` 决定用哪几个） */
  price?: number | null;
  reward?: number | null;
  score?: number | null;
  reviewCount?: number | null;
  status?: string;
  /** 点评作者：后端对普通用户点评**强制匿名**（调研 G18），因此有值才显示 */
  authorLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 该域要显示的指标串（**唯一的 null 处理点**，纯函数、可测） */
export function entityMetrics(props: Pick<
  EntityCardProps,
  'domain' | 'price' | 'reward' | 'score' | 'reviewCount' | 'status'
>): readonly string[] {
  const { domain, price, reward, score, reviewCount, status } = props;
  const statusLabel = status ? (ENTITY_STATUS_LABEL[status] ?? status) : null;

  switch (domain) {
    case 'food':
      return [formatNullablePrice(price), formatNullableScore(score, reviewCount)];
    case 'listing':
      return [formatNullablePrice(price), statusLabel].filter((v): v is string => v !== null);
    case 'errand':
      return [formatNullablePrice(reward), statusLabel].filter((v): v is string => v !== null);
    case 'review':
      return [formatNullableScore(score, reviewCount)];
    case 'post':
    default:
      return statusLabel ? [statusLabel] : [];
  }
}

export function EntityCard({
  domain,
  title,
  subtitle,
  mediaUri,
  badges,
  price,
  reward,
  score,
  reviewCount,
  status,
  authorLabel,
  onPress,
  style,
  testID,
}: EntityCardProps): React.ReactElement {
  const theme = useTheme();
  const hasMedia = typeof mediaUri === 'string' && mediaUri.length > 0;
  const metrics = entityMetrics({ domain, price, reward, score, reviewCount, status });

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      // §7.3：整卡可点时**卡片语义必须是一条**，不能把卡内每个元素都读出来
      accessibilityLabel={[title, subtitle, ...metrics].filter(Boolean).join('，')}
      style={style}
    >
      <Surface rounded="radius_medium" bordered="subtle">
        {hasMedia ? (
          <Image
            source={{ uri: mediaUri }}
            contentFit="cover"
            // 用**比例**而不是像素高度：令牌源里没有"卡片媒体高度"这个档位，
            // 而比例是无量纲的，不会变成"屏内魔法数字"（宪法 2.4 管的是尺寸/间距）。
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            accessible={false}
            transition={0}
          />
        ) : null}
        <View style={{ padding: theme.space('space_3'), gap: theme.space('space_1') }}>
          {badges ? (
            <View style={{ flexDirection: 'row', gap: theme.space('space_1') }}>{badges}</View>
          ) : null}
          <Text role="body" emphasis="strong" colorToken="text-primary" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text role="caption" colorToken="text-secondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {authorLabel ? (
            <Text role="caption" colorToken="text-muted" numberOfLines={1}>
              {authorLabel}
            </Text>
          ) : null}
          {metrics.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.space('space_2'),
                marginTop: theme.space('space_1'),
              }}
            >
              {metrics.map((metric, index) => (
                // 指标串可能重复（如两条都是"暂无价格"）→ key 里带上位置
                <Text key={`metric-${index}`} role="caption" colorToken="text-secondary">
                  {metric}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  );
}
