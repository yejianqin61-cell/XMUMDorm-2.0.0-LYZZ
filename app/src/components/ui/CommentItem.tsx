/**
 * CommentItem（D02）—— 单条评论（组件定义 §2.6）
 *
 * **最重要的一条：匿名域不得带作者身份。** 万能墙/课评的匿名是**后端写死的不变量**
 *   （宪法 4.1.1），所以这里用**类型**把四个出口一起断掉 ——
 *   `anonymous` 那一支**没有** `name` / `avatarUri` / `levelLabel` / `onPressAuthor` 字段，
 *   页面**想渲染身份也拿不到数据**（⛔ 不是靠"记得别传"）。
 *   与 `K13 AuthorRow` / `K14 AnonAuthorLabel` 的分工一致（§2.3 已声明不得互换）。
 *
 * ⛔ 层次只有两级（深度由 `D01` 保证）：`depth === 1` 的评论**没有回复按钮**
 *   （§2.6：仅二级，不能回复回复）。本组件把这条写成"传了 `onReply` 才渲染回复入口"。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Heart from 'lucide-react-native/icons/heart';
import Trash from 'lucide-react-native/icons/trash';
import CornerDownRight from 'lucide-react-native/icons/corner-down-right';

import { useTheme } from '@/design-system/theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

/**
 * 作者投影：**匿名与实名是两个不同的类型**。
 * ⛔ 不要把它做成 `{ name?: string; anonymous?: boolean }` —— 那样"传了 name 但 anonymous=true"
 *    就成了合法状态，而这正是要防的。
 */
export type CommentAuthor =
  | { kind: 'anonymous' }
  | {
      kind: 'named';
      name: string;
      avatarUri?: string | null;
      /** 等级徽章文字（`K15` 的口径）；不给就不渲染 */
      levelLabel?: string;
      onPressAuthor?: () => void;
    };

/** 匿名投影可播报的文案（纯函数；⛔ 不允许回退成"匿名用户 + 昵称"） */
export function commentAuthorLabel(author: CommentAuthor, anonymousLabel: string): string {
  return author.kind === 'anonymous' ? anonymousLabel : author.name;
}

export type CommentItemProps = {
  author: CommentAuthor;
  content: string;
  /** 时间文案由**页面**格式化（相对时间规则属页面口径） */
  createdAtLabel: string;
  /** 0 = 一级评论，1 = 回复（两级封顶） */
  depth?: 0 | 1;
  canDelete?: boolean;
  liked?: boolean;
  likeCount?: number;
  onToggleLike?: () => void;
  onDelete?: () => void;
  /** ⛔ `depth === 1` 时页面**不应**传它；传了本组件也会忽略（见下） */
  onReply?: () => void;
  labels: {
    anonymous: string;
    deleteLabel: string;
    replyLabel: string;
    likeLabel: string;
  };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CommentItem({
  author,
  content,
  createdAtLabel,
  depth = 0,
  canDelete = false,
  liked = false,
  likeCount,
  onToggleLike,
  onDelete,
  onReply,
  labels,
  style,
  testID,
}: CommentItemProps): React.ReactElement {
  const theme = useTheme();
  const isNamed = author.kind === 'named';
  // 仅二级：**回复的回复**在类型与渲染两处都被挡住
  const replyable = depth === 0 && onReply !== undefined;

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          gap: theme.space('space_2'),
          paddingVertical: theme.space('space_2'),
        },
        style,
      ]}
    >
      {/* 匿名投影：**没有头像位**（连占位方块都不给，否则就是在暗示"这是某人"） */}
      {isNamed ? (
        <Avatar
          size="space_8"
          kind="user"
          uri={author.avatarUri ?? undefined}
          fallbackText={author.name.slice(0, 1)}
        />
      ) : null}

      <View style={{ flex: 1, gap: theme.space('space_1') }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
          {/* 作者名（实名可点进主页；匿名只给"匿名"这一句） */}
          {isNamed && author.onPressAuthor ? (
            <Pressable onPress={author.onPressAuthor} accessibilityLabel={author.name}>
              <Text role="label" emphasis="strong" colorToken="text-primary">
                {author.name}
              </Text>
            </Pressable>
          ) : (
            <Text
              role="label"
              emphasis={isNamed ? 'strong' : 'regular'}
              colorToken={isNamed ? 'text-primary' : 'text-muted'}
            >
              {commentAuthorLabel(author, labels.anonymous)}
            </Text>
          )}
          {isNamed && author.levelLabel ? (
            <Text role="caption" colorToken="text-brand">
              {author.levelLabel}
            </Text>
          ) : null}
          <Text role="caption" colorToken="text-muted">
            {createdAtLabel}
          </Text>
        </View>

        <Text role="body" colorToken="text-primary">
          {content}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_4') }}>
          {onToggleLike ? (
            <Pressable
              onPress={onToggleLike}
              accessibilityLabel={labels.likeLabel}
              accessibilityState={{ selected: liked }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
            >
              {/* 点赞态**同时有图标与数字**（⛔ 不只靠颜色） */}
              <Icon source={Heart} size="inline" tint={liked ? 'brand' : 'secondary'} />
              <Text role="caption" colorToken={liked ? 'text-brand' : 'text-secondary'}>
                {typeof likeCount === 'number' ? String(likeCount) : ''}
              </Text>
            </Pressable>
          ) : null}

          {replyable ? (
            <Pressable
              onPress={onReply}
              accessibilityLabel={labels.replyLabel}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
            >
              <Icon source={CornerDownRight} size="inline" tint="secondary" />
              <Text role="caption" colorToken="text-secondary">
                {labels.replyLabel}
              </Text>
            </Pressable>
          ) : null}

          {canDelete && onDelete ? (
            <Pressable
              onPress={onDelete}
              accessibilityLabel={labels.deleteLabel}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
            >
              <Icon source={Trash} size="inline" tint="danger" />
              <Text role="caption" colorToken="text-danger">
                {labels.deleteLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
