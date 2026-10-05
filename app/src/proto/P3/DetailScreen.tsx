/**
 * `P3` 详情骨架 —— DetailScreen（组件定义 §2.7 · 原型层，**不是组件**）
 *
 * ⚠️ **为什么在 `src/proto/` 而不是 `components/ui/`**：
 *   §1.1 要求组件有七项声明，而 `DetailScreen` 在组件定义里**没有正式 ID**；
 *   README §5-3 已裁定按 §1.2「原型骨架豁免 9.14-③」落到 `src/proto/P3`，
 *   并在 Phase 1 收尾时回写 §2.7（宪法 15.4-3）。任务包纪律 3 约束的是**自研 UI 组件**
 *   必须放 `components/ui/**`（尺子统计的是**对该路径的引用**）—— 本文件全部通过引用它们构成。
 *
 * 交互契约（§2.7 `P3`）：**返回、举报、点赞/收藏、评论分页与嵌套、作者信息（可匿名投影）**。
 *
 * ## 三条硬约束
 * 1. **匿名投影**（宪法 4.1.1 / 验收索引 `4.1.1`）：`author.kind === 'anonymous'` 时
 *    **头像 / 昵称 / 等级 / 主页跳转四个出口一起断** —— 靠**类型**（复用 `D02` 的
 *    `CommentAuthor` 联合，⛔ 不新建第二个投影类型，9.14-①）+ 渲染分支两种手段。
 * 2. **顶栏可注入**（README §5-2：C-06 待所有者拍板）：`topBar` / `topMode` 都是插槽，
 *    两种口径（保留信箱 / 不保留）都能接，⛔ 骨架不预占该决定。
 * 3. **分页不自建**（任务包纪律 4）：评论区把 `K05` 的分页状态透传给 `T05 ListFooter`，
 *    ⛔ 这里不写第二个分页状态机。
 *
 * ⛔ 组件内不写文案：所有文字由页面传词条。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { AppError } from '@/i18n/errors';
import { Button } from '@/components/ui/Button';
import { CommentItem, commentAuthorLabel, type CommentAuthor } from '@/components/ui/CommentItem';
import { CommentThread, type CommentThreadLabels, type CommentNode } from '@/components/ui/CommentThread';
import { EmptyState, type EmptyKind } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { ListFooter } from '@/components/ui/ListFooter';
import { LoadingState } from '@/components/ui/LoadingState';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { listFooterState, type PaginationState } from '@/components/ui/ListScreen';
import Heart from 'lucide-react-native/icons/heart';
import Bookmark from 'lucide-react-native/icons/bookmark';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';

/** 原型骨架的 ID 与落点（§5-3 要求可追溯） */
export const PROTO_ID = 'P3' as const;

/* ────────────────────────── 四态判定（与列表骨架同款口径） ────────────────────────── */

export type DetailState = 'loading' | 'error' | 'empty' | 'content';

/**
 * 四态判定（纯函数）。
 * ⚠️ **有内容时不让错误接管整屏**（与 `K05` 同一条规则）：详情页尤其明显 ——
 *    正文已经渲染出来时，评论加载失败不应该把整篇内容换掉。
 */
export function resolveDetailState(input: {
  loading: boolean;
  error: AppError | null;
  hasContent: boolean;
}): DetailState {
  if (input.hasContent) return 'content';
  if (input.loading) return 'loading';
  if (input.error !== null) return 'error';
  return 'empty';
}

/* ────────────────────────── 互动条的纯规则 ────────────────────────── */

export type InteractionState = {
  liked?: boolean;
  likeCount?: number | null;
  favorited?: boolean;
  favoriteCount?: number | null;
  commentCount?: number | null;
};

/**
 * 计数文案（纯函数）：**`null` 是常态**（接口调研 G17：计数类字段后端可能给 `null`）
 * → 显示 `—`，⛔ **不得当成 0**（"没有数据"与"计数为零"是两件事）。
 */
export function formatInteractionCount(value: number | null | undefined, dash: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return dash;
  return String(value);
}

export type InteractionKind = 'like' | 'favorite' | 'comment' | 'report';

/** 互动条的四个动作（纯函数）：只声明"有哪几个"，措辞与图标由组件装配 */
export function interactionKinds(): readonly InteractionKind[] {
  return ['like', 'favorite', 'comment', 'report'];
}

const INTERACTION_ICON: Record<InteractionKind, IconComponent> = {
  like: Heart,
  favorite: Bookmark,
  comment: MessageCircle,
  report: Ellipsis,
};

/* ────────────────────────── Props ────────────────────────── */

export type DetailLabels = {
  back: string;
  like: string;
  favorite: string;
  comment: string;
  report: string;
  /** 计数缺失时的占位（如"—"） */
  countPlaceholder: string;
  /** 匿名作者的播报文案（"匿名"） */
  anonymous: string;
  /** 评论区：展开/收起/删除/回复/赞 */
  comments: CommentThreadLabels;
  /** 评论区页脚 */
  commentsEnd: string;
  commentsRetry: string;
};

export type DetailComments = {
  nodes: readonly CommentNode[];
  pagination: PaginationState;
  onToggleLike?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  /** 评论区标题（如"评论 12"） */
  title: string;
};

export type DetailScreenProps = {
  title: string;
  /** 作者投影（**复用 `D02` 的联合**，⛔ 不新建第二个） */
  author: CommentAuthor;
  /** 头图插槽（`K18 MediaGrid(hero)` 或单图；⛔ 骨架不认识数据形状） */
  hero?: React.ReactNode;
  /** 正文插槽（`D18 MarkdownReader` 由页面给） */
  body?: React.ReactNode;
  /** 时间/来源等次要信息 */
  metaLabel?: string;
  interactions: InteractionState;
  onToggleLike?: () => void;
  onToggleFavorite?: () => void;
  onReport?: () => void;
  onBack?: () => void;
  /** 评论区（可不给：如"跑腿详情永不出现输入框"那类页面） */
  comments?: DetailComments;
  labels: DetailLabels;
  /** 顶栏插槽（README §5-2：两种口径都能接） */
  topBar?: React.ReactNode;
  topMode?: 'topbar' | 'overlay' | 'none';
  /** 四态：`content` 时渲染实体，其余渲染 `T03`/`T02`/`T01` */
  state?: DetailState;
  error?: AppError | null;
  onRetry?: () => void;
  empty?: { kind: EmptyKind; title: string; description?: string; actionLabel: string; onAction: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/* ────────────────────────── 组件 ────────────────────────── */

export function DetailScreen({
  title,
  author,
  hero,
  body,
  metaLabel,
  interactions,
  onToggleLike,
  onToggleFavorite,
  onReport,
  onBack,
  comments,
  labels,
  topBar,
  topMode = 'topbar',
  state = 'content',
  error = null,
  onRetry,
  empty,
  style,
  testID,
}: DetailScreenProps): React.ReactElement {
  const theme = useTheme();
  const isNamed = author.kind === 'named';

  const countText = (value: number | null | undefined): string =>
    formatInteractionCount(value, labels.countPlaceholder);

  const action = (
    kind: InteractionKind,
    label: string,
    onPress: (() => void) | undefined,
    active: boolean,
    count?: number | null
  ): React.ReactElement => (
    <Pressable
      key={kind}
      testID={testID ? `${testID}-${kind}` : undefined}
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole="button"
      // 播报里带上计数（读屏用户要能知道"现在几个赞"）
      accessibilityLabel={count === undefined ? label : `${label}，${countText(count)}`}
      accessibilityState={{ selected: active, disabled: onPress === undefined }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space('space_1'),
        minHeight: theme.touchTarget,
        paddingHorizontal: theme.space('space_2'),
      }}
    >
      {/* 状态**不只靠颜色**：选中态换底色 + 图标色（双通道） */}
      <Icon source={INTERACTION_ICON[kind]} size="body" tint={active ? 'brand' : 'secondary'} />
      <Text role="caption" colorToken={active ? 'text-brand' : 'text-secondary'}>
        {count === undefined ? label : countText(count)}
      </Text>
    </Pressable>
  );

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space('space_2'),
        paddingHorizontal: theme.space('space_4'),
        paddingVertical: theme.space('space_2'),
      }}
    >
      {onBack ? (
        <Pressable
          testID={testID ? `${testID}-back` : undefined}
          onPress={onBack}
          accessibilityLabel={labels.back}
        >
          <Icon source={ChevronLeft} size="body" tint="primary" />
        </Pressable>
      ) : null}
      {/* 顶栏右侧**由页面注入**（C-06 未定：信箱按钮要不要留） */}
      <View style={{ flex: 1 }} />
      {topBar}
    </View>
  );

  if (state !== 'content') {
    return (
      <Screen topMode={topMode} testID={testID} style={style}>
        {header}
        {state === 'loading' ? (
          <LoadingState testID={testID ? `${testID}-loading` : undefined} />
        ) : state === 'error' ? (
          <ErrorState
            error={error ?? { kind: 'unknown' }}
            onAction={onRetry ?? (() => undefined)}
            testID={testID ? `${testID}-error` : undefined}
          />
        ) : empty ? (
          <EmptyState
            kind={empty.kind}
            title={empty.title}
            description={empty.description}
            actionLabel={empty.actionLabel}
            onAction={empty.onAction}
            testID={testID ? `${testID}-empty` : undefined}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen topMode={topMode} testID={testID} style={style}>
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space('space_8') }}>
        {hero}
        <View style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
          <Text role="title" emphasis="strong" colorToken="text-primary">
            {title}
          </Text>

          {/* 作者投影：**四个出口一起断**（头像/昵称/等级/跳转） */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
            {isNamed ? (
              <Pressable
                testID={testID ? `${testID}-author` : undefined}
                onPress={author.onPressAuthor}
                disabled={author.onPressAuthor === undefined}
                accessibilityLabel={author.name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}
              >
                <Text role="label" emphasis="strong" colorToken="text-primary">
                  {author.name}
                </Text>
                {author.levelLabel ? (
                  <Text role="caption" colorToken="text-brand">
                    {author.levelLabel}
                  </Text>
                ) : null}
              </Pressable>
            ) : (
              /* 匿名：**没有**可点区域、没有等级徽章 —— 只有一句话 */
              <Text role="label" colorToken="text-muted">
                {commentAuthorLabel(author, labels.anonymous)}
              </Text>
            )}
            {metaLabel ? (
              <Text role="caption" colorToken="text-muted">
                {metaLabel}
              </Text>
            ) : null}
          </View>

          {body}

          {/* 互动条 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderTopWidth: theme.borderWidth('border_width_hairline'),
              borderBottomWidth: theme.borderWidth('border_width_hairline'),
              borderColor: theme.color['border-subtle'].value,
            }}
          >
            {action('like', labels.like, onToggleLike, interactions.liked === true, interactions.likeCount)}
            {action(
              'favorite',
              labels.favorite,
              onToggleFavorite,
              interactions.favorited === true,
              interactions.favoriteCount
            )}
            {action('comment', labels.comment, undefined, false, interactions.commentCount)}
            <View style={{ flex: 1 }} />
            {action('report', labels.report, onReport, false)}
          </View>
        </View>

        {/* 评论区：只有给数据时才渲染（跑腿详情之类没有评论） */}
        {comments ? (
          <View style={{ paddingHorizontal: theme.space('space_4'), gap: theme.space('space_2') }}>
            <Text role="headline" emphasis="strong" colorToken="text-primary">
              {comments.title}
            </Text>
            <CommentThread
              testID={testID ? `${testID}-comments` : undefined}
              nodes={comments.nodes}
              labels={labels.comments}
              onToggleLike={comments.onToggleLike}
              onDelete={comments.onDelete}
              onReply={comments.onReply}
              /* ⛔ 分页状态机不在这里：映射自 `K05` 的 `PaginationState` */
              footer={
                <ListFooter
                  {...(listFooterState(comments.pagination) === 'retry'
                    ? {
                        state: 'retry' as const,
                        onRetry: comments.onRetry,
                        retryLabel: labels.commentsRetry,
                      }
                    : listFooterState(comments.pagination) === 'end'
                      ? { state: 'end' as const, endLabel: labels.commentsEnd }
                      : listFooterState(comments.pagination) === 'loading'
                        ? { state: 'loading' as const }
                        : { state: 'idle' as const })}
                  testID={testID ? `${testID}-comments-footer` : undefined}
                />
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** 供页面复用（评论项级渲染，如"被引用的评论"） */
export { CommentItem };
export type { CommentAuthor, CommentNode, PaginationState };
export { Button as DetailActionButton };
