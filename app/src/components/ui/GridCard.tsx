/**
 * GridCard（K23）—— **网格卡片**（双列瀑布流用；2026-10-18 所有者裁决新增）
 *
 * 与 `K17 EntityCard` 的分工（⛔ 不是互为壳子，两者都是"卡片"这一种组件的**版式**）：
 *   · `EntityCard` = **整行卡**：图在上、多行文字、作者/描述/指标纵向排开（详情型列表）；
 *   · `GridCard`   = **半屏卡**：图在上、标题最多两行、底部一行「左元信息 + 右主信息」。
 * 为什么必须分开：二手列表要"一页 6–8 个商品"，整行卡 16:9 大图 + 描述 + 卖家会撑到 300dp/张，
 * ⛔ 把 `EntityCard` 压小会让其他域的整行卡跟着变形（宪法 9.14 一改全改，但不能改出别的域的事故）。
 *
 * 四条纪律：
 * - 视觉取值只来自令牌；⛔ 不写裸色值 / 裸字号；
 * - **主信息（价格）固定右下角**：所有者 2026-10-18「价格可以放在右下角」；
 * - 标题给 `numberOfLines={2}` + **两行最小高度**：网格里每张卡等高，FlashList 多列才不参差；
 * - 整卡一条无障碍语义（§7.3）：读屏只念一次「标题，元信息，主信息」，卡内文字不各念一遍。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/design-system/theme';
import { textStyleForRole } from '@/design-system/typography';
import { Pressable } from './Pressable';
import { Surface } from './Surface';
import { Text } from './Text';

export type GridCardProps = {
  title: string;
  /** 主图；无图时保留同尺寸空位（网格不能因为缺图塌一行） */
  mediaUri?: string | null;
  /** 图片画幅（宽/高）；默认 4:3 —— 半屏宽下约 128dp 高，一屏能放下 3 排 */
  mediaAspect?: number;
  /** 压在图片左上角的角标（如「已售」）；不传就不渲染 */
  badge?: React.ReactNode;
  /** 底部左：分类等元信息（弱化） */
  meta?: string;
  /** 底部右：主信息（价格），**固定右下角** */
  highlight?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function GridCard({
  title,
  mediaUri,
  mediaAspect = 4 / 3,
  badge,
  meta,
  highlight,
  onPress,
  style,
  testID,
}: GridCardProps): React.ReactElement {
  const theme = useTheme();
  const hasMedia = typeof mediaUri === 'string' && mediaUri.length > 0;
  // 标题固定两行高度：只有一行时也留出第二行的位置，否则同一行的两张卡会一高一低
  const titleLineHeight = textStyleForRole('body').lineHeight;

  return (
    <Surface
      rounded="radius_medium"
      bordered="subtle"
      // 图片要贴着圆角裁切；Surface 默认不裁切子元素
      style={[{ overflow: 'hidden' }, style]}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        contentAlign="stretch"
        // §7.3：整卡可点时卡片语义必须是一条
        accessibilityLabel={[title, meta, highlight].filter(Boolean).join('，')}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: mediaAspect,
            backgroundColor: theme.color['bg-sunken'].value,
          }}
        >
          {hasMedia ? (
            <Image
              source={{ uri: mediaUri }}
              contentFit="cover"
              accessible={false}
              transition={0}
              style={{ width: '100%', height: '100%' }}
            />
          ) : null}
          {badge ? (
            <View
              style={{
                position: 'absolute',
                top: theme.space('space_2'),
                left: theme.space('space_2'),
              }}
            >
              {badge}
            </View>
          ) : null}
        </View>

        <View style={{ padding: theme.space('space_3'), gap: theme.space('space_1') }}>
          <Text
            role="body"
            emphasis="strong"
            colorToken="text-primary"
            numberOfLines={2}
            style={{ minHeight: titleLineHeight * 2 }}
          >
            {title}
          </Text>
          {/* 价格/重点在上、分类在下：原先同一行并排，分类被价格挤成「El…」 */}
          {highlight ? (
            <Text role="label" emphasis="strong" colorToken="text-brand" numberOfLines={1}>
              {highlight}
            </Text>
          ) : null}
          {meta ? (
            <Text role="caption" colorToken="text-muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Surface>
  );
}
