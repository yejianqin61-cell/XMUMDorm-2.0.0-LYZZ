/**
 * P3 · 万能墙阶段 3 —— 互动/评论状态机（useCampusActions）
 *
 * 只验证客户端状态与请求契约；真实服务端行为由一次性 MySQL 集成脚本验证。
 */
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { act, waitFor, userEvent } from '@testing-library/react-native';

import {
  useCampusActions,
  type CampusInteractionPost,
} from '@/features/campus/useCampusActions';
import {
  createConfessionComment,
  deleteConfessionComment,
  featureConfessionComment,
  getConfessionComments,
  toggleConfessionCommentLike,
  toggleConfessionFavorite,
} from '../../../shared/api/confessions';
import { submitReport } from '../../../shared/api/admin';
import { renderApp } from './helpers/renderApp';

jest.mock('../../../shared/api/confessions', () => ({
  getConfessionComments: jest.fn(),
  createConfessionComment: jest.fn(),
  deleteConfessionComment: jest.fn(),
  toggleConfessionCommentLike: jest.fn(),
  featureConfessionComment: jest.fn(),
  toggleConfessionLike: jest.fn(),
  toggleConfessionFavorite: jest.fn(),
}));
jest.mock('../../../shared/api/admin', () => ({ submitReport: jest.fn() }));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({
    identifier: 'reader',
    status: 'signedIn',
    isSignedIn: true,
    handleAuthFailure: jest.fn(),
  }),
}));

const comments = jest.mocked(getConfessionComments);
const create = jest.mocked(createConfessionComment);
const remove = jest.mocked(deleteConfessionComment);
const likeComment = jest.mocked(toggleConfessionCommentLike);
const feature = jest.mocked(featureConfessionComment);
const report = jest.mocked(submitReport);

const POST: CampusInteractionPost = {
  id: 101,
  is_mine: true,
  liked: false,
  favorited: false,
  like_count: 2,
  comment_count: 2,
};

function commentPage(overrides: Record<string, unknown> = {}) {
  return [
    {
      id: 1,
      parent_id: null,
      content: '一级评论',
      created_at: '2026-11-09T10:00:00.000Z',
      anonymous_no: 1,
      is_author: true,
      featured: false,
      like_count: 0,
      ...overrides,
    },
    {
      id: 2,
      parent_id: 1,
      root_id: 1,
      content: '二级回复',
      created_at: '2026-11-09T10:01:00.000Z',
      anonymous_no: 2,
      reply_to_id: 1,
      reply_to_excerpt: '一级评论',
      like_count: 3,
      replies: [],
    },
  ];
}

function Harness(): React.ReactElement {
  const actions = useCampusActions(POST, 'wall');
  return (
    <View>
      <Text testID="nodes">
        {actions.comments.nodes
          .map((node) => `${node.id}:${node.authorLabel}:${node.featured ? 'F' : ''}:${node.liked ? 'L' : ''}`)
          .join('|')}
      </Text>
      <Text testID="count">{String(actions.interactions.commentCount)}</Text>
      <Text testID="sort">{actions.comments.sort}</Text>
      <Text testID="notice">{String(actions.comments.notice)}</Text>
      <Text testID="reply-context">
        {actions.replyContext?.kind === 'anonymous' ? actions.replyContext.anonymousLabel : ''}
      </Text>
      <Pressable testID="sort-latest" onPress={() => actions.comments.setSort('latest')}>
        <Text>latest</Text>
      </Pressable>
      <Pressable testID="like-2" onPress={() => actions.comments.onToggleLike('2')}>
        <Text>like</Text>
      </Pressable>
      <Pressable testID="feature-1" onPress={() => actions.comments.onToggleFeature('1')}>
        <Text>feature</Text>
      </Pressable>
      <Pressable testID="delete-1" onPress={() => actions.comments.deleteComment('1')}>
        <Text>delete</Text>
      </Pressable>
      <Pressable testID="reply-2" onPress={() => actions.comments.onReply('2')}>
        <Text>reply</Text>
      </Pressable>
      <Pressable testID="draft" onPress={() => actions.setDraft('回复内容')}>
        <Text>draft</Text>
      </Pressable>
      <Pressable testID="draft-500" onPress={() => actions.setDraft('字'.repeat(500))}>
        <Text>draft500</Text>
      </Pressable>
      <Pressable testID="draft-501" onPress={() => actions.setDraft('字'.repeat(501))}>
        <Text>draft501</Text>
      </Pressable>
      <Pressable testID="send" onPress={() => actions.send()}>
        <Text>send</Text>
      </Pressable>
      <Pressable testID="report-open" onPress={() => actions.comments.report.open('2')}>
        <Text>open</Text>
      </Pressable>
      <Pressable
        testID="report-submit"
        onPress={() => void actions.comments.report.submit('spam', '详情')}
      >
        <Text>submit</Text>
      </Pressable>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  comments.mockResolvedValue(commentPage() as never);
  create.mockResolvedValue({
    id: 3,
    parent_id: 2,
    content: '回复内容',
    created_at: '2026-11-09T10:02:00.000Z',
    anonymous_no: 2,
    is_author: false,
    like_count: 0,
    liked: false,
  } as never);
  remove.mockResolvedValue({ status: 0 } as never);
  likeComment.mockResolvedValue({ comment_id: 2, liked: true, like_count: 4 } as never);
  feature.mockResolvedValue({ comment_id: 1, featured: true, featured_at: '2026-11-09T11:00:00.000Z' } as never);
  report.mockResolvedValue({ id: 9 } as never);
});

it('默认按最热加载评论，切到最新会带 sort 重新请求', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('1:匿名01'));

  expect(comments).toHaveBeenCalledWith(101, { sort: 'hot' });
  expect(view.getByTestId('nodes').props.children).toContain('2:匿名02');

  const user = userEvent.setup();
  await user.press(view.getByTestId('sort-latest'));

  await waitFor(() => expect(comments).toHaveBeenLastCalledWith(101, { sort: 'latest' }));
  expect(view.getByTestId('sort').props.children).toBe('latest');
});

it('评论点赞先乐观更新，再用服务端计数校准', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('like-2'));

  await waitFor(() => expect(likeComment).toHaveBeenCalledWith(101, 2));
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02::L'));
});

it('评论点赞失败会回滚并给出可感知提示', async () => {
  likeComment.mockRejectedValueOnce(new Error('network'));
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('like-2'));

  await waitFor(() => expect(view.getByTestId('notice').props.children).toBe('likeFailed'));
  expect(view.getByTestId('nodes').props.children).not.toContain('2:匿名02::L');
});

it('楼主精选调用接口并按服务端结果重新读取；超过上限给出提示', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('1:匿名01'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('feature-1'));
  await waitFor(() => expect(feature).toHaveBeenCalledWith(101, 1, true));
  await waitFor(() => expect(comments).toHaveBeenCalledTimes(2));

  feature.mockRejectedValueOnce({ status: 409 });
  await user.press(view.getByTestId('feature-1'));
  await waitFor(() => expect(view.getByTestId('notice').props.children).toBe('featureLimit'));
});

it('删除一级评论会同时移除下级回复并减少评论数；失败回滚', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('count').props.children).toBe('2'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('delete-1'));
  await waitFor(() => expect(remove).toHaveBeenCalledWith(101, 1));
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toBe(''));
  expect(view.getByTestId('count').props.children).toBe('0');
});

it('删除失败会恢复原来的评论与计数', async () => {
  remove.mockRejectedValueOnce(new Error('network'));
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('count').props.children).toBe('2'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('delete-1'));

  await waitFor(() => expect(remove).toHaveBeenCalledWith(101, 1));
  await waitFor(() =>
    expect(view.getByTestId('nodes').props.children).toContain('1:匿名01')
  );
  expect(view.getByTestId('count').props.children).toBe('2');
  expect(view.getByTestId('nodes').props.children).toContain('2:匿名02');
});

it('可以回复任意评论，发送时带上真实的父评论 id 且归到一级评论下', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('reply-2'));
  expect(view.getByTestId('reply-context').props.children).toBe('回复 匿名02');

  await user.press(view.getByTestId('draft'));
  await user.press(view.getByTestId('send'));

  await waitFor(() =>
    expect(create).toHaveBeenCalledWith(101, { content: '回复内容', parent_id: 2 })
  );
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('3:匿名02'));
  expect(view.getByTestId('count').props.children).toBe('3');
});

it('连点评论点赞只发一次请求', async () => {
  let resolve: (value: unknown) => void = () => undefined;
  likeComment.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }) as never
  );
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('like-2'));
  await user.press(view.getByTestId('like-2'));
  expect(likeComment).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolve({ comment_id: 2, liked: true, like_count: 4 });
  });
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02::L'));
});

it('500 字极端评论可发送，501 字被挡下', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('nodes').props.children).toContain('2:匿名02'));

  const user = userEvent.setup();
  await user.press(view.getByTestId('draft-501'));
  await user.press(view.getByTestId('send'));
  expect(create).not.toHaveBeenCalled();

  await user.press(view.getByTestId('draft-500'));
  await user.press(view.getByTestId('send'));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  const payload = create.mock.calls[0][1] as { content: string };
  expect(payload.content).toHaveLength(500);
});

it('评论举报复用统一举报契约（confession_comment）', async () => {
  const view = await renderApp(<Harness />);
  const user = userEvent.setup();
  await user.press(view.getByTestId('report-open'));
  expect(view.getByTestId('report-submit')).toBeTruthy();
  await user.press(view.getByTestId('report-submit'));

  await waitFor(() =>
    expect(report).toHaveBeenCalledWith({
      target_type: 'confession_comment',
      target_id: 2,
      reason: 'spam',
      detail: '详情',
      screenshots: undefined,
    })
  );
});
