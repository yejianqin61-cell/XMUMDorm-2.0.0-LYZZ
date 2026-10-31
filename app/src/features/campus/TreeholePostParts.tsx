/**
 * 树洞帖子的**共享部件**（列表行与详情块共用，避免两处各拼一套层级）
 *
 * 三条纪律：
 * 1. 视觉取值只来自令牌（间距/圆角/颜色/字阶），⛔ 不写裸数字；
 * 2. 图标只走 `A06 Icon`（第 1 层 Lucide，逐图标导入），⛔ 不用 Emoji / 文本字符冒充；
 * 3. **层级由字阶 + 颜色表达**：昵称 `label`、正文 `body`、时间/计数 `caption`，
 *    ⛔ 不再出现"作者名与帖子标题同字号、正文与时间同色"（P0-5 的层级塌陷）。
 */

import * as React from 'react';
import { View } from 'react-native';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import ThumbsUp from 'lucide-react-native/icons/thumbs-up';

import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { TreeholePostTag } from './treeholePostViewModel';

export function TreeholeAuthorLine({
  name,
  avatarUrl,
  level,
  timeLabel,
  tags,
  anonymous = false,
}: {
  name: string | null;
  avatarUrl: string | null;
  level: number | null;
  /** 列表行给相对时间；详情**不给**（绝对时间移交给动作行右侧，作者行只留身份） */
  timeLabel?: string;
  /** 列表行：标签跟在日期右边（所有者 2026-10-18 裁决） */
  tags?: readonly TreeholePostTag[];
  anonymous?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const shownName = anonymous ? t('screen.campus.read.anonymous') : name || t('screen.campus.read.author');
  return (
    <View
      testID="treehole-author"
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}
    >
      {/* 匿名域（万能墙）**没有头像位**：连占位都不给，否则是在暗示"这是某人" */}
      {anonymous ? null : (
        <Avatar
          testID="treehole-author-avatar"
          size="space_8"
          kind="user"
          uri={avatarUrl ?? undefined}
          fallbackText={shownName}
        />
      )}
      {/* 昵称：14sp 常规体 + 次色；标题：16sp 粗体 + 主色 —— 字号、字重、颜色三层都不一样
          （所有者 2026-10-18 第二轮「标题和用户名不要同一种字体」，第五轮再压小标题后仍保持层级） */}
      <Text
        testID="treehole-author-name"
        role="body"
        colorToken="text-secondary"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {shownName}
      </Text>
      {anonymous || level === null ? null : (
        <LevelBadge testID="treehole-author-level" level={level} variant="icon" />
      )}
      {timeLabel === undefined ? null : (
        <Text testID="treehole-author-time" role="caption" colorToken="text-muted" numberOfLines={1}>
          {timeLabel}
        </Text>
      )}
      {tags === undefined || tags.length === 0 ? null : <TreeholeInlineTags tags={tags} />}
    </View>
  );
}

/**
 * 身份行里的紧凑标签：**并成一行淡色文字**跟在日期右边。
 *
 * 为什么不用 `Chip`：身份行已经有头像 + 昵称 + 等级 + 时间，再塞 1–3 个 32dp 芯片，
 * 在 360dp 宽上必定换行或把昵称挤没；这里用单行文本，超长直接截断。
 */
export function TreeholeInlineTags({
  tags,
}: {
  tags: readonly TreeholePostTag[];
}): React.ReactElement | null {
  const { locale } = useI18n();
  const labels = tags
    .map((tag) => ((locale === 'en' ? tag.nameEn || tag.nameZh : tag.nameZh || tag.nameEn) ?? '').trim())
    .filter((label) => label.length > 0);
  if (labels.length === 0) return null;
  return (
    <Text
      testID="treehole-row-tags"
      role="caption"
      colorToken="text-brand"
      numberOfLines={1}
      style={{ flexShrink: 1 }}
    >
      {labels.join('  ')}
    </Text>
  );
}

/** 标签：正文之后、媒体之前（设计文档 §信息密度） */
export function TreeholeTagList({
  tags,
}: {
  tags: readonly TreeholePostTag[];
}): React.ReactElement | null {
  const theme = useTheme();
  const { locale } = useI18n();
  if (tags.length === 0) return null;
  return (
    <View testID="treehole-tags" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_1') }}>
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          testID={`treehole-tag-${tag.id}`}
          label={(locale === 'en' ? tag.nameEn || tag.nameZh : tag.nameZh || tag.nameEn) ?? ''}
          variant="static"
          // 2026-10-31：tag 是正文的附属信息，不是大按钮 —— 字阶退到 caption、
          // 胶囊收到 4/12（正文 14sp → tag 12sp ≈ 0.85×）。
          size="compact"
        />
      ))}
    </View>
  );
}

/**
 * 互动条：**图标 + 计数**，顺序按线框「评论 → 喜欢」。
 * ⛔ 不用文字动词（旧实现是 `"38 赞"` 文字按钮）；命中区由 `Pressable` 统一撑到 44/48。
 */
export function TreeholeActionBar({
  liked,
  likeCount,
  commentCount,
  onLike,
  onComment,
  testIDPrefix,
  likeNotice,
  timeLabel,
}: {
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onLike?: () => void;
  onComment?: () => void;
  testIDPrefix?: string;
  likeNotice?: React.ReactNode;
  /** 详情：绝对时间放动作行右端（作者行只留身份，避免昵称 + 等级 + 长时间挤成一行） */
  timeLabel?: string;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const prefix = testIDPrefix === undefined ? 'treehole' : testIDPrefix;
  return (
    <View style={{ gap: theme.space('space_1') }}>
      <View
        testID="treehole-actions"
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_4') }}
      >
        <Pressable
          testID={`${prefix}-comment`}
          onPress={onComment}
          accessibilityRole="button"
          accessibilityLabel={t('screen.campus.read.commentA11y', { count: commentCount ?? '—' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
        >
          <Icon source={MessageCircle} size="inline" tint="secondary" />
          <Text role="caption" colorToken="text-secondary" testID={`${prefix}-comment-count`}>
            {commentCount === null ? '—' : String(commentCount)}
          </Text>
        </Pressable>

        <Pressable
          testID={`${prefix}-like`}
          onPress={onLike}
          accessibilityRole="button"
          accessibilityLabel={t('screen.campus.read.likeA11y', { count: likeCount ?? '—' })}
          accessibilityState={{ selected: liked }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
        >
          {/* 点赞态双通道：图标变色 + 状态，⛔ 不只靠颜色 */}
          <Icon source={ThumbsUp} size="inline" tint={liked ? 'brand' : 'secondary'} />
          <Text
            role="caption"
            colorToken={liked ? 'text-brand' : 'text-secondary'}
            testID={`${prefix}-like-count`}
          >
            {likeCount === null ? '—' : String(likeCount)}
          </Text>
        </Pressable>

        {timeLabel === undefined ? null : (
          <>
            <View style={{ flex: 1 }} />
            <Text
              role="caption"
              colorToken="text-muted"
              numberOfLines={1}
              testID={`${prefix}-time`}
              style={{ flexShrink: 1 }}
            >
              {timeLabel}
            </Text>
          </>
        )}
      </View>
      {likeNotice}
    </View>
  );
}
