/**
 * P2X 校园内容（树洞 / 万能墙）—— 2026-10-18 重构后的行为回归
 *
 * 守住的是**旧实现已验证过的行为契约**（分页、筛选、竞态、匿名、点赞、评论、举报、返回），
 * 只把渲染目标换成了新组件（`TreeholeFeed` / `WallFeed` / `CampusDetailScreen`）。
 *
 * 新增的布局契约单独由 `p2x-treehole-phase-two-contract.test.ts` 守（源码结构），
 * 这里只测**用户可见行为**。
 */

import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import { CampusDetailScreen, TreeholeFeed, WallFeed } from '@/features/campus/CampusScreens';
import { WallTemplateContent } from '@/features/campus/wallTemplates';
import { getQueryClient } from '@/shared/queryClient';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';
import { QK } from '../../../shared/query/queryKeys';
import {
  getPostComments,
  getPostDetail,
  getPostList,
  getPostTagsList,
  createComment,
  toggleLike,
} from '../../../shared/api/posts';
import {
  getConfession,
  getConfessionComments,
  getConfessionWindow,
  createConfessionComment,
  toggleConfessionLike,
  deleteConfession,
  deleteConfessionComment,
} from '../../../shared/api/confessions';
import type { ListScreenProps } from '@/components/ui/ListScreen';
import { renderApp } from './helpers/renderApp';

/* ── expo-router：把原生 Header 的 options 真渲染出来，行为（⋯/返回）才可测 ── */
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const FocusContext = React.createContext(true);
  const router = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  };
  return {
    __router: router,
    __FocusProvider: FocusContext.Provider,
    useFocusEffect: (effect: () => void | (() => void)) => {
      const focused = React.useContext(FocusContext);
      React.useEffect(() => focused ? effect() : undefined, [effect, focused]);
    },
    useRouter: () => router,
    useLocalSearchParams: () => ({}),
    Redirect: (props: unknown) => React.createElement(View, props),
    Stack: {
      Screen: ({ options }: { options?: Record<string, unknown> }) =>
        React.createElement(
          View,
          { testID: 'campus-header' },
          React.createElement(Text, { testID: 'campus-header-title' }, String(options?.title ?? '')),
          typeof options?.headerLeft === 'function' ? options.headerLeft() : null,
          typeof options?.headerRight === 'function' ? options.headerRight() : null
        ),
    },
  };
});
// SymbolView 在 Jest 里没有字体渲染，换成占位即可（header 结构仍可点）
jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SymbolView: (props: unknown) => React.createElement(View, props) };
});

const routerModuleMock = require('expo-router') as {
  __FocusProvider: React.Provider<boolean>;
  __router: {
    push: jest.Mock;
    back: jest.Mock;
    replace: jest.Mock;
    canGoBack: jest.Mock;
    setParams: jest.Mock;
  };
};
const routerMock = routerModuleMock.__router;

const mockAuthFailure = jest.fn(async () => ({ kind: 'permission' }));
const mockSession = { status: 'signedIn', identifier: 'owner-a' as string | null, isSignedIn: true, handleAuthFailure: mockAuthFailure };
jest.mock('@/features/auth/session', () => ({ useSession: () => mockSession }));

jest.mock('../../../shared/api/posts', () => ({
  getPostList: jest.fn(),
  getPostDetail: jest.fn(),
  getPostTagsList: jest.fn(),
  toggleLike: jest.fn(),
  getPostComments: jest.fn(),
  createComment: jest.fn(),
}));
jest.mock('../../../shared/api/confessions', () => ({
  getConfessionWindow: jest.fn(),
  getConfession: jest.fn(),
  toggleConfessionLike: jest.fn(),
  getConfessionComments: jest.fn(),
  createConfessionComment: jest.fn(),
  deleteConfession: jest.fn(),
  deleteConfessionComment: jest.fn(),
}));

/** 捕获分页 props：用例自己触发 append / refresh（FlashList 的滚动在 Jest 里不触发） */
let mockListProps: ListScreenProps<unknown>;
jest.mock('@/components/ui/ListScreen', () => {
  const actual = jest.requireActual('@/components/ui/ListScreen');
  const React = require('react');
  return {
    ...actual,
    ListScreen: (props: ListScreenProps<unknown>) => {
      mockListProps = props;
      return React.createElement(actual.ListScreen, { ...props, onEndReached: () => undefined });
    },
  };
});

const list = getPostList as jest.Mock;
const detail = getPostDetail as jest.Mock;
const tags = getPostTagsList as jest.Mock;
const wall = getConfessionWindow as jest.Mock;
const wallDetail = getConfession as jest.Mock;

function resetRouter(): void {
  routerMock.push.mockClear();
  routerMock.back.mockClear();
  routerMock.replace.mockClear();
  routerMock.canGoBack.mockReset().mockReturnValue(true);
  routerMock.setParams.mockClear();
}

beforeEach(() => {
  getQueryClient().clear();
  secondaryTabStore.clear();
  jest.clearAllMocks();
  resetRouter();
  mockSession.isSignedIn = true;
  mockSession.status = 'signedIn';
  mockSession.identifier = 'owner-a';
  mockAuthFailure.mockReset().mockResolvedValue({ kind: 'permission' });
  list.mockReset();
  detail.mockReset();
  tags.mockReset().mockResolvedValue([]);
  wall.mockReset();
  wallDetail.mockReset();
  (toggleLike as jest.Mock).mockReset();
  (createComment as jest.Mock).mockReset();
  (getPostComments as jest.Mock).mockReset().mockResolvedValue([]);
  (getConfessionComments as jest.Mock).mockReset().mockResolvedValue([]);
  (toggleConfessionLike as jest.Mock).mockReset();
  (createConfessionComment as jest.Mock).mockReset();
});

describe('树洞列表', () => {
  it('从第一页读取；点内容进详情（不同时触发动作）', async () => {
    list.mockResolvedValue({ list: [{ id: 7, title: '校内交流', content: '周末运动' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByText('校内交流')).toBeTruthy());
    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    await fireEvent.press(view.getByTestId('campus-row-7'));
    expect(routerMock.push).toHaveBeenCalledWith('/campus/7');
  });

  it('行展示身份、相对时间与服务端计数（图标 + 数字）', async () => {
    list.mockResolvedValue({
      list: [
        {
          id: 7,
          title: '校内交流',
          content: '周末运动',
          author: { nickname: '小林' },
          created_at: new Date().toISOString(),
          like_count: 12,
          comment_count: 3,
        },
      ],
      hasMore: false,
    });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByText('小林')).toBeTruthy());
    expect(view.getByTestId('treehole-author-time')).toHaveTextContent('刚刚');
    expect(view.getByTestId('campus-row-7-like-count')).toHaveTextContent('12');
    expect(view.getByTestId('campus-row-7-comment-count')).toHaveTextContent('3');
  });

  it('内容块与媒体块是拉伸容器（文字左对齐、图片有宽度）', async () => {
    list.mockResolvedValue({
      list: [
        {
          id: 7,
          title: '校内交流',
          content: '周末运动',
          images: [{ url: 'https://example.com/a.webp' }],
        },
      ],
      hasMore: false,
    });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByTestId('campus-row-7')).toBeTruthy());
    // 2026-10-18 实测缺陷：内容塞进居中容器 → 标题/正文居中、媒体框塌成 0 宽（图片不可见）
    expect(view.getByTestId('campus-row-7')).toHaveStyle({ alignItems: 'stretch' });
    expect(view.getByTestId('campus-row-7-media')).toHaveStyle({ alignItems: 'stretch' });
    expect(view.getByTestId('treehole-media-feed')).toBeTruthy();
  });

  it('标签筛选是下拉列表：选中写回 store，「全部」回到无筛选', async () => {
    tags.mockResolvedValue([{ id: 7, name_zh: '组队自习', name_en: 'Study group' }]);
    list.mockResolvedValue({ list: [{ id: 7, content: '找自习搭子' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    const trigger = await waitFor(() => view.getByTestId('campus-tag-filter'));
    // 折叠态只有一行：当前值 = 全部（不再是摊开的一排圆角 Tab）
    expect(within(trigger).getByText(/全部|All/)).toBeTruthy();

    await fireEvent.press(trigger);
    // 2026-10-18 实测缺陷：字段名错位曾让每个选项都是空字符串
    const option = await waitFor(() => view.getByLabelText(/组队自习|Study group/));
    await fireEvent.press(option);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, tagId: 7 })
    );
    expect(secondaryTabStore.get('square', 'confession').filters).toEqual({ tag: '7' });

    await fireEvent.press(view.getByTestId('campus-tag-filter'));
    await fireEvent.press(await waitFor(() => view.getByLabelText(/^全部$|^All$/)));
    await waitFor(() => expect(secondaryTabStore.get('square', 'confession').filters).toEqual({}));
  });

  it('标签目录失败不阻断阅读（筛选入口隐藏）', async () => {
    tags.mockRejectedValue(new TypeError('tags unavailable'));
    list.mockResolvedValue({ list: [{ id: 7, content: '仍可阅读' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByText('仍可阅读')).toBeTruthy());
    expect(view.queryByTestId('campus-tag-filter')).toBeNull();
  });

  it('分页失败重试同一页、去重并在末页停止', async () => {
    list
      .mockResolvedValueOnce({ list: [{ id: 7, content: '首篇' }], hasMore: true })
      .mockRejectedValueOnce(new TypeError('retry'))
      .mockResolvedValueOnce({
        list: [
          { id: 7, content: '首篇' },
          { id: 8, content: '次篇' },
        ],
        hasMore: false,
      });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByText('首篇')).toBeTruthy());
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(mockListProps.pagination?.errorScope).toBe('append'));
    await act(async () => mockListProps.onRetryAppend?.());
    await waitFor(() => expect(view.getByText('次篇')).toBeTruthy());
    expect(list.mock.calls.map((call) => call[0].page)).toEqual([1, 2, 2]);
    expect(view.getAllByText('首篇')).toHaveLength(1);
    await act(async () => mockListProps.onEndReached());
    expect(list).toHaveBeenCalledTimes(3);
  });

  it('刷新一栏归零位置；切走再回来保留位置与已加载页', async () => {
    list
      .mockResolvedValueOnce({ list: [{ id: 7, content: '旧树洞' }], hasMore: true })
      .mockResolvedValueOnce({ list: [{ id: 8, content: '新树洞' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByText('旧树洞')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(120));
    await act(async () => mockListProps.onRefresh());
    await waitFor(() => expect(view.getByText('新树洞')).toBeTruthy());
    expect(view.queryByText('旧树洞')).toBeNull();
    expect(mockListProps.restoredScrollOffset).toBe(0);
  });

  it('发布后缓存被移除时已挂载列表重新读取', async () => {
    list
      .mockResolvedValueOnce({ list: [{ id: 7, title: 'Old', content: 'Old' }], hasMore: false })
      .mockResolvedValue({ list: [{ id: 8, title: 'New', content: 'New' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByTestId('campus-row-7')).toBeTruthy());
    await act(async () => getQueryClient().removeQueries({ queryKey: ['posts', 'infinite'] }));
    await waitFor(() => expect(view.getByTestId('campus-row-8')).toBeTruthy());
    expect(view.queryByTestId('campus-row-7')).toBeNull();
  });

  it('卸载时解绑缓存订阅', async () => {
    const unsubscribe = jest.fn();
    const subscribe = jest
      .spyOn(getQueryClient().getQueryCache(), 'subscribe')
      .mockReturnValue(unsubscribe);
    try {
      list.mockResolvedValue({ list: [{ id: 7, title: 'Old', content: 'Old' }], hasMore: false });
      const view = await renderApp(<TreeholeFeed />);
      await waitFor(() => expect(view.getByTestId('campus-row-7')).toBeTruthy());
      await act(async () => {
        view.unmount();
      });
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      subscribe.mockRestore();
    }
  });

  it('树洞行点赞调用真实接口，回复进入同一帖详情', async () => {
    list.mockResolvedValue({
      list: [{ id: 7, title: '校内交流', content: '周末运动', user_liked: false, like_count: 4, comment_count: 2 }],
      hasMore: false,
    });
    (toggleLike as jest.Mock).mockResolvedValue({ post_id: 7, liked: true, like_count: 5 });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByTestId('campus-row-7-like')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-row-7-like'));
    await waitFor(() =>
      expect(view.getByTestId('campus-row-7-like').props.accessibilityState.selected).toBe(true)
    );
    expect(toggleLike).toHaveBeenCalledWith(7);
    expect(view.getByTestId('campus-row-7-like-count')).toHaveTextContent('5');
    expect(getPostComments).not.toHaveBeenCalled();
    await fireEvent.press(view.getByTestId('campus-row-7-comment'));
    expect(routerMock.push).toHaveBeenCalledWith('/campus/7');
  });

  it('游客点赞不写接口，给出登录入口', async () => {
    mockSession.isSignedIn = false;
    list.mockResolvedValue({
      list: [{ id: 7, title: '校内交流', content: '周末运动', user_liked: false, like_count: 4 }],
      hasMore: false,
    });
    const view = await renderApp(<TreeholeFeed />);
    await waitFor(() => expect(view.getByTestId('campus-row-7-like')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-row-7-like'));
    expect(toggleLike).not.toHaveBeenCalled();
    await waitFor(() => expect(view.getByTestId('campus-row-7-notice')).toBeTruthy());
    expect(view.getByTestId('campus-row-7-like').props.accessibilityState.selected).toBe(false);
    await fireEvent.press(view.getByText('登录'));
    expect(routerMock.push).toHaveBeenCalledWith('/login');
  });
});

describe('树洞搜索（就地展开）', () => {
  it('点搜索框在本页展开，输入后结果就地替换，不跳页', async () => {
    list.mockResolvedValue({ list: [{ id: 7, title: '自习', content: '组队自习' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    expect(view.queryByTestId('campus-search-field')).toBeNull();
    await fireEvent.press(view.getByTestId('campus-search-toggle'));
    expect(view.getByTestId('campus-search-field')).toBeTruthy();
    await fireEvent.changeText(view.getByTestId('campus-search-field-input'), '自习');
    await waitFor(
      () => expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: '自习' }),
      { timeout: 3000 }
    );
    expect(view.getByText('帖子结果')).toBeTruthy();
    expect(routerMock.push).not.toHaveBeenCalledWith('/campus/search');
  });

  it('取消展开会清空关键词并回到普通流（缓存优先）', async () => {
    list.mockResolvedValue({ list: [{ id: 7, content: '普通正文' }], hasMore: false });
    const view = await renderApp(<TreeholeFeed />);
    await fireEvent.press(view.getByTestId('campus-search-toggle'));
    await fireEvent.changeText(view.getByTestId('campus-search-field-input'), '自习');
    await waitFor(
      () => expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: '自习' }),
      { timeout: 3000 }
    );
    await fireEvent.press(view.getByTestId('campus-search-cancel'));
    expect(view.queryByTestId('campus-search-field')).toBeNull();
    // 回到普通流时**先给缓存**（宪法 10.6 cache-then-network），不重新请求
    expect(view.getByText('普通正文')).toBeTruthy();
  });

  it('搜索无结果给业务空态，动作回到普通流', async () => {
    list.mockImplementation(({ q }: { q?: string }) =>
      Promise.resolve(
        q
          ? { list: [], hasMore: false }
          : { list: [{ id: 7, content: '普通正文' }], hasMore: false }
      )
    );
    const view = await renderApp(<TreeholeFeed />);
    await fireEvent.press(view.getByTestId('campus-search-toggle'));
    await fireEvent.changeText(view.getByTestId('campus-search-field-input'), '不存在');
    await waitFor(() => expect(view.getByText('无匹配帖子，试试其他词')).toBeTruthy(), {
      timeout: 3000,
    });
    await fireEvent.press(view.getByText('清除'));
    expect(view.queryByTestId('campus-search-field')).toBeNull();
  });
});

describe('万能墙列表 / 详情', () => {
  it('公告从列表进入详情保留同一类型、完整长文及公开时间', async () => {
    const content = `图书馆闭馆通知\n${'请提前办理借还手续。'.repeat(22)}`.slice(0, 200);
    const row = {
      id: 40, content, template_key: 'announcement', created_at: '2026-10-29T12:00:00Z',
      author: { nickname: '不应公开的名字' }, title: '不应公开的标题',
    };
    wall.mockResolvedValue({ items: [row], has_older: false, oldest_cursor: 40 });
    wallDetail.mockResolvedValue(row);
    function ReadingPath() {
      const [opened, setOpened] = React.useState(false);
      return <><WallFeed /><Button label="查看详情" onPress={() => setOpened(true)} />{opened ? <CampusDetailScreen postId="40" kind="wall" /> : null}</>;
    }
    const view = await renderApp(<ReadingPath />);
    await waitFor(() => expect(view.getByText(content)).toBeTruthy());
    expect(view.getByText(content).props.numberOfLines).toBeUndefined();
    expect(view.getByText('公告卡')).toBeTruthy();
    expect(view.getByTestId('wall-row-time-40')).toBeTruthy();
    await fireEvent.press(view.getByTestId('campus-row-40'));
    expect(routerMock.push).toHaveBeenCalledWith('/campus/wall/40');
    await fireEvent.press(view.getByText('查看详情'));
    await waitFor(() => expect(view.getAllByText(content)).toHaveLength(2));
    expect(view.getAllByText('公告卡')).toHaveLength(2);
    expect(view.queryByText('不应公开的名字')).toBeNull();
    expect(view.queryByText('不应公开的标题')).toBeNull();
    expect(view.queryByTestId('treehole-author-avatar')).toBeNull();
    expect(view.getByTestId('campus-detail-time')).not.toHaveTextContent(/^$/);
  });

  it('窗口游标分页且不展示服务端身份', async () => {
    wall
      .mockResolvedValueOnce({
        items: [{ id: 40, content: '墙首篇', author: { nickname: '泄漏作者' } }],
        has_older: true,
        oldest_cursor: 40,
      })
      .mockResolvedValueOnce({ items: [{ id: 35, content: '墙次篇' }], has_older: false, oldest_cursor: 35 });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByText('墙首篇')).toBeTruthy());
    expect(view.queryByText('泄漏作者')).toBeNull();
    expect(view.getByText('匿名')).toBeTruthy();
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('墙次篇')).toBeTruthy());
    expect(wall.mock.calls.map((call) => call[0])).toEqual([
      { cursor: null, direction: 'older', limit: 5 },
      { cursor: 40, direction: 'older', limit: 5 },
    ]);
    await fireEvent.press(view.getByTestId('campus-row-35'));
    expect(routerMock.push).toHaveBeenCalledWith('/campus/wall/35');
  });

  it('窗口声称有下一页却缺游标时显示错误且不循环请求', async () => {
    wall.mockResolvedValue({ items: [{ id: 40, content: '错误窗口' }], has_older: true, oldest_cursor: null });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByTestId('wall-feed-error')).toBeTruthy());
    expect(view.queryByText('错误窗口')).toBeNull();
    expect(wall).toHaveBeenCalledTimes(1);
  });

  it('英语界面按服务端模板键标明版式', async () => {
    wall.mockResolvedValue({ items: [{ id: 40, content: '海报', template_key: 'bigtype' }], has_older: false, oldest_cursor: 40 });
    const view = await renderApp(<WallFeed />, { locale: 'en' });
    await waitFor(() => expect(view.getByText('Poster')).toBeTruthy());
  });

  it('万能墙详情只投影匿名作者，不渲染标题与作者身份', async () => {
    wallDetail.mockResolvedValue({
      id: 40,
      content: '匿名正文',
      title: '身份标题',
      template_key: 'announcement',
      author: { nickname: '泄漏作者' },
      images: [{ url: 'https://example.test/leak.jpg' }],
    });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);
    await waitFor(() => expect(view.getByText('匿名正文')).toBeTruthy());
    expect(view.queryByText('泄漏作者')).toBeNull();
    expect(view.queryByText('身份标题')).toBeNull();
    expect(view.getByText('匿名')).toBeTruthy();
    expect(detail).not.toHaveBeenCalled();
  });
});

describe('树洞详情（原生 Header + 粘性底栏）', () => {
  it('内容、作者与原生 Header 标题都在；底栏在 Screen footer 里', async () => {
    detail.mockResolvedValue({
      id: 7,
      title: '校内交流',
      content: '一起打球',
      author: { nickname: '小林' },
      images: [{ url: 'https://example.test/photo.jpg' }],
    });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('一起打球')).toBeTruthy());
    expect(view.getByText('小林')).toBeTruthy();
    expect(view.getByTestId('campus-header-title')).toHaveTextContent('帖子');
    expect(view.getByTestId('treehole-post-detail')).toBeTruthy();
    const footer = view.getByTestId('screen-footer');
    expect(within(footer).getByLabelText('写评论')).toBeTruthy();
    expect(view.queryByTestId('campus-detail-back')).toBeNull();
  });

  it('绝对时间在动作行右端，作者行只留身份（2026-10-18 详情版式）', async () => {
    detail.mockResolvedValue({
      id: 7,
      content: '一起打球',
      author: { nickname: '小林' },
      created_at: '2026-10-15T02:42:00.000Z',
    });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('一起打球')).toBeTruthy());
    // 作者行不放时间：昵称 + 等级 + 339px 的英文绝对时间会挤爆一行
    expect(view.queryByTestId('treehole-author-time')).toBeNull();
    expect(view.getByTestId('campus-detail-time')).toBeTruthy();
  });

  it('右上 ⋯ 打开动作表，举报表单可达（唯一举报入口）', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    expect(view.getByTestId('campus-detail-menu-report')).toBeTruthy();
    await fireEvent.press(view.getByTestId('campus-detail-menu-report'));
    await waitFor(() => expect(view.getByTestId('report-submit')).toBeTruthy());
  });

  it('无效/隐藏/错配 id 一律空态，不请求详情', async () => {
    const view = await renderApp(<CampusDetailScreen postId="abc" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toBeTruthy());
    expect(detail).not.toHaveBeenCalled();
  });

  it('错配 id 不显示正文', async () => {
    detail.mockResolvedValue({ id: 8, content: '错配正文' });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toBeTruthy());
    expect(view.queryByText('错配正文')).toBeNull();
  });

  it('404 空态给出唯一动作', async () => {
    detail.mockRejectedValue({ status: 404 });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('内容不存在或已删除')).toBeTruthy());
  });

  it('详情失败可重试，且不泄漏内部错误', async () => {
    detail.mockRejectedValueOnce(new TypeError('secret-db')).mockResolvedValueOnce({ id: 7, content: '恢复正文' });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-error')).toBeTruthy());
    expect(view.queryByText('secret-db')).toBeNull();
    await fireEvent.press(view.getByText('连上校园网后重试'));
    await waitFor(() => expect(view.getByText('恢复正文')).toBeTruthy());
  });

  it('切换帖子后旧请求不能覆盖新正文', async () => {
    let finish: (row: unknown) => void = () => undefined;
    detail
      .mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce({ id: 8, content: '新帖子' });
    function Harness(): React.ReactElement {
      const [id, setId] = React.useState('7');
      return (
        <>
          <Button label="切换帖子" onPress={() => setId('8')} />
          <CampusDetailScreen postId={id} />
        </>
      );
    }
    const view = await renderApp(<Harness />);
    await fireEvent.press(view.getByText('切换帖子'));
    await waitFor(() => expect(view.getByText('新帖子')).toBeTruthy());
    await act(async () => finish({ id: 7, content: '旧帖子' }));
    expect(view.getByText('新帖子')).toBeTruthy();
    expect(view.queryByText('旧帖子')).toBeNull();
  });
});

describe('树洞详情互动 / 评论', () => {
  it('点赞按响应更新；缺计数时重读服务端计数（不发明新数字）', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文', user_liked: false, like_count: 4 });
    (toggleLike as jest.Mock).mockResolvedValue({ post_id: 7, liked: true });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('正文')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-like'));
    await waitFor(() =>
      expect(view.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(true)
    );
    expect(toggleLike).toHaveBeenCalledWith(7);
    expect(view.getByTestId('campus-detail-like-count')).toHaveTextContent('4');
  });

  it('连续点赞只发一次请求；失败不移除正文', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文', user_liked: false });
    let reject: (error: unknown) => void = () => undefined;
    (toggleLike as jest.Mock).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('正文')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-like'));
    await fireEvent.press(view.getByTestId('campus-detail-like'));
    expect(toggleLike).toHaveBeenCalledTimes(1);
    await act(async () => reject(new TypeError('internal-secret')));
    expect(view.getByText('正文')).toBeTruthy();
    expect(view.queryByText('internal-secret')).toBeNull();
    expect(view.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(false);
  });

  it('被禁言提示权限拒绝；失效令牌交给会话处理', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    (toggleLike as jest.Mock).mockRejectedValueOnce({ status: 403, body: { muted: true } });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('正文')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-like'));
    await waitFor(() => expect(view.getByText('当前账号不能进行此操作')).toBeTruthy());
    expect(mockAuthFailure).not.toHaveBeenCalled();
  });

  it('评论时间在投影层格式化（不出现后端 ISO 原文）', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    const iso = new Date(Date.now() - 5 * 60000).toISOString();
    (getPostComments as jest.Mock).mockResolvedValue([{ id: 50, content: '五分钟前评论', author: { nickname: '小林' }, created_at: iso }]);
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('五分钟前评论')).toBeTruthy());
    expect(view.queryByText(iso)).toBeNull();
    expect(view.getByText('5 分钟前')).toBeTruthy();
  });

  it('评论读取失败可独立重试，不影响正文', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    (getPostComments as jest.Mock)
      .mockRejectedValueOnce(new TypeError('secret'))
      .mockResolvedValueOnce([{ id: 80, content: '恢复评论', author: { nickname: '小林' } }]);
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-comments-error')).toBeTruthy());
    expect(view.getByText('正文')).toBeTruthy();
    await fireEvent.press(view.getByText('重试'));
    await waitFor(() => expect(view.getByText('恢复评论')).toBeTruthy());
  });

  it('评论失败保留草稿，重试成功追加评论并清空', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    (createComment as jest.Mock)
      .mockRejectedValueOnce(new TypeError('secret'))
      .mockResolvedValueOnce({ id: 90, content: '一起运动', author: { nickname: '我' } });
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByLabelText('写评论')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('写评论'), '一起运动');
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    await waitFor(() => expect(view.getByText('评论未发送，请重试')).toBeTruthy());
    expect(view.getByLabelText('写评论').props.value).toBe('一起运动');
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    await waitFor(() => expect(view.getByText('一起运动')).toBeTruthy());
    expect(view.getByLabelText('写评论').props.value).toBe('');
    expect(createComment).toHaveBeenLastCalledWith(7, { content: '一起运动' });
  });

  it('空白评论不提交；实名回复显示被回复者昵称', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    (getPostComments as jest.Mock).mockResolvedValue([{ id: 50, content: '原评论', author: { nickname: '小林' } }]);
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByText('原评论')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('写评论'), '   ');
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    expect(createComment).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText('回复'));
    expect(view.getByText('正在回复 @小林')).toBeTruthy();
  });

  it('万能墙评论与回复全程匿名；超过 500 字不提交', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '墙正文' });
    (getConfessionComments as jest.Mock).mockResolvedValue([
      { id: 50, content: '匿名评论', author: { nickname: '秘密姓名' }, replies: [{ id: 51, content: '匿名回复', author: { nickname: '回复姓名' } }] },
    ]);
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);
    await waitFor(() => expect(view.getByText('匿名回复')).toBeTruthy());
    expect(view.queryByText('秘密姓名')).toBeNull();
    expect(view.queryByText('回复姓名')).toBeNull();
    await fireEvent.press(view.getByText('回复'));
    expect(view.getByText('正在回复某条评论')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('写评论'), '字'.repeat(501));
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    expect(createConfessionComment).not.toHaveBeenCalled();
  });

  it('发送中编辑的新草稿不会被成功响应清空', async () => {
    detail.mockResolvedValue({ id: 7, content: '正文' });
    let finish: (value: unknown) => void = () => undefined;
    (createComment as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = await renderApp(<CampusDetailScreen postId="7" />);
    await waitFor(() => expect(view.getByLabelText('写评论')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('写评论'), '第一条');
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    await fireEvent.changeText(view.getByLabelText('写评论'), '第二条');
    await fireEvent.press(view.getByTestId('campus-composer-send'));
    expect(createComment).toHaveBeenCalledTimes(1);
    await act(async () => finish({ id: 90, content: '第一条' }));
    expect(view.getByText('第一条')).toBeTruthy();
    expect(view.getByLabelText('写评论').props.value).toBe('第二条');
  });

  it('发布成功进入详情时，返回一律回广场（不回到发布表单）', async () => {
    detail.mockResolvedValue({ id: 7, title: '新帖', content: '新内容' });
    const view = await renderApp(<CampusDetailScreen postId="7" published />);
    await waitFor(() => expect(view.getByText('新内容')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-back'));
    expect(routerMock.replace).toHaveBeenCalledWith('/');
    expect(routerMock.back).not.toHaveBeenCalled();
  });
});

describe('树洞四态（中英双语）', () => {
  for (const locale of ['zh', 'en'] as const) {
    it(`${locale}·未返回请求显示骨架`, async () => {
      list.mockReturnValue(new Promise(() => undefined));
      const view = await renderApp(<TreeholeFeed />, { locale });
      expect(view.getByTestId('campus-list-loading')).toBeTruthy();
    });

    it(`${locale}·空列表是业务空态`, async () => {
      list.mockResolvedValue({ list: [], hasMore: false });
      const view = await renderApp(<TreeholeFeed />, { locale });
      await waitFor(() =>
        expect(view.getByText(locale === 'zh' ? '还没有帖子' : 'No posts yet')).toBeTruthy()
      );
    });

    it(`${locale}·错误给出可感知/可理解/可改正的恢复入口`, async () => {
      list.mockRejectedValueOnce(new TypeError('secret-endpoint')).mockResolvedValueOnce({ list: [], hasMore: false });
      const view = await renderApp(<TreeholeFeed />, { locale });
      await waitFor(() =>
        expect(view.getByText(locale === 'zh' ? '服务连不上' : 'Service unreachable')).toBeTruthy()
      );
      expect(view.queryByText('secret-endpoint')).toBeNull();
    });
  }
});

describe('万能墙删除自己的帖子', () => {
  const removeConfession = deleteConfession as jest.Mock;
  const windowRows = (ids: number[], hasMore = false, content = '墙帖') => ({
    items: ids.map((id) => ({ id, content: `${content}${id}`, template_key: 'announcement', viewer_is_author: id === 40 })),
    has_older: hasMore,
    oldest_cursor: ids.at(-1) ?? null,
  });
  async function confirmDelete(view: Awaited<ReturnType<typeof renderApp>>) {
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
  }

  it('D-1 旧刷新在删除后返回不能复活记录，随后正常刷新仍更新其他记录', async () => {
    let resolveRefresh: (value: unknown) => void = () => undefined;
    wall.mockResolvedValueOnce(windowRows([40, 39])).mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await act(async () => mockListProps.onRefresh());
    await confirmDelete(view);
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    await act(async () => resolveRefresh(windowRows([40, 39])));
    expect(view.queryByTestId('campus-row-40')).toBeNull();
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    wall.mockResolvedValueOnce(windowRows([39, 38], false, '已更新'));
    await act(async () => mockListProps.onRefresh());
    await waitFor(() => expect(view.getByTestId('campus-row-38')).toBeTruthy());
    expect(within(view.getByTestId('campus-row-39')).getByText('已更新39')).toBeTruthy();
    expect(view.queryByTestId('campus-row-40')).toBeNull();
    expect(wall).toHaveBeenCalledTimes(3);
  });

  it('D-1 分页与删除交错仍保留其他记录和后续分页能力', async () => {
    let resolveAppend: (value: unknown) => void = () => undefined;
    wall.mockResolvedValueOnce(windowRows([40, 39], true)).mockReturnValueOnce(new Promise((resolve) => { resolveAppend = resolve; }));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await act(async () => mockListProps.onEndReached());
    expect(wall).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 39 }));
    await confirmDelete(view);
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    await act(async () => resolveAppend(windowRows([38, 37], true)));
    for (const id of [39, 38, 37]) expect(view.getByTestId(`campus-row-${id}`)).toBeTruthy();
    expect(view.queryByTestId('campus-row-40')).toBeNull();
    wall.mockResolvedValueOnce(windowRows([36]));
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByTestId('campus-row-36')).toBeTruthy());
    expect(wall).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 37 }));
  });

  it('D-1 删除失败不屏蔽记录，旧刷新后可重新删除', async () => {
    let resolveRefresh: (value: unknown) => void = () => undefined;
    wall.mockResolvedValueOnce(windowRows([40, 39])).mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await act(async () => mockListProps.onRefresh());
    await confirmDelete(view);
    await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toBeTruthy());
    await act(async () => resolveRefresh(windowRows([40, 39])));
    expect(view.getByTestId('campus-row-40')).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();
    await confirmDelete(view);
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    expect(removeConfession).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('D-1 首次列表仍在请求时删除成功，首次旧响应也不能复活记录（重挂=%s）', async (remountFeed) => {
    let resolveWindow: (value: unknown) => void = () => undefined;
    wall.mockReturnValueOnce(new Promise((resolve) => { resolveWindow = resolve; })).mockResolvedValue(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={remountFeed} />);
    await confirmDelete(view);
    await waitFor(() => expect(routerMock.back).toHaveBeenCalledTimes(1));
    await act(async () => resolveWindow(windowRows([40, 39])));
    await waitFor(() => expect(view.getByTestId('campus-row-39')).toBeTruthy());
    expect(view.queryByTestId('campus-row-40')).toBeNull();
  });

  it('D-1 窗口缓存被回收后删除不丢已挂载列表中的其他记录', async () => {
    wall.mockResolvedValueOnce(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await act(async () => getQueryClient().removeQueries({ queryKey: [...QK.confessionWindow('_guest'), 'wallReadSnapshot'], exact: true }));
    await confirmDelete(view);
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    wall.mockResolvedValueOnce(windowRows([40, 39, 38]));
    await act(async () => mockListProps.onRefresh());
    await waitFor(() => expect(view.getByTestId('campus-row-38')).toBeTruthy());
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    expect(view.queryByTestId('campus-row-40')).toBeNull();
  });

  it('D-1 先从详情删除再首次进入列表仍加载其他记录', async () => {
    function DetailThenFeed(): React.ReactElement {
      const [detail, setDetail] = React.useState(true);
      React.useEffect(() => {
        routerMock.back.mockImplementation(() => setDetail(false));
        return () => { routerMock.back.mockReset(); };
      }, []);
      return detail ? <CampusDetailScreen postId="40" kind="wall" /> : <WallFeed />;
    }
    wall.mockResolvedValueOnce(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DetailThenFeed />);
    await confirmDelete(view);
    await waitFor(() => expect(view.getByTestId('campus-row-39')).toBeTruthy());
    expect(view.queryByTestId('campus-row-40')).toBeNull();
    expect(wall).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('D-1 删除中离开详情，迟到回执只在成功时更新列表（成功=%s）', async (success) => {
    let finish: (value: unknown) => void = () => undefined;
    let fail: (error: unknown) => void = () => undefined;
    removeConfession.mockReturnValueOnce(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
    wall.mockResolvedValue(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    function LeaveDetail(): React.ReactElement {
      const [open, setOpen] = React.useState(true);
      return <><WallFeed /><Button label="离开详情" onPress={() => setOpen(false)} />{open ? <CampusDetailScreen postId="40" kind="wall" /> : null}</>;
    }
    const view = await renderApp(<LeaveDetail />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await confirmDelete(view);
    await waitFor(() => expect(view.getByTestId('wall-delete-pending')).toBeTruthy());
    await fireEvent.press(view.getByText('离开详情'));
    await act(async () => { if (success) finish({ status: 0 }); else fail(new TypeError('Network request failed')); });
    expect(view.queryByTestId('campus-detail')).toBeNull();
    expect(view.queryByTestId('wall-delete-notice')).toBeNull();
    expect(view.queryByTestId('wall-delete-pending')).toBeNull();
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    if (success) expect(view.queryByTestId('campus-row-40')).toBeNull();
    else expect(view.getByTestId('campus-row-40')).toBeTruthy();
  });

  function DeletionFlow({ remountFeed }: { remountFeed: boolean }): React.ReactElement {
    const [detailOpen, setDetailOpen] = React.useState(true);
    const [feedRevision, setFeedRevision] = React.useState(0);
    React.useEffect(() => {
      routerMock.back.mockImplementation(() => {
        setDetailOpen(false);
        if (remountFeed) setFeedRevision((revision) => revision + 1);
      });
      return () => { routerMock.back.mockReset(); };
    }, [remountFeed]);
    return <><WallFeed key={feedRevision} />{detailOpen ? <CampusDetailScreen postId="40" kind="wall" /> : null}</>;
  }

  describe('D-3 登录恢复', () => {
    const mine = { id: 40, content: '恢复后的内容', template_key: 'announcement', viewer_is_author: true };
    const expired = () => Object.assign(new Error('expired'), { status: 401, apiStatus: -1, body: { status: -1 } });
    const FocusProvider = routerModuleMock.__FocusProvider;

    function RecoveryFlow(): React.ReactElement {
      const [focused, setFocused] = React.useState(true);
      const [contentId, setContentId] = React.useState('40');
      const [mounted, setMounted] = React.useState(true);
      const [, renderSession] = React.useReducer((value: number) => value + 1, 0);
      React.useEffect(() => {
        routerMock.push.mockImplementation(() => setFocused(false));
        mockAuthFailure.mockImplementation(async () => {
          mockSession.status = 'expired'; mockSession.identifier = null; mockSession.isSignedIn = false;
          renderSession();
          return { kind: 'permission' };
        });
        return () => { routerMock.push.mockReset(); };
      }, []);
      const login = (identifier: string) => {
        mockSession.status = 'signedIn'; mockSession.identifier = identifier; mockSession.isSignedIn = true;
        renderSession(); setFocused(true);
      };
      return <>
        <Button label="完成原账号登录" onPress={() => login('owner-a')} />
        <Button label="完成其他账号登录" onPress={() => login('other-b')} />
        <Button label="取消登录" onPress={() => setFocused(true)} />
        <Button label="离开详情" onPress={() => setFocused(false)} />
        <Button label="回到详情" onPress={() => setFocused(true)} />
        <Button label="打开其他内容" onPress={() => { setContentId('41'); setFocused(true); }} />
        <Button label="卸载详情" onPress={() => setMounted(false)} />
        <Button label="重挂详情" onPress={() => { setMounted(true); setFocused(true); }} />
        <FocusProvider value={focused}>{mounted ? <CampusDetailScreen postId={contentId} kind="wall" /> : null}</FocusProvider>
      </>;
    }
    async function loginAfter401(view: Awaited<ReturnType<typeof renderApp>>) {
      await confirmDelete(view);
      await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toHaveTextContent(/登录已过期/));
      await fireEvent.press(within(view.getByTestId('wall-delete-notice')).getByText('登录'));
      expect(routerMock.push).toHaveBeenCalledWith('/login');
    }

    describe('D-4 迟到成功收尾', () => {
      const ownerKey = QK.confessionDetail(40, '["signedIn","owner-a",true]');

      it('重聚焦读完详情后旧删除成功，同内容失效且不能再删除', async () => {
        let finish: (value: unknown) => void = () => undefined;
        wallDetail.mockResolvedValue(mine);
        removeConfession.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('离开详情'));
        await fireEvent.press(view.getByText('回到详情'));
        await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
        await act(async () => finish({ status: 0 }));
        await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toHaveTextContent(/内容不存在或已删除/));
        expect(view.queryByText('恢复后的内容')).toBeNull();
        expect(view.queryByTestId('campus-detail-more')).toBeNull();
        expect(view.queryByTestId('wall-delete-pending')).toBeNull();
        expect(getQueryClient().getQueryData(ownerKey)).toBeNull();
        expect(getQueryClient().getQueryData<{ deletedIds: number[] }>([...QK.confessionWindow('_guest'), 'wallReadSnapshot'])?.deletedIds).toEqual([40]);
        expect(routerMock.back).not.toHaveBeenCalled();
      });

      it('停留其他内容时旧删除成功，不清空或返回无关详情', async () => {
        let finish: (value: unknown) => void = () => undefined;
        wallDetail.mockResolvedValueOnce(mine).mockResolvedValueOnce({ ...mine, id: 41, content: '其他内容41' });
        removeConfession.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('离开详情'));
        await fireEvent.press(view.getByText('打开其他内容'));
        await waitFor(() => expect(view.getByText('其他内容41')).toBeTruthy());
        await act(async () => finish({ status: 0 }));
        expect(view.getByText('其他内容41')).toBeTruthy();
        expect(view.queryByTestId('campus-detail-empty')).toBeNull();
        expect(routerMock.back).not.toHaveBeenCalled();
        expect(routerMock.replace).not.toHaveBeenCalled();
        await fireEvent.press(view.getByTestId('campus-detail-more'));
        expect(view.getByTestId('campus-detail-menu-delete')).not.toBeDisabled();
        expect(getQueryClient().getQueryData(QK.confessionDetail(41, '["signedIn","owner-a",true]'))).toBeUndefined();
      });

      it('换账号后旧删除成功，不修改新账号详情与资格', async () => {
        let finish: (value: unknown) => void = () => undefined;
        wallDetail.mockResolvedValueOnce(mine).mockResolvedValueOnce({ ...mine, content: '新账号的当前详情', viewer_is_author: false });
        removeConfession.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('离开详情'));
        await fireEvent.press(view.getByText('完成其他账号登录'));
        await waitFor(() => expect(view.getByText('新账号的当前详情')).toBeTruthy());
        await act(async () => finish({ status: 0 }));
        expect(view.getByText('新账号的当前详情')).toBeTruthy();
        expect(view.queryByTestId('campus-detail-empty')).toBeNull();
        await fireEvent.press(view.getByTestId('campus-detail-more'));
        expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
        expect(routerMock.back).not.toHaveBeenCalled();
        expect(mockAuthFailure).not.toHaveBeenCalled();
        expect(getQueryClient().getQueryData(QK.confessionDetail(40, '["signedIn","other-b",true]'))).toBeUndefined();
      });

      it('重聚焦后旧删除失败不写成功结果，仍能重新确认', async () => {
        let fail: (error: unknown) => void = () => undefined;
        wallDetail.mockResolvedValue(mine);
        removeConfession.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; })).mockResolvedValue({ status: 0 });
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('离开详情'));
        await fireEvent.press(view.getByText('回到详情'));
        await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
        await act(async () => fail(new TypeError('Network request failed')));
        expect(view.queryByTestId('campus-detail-empty')).toBeNull();
        expect(view.queryByTestId('wall-delete-pending')).toBeNull();
        expect(getQueryClient().getQueryData(ownerKey)).toBeUndefined();
        await confirmDelete(view);
        await waitFor(() => expect(removeConfession).toHaveBeenCalledTimes(2));
        expect(routerMock.back).toHaveBeenCalledTimes(1);
      });

      it.each(['row', '401'])('成功回执先到，旧详情 %s 后返回不能恢复正文或旧错误', async (response) => {
        let finishDelete: (value: unknown) => void = () => undefined;
        let finishRead: (value: unknown) => void = () => undefined;
        let failRead: (error: unknown) => void = () => undefined;
        wallDetail.mockResolvedValueOnce(mine).mockReturnValueOnce(new Promise((resolve, reject) => { finishRead = resolve; failRead = reject; }));
        removeConfession.mockReturnValueOnce(new Promise((resolve) => { finishDelete = resolve; }));
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('离开详情'));
        await fireEvent.press(view.getByText('回到详情'));
        await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
        await act(async () => finishDelete({ status: 0 }));
        await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toBeTruthy());
        await act(async () => { if (response === 'row') finishRead(mine); else failRead(expired()); });
        expect(view.getByTestId('campus-detail-empty')).toBeTruthy();
        expect(view.queryByText('恢复后的内容')).toBeNull();
        expect(view.queryByTestId('wall-delete-notice')).toBeNull();
        expect(view.queryByTestId('campus-detail-more')).toBeNull();
        expect(mockAuthFailure).not.toHaveBeenCalled();
        expect(routerMock.back).not.toHaveBeenCalled();
      });

      it('成功时原详情已卸载，重新挂载同内容仍恢复失效', async () => {
        let finish: (value: unknown) => void = () => undefined;
        wallDetail.mockResolvedValue(mine);
        removeConfession.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const view = await renderApp(<RecoveryFlow />);
        await confirmDelete(view);
        await fireEvent.press(view.getByText('卸载详情'));
        await act(async () => finish({ status: 0 }));
        expect(routerMock.back).not.toHaveBeenCalled();
        await fireEvent.press(view.getByText('重挂详情'));
        await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toBeTruthy());
        expect(view.queryByText('恢复后的内容')).toBeNull();
        expect(wallDetail).toHaveBeenCalledTimes(1);
        expect(getQueryClient().getQueryData(ownerKey)).toBeNull();
      });
    });

    it('同账号返回先重新确认权限，完成前不开放删除，随后可再次删除', async () => {
      let finish: (value: unknown) => void = () => undefined;
      wallDetail.mockResolvedValueOnce(mine).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
      removeConfession.mockRejectedValueOnce(expired()).mockResolvedValue({ status: 0 });
      const view = await renderApp(<RecoveryFlow />);
      await loginAfter401(view);
      await fireEvent.press(view.getByText('完成原账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      expect(view.getByTestId('campus-detail-loading')).toBeTruthy();
      expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
      await fireEvent.press(view.getByText('回到详情'));
      await fireEvent.press(view.getByText('回到详情'));
      expect(wallDetail).toHaveBeenCalledTimes(2);
      await act(async () => finish(mine));
      await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
      expect(view.queryByTestId('wall-delete-notice')).toBeNull();
      await confirmDelete(view);
      await waitFor(() => expect(removeConfession).toHaveBeenCalledTimes(2));
      expect(routerMock.back).toHaveBeenCalledTimes(1);
      expect(wallDetail).toHaveBeenCalledTimes(2);
    });

    it('换账号返回重新读取本人标记，不沿用原账号删除资格', async () => {
      wallDetail.mockResolvedValueOnce(mine).mockResolvedValueOnce({ ...mine, viewer_is_author: false });
      removeConfession.mockRejectedValueOnce(expired());
      const view = await renderApp(<RecoveryFlow />);
      await loginAfter401(view);
      await fireEvent.press(view.getByText('完成其他账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.queryByTestId('campus-detail-loading')).toBeNull());
      await fireEvent.press(view.getByTestId('campus-detail-more'));
      expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
      expect(view.queryByTestId('wall-delete-notice')).toBeNull();
      expect(removeConfession).toHaveBeenCalledTimes(1);
    });

    it('取消登录返回不残留忙态，能再次登录并恢复', async () => {
      wallDetail.mockResolvedValue(mine);
      removeConfession.mockRejectedValueOnce(expired());
      const view = await renderApp(<RecoveryFlow />);
      await loginAfter401(view);
      await fireEvent.press(view.getByText('取消登录'));
      expect(view.queryByTestId('wall-delete-pending')).toBeNull();
      expect(view.queryByTestId('campus-detail-loading')).toBeNull();
      expect(wallDetail).toHaveBeenCalledTimes(1);
      await fireEvent.press(within(view.getByTestId('wall-delete-notice')).getByText('登录'));
      await fireEvent.press(view.getByText('完成原账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.queryByTestId('wall-delete-notice')).toBeNull());
      await fireEvent.press(view.getByTestId('campus-detail-more'));
      expect(view.getByTestId('campus-detail-menu-delete')).not.toBeDisabled();
      expect(routerMock.push).toHaveBeenCalledTimes(2);
    });

    it('恢复时旧账号详情后返回，不覆盖当前账号权限', async () => {
      let finishOld: (value: unknown) => void = () => undefined;
      wallDetail.mockResolvedValueOnce(mine)
        .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
        .mockResolvedValueOnce({ ...mine, content: '新账号内容', viewer_is_author: false });
      removeConfession.mockRejectedValueOnce(expired());
      const view = await renderApp(<RecoveryFlow />);
      await loginAfter401(view);
      await fireEvent.press(view.getByText('完成原账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await fireEvent.press(view.getByText('离开详情'));
      await fireEvent.press(view.getByText('完成其他账号登录'));
      await waitFor(() => expect(view.getByText('新账号内容')).toBeTruthy());
      await act(async () => finishOld(mine));
      expect(view.queryByText('恢复后的内容')).toBeNull();
      await fireEvent.press(view.getByTestId('campus-detail-more'));
      expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
      expect(mockAuthFailure).toHaveBeenCalledTimes(1);
    });

    it('换账号后旧删除401不清理新会话，也不留下旧错误', async () => {
      let rejectOld: (error: unknown) => void = () => undefined;
      wallDetail.mockResolvedValueOnce(mine).mockResolvedValueOnce({ ...mine, viewer_is_author: false });
      removeConfession.mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject; }));
      const view = await renderApp(<RecoveryFlow />);
      await confirmDelete(view);
      await fireEvent.press(view.getByText('离开详情'));
      await fireEvent.press(view.getByText('完成其他账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await act(async () => rejectOld(expired()));
      expect(mockAuthFailure).not.toHaveBeenCalled();
      expect(mockSession.identifier).toBe('other-b');
      expect(view.queryByTestId('wall-delete-notice')).toBeNull();
      expect(view.queryByTestId('wall-delete-pending')).toBeNull();
    });

    it('身份未变但重新聚焦也重新确认已变化的权限', async () => {
      wallDetail.mockResolvedValueOnce(mine).mockResolvedValueOnce({ ...mine, viewer_is_author: false });
      const view = await renderApp(<RecoveryFlow />);
      await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
      await fireEvent.press(view.getByText('离开详情'));
      await fireEvent.press(view.getByText('回到详情'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.queryByTestId('campus-detail-loading')).toBeNull());
      await fireEvent.press(view.getByTestId('campus-detail-more'));
      expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
    });

    it('删除请求中重新聚焦仍防重复，迟到请求结束后可以再操作', async () => {
      let rejectOld: (error: unknown) => void = () => undefined;
      wallDetail.mockResolvedValue(mine);
      removeConfession.mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject; })).mockResolvedValue({ status: 0 });
      const view = await renderApp(<RecoveryFlow />);
      await confirmDelete(view);
      await fireEvent.press(view.getByText('离开详情'));
      await fireEvent.press(view.getByText('回到详情'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
      await fireEvent.press(view.getByTestId('campus-detail-more'));
      expect(view.getByTestId('campus-detail-menu-delete')).toBeDisabled();
      await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
      expect(removeConfession).toHaveBeenCalledTimes(1);
      await fireEvent.press(view.getByTestId('campus-detail-menu-cancel'));
      await act(async () => rejectOld(new TypeError('Network request failed')));
      expect(view.queryByTestId('wall-delete-pending')).toBeNull();
      await confirmDelete(view);
      await waitFor(() => expect(removeConfession).toHaveBeenCalledTimes(2));
      expect(routerMock.back).toHaveBeenCalledTimes(1);
    });

    it.each([401, 403, 404, 'network'] as const)('重新确认详情失败仍有正确恢复动作（%s）', async (failure) => {
      wallDetail.mockResolvedValueOnce(mine).mockRejectedValueOnce(
        failure === 'network' ? new TypeError('Network request failed')
          : Object.assign(new Error('internal-secret'), { status: failure, apiStatus: -1, body: { status: -1 } })
      ).mockResolvedValue(mine);
      removeConfession.mockRejectedValueOnce(expired());
      const view = await renderApp(<RecoveryFlow />);
      await loginAfter401(view);
      await fireEvent.press(view.getByText('完成原账号登录'));
      await waitFor(() => expect(wallDetail).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.queryByTestId('campus-detail-loading')).toBeNull());
      expect(view.queryByTestId('wall-delete-pending')).toBeNull();
      expect(view.queryByText('internal-secret')).toBeNull();
      expect(removeConfession).toHaveBeenCalledTimes(1);
      if (failure === 401 || failure === 403) {
        const notice = view.getByTestId('wall-delete-notice');
        expect(notice).toHaveTextContent(failure === 401 ? /登录已过期/ : /当前账号不能进行此操作/);
        await fireEvent.press(within(notice).getByText(failure === 401 ? '登录' : '返回列表'));
        if (failure === 401) expect(routerMock.push).toHaveBeenCalledTimes(2);
        else expect(routerMock.back).toHaveBeenCalledTimes(1);
      } else if (failure === 404) {
        const empty = view.getByTestId('campus-detail-empty');
        expect(empty).toHaveTextContent(/内容不存在或已删除/);
        await fireEvent.press(within(empty).getByText('返回列表'));
        expect(routerMock.back).toHaveBeenCalledTimes(1);
      } else {
        await fireEvent.press(within(view.getByTestId('campus-detail-error')).getByText('连上校园网后重试'));
        await waitFor(() => expect(view.getByText('恢复后的内容')).toBeTruthy());
        await fireEvent.press(view.getByTestId('campus-detail-more'));
        expect(view.getByTestId('campus-detail-menu-delete')).not.toBeDisabled();
        expect(wallDetail).toHaveBeenCalledTimes(3);
      }
    });
  });

  it('作者在 ⋯ 菜单看到删除，确认后删除并返回', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'announcement', viewer_is_author: true });
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('我的墙帖')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    const dialog = view.getByTestId('wall-delete-dialog');
    await fireEvent.press(within(dialog).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(removeConfession).toHaveBeenCalledWith(40));
    await waitFor(() => expect(routerMock.back).toHaveBeenCalled());
  });

  it.each([false, undefined])('本人标记为 %s 时不见删除入口', async (viewerIsAuthor) => {
    wallDetail.mockResolvedValue({ id: 40, content: '别人的墙帖', template_key: 'announcement', ...(viewerIsAuthor === undefined ? {} : { viewer_is_author: viewerIsAuthor }) });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('别人的墙帖')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    expect(view.queryByTestId('campus-detail-menu-delete')).toBeNull();
  });

  it('删除失败停留本页并给出可读提示', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'announcement', viewer_is_author: true });
    removeConfession.mockRejectedValue(new TypeError('Network request failed'));
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('我的墙帖')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toBeTruthy());
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it.each([false, true])('删除成功后详情退出且列表无残留（重新挂载=%s）', async (remountFeed) => {
    wall.mockResolvedValue({
      items: [
        { id: 40, content: '我的墙帖', template_key: 'announcement', viewer_is_author: true },
        { id: 39, content: '保留的墙帖', template_key: 'note', viewer_is_author: false },
      ],
      has_older: false,
      oldest_cursor: 39,
    });
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'announcement', viewer_is_author: true });
    removeConfession.mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={remountFeed} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);

    await waitFor(() => expect(view.queryByTestId('campus-detail')).toBeNull());
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    const cached = getQueryClient().getQueryData<{ rows: { id: number }[]; cursor: number }>([...QK.confessionWindow('_guest'), 'wallReadSnapshot']);
    expect(cached?.rows.map((row) => row.id)).toEqual([39]);
    expect(cached?.cursor).toBe(39);
    expect(wall).toHaveBeenCalledTimes(1);
  });

  it.each([500, 'invalid-ack'] as const)('删除未成功时保留详情和列表（%s）', async (failure) => {
    wall.mockResolvedValue({ items: [{ id: 40, content: '我的墙帖', template_key: 'note', viewer_is_author: true }], has_older: false, oldest_cursor: 40 });
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'note', viewer_is_author: true });
    if (failure === 'invalid-ack') removeConfession.mockResolvedValue({ status: -1 });
    else removeConfession.mockRejectedValue({ status: failure, message: 'internal-secret' });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toHaveTextContent(/帖子未删除/));
    expect(view.getByTestId('campus-detail')).toBeTruthy();
    expect(view.getByTestId('campus-row-40')).toBeTruthy();
    expect(view.queryByText('internal-secret')).toBeNull();
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(getQueryClient().getQueryData<{ rows: { id: number }[] }>([...QK.confessionWindow('_guest'), 'wallReadSnapshot'])?.rows.map((row) => row.id)).toEqual([40]);
  });

  it.each([401, 403, 404])('D-2 删除 HTTP %s 提供对应恢复动作，不伪装成功', async (status) => {
    wall.mockResolvedValue(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    const failure = Object.assign(new Error('internal-secret'), { status, apiStatus: -1, body: { status: -1, message: 'internal-secret' } });
    removeConfession.mockRejectedValue(failure);
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await confirmDelete(view);
    if (status === 404) {
      await waitFor(() => expect(view.getByTestId('campus-detail-empty')).toHaveTextContent(/内容不存在或已删除/));
      expect(view.queryByTestId('campus-detail-more')).toBeNull();
    } else {
      await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toHaveTextContent(status === 401 ? /登录已过期/ : /当前账号不能进行此操作/));
      expect(view.getByTestId('campus-detail-more')).toBeTruthy();
      expect(within(view.getByTestId('wall-delete-notice')).queryByText('重试')).toBeNull();
    }
    expect(view.queryByText('internal-secret')).toBeNull();
    expect(view.getByTestId('campus-row-40')).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    const cached = getQueryClient().getQueryData<{ rows: { id: number }[]; deletedIds?: number[] }>([...QK.confessionWindow('_guest'), 'wallReadSnapshot']);
    expect(cached?.rows.map((row) => row.id)).toEqual([40, 39]);
    expect(cached?.deletedIds ?? []).toEqual([]);
    if (status === 401) {
      expect(mockAuthFailure).toHaveBeenCalledWith(failure);
      await fireEvent.press(within(view.getByTestId('wall-delete-notice')).getByText('登录'));
      expect(routerMock.push).toHaveBeenCalledWith('/login');
    } else {
      expect(mockAuthFailure).not.toHaveBeenCalled();
      const recovery = view.getByTestId(status === 404 ? 'campus-detail-empty' : 'wall-delete-notice');
      await fireEvent.press(within(recovery).getByText('返回列表'));
      await waitFor(() => expect(view.queryByTestId('campus-detail')).toBeNull());
      expect(removeConfession).toHaveBeenCalledTimes(1);
      // 失败回执不剔除缓存；用户随后真实刷新才按服务端列表收敛。
      wall.mockResolvedValueOnce(windowRows([39]));
      await act(async () => mockListProps.onRefresh());
      await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
      expect(view.getByTestId('campus-row-39')).toBeTruthy();
    }
  });

  it('D-2 断网保留内容，提示中的重试再次确认后可成功', async () => {
    wall.mockResolvedValue(windowRows([40, 39]));
    wallDetail.mockResolvedValue(windowRows([40]).items[0]);
    removeConfession.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({ status: 0 });
    const view = await renderApp(<DeletionFlow remountFeed={false} />);
    await waitFor(() => expect(view.getByTestId('campus-row-40')).toBeTruthy());
    await confirmDelete(view);
    await waitFor(() => expect(view.getByTestId('wall-delete-notice')).toHaveTextContent(/帖子未删除/));
    expect(view.getByTestId('campus-row-40')).toBeTruthy();
    expect(view.getByTestId('campus-detail-more')).toBeTruthy();
    await fireEvent.press(within(view.getByTestId('wall-delete-notice')).getByText('重试'));
    expect(removeConfession).toHaveBeenCalledTimes(1);
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(view.queryByTestId('campus-row-40')).toBeNull());
    expect(view.getByTestId('campus-row-39')).toBeTruthy();
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(mockAuthFailure).not.toHaveBeenCalled();
  });

  it('取消确认不会发送删除请求', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'note', viewer_is_author: true });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getByText('取消'));
    expect(removeConfession).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(view.getByText(/我的墙帖/)).toBeTruthy();
  });

  it('删除中显示进度且禁止重复提交，失败后能重新确认', async () => {
    let rejectDelete: (error: unknown) => void = () => undefined;
    removeConfession.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
    wallDetail.mockResolvedValue({ id: 40, content: '我的墙帖', template_key: 'note', viewer_is_author: true });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);
    await waitFor(() => expect(view.getByTestId('campus-detail-more')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(view.getByTestId('wall-delete-pending')).toBeTruthy());
    expect(routerMock.back).not.toHaveBeenCalled();
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    expect(view.getByTestId('campus-detail-menu-delete')).toBeDisabled();
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    expect(removeConfession).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByTestId('campus-detail-menu-cancel'));
    await act(async () => rejectDelete(new TypeError('Network request failed')));
    await waitFor(() => expect(view.queryByTestId('wall-delete-pending')).toBeNull());
    expect(view.getByTestId('wall-delete-notice')).toBeTruthy();
    removeConfession.mockResolvedValue({ status: 0 });
    await fireEvent.press(view.getByTestId('campus-detail-more'));
    await fireEvent.press(view.getByTestId('campus-detail-menu-delete'));
    await fireEvent.press(within(view.getByTestId('wall-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(routerMock.back).toHaveBeenCalledTimes(1));
    expect(removeConfession).toHaveBeenCalledTimes(2);
  });
});

describe('万能墙删除自己的评论', () => {
  const wallComments = getConfessionComments as jest.Mock;
  const removeComment = deleteConfessionComment as jest.Mock;
  const OWN_AND_OTHER = [
    { id: 11, parent_id: null, content: '我的评论', author: { display_name: '匿名', display_name_en: 'Anonymous' }, viewer_is_mine: true, created_at: '2026-10-15T02:42:00.000Z' },
    { id: 12, parent_id: null, content: '别人的评论', author: { display_name: '匿名', display_name_en: 'Anonymous' }, viewer_is_mine: false, created_at: '2026-10-15T02:42:00.000Z' },
  ];

  it('自己的评论有删除动作，别人的没有', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '正文', template_key: 'announcement' });
    wallComments.mockResolvedValue(OWN_AND_OTHER);
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('我的评论')).toBeTruthy());
    expect(within(view.getByTestId('campus-detail-comments-11')).getByText('删除')).toBeTruthy();
    expect(within(view.getByTestId('campus-detail-comments-12')).queryByText('删除')).toBeNull();
  });

  it('确认后删除评论，节点消失', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '正文', template_key: 'announcement' });
    wallComments.mockResolvedValue(OWN_AND_OTHER);
    removeComment.mockResolvedValue({ status: 0 });
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('我的评论')).toBeTruthy());
    await fireEvent.press(within(view.getByTestId('campus-detail-comments-11')).getByText('删除'));
    await fireEvent.press(within(view.getByTestId('wall-comment-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(removeComment).toHaveBeenCalledWith(40, 11));
    await waitFor(() => expect(view.queryByTestId('campus-detail-comments-11')).toBeNull());
  });

  it('删除评论失败节点恢复并提示', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '正文', template_key: 'announcement' });
    wallComments.mockResolvedValue(OWN_AND_OTHER);
    removeComment.mockRejectedValue(new TypeError('Network request failed'));
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" />);

    await waitFor(() => expect(view.getByText('我的评论')).toBeTruthy());
    await fireEvent.press(within(view.getByTestId('campus-detail-comments-11')).getByText('删除'));
    await fireEvent.press(within(view.getByTestId('wall-comment-delete-dialog')).getAllByText('删除').at(-1)!);
    await waitFor(() => expect(view.getByTestId('campus-comment-delete-notice')).toBeTruthy());
    expect(view.getByTestId('campus-detail-comments-11')).toBeTruthy();
  });
});

describe('列表状态闭环 L-1 墙失败反馈', () => {
  it.each(['zh', 'en'] as const)('有旧行刷新失败保留内容和位置，显示真实重试入口（%s）', async (locale) => {
    wall.mockResolvedValueOnce({ items: [{ id: 40, content: '旧墙正文' }], has_older: true, oldest_cursor: 40 })
      .mockRejectedValueOnce(new TypeError('internal-endpoint'))
      .mockResolvedValueOnce({ items: [{ id: 41, content: '更新正文' }], has_older: false, oldest_cursor: 41 });
    const view = await renderApp(<WallFeed />, { locale });
    await waitFor(() => expect(view.getByText('旧墙正文')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(260));
    await act(async () => mockListProps.onRefresh());
    expect(view.getByText('旧墙正文')).toBeTruthy();
    expect(secondaryTabStore.get('square', 'wall').scrollOffset).toBe(260);
    expect(view.getByText(locale === 'zh' ? '刷新失败，重试' : 'Refresh failed. Retry')).toBeTruthy();
    expect(view.queryByText('internal-endpoint')).toBeNull();
    await fireEvent.press(view.getByText(locale === 'zh' ? '重试' : 'Retry'));
    await waitFor(() => expect(view.getByText('更新正文')).toBeTruthy());
    expect(view.queryByText('旧墙正文')).toBeNull();
    expect(wall.mock.calls.map((call) => call[0].cursor)).toEqual([null, null, null]);
    expect(secondaryTabStore.get('square', 'wall').scrollOffset).toBe(0);
  });

  it('追加失败的可见重试仍请求同一游标，服务端末页停止追加', async () => {
    wall.mockResolvedValueOnce({ items: [{ id: 40, content: '第一篇' }], has_older: true, oldest_cursor: 40 })
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({ items: [{ id: 40, content: '第一篇' }, { id: 39, content: '第二篇' }], has_older: false, oldest_cursor: 39 });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByText('第一篇')).toBeTruthy());
    await act(async () => mockListProps.onEndReached());
    expect(mockListProps.pagination.errorScope).toBe('append');
    await fireEvent.press(view.getByText('重试'));
    await waitFor(() => expect(view.getByText('第二篇')).toBeTruthy());
    expect(view.getAllByText('第一篇')).toHaveLength(1);
    expect(wall.mock.calls.map((call) => call[0].cursor)).toEqual([null, 40, 40]);
    await act(async () => mockListProps.onEndReached());
    expect(wall).toHaveBeenCalledTimes(3);
  });

  it('无旧行首次失败使用公共错误态和重试，成功空结果使用业务空态', async () => {
    wall.mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({ items: [], has_older: false, oldest_cursor: null });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByTestId('wall-feed-error')).toBeTruthy());
    await act(async () => mockListProps.onRetryRefresh?.());
    await waitFor(() => expect(view.getByTestId('wall-feed-empty')).toBeTruthy());
    expect(view.getByText('还没有帖子')).toBeTruthy();
  });

  it('首次加载使用公共加载态，重复刷新不发送第二个请求', async () => {
    let finish!: (value: unknown) => void;
    wall.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByTestId('wall-feed-loading')).toBeTruthy());
    await act(async () => mockListProps.onRefresh());
    expect(wall).toHaveBeenCalledTimes(1);
    await act(async () => finish({ items: [], has_older: false, oldest_cursor: null }));
    expect(view.getByTestId('wall-feed-empty')).toBeTruthy();
  });
});

describe('列表状态闭环 L-2 返回与分页', () => {
  function RoundTrip({ children }: { children: React.ReactNode }): React.ReactElement {
    const [open, setOpen] = React.useState(true);
    return <><Button label="切换列表挂载" onPress={() => setOpen(!open)} />{open ? children : null}</>;
  }

  it('搜索详情返回后恢复关键词、已加载页和搜索位置，不污染普通流位置', async () => {
    list.mockImplementation(({ q, page }: { q?: string; page: number }) => Promise.resolve({
      list: [{ id: q ? (page === 1 ? 8 : 9) : 7, content: q ? `搜索第${page}篇` : '普通流' }], hasMore: page === 1,
    }));
    const view = await renderApp(<RoundTrip><TreeholeFeed /></RoundTrip>);
    await waitFor(() => expect(view.getByText('普通流')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(180));
    await fireEvent.press(view.getByTestId('campus-search-toggle'));
    await fireEvent.changeText(view.getByTestId('campus-search-field-input'), '自习');
    await waitFor(() => expect(view.getByText('搜索第1篇')).toBeTruthy(), { timeout: 3000 });
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('搜索第2篇')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(360));
    await fireEvent.press(view.getByTestId('campus-row-9'));
    expect(routerMock.push).toHaveBeenCalledWith('/campus/9');
    await fireEvent.press(view.getByText('切换列表挂载'));
    const requests = list.mock.calls.length;
    await fireEvent.press(view.getByText('切换列表挂载'));
    await waitFor(() => expect(view.getByText('搜索第2篇')).toBeTruthy());
    expect(view.getByTestId('campus-search-field-input').props.value).toBe('自习');
    expect(mockListProps.restoredScrollOffset).toBe(360);
    expect(list).toHaveBeenCalledTimes(requests);
    expect(secondaryTabStore.get('square', 'confession').scrollOffset).toBe(180);
    await fireEvent.press(view.getByTestId('campus-search-cancel'));
    expect(view.getByText('普通流')).toBeTruthy();
    expect(mockListProps.restoredScrollOffset).toBe(180);
  });

  it('长文多图搜索进入真实详情组合再返回，保留查询、两页和位置', async () => {
    const content = '长文阅读段落\n'.repeat(40) + '自习尾句';
    const images = [{ url: 'https://example.test/wide.jpg' }, { url: 'https://example.test/tall.jpg' }, { url: 'https://example.test/third.jpg' }];
    list.mockImplementation(({ q, page }: { q?: string; page: number }) => Promise.resolve({
      list: [{ id: q ? (page === 1 ? 8 : 9) : 7, title: `第${page}篇`, content: q ? content : '普通流', images }],
      hasMore: page === 1,
    }));
    detail.mockResolvedValue({ id: 9, title: '第2篇', content, images });
    function ReadingFlow(): React.ReactElement {
      const [opened, setOpened] = React.useState(false);
      routerMock.push.mockImplementation(() => setOpened(true));
      routerMock.back.mockImplementation(() => setOpened(false));
      return opened ? <><Button label="返回阅读列表" onPress={() => routerMock.back()} />
        <CampusDetailScreen postId="9" kind="confession" /></> : <TreeholeFeed />;
    }
    const view = await renderApp(<ReadingFlow />);
    await waitFor(() => expect(view.getByText('普通流')).toBeTruthy());
    await fireEvent.press(view.getByTestId('campus-search-toggle'));
    await fireEvent.changeText(view.getByTestId('campus-search-field-input'), '自习');
    await waitFor(() => expect(view.getByTestId('treehole-content-8')).toBeTruthy(), { timeout: 3000 });
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByTestId('treehole-content-9')).toBeTruthy());
    expect(view.getByTestId('treehole-content-9').props.numberOfLines).toBeUndefined();
    await act(async () => mockListProps.onScrollOffset?.(960));
    await fireEvent.press(view.getByTestId('campus-row-9-media'));
    await waitFor(() => expect(view.getByTestId('treehole-post-content')).toHaveTextContent(/自习尾句/));
    expect(view.getByTestId('treehole-post-content').props.numberOfLines).toBeUndefined();
    expect(view.getByTestId('treehole-media-drag-area')).toBeTruthy();
    const requests = list.mock.calls.length;
    await fireEvent.press(view.getByText('返回阅读列表'));
    await waitFor(() => expect(view.getByTestId('treehole-content-9')).toBeTruthy());
    expect(view.getByTestId('campus-search-field-input').props.value).toBe('自习');
    expect(mockListProps.restoredScrollOffset).toBe(960);
    expect(list).toHaveBeenCalledTimes(requests);
    expect(view.getByTestId('treehole-content-8')).toBeTruthy();
    expect(mockListProps.pagination.hasMore).toBe(false);
  });

  it('各标签使用各自快照位置，新标签从顶部开始，返回恢复筛选与页码', async () => {
    tags.mockResolvedValue([{ id: 7, name_zh: '组队自习' }]);
    list.mockImplementation(({ tagId, page }: { tagId?: number; page: number }) => Promise.resolve({
      list: [{ id: tagId ? 70 + page : 7, content: tagId ? `筛选第${page}篇` : '全部内容' }], hasMore: page === 1,
    }));
    const view = await renderApp(<RoundTrip><TreeholeFeed /></RoundTrip>);
    await waitFor(() => expect(view.getByText('全部内容')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(180));
    await fireEvent.press(view.getByTestId('campus-tag-filter'));
    await fireEvent.press(await waitFor(() => view.getByLabelText('组队自习')));
    await waitFor(() => expect(view.getByText('筛选第1篇')).toBeTruthy());
    expect(mockListProps.restoredScrollOffset).toBe(0);
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('筛选第2篇')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(540));
    await fireEvent.press(view.getByText('切换列表挂载'));
    const requests = list.mock.calls.length;
    await fireEvent.press(view.getByText('切换列表挂载'));
    await waitFor(() => expect(view.getByText('筛选第2篇')).toBeTruthy());
    expect(mockListProps.restoredScrollOffset).toBe(540);
    expect(secondaryTabStore.get('square', 'confession').filters).toEqual({ tag: '7' });
    expect(list).toHaveBeenCalledTimes(requests);
    await fireEvent.press(view.getByTestId('campus-tag-filter'));
    await fireEvent.press(await waitFor(() => view.getByLabelText('全部')));
    expect(view.getByText('全部内容')).toBeTruthy();
    expect(mockListProps.restoredScrollOffset).toBe(180);
  });

  it.each(['treehole', 'wall'] as const)('重挂恢复后刷新消费公共回顶信号，更新顺序并从首批重新分页（%s）', async (kind) => {
    if (kind === 'treehole') {
      list.mockResolvedValueOnce({ list: [{ id: 7, content: '原首批' }], hasMore: true })
        .mockResolvedValueOnce({ list: [{ id: 8, content: '原次批' }], hasMore: true })
        .mockResolvedValueOnce({ list: [{ id: 9, content: '刷新首批' }], hasMore: true })
        .mockResolvedValueOnce({ list: [{ id: 10, content: '刷新次批' }], hasMore: false });
    } else {
      wall.mockResolvedValueOnce({ items: [{ id: 40, content: '原首批' }], has_older: true, oldest_cursor: 40 })
        .mockResolvedValueOnce({ items: [{ id: 39, content: '原次批' }], has_older: true, oldest_cursor: 39 })
        .mockResolvedValueOnce({ items: [{ id: 42, content: '刷新首批' }], has_older: true, oldest_cursor: 42 })
        .mockResolvedValueOnce({ items: [{ id: 41, content: '刷新次批' }], has_older: false, oldest_cursor: 41 });
    }
    const view = await renderApp(<RoundTrip>{kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />}</RoundTrip>);
    await waitFor(() => expect(view.getByText('原首批')).toBeTruthy());
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('原次批')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(480));
    await fireEvent.press(view.getByText('切换列表挂载'));
    await fireEvent.press(view.getByText('切换列表挂载'));
    expect(mockListProps.restoredScrollOffset).toBe(480);
    const signal = mockListProps.scrollToTopSignal ?? 0;
    await act(async () => mockListProps.onRefresh());
    await waitFor(() => expect(view.getByText('刷新首批')).toBeTruthy());
    expect(view.queryByText('原次批')).toBeNull();
    expect(mockListProps.restoredScrollOffset).toBe(0);
    expect(mockListProps.scrollToTopSignal).toBeGreaterThan(signal);
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('刷新次批')).toBeTruthy());
    if (kind === 'treehole') expect(list.mock.calls.map((call) => call[0].page)).toEqual([1, 2, 1, 2]);
    else expect(wall.mock.calls.map((call) => call[0].cursor)).toEqual([null, 40, null, 42]);
  });
});

describe('列表状态闭环 L-3 身份与失效', () => {
  it.each(['treehole', 'wall'] as const)('同为登录态换号时清除已挂载旧行，并隔离迟到分页（%s）', async (kind) => {
    let finishOld!: (value: unknown) => void;
    let finishNew!: (value: unknown) => void;
    const api = kind === 'treehole' ? list : wall;
    const response = (id: number, content: string) => kind === 'treehole'
      ? { list: [{ id, content, user_liked: true }], hasMore: true }
      : { items: [{ id, content, viewer_is_author: true }], has_older: true, oldest_cursor: id };
    api.mockResolvedValueOnce(response(40, 'A账号旧行'))
      .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { finishNew = resolve; }));
    function Harness(): React.ReactElement {
      const [, update] = React.useState(0);
      return <><Button label="切换到B" onPress={() => { mockSession.identifier = 'account-b'; update((v) => v + 1); }} />
        {kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />}</>;
    }
    const view = await renderApp(<Harness />);
    await waitFor(() => expect(view.getByText('A账号旧行')).toBeTruthy());
    await act(async () => { void mockListProps.onEndReached(); });
    await fireEvent.press(view.getByText('切换到B'));
    expect(view.queryByText('A账号旧行')).toBeNull();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
    await act(async () => finishOld(response(39, 'A账号迟到分页')));
    expect(view.queryByText('A账号迟到分页')).toBeNull();
    await act(async () => finishNew(response(41, 'B账号新行')));
    expect(view.getByText('B账号新行')).toBeTruthy();
    expect(view.queryByText('A账号旧行')).toBeNull();
    expect(api.mock.calls[2][0]).toEqual(kind === 'treehole'
      ? { page: 1, pageSize: 10 } : { cursor: null, direction: 'older', limit: 5 });
  });

  it.each(['treehole', 'wall'] as const)('卸载后换号不能消费上一账号缓存（%s）', async (kind) => {
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(kind === 'treehole'
      ? { list: [{ id: 40, content: '旧身份缓存', user_liked: true }], hasMore: false }
      : { items: [{ id: 40, content: '旧身份缓存', viewer_is_author: true }], has_older: false, oldest_cursor: 40 })
      .mockResolvedValueOnce(kind === 'treehole'
        ? { list: [], hasMore: false } : { items: [], has_older: false, oldest_cursor: null });
    function Harness(): React.ReactElement {
      const [open, setOpen] = React.useState(true);
      return <><Button label="离开列表" onPress={() => setOpen(false)} />
        <Button label="B返回列表" onPress={() => { mockSession.identifier = 'account-b'; setOpen(true); }} />
        {open ? (kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />) : null}</>;
    }
    const view = await renderApp(<Harness />);
    await waitFor(() => expect(view.getByText('旧身份缓存')).toBeTruthy());
    await fireEvent.press(view.getByText('离开列表'));
    await fireEvent.press(view.getByText('B返回列表'));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(view.queryByText('旧身份缓存')).toBeNull();
  });

  it.each(['treehole', 'wall'] as const)('退出清缓存后已挂载列表不展示旧私有行（%s）', async (kind) => {
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(kind === 'treehole'
      ? { list: [{ id: 40, content: '退出前私有行', user_liked: true }], hasMore: false }
      : { items: [{ id: 40, content: '退出前私有行', viewer_is_author: true }], has_older: false, oldest_cursor: 40 })
      .mockResolvedValue(kind === 'treehole'
        ? { list: [], hasMore: false } : { items: [], has_older: false, oldest_cursor: null });
    function Harness(): React.ReactElement {
      const [, update] = React.useState(0);
      return <><Button label="模拟退出完成" onPress={() => {
        getQueryClient().clear();
        mockSession.status = 'signedOut'; mockSession.identifier = null; mockSession.isSignedIn = false;
        update((v) => v + 1);
      }} />{kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />}</>;
    }
    const view = await renderApp(<Harness />);
    await waitFor(() => expect(view.getByText('退出前私有行')).toBeTruthy());
    await fireEvent.press(view.getByText('模拟退出完成'));
    await waitFor(() => expect(view.queryByText('退出前私有行')).toBeNull());
    expect(mockAuthFailure).not.toHaveBeenCalled();
  });

  it('墙发布移除快照后已挂载列表也重新读取，不只等待下次挂载', async () => {
    wall.mockResolvedValueOnce({ items: [{ id: 40, content: '发布前窗口' }], has_older: false, oldest_cursor: 40 })
      .mockResolvedValueOnce({ items: [{ id: 41, content: '发布后窗口' }], has_older: false, oldest_cursor: 41 });
    const view = await renderApp(<WallFeed />);
    await waitFor(() => expect(view.getByText('发布前窗口')).toBeTruthy());
    await act(async () => getQueryClient().removeQueries({ queryKey: QK.confessionWindow('_guest') }));
    await waitFor(() => expect(view.getByText('发布后窗口')).toBeTruthy());
    expect(view.queryByText('发布前窗口')).toBeNull();
  });
});

describe('列表状态返工 LS-1 GC与自动重读', () => {
  function batch(kind: 'treehole' | 'wall', id: number, content: string, more = true) {
    return kind === 'treehole'
      ? { list: [{ id, content }], hasMore: more }
      : { items: [{ id, content }], has_older: more, oldest_cursor: id };
  }
  const prefixFor = (kind: 'treehole' | 'wall') => kind === 'treehole' ? ['posts', 'infinite'] : ['confessions', 'window'];

  it.each(['treehole', 'wall'] as const)('真实QueryCache GC后更新数据但不产生用户回顶信号（%s）', async (kind) => {
    jest.useFakeTimers();
    const client = getQueryClient();
    const prefix = prefixFor(kind);
    client.setQueryDefaults(prefix, { gcTime: 1000 });
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(batch(kind, 40, 'GC前内容', false))
      .mockResolvedValue(batch(kind, 40, 'GC后已更新', false));
    const view = await renderApp(kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />);
    try {
      await waitFor(() => expect(view.getByText('GC前内容')).toBeTruthy());
      await act(async () => mockListProps.onScrollOffset?.(480));
      const signal = mockListProps.scrollToTopSignal;
      const query = client.getQueryCache().findAll({ queryKey: prefix }).find((entry) =>
        entry.queryKey.includes(kind === 'treehole' ? 'campusReadSnapshot' : 'wallReadSnapshot'));
      expect(query?.getObserversCount()).toBe(0);
      await act(async () => { jest.advanceTimersByTime(1001); });
      expect(view.getByText('GC后已更新')).toBeTruthy();
      expect(api).toHaveBeenCalledTimes(2);
      expect(mockListProps.scrollToTopSignal).toBe(signal);
      expect(secondaryTabStore.get('square', kind === 'treehole' ? 'confession' : 'wall').scrollOffset).toBe(480);
    } finally {
      await view.unmount();
      client.setQueryDefaults(prefix, { gcTime: 900000 });
      jest.useRealTimers();
    }
  });

  it.each(['treehole', 'wall'] as const)('失效重读已加载范围，更新结果且保留页码和位置（%s）', async (kind) => {
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(batch(kind, 40, '旧首批'))
      .mockResolvedValueOnce(batch(kind, 39, '旧次批'))
      .mockResolvedValueOnce(batch(kind, 41, '新首批'))
      .mockResolvedValueOnce(batch(kind, 39, '次批已更新'))
      .mockResolvedValueOnce(batch(kind, 38, '第三批', false));
    const view = await renderApp(kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />);
    await waitFor(() => expect(view.getByText('旧首批')).toBeTruthy());
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('旧次批')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(480));
    const signal = mockListProps.scrollToTopSignal;
    await act(async () => getQueryClient().removeQueries({ queryKey: prefixFor(kind) }));
    await waitFor(() => expect(view.getByText('次批已更新')).toBeTruthy());
    expect(view.getByText('新首批')).toBeTruthy();
    expect(view.queryByText('旧首批')).toBeNull();
    expect(mockListProps.scrollToTopSignal).toBe(signal);
    expect(secondaryTabStore.get('square', kind === 'treehole' ? 'confession' : 'wall').scrollOffset).toBe(480);
    await act(async () => mockListProps.onEndReached());
    await waitFor(() => expect(view.getByText('第三批')).toBeTruthy());
    expect(api.mock.calls.map((call) => kind === 'treehole' ? call[0].page : call[0].cursor))
      .toEqual(kind === 'treehole' ? [1, 2, 1, 2, 3] : [null, 40, null, 41, 39]);
  });

  it.each(['treehole', 'wall'] as const)('自动重读失败仍可返回原快照，不多发请求或回顶（%s）', async (kind) => {
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(batch(kind, 40, '可恢复的旧内容', false)).mockRejectedValueOnce(new TypeError('offline'));
    function Harness(): React.ReactElement {
      const [open, setOpen] = React.useState(true);
      return <><Button label="模拟详情返回" onPress={() => setOpen(!open)} />
        {open ? (kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />) : null}</>;
    }
    const view = await renderApp(<Harness />);
    await waitFor(() => expect(view.getByText('可恢复的旧内容')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(480));
    const signal = mockListProps.scrollToTopSignal;
    await act(async () => getQueryClient().removeQueries({ queryKey: prefixFor(kind) }));
    expect(view.getByText('刷新失败，重试')).toBeTruthy();
    expect(mockListProps.scrollToTopSignal).toBe(signal);
    await fireEvent.press(view.getByText('模拟详情返回'));
    await fireEvent.press(view.getByText('模拟详情返回'));
    expect(view.getByText('可恢复的旧内容')).toBeTruthy();
    expect(mockListProps.restoredScrollOffset).toBe(480);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it.each(['treehole', 'wall'] as const)('用户刷新可取代自动重读，自动旧响应不回填（%s）', async (kind) => {
    let finishOld!: (value: unknown) => void;
    const api = kind === 'treehole' ? list : wall;
    api.mockResolvedValueOnce(batch(kind, 40, '原有内容', false))
      .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(batch(kind, 41, '用户刷新内容', false));
    const view = await renderApp(kind === 'treehole' ? <TreeholeFeed /> : <WallFeed />);
    await waitFor(() => expect(view.getByText('原有内容')).toBeTruthy());
    await act(async () => mockListProps.onScrollOffset?.(480));
    const signal = mockListProps.scrollToTopSignal ?? 0;
    await act(async () => getQueryClient().removeQueries({ queryKey: prefixFor(kind) }));
    await act(async () => mockListProps.onRefresh());
    await waitFor(() => expect(view.getByText('用户刷新内容')).toBeTruthy());
    expect(mockListProps.scrollToTopSignal).toBeGreaterThan(signal);
    expect(secondaryTabStore.get('square', kind === 'treehole' ? 'confession' : 'wall').scrollOffset).toBe(0);
    await act(async () => finishOld(batch(kind, 39, '自动旧响应', false)));
    expect(view.queryByText('自动旧响应')).toBeNull();
    expect(view.getByText('用户刷新内容')).toBeTruthy();
  });
});

describe('万能墙清单模板图标化', () => {
  it('checklist 每行渲染方框图标，不再出现文字符号', async () => {
    const view = await renderApp(<WallTemplateContent templateKey="checklist" content={'买水\n买咖啡'} />);
    expect(view.queryByText(/□/)).toBeNull();
    // 装饰图标对读屏隐藏（宪法 16.5-4），查询需显式包含隐藏元素
    expect(view.getByTestId('wall-checklist-icon-0', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByTestId('wall-checklist-icon-1', { includeHiddenElements: true })).toBeTruthy();
  });

  it('note 模板保留排版圆点', async () => {
    const view = await renderApp(<WallTemplateContent templateKey="note" content={'一行\n两行'} />);
    expect(view.getAllByText(/• /)).toHaveLength(2);
  });
});

describe('当前图片保存的真实详情接线', () => {
  const messages = { save: '保存图片', saving: '保存中', saved: '已保存到相册',
    permissionDenied: '未获相册权限', failed: '保存失败，请重试' };
  it('模块props经过真实详情和正文组合，传到详情及全屏预览', async () => {
    const image = 'https://assets.example.test/current.png';
    detail.mockResolvedValue({ id: 7, content: '带图正文', images: [{ url: image }] });
    const save = jest.fn().mockResolvedValue({ status: 'saved' });
    const view = await renderApp(<CampusDetailScreen postId="7" imageSave={{ save, messages }} />);
    await waitFor(() => expect(view.getByTestId('treehole-save-detail')).toBeTruthy());
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    // 全屏看图器只有图与计数：⛔ 不带帖子正文、互动条、评论输入框
    const dialog = view.getByTestId('treehole-media-preview-dialog');
    expect(within(dialog).queryByTestId('treehole-post-content')).toBeNull();
    expect(within(dialog).queryByTestId('treehole-actions')).toBeNull();
    expect(within(dialog).queryByTestId('campus-composer')).toBeNull();
    await fireEvent.press(view.getByTestId('treehole-save-preview'));
    await waitFor(() => expect(view.getByTestId('treehole-save-preview-notice')).toHaveTextContent(messages.saved));
    expect(save).toHaveBeenCalledWith(image);
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it('匿名墙即使收到媒体字段和保存配置也不展示媒体入口', async () => {
    wallDetail.mockResolvedValue({ id: 40, content: '匿名内容', template_key: 'note', images: [{ url: 'https://example.test/private.png' }] });
    const save = jest.fn();
    const view = await renderApp(<CampusDetailScreen postId="40" kind="wall" imageSave={{ save, messages }} />);
    await waitFor(() => expect(view.getByText(/匿名内容/)).toBeTruthy());
    expect(view.queryByTestId('treehole-save-detail')).toBeNull();
    expect(view.queryByTestId('treehole-media-detail')).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('无图帖子不展示保存按钮，原正文与操作仍可达', async () => {
    detail.mockResolvedValue({ id: 7, content: '纯文字正文' });
    const save = jest.fn();
    const view = await renderApp(<CampusDetailScreen postId="7" imageSave={{ save, messages }} />);
    await waitFor(() => expect(view.getByText('纯文字正文')).toBeTruthy());
    expect(view.queryByTestId('treehole-save-detail')).toBeNull();
    expect(view.getByTestId('campus-detail-like')).toBeTruthy();
  });
});
