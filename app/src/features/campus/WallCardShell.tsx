/**
 * WallCardShell —— 万能墙**两种帖子共用的外层卡片**（阶段 1 收尾版）
 *
 * 结构（所有者 2026-11-02 实机验收后定稿）：
 *
 *   ┌──────────────────────────────────┐
 *   │  内容区（自由帖 / 招募帖各自独立）      │
 *   │  ♡ 12   ○ 4   ⌑              2天前 │
 *   └──────────────────────────────────┘
 *
 * 三条口径：
 *   1. **首页不再重复「匿名 · 时间」**：万能墙本身是匿名社区，作者账号仍在后端关联，
 *      只是不作为公开展示字段；这里没有头像 / 昵称 / 匿名行。
 *   2. **发布时间属于卡片元信息**，统一放底部互动栏右侧；⛔ 不画进文字海报内部，
 *      ⛔ 不做海报水印。
 *   3. 互动区默认是**静态计数**；阶段 3 起调用方传 `onLike` / `onFavorite` / `onComment`
 *      才变成可点按钮（点赞/收藏有选中态）。没有处理函数时保持纯展示，⛔ 不伪造可点。
 *
 * ⛔ 内容区由调用方给（`WallFreePostBody` / `WallRecruitPostBody`），外壳不关心内部版式，
 *    整卡颜色由调用方传入，互动区与正文共享底色。
 */

import * as React from 'react';
import { View } from 'react-native';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Heart from 'lucide-react-native/icons/heart';
import MessageCircle from 'lucide-react-native/icons/message-circle';

import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';

export type WallCardShellProps = {
  cardId: number;
  background: string;
  muted: string;
  /** 首页展示用的相对时间；空串表示未知，右侧留空 */
  timeLabel: string;
  likeCount: number;
  commentCount: number;
  /** 阶段 3 互动：不传处理函数则保持静态计数 */
  liked?: boolean;
  favorited?: boolean;
  onLike?: () => void;
  onFavorite?: () => void;
  onComment?: () => void;
  actionLabels: { like: string; comment: string; save: string };
  /** 读屏整卡摘要；给了 `onPress` 时这条摘要就是按钮标签 */
  accessibilityLabel: string;
  /** 真实投稿才可点进详情；示例帖不传，避免进入不存在的详情 */
  onPress?: () => void;
  children: React.ReactNode;
};

export function WallCardShell({
  cardId,
  background,
  muted,
  timeLabel,
  likeCount,
  commentCount,
  liked = false,
  favorited = false,
  onLike,
  onFavorite,
  onComment,
  actionLabels,
  accessibilityLabel,
  onPress,
  children,
}: WallCardShellProps): React.ReactElement {
  const theme = useTheme();

  const content = (
    <View style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
      {children}

      {/*
        * 底部元信息栏：左＝互动计数，右＝发布时间。
        * 用 flex 而不是定宽：左侧按内容不收缩，右侧允许收缩成一行，
        * 窄屏 / 大字号时两者在垂直中线上各让一步，⛔ 不重叠、⛔ 必要时互动项换行。
        */}
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: theme.space('space_3') }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_4'),
            flexShrink: 1,
            flexWrap: 'wrap',
          }}
        >
          <WallActionStat
            muted={muted}
            source={Heart}
            count={likeCount}
            label={actionLabels.like}
            testID={`wall-row-${cardId}-like`}
            onPress={onLike}
            selected={liked}
          />
          <WallActionStat
            muted={muted}
            source={MessageCircle}
            count={commentCount}
            label={actionLabels.comment}
            testID={`wall-row-${cardId}-comment`}
            onPress={onComment}
          />
          <WallActionStat
            muted={muted}
            source={Bookmark}
            label={actionLabels.save}
            testID={`wall-row-${cardId}-save`}
            onPress={onFavorite}
            selected={favorited}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }} />

        {timeLabel === '' ? null : (
          <Text
            testID={`wall-row-time-${cardId}`}
            role="caption"
            colorToken="text-muted"
            numberOfLines={1}
            style={{ flexShrink: 1, textAlign: 'right', color: muted }}
          >
            {timeLabel}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View
      testID={`wall-card-${cardId}`}
      style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_1') }}
    >
      <Surface testID={`wall-surface-${cardId}`} rounded="radius_large" style={{ backgroundColor: background }}>
        {onPress === undefined ? (
          content
        ) : (
          <Pressable
            testID={`campus-row-${cardId}`}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            contentAlign="stretch"
            // 信息流卡片不做按压变灰（2026-10-31 所有者：滑动误触会一闪一闪）；跳转保留
            feedback="none"
          >
            {content}
          </Pressable>
        )}
      </Surface>
    </View>
  );
}

/**
 * 互动计数：有 `onPress` 才是按钮并带选中态；
 * 没有处理函数时保持静态展示（读屏只播报"事实"，⛔ 不谎报可点）。
 */
function WallActionStat({
  source,
  muted,
  count,
  label,
  testID,
  onPress,
  selected,
}: {
  source: IconComponent;
  muted: string;
  count?: number;
  label: string;
  testID: string;
  onPress?: () => void;
  selected?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const content = (
    <>
      <Icon
        source={source}
        size="body"
        {...(onPress === undefined
          ? { colorOverride: muted }
          : { tint: selected ? 'brand' : 'secondary' })}
      />
      {count === undefined ? null : (
        <Text role="caption" style={{ color: selected ? theme.color['text-brand'].value : muted }}>
          {String(count)}
        </Text>
      )}
    </>
  );
  // ⛔ 不靠 minHeight 撑高：那会把卡片底部互动栏整体变高；
  //    可点范围用 hitSlop 扩展，视觉尺寸与阶段 1/2 保持一致。
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.space('space_1'),
  };

  if (onPress === undefined) {
    return (
      <View testID={testID} accessible accessibilityLabel={label} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={theme.space('space_2')}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: selected === true }}
      style={style}
    >
      {content}
    </Pressable>
  );
}
