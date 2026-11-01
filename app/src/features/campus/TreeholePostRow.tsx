/** 树洞单列阅读行：身份 → 标题和完整正文 → 媒体 → 独立动作条。Stage 2 统一契约优先于旧标题流。 */

import * as React from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { TreeholeMedia } from './TreeholeMedia';
import { SearchHighlight } from './SearchHighlight';
import { TreeholeActionBar, TreeholeAuthorLine } from './TreeholePostParts';
import type { TreeholePostViewModel } from './treeholePostViewModel';

export type TreeholePostRowProps = {
  post: TreeholePostViewModel;
  timeLabel: string;
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onOpen: () => void;
  onLike: () => void;
  /** 点赞失败/登录提示（由列表行持有状态后传入，行本身不写业务） */
  likeNotice?: React.ReactNode;
  /** 搜索关键词（命中片段加粗） */
  query?: string;
};

export function TreeholePostRow({
  post,
  timeLabel,
  liked,
  likeCount,
  commentCount,
  onOpen,
  onLike,
  likeNotice,
  query,
}: TreeholePostRowProps): React.ReactElement {
  const theme = useTheme();
  const indent = theme.space('space_8') + theme.space('space_2');
  const title = post.title.trim();
  const openLabel = title || post.content || String(post.id);

  return (
    <View
      testID={`treehole-post-${post.id}`}
      style={{
        paddingHorizontal: theme.space('space_4'),
        paddingTop: theme.space('space_2'),
        paddingBottom: theme.space('space_2'),
        gap: theme.space('space_2'),
      }}
    >
      {/* 标签跟着身份行（日期右边），不再占正文一行 */}
      <TreeholeAuthorLine
        name={post.authorName}
        avatarUrl={post.avatarUrl}
        level={post.authorLevel}
        timeLabel={timeLabel}
        tags={post.tags}
      />

      <View style={{ paddingLeft: indent, gap: theme.space('space_1') }}>
        {/* 内容区：标题与完整正文可点（动作区是兄弟节点，⛔ 按钮套按钮） */}
        <Pressable
          testID={`campus-row-${post.id}`}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={openLabel}
          contentAlign="stretch"
          // 2026-10-31 所有者：⛔ 不要"手指刚碰到就整块变灰"的按压态 ——
          // 列表滑动会反复误触发，一闪一闪像卡顿；点进详情的交互一点不动。
          feedback="none"
        >
          {title.length === 0 ? null : query ? (
            <SearchHighlight
              value={title}
              query={query}
              role="label"
              maxFontSizeMultiplier={0}
            />
          ) : (
            <Text
              role="label"
              emphasis="strong"
              colorToken="text-primary"
              maxFontSizeMultiplier={0}
            >
              {title}
            </Text>
          )}
          {post.content.trim() ? (
            <SearchHighlight
              testID={`treehole-content-${post.id}`}
              value={post.content}
              query={query ?? ''}
              role="body"
              colorToken="text-primary"
              maxFontSizeMultiplier={0}
            />
          ) : null}
        </Pressable>

        {post.mediaUrls.length > 0 ? (
          <Pressable
            testID={`campus-row-${post.id}-media`}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={openLabel}
            contentAlign="stretch"
            // 图组（含每张缩略图）同样不做按压变灰：一条帖子只有一次按压态，且不可见
            feedback="none"
            // 图组距正文 12dp：内容列已给 space_1(4)，这里补 space_2(8)
            style={{ marginTop: theme.space('space_2') }}
          >
            <TreeholeMedia postId={post.id} urls={post.mediaUrls} mode="feed" />
          </Pressable>
        ) : null}

        <TreeholeActionBar
          testIDPrefix={`campus-row-${post.id}`}
          liked={liked}
          likeCount={likeCount}
          commentCount={commentCount}
          onLike={onLike}
          onComment={onOpen}
          likeNotice={likeNotice}
        />
      </View>
    </View>
  );
}
