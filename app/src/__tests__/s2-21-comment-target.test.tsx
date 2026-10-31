/**
 * 阶段A-07 · 评论定位参数与定向展开
 *
 * ① 公共评论组件：给 targetId 就自动展开所在组并标出目标（滚动归内容域）；
 * ② 两条详情路由：读通知带来的 `comment` 参数并透传给详情屏。
 */
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/shared/mediaLibrary', () => ({
  isAlbumAvailable: jest.fn(async () => false),
  createAlbumSaver: jest.fn(),
}));

jest.mock('@/features/campus/CampusScreens', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CampusDetailScreen: (props: Record<string, unknown>) => {
      mockDetailProps(props);
      return <View testID="detail-probe" />;
    },
  };
});

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { CommentThread, type CommentNode } from '@/components/ui/CommentThread';
import CampusRoute from '@/app/campus/[id]';
import WallRoute from '@/app/campus/wall/[id]';

const mockDetailProps = jest.fn();
let mockParams: { id?: string; comment?: string } = {};
const author = { kind: 'named' as const, name: '甲', avatarUrl: null };
const labels = {
  anonymous: '匿名',
  deleteLabel: '删除',
  replyLabel: '回复',
  likeLabel: '赞',
  moreReplies: (count: number) => `展开其余 ${count} 条`,
  collapse: '收起',
};
const node = (id: string, parentId: string | null, depth: 0 | 1, content: string): CommentNode => ({
  id,
  parentId,
  depth,
  author,
  content,
  createdAtLabel: '刚刚',
});
const nodes: CommentNode[] = [
  node('root-1', null, 0, '一级评论'),
  node('reply-1', 'root-1', 1, '回复一'),
  node('reply-2', 'root-1', 1, '回复二'),
  node('reply-3', 'root-1', 1, '回复三'),
];

beforeEach(() => {
  mockParams = { id: '9' };
  mockDetailProps.mockClear();
});

describe('评论定向展开（阶段A-07）', () => {
  it('目标是根评论：直接标出该条', async () => {
    const view = await renderApp(
      <CommentThread nodes={nodes} labels={labels} testID="thread" targetId="root-1" />
    );
    expect(view.getByTestId('thread-root-1').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('thread-reply-1').props.accessibilityState).toBeUndefined();
  });

  it('目标在默认折叠的回复里：自动展开所在组并标出该条', async () => {
    const view = await renderApp(
      <CommentThread nodes={nodes} labels={labels} testID="thread" targetId="reply-3" />
    );
    await waitFor(() => expect(view.getByTestId('thread-reply-3')).toBeTruthy());
    expect(view.getByTestId('thread-reply-3').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('thread-reply-1')).toBeTruthy();
  });

  it('目标不在已加载节点里：不展开、不抛错、列表照常', async () => {
    const view = await renderApp(
      <CommentThread nodes={nodes} labels={labels} testID="thread" targetId="deleted-99" />
    );
    expect(view.getByTestId('thread-root-1')).toBeTruthy();
    expect(view.queryByTestId('thread-reply-3')).toBeNull();
  });

  it('无目标时行为与改动前一致（折叠仍然生效）', async () => {
    const view = await renderApp(<CommentThread nodes={nodes} labels={labels} testID="thread" />);
    expect(view.queryByTestId('thread-reply-3')).toBeNull();
    expect(view.getByTestId('thread-root-1')).toBeTruthy();
  });
});

describe('详情路由透传评论参数（阶段A-07）', () => {
  it('树洞路由：带 comment 时传给详情屏', async () => {
    mockParams = { id: '9', comment: 'reply-3' };
    await renderApp(<CampusRoute />);
    await waitFor(() => expect(mockDetailProps).toHaveBeenCalled());
    expect(mockDetailProps.mock.calls.at(-1)?.[0]).toMatchObject({ comment: 'reply-3' });
  });

  it('万能墙路由：同样透传', async () => {
    mockParams = { id: '5', comment: 'c-1' };
    await renderApp(<WallRoute />);
    await waitFor(() => expect(mockDetailProps).toHaveBeenCalled());
    expect(mockDetailProps.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'wall', comment: 'c-1' });
  });

  it('无参数时透传 undefined（不改变详情行为）', async () => {
    await renderApp(<CampusRoute />);
    await waitFor(() => expect(mockDetailProps).toHaveBeenCalled());
    expect(mockDetailProps.mock.calls.at(-1)?.[0].comment).toBeUndefined();
  });
});
