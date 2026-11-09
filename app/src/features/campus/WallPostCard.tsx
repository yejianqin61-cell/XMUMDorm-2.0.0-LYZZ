/**
 * WallPostCard —— 万能墙信息流的**一张帖子**（两种类型共用）
 *
 * 组装顺序：共用外壳（`WallCardShell`）+ 按类型选择的内部内容：
 *   · 自由帖 → `WallFreePostBody`
 *   · 招募帖 → `WallRecruitPostBody`
 *
 * 阶段 3：信息流点赞 / 收藏 / 评论可点（由调用方给处理函数；没有就保持静态计数）；
 * ⛔ 示例帖不绑定 `onPress`，避免跳到并不存在的详情。
 */

import * as React from 'react';

import { useI18n } from '@/i18n';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import { WallCardShell } from './WallCardShell';
import { WallFreePostBody } from './WallFreePostBody';
import { WallRecruitPostBody } from './WallRecruitPostBody';
import { wallPosterStyle } from './wallPosterLayout';
import { useTheme } from '@/design-system/theme';
import { wallPalette } from './wallPosterTemplates';
import type { WallPost } from './wallPost';

export function WallPostCard({
  post,
  onOpen,
  onLike,
  onFavorite,
  onComment,
  full = false,
}: {
  post: WallPost;
  onOpen?: () => void;
  onLike?: () => void;
  onFavorite?: () => void;
  onComment?: () => void;
  full?: boolean;
}): React.ReactElement {
  const { t, locale } = useI18n();
  const { scheme } = useTheme();
  const timeLabel = post.createdAt ? formatPostTime(post.createdAt, { locale }) : '';
  const posterStyle = wallPosterStyle(post.id, post.posterStyle, post.posterTemplateId);
  const palette = wallPalette(post.kind === 'recruit' ? 'oat' : posterStyle.colorId, scheme);
  const summary =
    post.kind === 'recruit' ? (post.recruit?.title ?? '') : post.content;

  return (
    <WallCardShell
      cardId={post.id}
      background={palette.background}
      muted={palette.muted}
      timeLabel={timeLabel}
      likeCount={post.likeCount}
      commentCount={post.commentCount}
      liked={post.liked === true}
      favorited={post.favorited === true}
      {...(onLike === undefined ? {} : { onLike })}
      {...(onFavorite === undefined ? {} : { onFavorite })}
      {...(onComment === undefined ? {} : { onComment })}
      actionLabels={{
        like: t('screen.campus.read.likeA11y', { count: post.likeCount }),
        comment: t('screen.campus.read.commentA11y', { count: post.commentCount }),
        save: t('wall.action.save'),
      }}
      accessibilityLabel={[timeLabel, summary].filter(Boolean).join(' · ')}
      {...(onOpen === undefined ? {} : { onPress: onOpen })}
    >
      {post.kind === 'recruit' && post.recruit ? (
        <WallRecruitPostBody recruit={post.recruit} />
      ) : (
        <WallFreePostBody
          content={post.content}
          posterStyle={posterStyle}
          full={full}
        />
      )}
    </WallCardShell>
  );
}
