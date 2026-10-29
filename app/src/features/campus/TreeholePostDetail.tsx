/**
 * TreeholePostDetail —— 树洞 / 万能墙的**详情正文块**
 *
 * 版式依据：同设计文档 §页面线框（帖子详情）
 *   作者 → 标题 → **完整正文** → 标签 → 媒体 → 分隔线 → 互动计数。
 * 与列表共用 `TreeholeAuthorLine / TreeholeTagList / TreeholeActionBar`，
 * ⛔ 不再出现"列表一套、详情另一套"的重复拼装。
 *
 * ⛔ 详情是**页面**不是卡片：不套 Surface / 不设圆角 / 不加阴影（旧实现外层 16 + Card 16 = 32dp 内缩）。
 * 万能墙走 `anonymous` + `wallContent`：**没有头像、昵称、等级**（后端匿名不变量）。
 */

import * as React from 'react';
import { View } from 'react-native';

import { Divider } from '@/components/ui/Divider';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { TreeholeMedia } from './TreeholeMedia';
import { TreeholeActionBar, TreeholeAuthorLine, TreeholeTagList } from './TreeholePostParts';
import type { TreeholePostViewModel } from './treeholePostViewModel';

export type TreeholePostDetailProps = {
  post: TreeholePostViewModel;
  /** 绝对时间（详情口径） */
  timeLabel: string;
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onLike: () => void;
  onComment: () => void;
  /** 万能墙：匿名投影，丢弃标题/媒体/标签 */
  anonymous?: boolean;
  /** 万能墙正文（六种版式模板）；给了它就替代纯文本正文 */
  wallContent?: React.ReactNode;
  likeNotice?: React.ReactNode;
  testID?: string;
};

export function TreeholePostDetail({
  post,
  timeLabel,
  liked,
  likeCount,
  commentCount,
  onLike,
  onComment,
  anonymous = false,
  wallContent,
  likeNotice,
  testID = 'treehole-post-detail',
}: TreeholePostDetailProps): React.ReactElement {
  const theme = useTheme();
  const hasMedia = !anonymous && post.mediaUrls.length > 0;
  return (
    <View
      testID={testID}
      style={{
        paddingHorizontal: theme.space('space_4'),
        paddingTop: theme.space('space_3'),
        gap: theme.space('space_3'),
      }}
    >
      <TreeholeAuthorLine
        name={post.authorName}
        avatarUrl={post.avatarUrl}
        level={post.authorLevel}
        anonymous={anonymous}
      />

      {/* 详情标题是**页面级标题**（24sp），比列表标题大一档、比昵称(14sp)大两档：
          所有者 2026-10-18 第五轮「标题字体小一点」后，标题不再用 32sp 把整屏压成两行字。 */}
      {!anonymous && post.title.trim().length > 0 ? (
        <Text role="headline" emphasis="strong" colorToken="text-primary">
          {post.title}
        </Text>
      ) : null}

      {wallContent ?? (post.content.trim() ? (
        <Text role="body" colorToken="text-primary" testID="treehole-post-content">
          {post.content}
        </Text>
      ) : null)}

      {anonymous ? null : <TreeholeTagList tags={post.tags} />}

      {hasMedia ? <TreeholeMedia postId={post.id} urls={post.mediaUrls} mode="detail" /> : null}

      <Divider />

      <View style={{ paddingBottom: theme.space('space_2') }}>
        <TreeholeActionBar
          testIDPrefix="campus-detail"
          liked={liked}
          likeCount={likeCount}
          commentCount={commentCount}
          onLike={onLike}
          onComment={onComment}
          likeNotice={likeNotice}
          timeLabel={timeLabel}
        />
      </View>
    </View>
  );
}
