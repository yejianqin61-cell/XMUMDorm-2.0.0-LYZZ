/**
 * CommentThread（D01）—— 评论列表（组件定义 §2.6）
 *
 * 三条硬约束，全部落成**可测的纯函数**：
 *   1. **视觉最多两层**：默认只有一级可回复；万能墙用 `allowNestedReply` 允许
 *      「回复一条回复」，但仍归到同一条一级评论下、不新增缩进（`rootId` 决定归属）
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
  /** 直接父评论；一级评论为 `null`（多级数据下可能指向一条回复） */
  parentId: string | null;
  /** 后端给的层级：0 一级 / 1 回复（**视觉只有这两级**） */
  depth: 0 | 1;
  /** 阶段 3：这条回复最终归属的一级评论（用于多级压平，不加缩进） */
  rootId?: string | null;
  author: CommentAuthor;
  /** 匿名编号等展示文案（「匿名03」），不含真实身份 */
  authorLabel?: string;
  /** 楼主 / 我 / 精选（轻量文字标识） */
  isAuthor?: boolean;
  isMine?: boolean;
  featured?: boolean;
  /** 被回复评论的 id 与摘要（目标已删除时摘要为空） */
  replyToId?: string | null;
  replyToExcerpt?: string | null;
  /** 当前查看者能否精选这条评论（仅楼主 + 一级评论） */
  canFeature?: boolean;
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
    if (node.depth === 0 || (node.parentId === null && node.rootId == null)) {
      roots.push(node);
      continue;
    }
    // 多级回复按 rootId 归到一级评论；旧数据没有 rootId 时退回直接父评论
    const anchor = node.rootId ?? node.parentId;
    if (anchor === null) continue;
    const bucket = repliesByParent.get(anchor);
    if (bucket) bucket.push(node);
    else repliesByParent.set(anchor, [node]);
  }

  const groups: CommentGroup[] = roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));

  const rootIds = new Set(roots.map((root) => root.id));
  for (const node of nodes) {
    const anchor = node.rootId ?? node.parentId;
    if (node.depth === 1 && anchor !== null && !rootIds.has(anchor)) {
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
  /** 阶段 3 可选：轻量标识与操作文案 */
  authorBadge?: string;
  mineBadge?: string;
  featuredBadge?: string;
  feature?: string;
  unfeature?: string;
  reportComment?: string;
  replyToDeleted?: string;
  /** 格式化「回复 匿名03」；不给就不显示引用行 */
  replyTo?: (name: string) => string;
  /** 引用摘要前的标点（中文全角 / 英文半角） */
  replyToSeparator?: string;
};

export type CommentThreadProps = {
  nodes: readonly CommentNode[];
  labels: CommentThreadLabels;
  onToggleLike?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** 传了才有回复入口；默认只有一级可回复 */
  onReply?: (id: string) => void;
  /** 万能墙：允许回复一条回复（视觉仍压平在一级评论下） */
  allowNestedReply?: boolean;
  /** 楼主精选（页面负责权限；这里只负责入口） */
  onToggleFeature?: (id: string) => void;
  /** 评论举报 */
  onReportComment?: (id: string) => void;
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
  allowNestedReply = false,
  onToggleFeature,
  onReportComment,
  footer,
  style,
  testID,
}: CommentThreadProps): React.ReactElement {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const groups = groupComments(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  /** ⛔ 回复入口**由 `canReplyTo` 决定**，不是靠"回复那里忘了传 onReply" —— 规则要能被改一处 */
  const replyHandlerFor = (node: CommentNode): (() => void) | undefined =>
    onReply !== undefined && (canReplyTo(node.depth) || (allowNestedReply && node.depth === 1))
      ? () => onReply(node.id)
      : undefined;

  /** 「回复 匿名03」：目标已不在已加载列表里时给「回复已删除评论」，不暴露已删除正文 */
  const replyLabelFor = (node: CommentNode): string | undefined => {
    if (node.replyToId == null) return undefined;
    const target = nodeById.get(node.replyToId);
    if (!target) return labels.replyToDeleted;
    const name =
      target.authorLabel ?? (target.author.kind === 'named' ? target.author.name : labels.anonymous);
    return labels.replyTo ? labels.replyTo(name) : undefined;
  };

  const itemProps = (node: CommentNode) => ({
    author: node.author,
    authorLabel: node.authorLabel,
    content: node.content,
    createdAtLabel: node.createdAtLabel,
    canDelete: node.canDelete,
    liked: node.liked,
    likeCount: node.likeCount,
    onToggleLike: onToggleLike ? () => onToggleLike(node.id) : undefined,
    onDelete: onDelete ? () => onDelete(node.id) : undefined,
    onReply: replyHandlerFor(node),
    allowReply: allowNestedReply,
    authorBadge: node.isAuthor ? labels.authorBadge : undefined,
    mineBadge: node.isMine ? labels.mineBadge : undefined,
    featured: node.featured === true,
    featuredBadge: labels.featuredBadge,
    replyToLabel: replyLabelFor(node),
    replyToExcerpt: node.replyToExcerpt,
    replyToSeparator: labels.replyToSeparator,
    canFeature: node.canFeature === true && onToggleFeature !== undefined,
    onToggleFeature: onToggleFeature ? () => onToggleFeature(node.id) : undefined,
    featureLabel: node.featured ? labels.unfeature : labels.feature,
    onReport: onReportComment ? () => onReportComment(node.id) : undefined,
    reportLabel: labels.reportComment,
    labels,
  });

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
              depth={0}
              {...itemProps(group.root)}
            />

            {/*
              * 回复区（⛔ 只有一层视觉层级，不存在第三层）：
              * 万能墙用低对比度容器 + 小缩进；其它评论区保持原来的纯缩进。
              */}
            {shown.length > 0 ? (
              <View
                testID={testID ? `${testID}-${group.root.id}-replies` : undefined}
                style={[
                  { gap: theme.space('space_1') },
                  allowNestedReply
                    ? {
                        marginLeft: theme.space('space_2'),
                        paddingHorizontal: theme.space('space_3'),
                        paddingVertical: theme.space('space_2'),
                        borderRadius: theme.radius('radius_medium'),
                        backgroundColor: theme.color['bg-sunken'].value,
                      }
                    : { paddingLeft: theme.space('space_8') },
                ]}
              >
                {shown.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    testID={testID ? `${testID}-${reply.id}` : undefined}
                    depth={1}
                    {...itemProps(reply)}
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
                style={{
                  paddingLeft: allowNestedReply ? theme.space('space_3') : theme.space('space_8'),
                  minHeight: theme.touchTarget,
                }}
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
