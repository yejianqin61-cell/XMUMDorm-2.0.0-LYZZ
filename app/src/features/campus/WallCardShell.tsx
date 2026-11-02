/**
 * WallCardShell —— 万能墙**两种帖子共用的外层卡片**
 *
 * 阶段 1 的边界（所有者 2026-11-02）：
 *   · 外壳统一：圆角、间距、底色、匿名标识、发布时间、轻量类型标签、公共操作区；
 *   · ⛔ 不使用头像 / 昵称 / 随机头像：万能墙公开内容默认匿名，
 *     后端仍关联真实账号，但这里**只渲染匿名投影**；
 *   · 操作区是**静态展示**（点赞 / 评论 / 收藏计数与图标），
 *     阶段 1 不实现互动，⛔ 不把图标做成看起来可点的按钮；
 *   · 内部内容由调用方给（`WallFreePostBody` / `WallRecruitPostBody`），
 *     阶段 2 / 5 可以分别替换而**不动外壳**。
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
  anonymousLabel: string;
  /** 相对时间（`formatPostTime` 的结果）；空串表示未知，只显示匿名 */
  timeLabel: string;
  /** 轻量类型标签（目前只有招募帖给） */
  typeLabel?: string;
  /** 示例内容标签（阶段 1 静态样板必须标注） */
  sampleLabel?: string;
  likeCount: number;
  commentCount: number;
  actionLabels: { like: string; comment: string; save: string };
  /** 读屏整卡摘要；给了 `onPress` 时这条摘要就是按钮标签 */
  accessibilityLabel: string;
  /** 真实投稿才可点进详情；示例帖不传，避免进入不存在的详情 */
  onPress?: () => void;
  children: React.ReactNode;
};

export function WallCardShell({
  cardId,
  anonymousLabel,
  timeLabel,
  typeLabel,
  sampleLabel,
  likeCount,
  commentCount,
  actionLabels,
  accessibilityLabel,
  onPress,
  children,
}: WallCardShellProps): React.ReactElement {
  const theme = useTheme();

  const content = (
    <View style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          // 大字号下「匿名 · 时间」与右侧标签允许换行，⛔ 不靠缩字号或截断硬塞一行
          flexWrap: 'wrap',
          columnGap: theme.space('space_2'),
          rowGap: theme.space('space_1'),
        }}
      >
        <Text role="caption" colorToken="text-secondary">
          {anonymousLabel}
        </Text>
        <Text role="caption" colorToken="text-muted">
          ·
        </Text>
        {timeLabel === '' ? null : (
          <Text testID={`wall-row-time-${cardId}`} role="caption" colorToken="text-muted">
            {timeLabel}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        {typeLabel === undefined ? null : <WallChip label={typeLabel} tone="brand" testID={`wall-type-${cardId}`} />}
        {sampleLabel === undefined ? null : (
          <WallChip label={sampleLabel} tone="neutral" testID={`wall-sample-tag-${cardId}`} />
        )}
      </View>

      {children}

      {/* 公共操作区：阶段 1 只是"这条帖子有多少互动"的静态事实，⛔ 不是未实现的按钮 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_4') }}>
        <WallActionStat
          source={Heart}
          count={likeCount}
          label={actionLabels.like}
          testID={`wall-row-${cardId}-like`}
        />
        <WallActionStat
          source={MessageCircle}
          count={commentCount}
          label={actionLabels.comment}
          testID={`wall-row-${cardId}-comment`}
        />
        <WallActionStat source={Bookmark} label={actionLabels.save} testID={`wall-row-${cardId}-save`} />
      </View>
    </View>
  );

  return (
    <View
      testID={`wall-card-${cardId}`}
      style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_2') }}
    >
      <Surface variant="surface" rounded="radius_large" bordered="subtle">
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

/** 轻量标签：只借 Surface 的语义底色，不新增一套视觉系统 */
function WallChip({
  label,
  tone,
  testID,
}: {
  label: string;
  tone: 'brand' | 'neutral';
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <Surface
      testID={testID}
      variant={tone === 'brand' ? 'brandSoft' : 'sunken'}
      rounded="radius_small"
      style={{ paddingHorizontal: theme.space('space_2'), paddingVertical: theme.space('space_1') }}
    >
      <Text role="caption" colorToken={tone === 'brand' ? 'text-brand' : 'text-secondary'}>
        {label}
      </Text>
    </Surface>
  );
}

/** 静态互动计数：无 onPress、无 button 角色 —— 读屏只播报"事实" */
function WallActionStat({
  source,
  count,
  label,
  testID,
}: {
  source: IconComponent;
  count?: number;
  label: string;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
    >
      <Icon source={source} size="body" tint="secondary" />
      {count === undefined ? null : (
        <Text role="caption" colorToken="text-muted">
          {String(count)}
        </Text>
      )}
    </View>
  );
}
