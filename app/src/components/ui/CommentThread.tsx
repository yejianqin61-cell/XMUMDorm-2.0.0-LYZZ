/**
 * CommentThread（D01）—— 评论列表（组件定义 §2.6）
 *
 * 三条硬约束，全部落成**可测的纯函数**：
 *   1. **仅二级**：不能回复回复 → `canReplyTo(depth)`（`depth === 0` 才可）
 *   2. **组内展开**：默认只显示前 N 条回复 + "展开其余"，`visibleReplies(...)` 决定
 *   3. **分页**：本组件只管已加载的评论；页脚状态交给 `T05 ListFooter`（页面传 `footer`）
 *      —— ⛔ 不在这里另写一套分页状态机（§2.4：分页状态机只有 `K05`/`T05` 两处）
 *
 * ⛔ 组件内不写死文案：`labels` 由页面用词条传入。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { CommentItem, type CommentAuthor, type CommentItemProps } from './CommentItem';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type CommentNode = {
  id: string;
  /** 一级评论为 `null` */
  parentId: string | null;
  /** 后端给的层级：0 一级 / 1 回复（**只有这两级**） */
  depth: 0 | 1;
  author: CommentAuthor;
  content: string;
  createdAtLabel: string;
  canDelete?: boolean;
  liked?: boolean;
  likeCount?: number;
};

/** 分组结果（纯函数输出，供渲染与测试共用） */
export type CommentGroup = {
  root: CommentNode;
  replies: readonly CommentNode[];
};

/**
 * 把扁平列表按"一级 + 其回复"分组（纯函数）。
 * - **孤儿回复**（`parentId` 指向未加载的评论）**不丢弃**：挂到末尾单独成组，
 *   否则用户会看到"评论凭空消失"（分页加载时必然出现）
 * - 回复顺序按输入顺序（后端已按 `created_at ASC` 给；⛔ 客户端不重排）
 */
export function groupComments(nodes: readonly CommentNode[]): readonly CommentGroup[] {
  const roots: CommentNode[] = [];
  const repliesByParent = new Map<string, CommentNode[]>();
  const orphans: CommentNode[] = [];

  for (const node of nodes) {
    if (node.depth === 0 || node.parentId === null) {
      roots.push(node);
      continue;
    }
    const bucket = repliesByParent.get(node.parentId);
    if (bucket) bucket.push(node);
    else repliesByParent.set(node.parentId, [node]);
  }

  const groups: CommentGroup[] = roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));

  const rootIds = new Set(roots.map((root) => root.id));
  for (const node of nodes) {
    if (node.depth === 1 && node.parentId !== null && !rootIds.has(node.parentId)) {
      orphans.push(node);
    }
  }
  // 孤儿回复各自成组（用自身当"根"渲染，但**不带回复入口**）
  for (const orphan of orphans) {
    groups.push({ root: { ...orphan, depth: 0 }, replies: [] });
  }
  return groups;
}

/** 能否回复某层（纯函数）：**只有一级评论可回复**（§2.6：不能回复回复） */
export function canReplyTo(depth: number): boolean {
  return depth === 0;
}

/** 默认显示几条回复（超过就折叠 —— 组内展开的最小实现） */
export const REPLY_PREVIEW_COUNT = 2;

/** 当前该显示哪几条回复（纯函数） */
export function visibleReplies(
  replies: readonly CommentNode[],
  expanded: boolean,
  previewCount: number = REPLY_PREVIEW_COUNT
): readonly CommentNode[] {
  if (expanded) return replies;
  return replies.slice(0, Math.max(0, previewCount));
}

export type CommentThreadLabels = CommentItemProps['labels'] & {
  /** "展开其余 N 条回复" */
  moreReplies: (count: number) => string;
  /** "收起" */
  collapse: string;
};

export type CommentThreadProps = {
  nodes: readonly CommentNode[];
  labels: CommentThreadLabels;
  onToggleLike?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** 传了才有回复入口；回复的回复由 `canReplyTo` 挡住 */
  onReply?: (id: string) => void;
  /** 页脚（`T05 ListFooter` 或"没有更多"）——分页状态机不在这里 */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CommentThread({
  nodes,
  labels,
  onToggleLike,
  onDelete,
  onReply,
  footer,
  style,
  testID,
}: CommentThreadProps): React.ReactElement {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const groups = groupComments(nodes);

  /** ⛔ 回复入口**由 `canReplyTo` 决定**，不是靠"回复那里忘了传 onReply" —— 规则要能被改一处 */
  const replyHandlerFor = (node: CommentNode): (() => void) | undefined =>
    onReply !== undefined && canReplyTo(node.depth) ? () => onReply(node.id) : undefined;

  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View testID={testID} style={[{ gap: theme.space('space_2') }, style]}>
      {groups.map((group) => {
        const isExpanded = expanded.has(group.root.id);
        const shown = visibleReplies(group.replies, isExpanded);
        const hiddenCount = group.replies.length - shown.length;
        return (
          <View key={group.root.id} style={{ gap: theme.space('space_1') }}>
            <CommentItem
              testID={testID ? `${testID}-${group.root.id}` : undefined}
              author={group.root.author}
              content={group.root.content}
              createdAtLabel={group.root.createdAtLabel}
              depth={0}
              canDelete={group.root.canDelete}
              liked={group.root.liked}
              likeCount={group.root.likeCount}
              onToggleLike={onToggleLike ? () => onToggleLike(group.root.id) : undefined}
              onDelete={onDelete ? () => onDelete(group.root.id) : undefined}
              // 仅二级：只有一级评论才拿到回复入口（判断走纯函数）
              onReply={replyHandlerFor(group.root)}
              labels={labels}
            />

            {/* 回复缩进一层（⛔ 只有一层缩进，不存在第三层） */}
            {shown.length > 0 ? (
              <View style={{ paddingLeft: theme.space('space_8'), gap: theme.space('space_1') }}>
                {shown.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    testID={testID ? `${testID}-${reply.id}` : undefined}
                    author={reply.author}
                    content={reply.content}
                    createdAtLabel={reply.createdAtLabel}
                    depth={1}
                    canDelete={reply.canDelete}
                    liked={reply.liked}
                    likeCount={reply.likeCount}
                    onToggleLike={onToggleLike ? () => onToggleLike(reply.id) : undefined}
                    onDelete={onDelete ? () => onDelete(reply.id) : undefined}
                    // 回复的回复：`canReplyTo(1)` 为 false → 这里天然没有入口
                    onReply={replyHandlerFor(reply)}
                    labels={labels}
                  />
                ))}
              </View>
            ) : null}

            {group.replies.length > 0 && (hiddenCount > 0 || isExpanded) ? (
              <Pressable
                testID={testID ? `${testID}-${group.root.id}-toggle` : undefined}
                onPress={() => toggle(group.root.id)}
                accessibilityLabel={
                  hiddenCount > 0 ? labels.moreReplies(hiddenCount) : labels.collapse
                }
                style={{ paddingLeft: theme.space('space_8'), minHeight: theme.touchTarget }}
              >
                <Text role="caption" colorToken="text-brand">
                  {hiddenCount > 0 ? labels.moreReplies(hiddenCount) : labels.collapse}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {footer}
    </View>
  );
}
