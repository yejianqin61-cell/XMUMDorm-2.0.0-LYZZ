/**
 * 万能墙阶段 1 —— **统一信息流骨架**的行为回归
 *
 * 守住的所有者口径（2026-11-02）：
 *   · 两种帖子（自由帖 / 招募帖）在**同一个单列信息流**里混排；
 *   · 共用同一套外壳：内容区 + 底部互动栏（左＝计数，右＝时间），首页不重复匿名行；
 *   · 示例内容**明确标注**、不写库、不发请求，且不可点进详情；
 *   · 旧六卡版式不再参与呈现（历史行按自由帖纯文本阅读）。
 */

import * as React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';

import { WallFeed } from '@/features/campus/WallFeed';
import { WALL_SAMPLE_POSTS } from '@/features/campus/wallSamplePosts';
import { wallPostFromRow } from '@/features/campus/wallPost';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';
import { getQueryClient } from '@/shared/queryClient';
import { getConfessionWindow } from '../../../shared/api/confessions';
import { renderApp } from './helpers/renderApp';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'signedIn',
    identifier: 'owner-a',
    isSignedIn: true,
    handleAuthFailure: jest.fn(async () => ({ kind: 'permission' })),
  }),
}));
jest.mock('../../../shared/api/confessions', () => ({ getConfessionWindow: jest.fn() }));

const wall = getConfessionWindow as jest.Mock;
const emptyWindow = { items: [], has_older: false, oldest_cursor: null };

beforeEach(() => {
  getQueryClient().clear();
  secondaryTabStore.clear();
  wall.mockReset();
  mockPush.mockReset();
});

describe('阶段 1 · 两卡混排信息流', () => {
  it('6 条示例帖同屏，自由帖与招募帖交替出现且逐卡标注「示例」', async () => {
    wall.mockResolvedValue(emptyWindow);
    const view = await renderApp(<WallFeed />);

    await waitFor(() => expect(view.getByTestId('wall-sample-band')).toBeTruthy());
    expect(view.getByTestId('wall-sample-notice')).toBeTruthy();
    for (const post of WALL_SAMPLE_POSTS) {
      expect(view.getByTestId(`wall-card-${post.id}`)).toBeTruthy();
      // 收尾版：首页不再重复「匿名 · 时间」，也不再挂类型/示例标签；
      // 时间作为元信息落在底部互动栏右侧。
      expect(view.getByTestId(`wall-row-time-${post.id}`)).toBeTruthy();
    }
    expect(view.queryByText('匿名')).toBeNull();
    expect(view.queryByTestId('wall-sample-tag-900001')).toBeNull();
    expect(view.queryByTestId('wall-type-900002')).toBeNull();
    // 同一列里两种内部内容都在：4 条自由帖 + 2 条招募帖
    expect(view.getAllByTestId('wall-free-body')).toHaveLength(4);
    expect(view.getAllByTestId('wall-recruit-body')).toHaveLength(2);
  });

  it('自由帖正文完整可读：长文、换行与中英混排都不截断', async () => {
    wall.mockResolvedValue(emptyWindow);
    const view = await renderApp(<WallFeed />);

    const long = WALL_SAMPLE_POSTS.find((post) => post.id === 900004);
    expect(long).toBeDefined();
    await waitFor(() => expect(view.getByText(long!.content)).toBeTruthy());
    expect(view.getByText(long!.content).props.numberOfLines).toBeUndefined();
    expect(view.getByText(/Any update would be great/)).toBeTruthy();
  });

  it('招募帖内部是结构化信息：标题、描述、人数、时间、地点与状态', async () => {
    wall.mockResolvedValue(emptyWindow);
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByTestId('wall-card-900005')).toBeTruthy());

    const card = within(view.getByTestId('wall-card-900005'));
    expect(card.getByText('摄影社外拍招募：布城老城区扫街')).toBeTruthy();
    expect(card.getByText(/需要两位同学帮忙拿器材/)).toBeTruthy();
    // 首页最多两行：标题与描述都截断，但数据本身是全文（阶段 5 详情/编辑读同一份）
    expect(card.getByTestId('wall-recruit-title').props.numberOfLines).toBe(2);
    expect(card.getByTestId('wall-recruit-description').props.numberOfLines).toBe(2);
    expect(card.getByTestId('wall-recruit-headcount')).toHaveTextContent(/6\/12/);
    expect(card.getByText('周六 14:00–18:00')).toBeTruthy();
    expect(card.getByText('校门口集合，统一出发')).toBeTruthy();
    expect(card.getByTestId('wall-recruit-status')).toHaveTextContent(/招募中/);
    // 招募帖不套自由帖的文字容器
    expect(card.queryByTestId('wall-free-body')).toBeNull();
  });

  it('公共操作区只是静态计数，不是未实现的可点按钮', async () => {
    wall.mockResolvedValue(emptyWindow);
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByTestId('wall-row-900001-like')).toBeTruthy());

    const like = view.getByTestId('wall-row-900001-like');
    expect(like.props.accessibilityLabel).toBe('喜欢 12');
    expect(like.props.accessibilityRole).toBeUndefined();
    const card = within(view.getByTestId('wall-card-900001'));
    expect(card.getByText('12')).toBeTruthy();
    expect(card.getByText('4')).toBeTruthy();
    // 时间与互动栏同一行（右侧元信息）
    expect(card.getByTestId('wall-row-time-900001')).toBeTruthy();
    // 没有收藏数字的帖子只显示图标事实
    expect(view.getByTestId('wall-row-900001-save')).toBeTruthy();
  });
});

describe('阶段 1 · 匿名与真实行', () => {
  it('服务端身份不外泄；示例帖没有可点入口，真实行仍可进详情', async () => {
    wall.mockResolvedValue({
      items: [
        {
          id: 40,
          content: '真实墙帖正文',
          template_key: 'announcement',
          created_at: '2026-10-29T12:00:00Z',
          author: { nickname: '泄漏作者', avatar: 'https://example.test/a.png' },
          like_count: 2,
          comment_count: 1,
        },
      ],
      has_older: false,
      oldest_cursor: 40,
    });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByText('真实墙帖正文')).toBeTruthy());

    expect(view.queryByText('泄漏作者')).toBeNull();
    expect(view.queryByTestId('treehole-author-avatar')).toBeNull();
    const row = within(view.getByTestId('campus-row-40'));
    // 首页不显示匿名行；时间改在底部互动栏
    expect(row.queryByText('匿名')).toBeNull();
    expect(row.getByTestId('wall-row-time-40')).toBeTruthy();
    expect(row.getByTestId('wall-free-body')).toBeTruthy();
    // 示例帖不是按钮：没有 campus-row 可点目标
    expect(view.queryByTestId('campus-row-900001')).toBeNull();

    await fireEvent.press(view.getByTestId('campus-row-40'));
    expect(mockPush).toHaveBeenCalledWith('/campus/wall/40');
  });

  it('示例内容不依赖后端：读取失败时示例流仍在，错误态可重试', async () => {
    wall.mockRejectedValue(new TypeError('offline'));
    const view = await renderApp(<WallFeed />);

    await waitFor(() => expect(view.getByTestId('wall-feed-error')).toBeTruthy());
    expect(view.getByTestId('wall-card-900001')).toBeTruthy();
    expect(view.getByTestId('wall-card-900006')).toBeTruthy();
  });
});

describe('阶段 1 · 双语与投影', () => {
  it('英文界面复用同一外壳，首页同样不出现匿名行与类型标签', async () => {
    wall.mockResolvedValue(emptyWindow);
    const view = await renderApp(<WallFeed />, { locale: 'en' });

    await waitFor(() => expect(view.getByTestId('wall-sample-notice')).toBeTruthy());
    expect(view.getByTestId('wall-sample-notice')).toHaveTextContent(/Sample content/);
    expect(view.queryByText('Anonymous')).toBeNull();
    expect(view.getByTestId('wall-row-time-900001')).toHaveTextContent(/min ago/);
  });

  it('历史六卡行一律投影为自由帖，模板键不参与呈现', () => {
    expect(wallPostFromRow({ id: 7, content: '旧清单内容', template_key: 'checklist' })).toEqual({
      id: 7,
      kind: 'free',
      content: '旧清单内容',
      likeCount: 0,
      commentCount: 0,
    });
    expect(
      wallPostFromRow({
        id: 8,
        content: '带计数',
        template_key: 'announcement',
        created_at: '2026-10-29T12:00:00Z',
        like_count: 5,
        comment_count: 3,
      })
    ).toEqual({
      id: 8,
      kind: 'free',
      content: '带计数',
      createdAt: '2026-10-29T12:00:00Z',
      likeCount: 5,
      commentCount: 3,
    });
  });
});
