/**
 * P3 · 万能墙阶段 3（讨论与共用互动）—— App 侧自动化
 *
 * 覆盖：
 *   - 帖内匿名编号 / 楼主 / 我 / 精选 的投影与轻量标识
 *   - 多级回复压平在一级评论下（rootId）与「回复 匿名XX」引用
 *   - 评论点赞 / 举报 / 精选入口与权限回调
 *   - 删除评论时本条与下级回复一起移除（与服务端级联一致）
 *   - 信息流互动按钮（点赞 / 收藏 / 评论）
 *   - 分享深链
 *
 * 真实后端 / 数据库 / 部署在 `.scratch/wall-p3-mysql.cjs` 的一次性 MySQL 中另行验证。
 */
import * as React from 'react';
import { userEvent } from '@testing-library/react-native';

import { translate } from '@/i18n';
import { CommentItem } from '@/components/ui/CommentItem';
import {
  CommentThread,
  canReplyTo,
  groupComments,
  type CommentNode,
} from '@/components/ui/CommentThread';
import { WallCardShell } from '@/features/campus/WallCardShell';
import { WallPostCard } from '@/features/campus/WallPostCard';
import { wallShareLink } from '@/features/campus/CampusScreens';
import {
  projectComments,
  removeCommentWithDescendants,
} from '@/features/campus/useCampusActions';
import { renderApp } from './helpers/renderApp';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate('zh', key, params);

const labels = {
  anonymous: '匿名',
  deleteLabel: '删除',
  replyLabel: '回复',
  likeLabel: '赞',
};

describe('P3 · 匿名编号与轻量标识', () => {
  it('万能墙投影：匿名编号、楼主、我、精选与回复引用都不含真实身份', () => {
    const nodes = projectComments(
      [
        {
          id: 501,
          parent_id: null,
          content: '一级评论',
          created_at: '2026-11-09T10:00:00.000Z',
          anonymous_no: 1,
          is_author: true,
          featured: true,
          viewer_is_mine: true,
        },
        {
          id: 502,
          parent_id: 501,
          root_id: 501,
          content: '回复一级',
          created_at: '2026-11-09T10:01:00.000Z',
          anonymous_no: 2,
          is_author: false,
          viewer_is_mine: false,
          reply_to_id: 501,
          reply_to_excerpt: '一级评论',
        },
      ],
      'wall',
      t,
      'zh'
    );

    expect(nodes).toHaveLength(2);
    expect(nodes[0].authorLabel).toBe('匿名01');
    expect(nodes[0].isAuthor).toBe(true);
    expect(nodes[0].isMine).toBe(true);
    expect(nodes[0].featured).toBe(true);
    expect(nodes[0].author.kind).toBe('anonymous');
    expect(nodes[1].authorLabel).toBe('匿名02');
    expect(nodes[1].rootId).toBe('501');
    expect(nodes[1].replyToId).toBe('501');
    expect(nodes[1].replyToExcerpt).toBe('一级评论');
    // 匿名域：投影结果里不允许出现任何身份字段
    expect(JSON.stringify(nodes)).not.toMatch(/user_id|nickname|avatar|username/);
  });

  it('回复的回复仍压平在同一个一级评论组里', () => {
    const node = (id: string, parentId: string | null, rootId: string | null): CommentNode => ({
      id,
      parentId,
      rootId,
      depth: parentId === null ? 0 : 1,
      author: { kind: 'anonymous' },
      content: id,
      createdAtLabel: '刚刚',
    });
    const groups = groupComments([
      node('a', null, null),
      node('b', 'a', 'a'),
      node('c', 'b', 'a'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].replies.map((reply) => reply.id)).toEqual(['b', 'c']);
  });
});

describe('P3 · CommentItem 的标识与入口', () => {
  it('渲染匿名编号、楼主/我/精选与回复引用，并回调精选/举报', async () => {
    const onToggleFeature = jest.fn();
    const onReport = jest.fn();
    const view = await renderApp(
      <CommentItem
        testID="c"
        author={{ kind: 'anonymous' }}
        authorLabel="匿名03"
        authorBadge="楼主"
        mineBadge="我"
        featured
        featuredBadge="精选"
        replyToLabel="回复 匿名02"
        replyToExcerpt="原评论内容"
        content="这是评论正文"
        createdAtLabel="刚刚"
        canFeature
        onToggleFeature={onToggleFeature}
        featureLabel="取消精选"
        onReport={onReport}
        reportLabel="举报评论"
        labels={labels}
      />
    );

    expect(view.getByText('匿名03')).toBeTruthy();
    expect(view.getByText('楼主')).toBeTruthy();
    expect(view.getByText('我')).toBeTruthy();
    expect(view.getByText('精选')).toBeTruthy();
    expect(view.getByText('回复 匿名02：原评论内容')).toBeTruthy();
    expect(view.getByText('这是评论正文')).toBeTruthy();

    const user = userEvent.setup();
    await user.press(view.getByTestId('c-feature'));
    await user.press(view.getByTestId('c-report'));
    expect(onToggleFeature).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('默认二级回复没有回复入口', async () => {
    const view = await renderApp(
      <CommentItem
        author={{ kind: 'anonymous' }}
        authorLabel="匿名02"
        content="回复内容"
        createdAtLabel="刚刚"
        depth={1}
        onReply={() => undefined}
        labels={labels}
      />
    );
    expect(view.queryByLabelText('回复')).toBeNull();
  });

  it('allowReply 打开后二级回复可以继续回复', async () => {
    const view = await renderApp(
      <CommentItem
        author={{ kind: 'anonymous' }}
        authorLabel="匿名02"
        content="回复内容"
        createdAtLabel="刚刚"
        depth={1}
        allowReply
        onReply={() => undefined}
        labels={labels}
      />
    );
    expect(view.getByLabelText('回复')).toBeTruthy();
  });
});

describe('P3 · CommentThread 回复任意评论与精选', () => {
  const baseNodes: CommentNode[] = [
    {
      id: 'a',
      parentId: null,
      depth: 0,
      author: { kind: 'anonymous' },
      authorLabel: '匿名01',
      isAuthor: true,
      content: '一级',
      createdAtLabel: '1 小时前',
      canFeature: true,
    },
    {
      id: 'b',
      parentId: 'a',
      rootId: 'a',
      depth: 1,
      author: { kind: 'anonymous' },
      authorLabel: '匿名02',
      content: '二级',
      createdAtLabel: '50 分钟前',
      replyToId: 'a',
      replyToExcerpt: '一级',
    },
    {
      id: 'c',
      parentId: 'b',
      rootId: 'a',
      depth: 1,
      author: { kind: 'anonymous' },
      authorLabel: '匿名03',
      content: '三级也压平',
      createdAtLabel: '40 分钟前',
      replyToId: 'b',
      replyToExcerpt: '二级',
    },
  ];

  const threadLabels = {
    ...labels,
    moreReplies: (count: number) => `${count} 条回复`,
    collapse: '收起',
    authorBadge: '楼主',
    mineBadge: '我',
    featuredBadge: '精选',
    feature: '设为精选',
    unfeature: '取消精选',
    reportComment: '举报评论',
    replyToDeleted: '回复已删除评论',
    replyTo: (name: string) => `回复 ${name}`,
  };

  it('允许回复二级回复，引用目标保持在同一条一级评论下', async () => {
    const onReply = jest.fn();
    const view = await renderApp(
      <CommentThread
        testID="thread"
        nodes={baseNodes}
        labels={threadLabels}
        onReply={onReply}
        allowNestedReply
      />
    );

    expect(view.getByText('回复 匿名01：一级')).toBeTruthy();
    expect(view.getByText('回复 匿名02：二级')).toBeTruthy();
    expect(view.getByTestId('thread-c')).toBeTruthy();
    // 一级 + 两条回复都有回复入口
    expect(view.getAllByLabelText('回复')).toHaveLength(3);

    const user = userEvent.setup();
    await user.press(view.getAllByLabelText('回复')[2]);
    expect(onReply).toHaveBeenCalledWith('c');
  });

  it('默认仍只有一级评论可回复（其它评论区不变）', async () => {
    const view = await renderApp(
      <CommentThread testID="thread" nodes={baseNodes} labels={threadLabels} onReply={() => undefined} />
    );
    expect(view.getAllByLabelText('回复')).toHaveLength(1);
  });

  it('楼主精选入口只在可精选的一级评论上出现', async () => {
    const onToggleFeature = jest.fn();
    const view = await renderApp(
      <CommentThread
        testID="thread"
        nodes={baseNodes}
        labels={threadLabels}
        onToggleFeature={onToggleFeature}
        onReportComment={() => undefined}
      />
    );
    expect(view.queryByTestId('thread-a-feature')).toBeTruthy();
    expect(view.queryByTestId('thread-b-feature')).toBeNull();
    expect(view.getByText('楼主')).toBeTruthy();

    const user = userEvent.setup();
    await user.press(view.getByTestId('thread-a-feature'));
    expect(onToggleFeature).toHaveBeenCalledWith('a');
  });

  it('目标已删除时显示「回复已删除评论」而不是已删除正文', async () => {
    const view = await renderApp(
      <CommentThread
        testID="thread"
        nodes={[
          {
            id: 'b',
            parentId: 'deleted-parent',
            rootId: 'a',
            depth: 1,
            author: { kind: 'anonymous' },
            authorLabel: '匿名02',
            content: '回复内容',
            createdAtLabel: '刚刚',
            replyToId: 'deleted-parent',
            replyToExcerpt: null,
          },
          {
            id: 'a',
            parentId: null,
            depth: 0,
            author: { kind: 'anonymous' },
            authorLabel: '匿名01',
            content: '一级',
            createdAtLabel: '1 小时前',
          },
        ]}
        labels={threadLabels}
      />
    );
    expect(view.getByText('回复已删除评论')).toBeTruthy();
  });
});

describe('P3 · 删除评论与信息流互动', () => {
  const node = (id: string, parentId: string | null): CommentNode => ({
    id,
    parentId,
    depth: parentId === null ? 0 : 1,
    author: { kind: 'anonymous' },
    content: id,
    createdAtLabel: '刚刚',
  });

  it('删除一级评论会带走整条回复链', () => {
    const result = removeCommentWithDescendants(
      [node('a', null), node('b', 'a'), node('c', 'b'), node('d', null)],
      'a'
    );
    expect(result.removed).toBe(3);
    expect(result.nodes.map((item) => item.id)).toEqual(['d']);
  });

  it('删除中间回复只带走它自己的下级', () => {
    const result = removeCommentWithDescendants(
      [node('a', null), node('b', 'a'), node('c', 'b'), node('d', 'a')],
      'b'
    );
    expect(result.removed).toBe(2);
    expect(result.nodes.map((item) => item.id)).toEqual(['a', 'd']);
  });

  it('信息流卡片：点赞 / 收藏 / 评论都能点，选中态可读', async () => {
    const onLike = jest.fn();
    const onFavorite = jest.fn();
    const onComment = jest.fn();
    const view = await renderApp(
      <WallCardShell
        cardId={7}
        background="#ffffff"
        muted="#666666"
        timeLabel="2 小时前"
        likeCount={3}
        commentCount={2}
        liked
        favorited
        onLike={onLike}
        onFavorite={onFavorite}
        onComment={onComment}
        actionLabels={{ like: '喜欢 3', comment: '评论 2', save: '收藏' }}
        accessibilityLabel="帖子"
      >
        <React.Fragment />
      </WallCardShell>
    );

    expect(view.getByTestId('wall-row-7-like').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByTestId('wall-row-7-save').props.accessibilityState).toMatchObject({ selected: true });

    const user = userEvent.setup();
    await user.press(view.getByTestId('wall-row-7-like'));
    await user.press(view.getByTestId('wall-row-7-save'));
    await user.press(view.getByTestId('wall-row-7-comment'));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onFavorite).toHaveBeenCalledTimes(1);
    expect(onComment).toHaveBeenCalledTimes(1);
  });

  it('信息流卡片上点互动不会误触打开详情', async () => {
    const onOpen = jest.fn();
    const onLike = jest.fn();
    const view = await renderApp(
      <WallPostCard
        post={{
          id: 9,
          kind: 'free',
          content: '正文',
          likeCount: 2,
          commentCount: 1,
          liked: false,
          favorited: false,
        }}
        onOpen={onOpen}
        onLike={onLike}
      />
    );
    const user = userEvent.setup();
    await user.press(view.getByTestId('wall-row-9-like'));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('没有处理函数时互动区保持静态（不是假按钮）', async () => {
    const view = await renderApp(
      <WallCardShell
        cardId={8}
        background="#ffffff"
        muted="#666666"
        timeLabel=""
        likeCount={1}
        commentCount={0}
        actionLabels={{ like: '喜欢 1', comment: '评论 0', save: '收藏' }}
        accessibilityLabel="帖子"
      >
        <React.Fragment />
      </WallCardShell>
    );
    const like = view.getByTestId('wall-row-8-like');
    expect(like.props.accessibilityRole).toBeUndefined();
    expect(like.props.onPress).toBeUndefined();
  });

  it('分享深链固定为 xmumdorm://campus/wall/:id', () => {
    expect(wallShareLink(42)).toBe('xmumdorm://campus/wall/42');
  });

  it('canReplyTo 仍是「一级可回复」的纯函数（多级由 allowNestedReply 决定）', () => {
    expect(canReplyTo(0)).toBe(true);
    expect(canReplyTo(1)).toBe(false);
  });
});
