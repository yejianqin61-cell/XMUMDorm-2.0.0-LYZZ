/**
 * WallPostCard —— 万能墙信息流的**一张帖子**（两种类型共用）
 *
 * 组装顺序：共用外壳（`WallCardShell`）+ 按类型选择的内部内容：
 *   · 自由帖 → `WallFreePostBody`
 *   · 招募帖 → `WallRecruitPostBody`
 *
 * ⛔ 阶段 1 不接互动：点赞 / 评论 / 收藏只有计数，没有点击行为；
 * ⛔ 示例帖不绑定 `onPress`，避免跳到并不存在的详情。
 */

import * as React from 'react';

import { useI18n } from '@/i18n';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import { WallCardShell } from './WallCardShell';
import { WallFreePostBody } from './WallFreePostBody';
import { WallRecruitPostBody } from './WallRecruitPostBody';
import type { WallPost } from './wallPost';

export function WallPostCard({
  post,
  onOpen,
  allowFallback = true,
}: {
  post: WallPost;
  onOpen?: () => void;
  /** 预览"全部模板"时关掉实测回退（默认开） */
  allowFallback?: boolean;
}): React.ReactElement {
  const { t, locale } = useI18n();
  const timeLabel = post.createdAt ? formatPostTime(post.createdAt, { locale }) : '';
  const summary =
    post.kind === 'recruit' ? (post.recruit?.title ?? '') : post.content;

  return (
    <WallCardShell
      cardId={post.id}
      timeLabel={timeLabel}
      likeCount={post.likeCount}
      commentCount={post.commentCount}
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
          allowFallback={allowFallback}
          {...(post.posterTemplateId === undefined
            ? {}
            : { templateId: post.posterTemplateId })}
        />
      )}
    </WallCardShell>
  );
}
