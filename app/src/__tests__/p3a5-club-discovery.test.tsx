import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';

/** 捕获分页 props：用例自己触发 append（FlashList 的滚动在 Jest 里不触发） */
let capturedListProps: { onEndReached: () => void };
jest.mock('@/components/ui/ListScreen', () => {
  const actual = jest.requireActual('@/components/ui/ListScreen');
  const React = require('react');
  return {
    ...actual,
    ListScreen: (props: { onEndReached: () => void }) => {
      capturedListProps = props;
      return React.createElement(actual.ListScreen, { ...props, onEndReached: () => undefined });
    },
  };
});

jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[], replaced: [] as unknown[], params: {} as Record<string, string> };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      replace: (target: unknown) => state.replaced.push(target),
      back: () => undefined,
      canGoBack: () => false,
    }),
  };
});

jest.mock('../../../shared/api/clubs', () => ({ listClubs: jest.fn(), getClubProfile: jest.fn() }));
jest.mock('@/features/clubs/useClubFollow', () => ({ useClubFollow: jest.fn() }));

const api = require('../../../shared/api/clubs') as { listClubs: jest.Mock; getClubProfile: jest.Mock };
const follow = require('@/features/clubs/useClubFollow').useClubFollow as jest.Mock;
const routerState = require('expo-router').__state as { pushed: unknown[]; replaced: unknown[]; params: Record<string, string> };
const { ClubDiscoveryScreen, ClubProfileScreen } = require('@/features/clubs/ClubScreens') as typeof import('@/features/clubs/ClubScreens');

const CLUB = {
  id: 7,
  name: 'Music Club',
  category: 'music',
  description: 'Play together',
  avatar: null,
  followers: 3,
  viewer: { following: false },
};

const PROFILE = {
  id: 7,
  basicInfo: { ...CLUB, viewer: { following: false, canManage: true, isMember: true } },
  joinInfo: { contactText: 'music@example.com', signupLink: '', ig: '', xhs: '' },
  members: [{ id: 1, role: 'admin', email: 'a@example.com', username: 'admin', nickname: 'Admin', avatar: null }],
  activities: [],
  posts: [],
};

beforeEach(() => {
  api.listClubs.mockReset();
  api.getClubProfile.mockReset();
  follow.mockReset().mockReturnValue({ following: false, followers: 3, state: 'idle', toggle: jest.fn() });
  routerState.pushed.length = 0;
  routerState.replaced.length = 0;
});

describe('P3A5-02 社团发现与主页', () => {
  it('发现页显示经模型验证的社团，并进入主页', async () => {
    api.listClubs.mockResolvedValue({ list: [CLUB], page: 1, pageSize: 20, hasMore: false });
    const view = await renderApp(<ClubDiscoveryScreen />);

    await waitFor(() => expect(view.getByTestId('club-list-row-7')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('club-list-row-7'));
    expect(routerState.pushed).toEqual(['/clubs/7']);
  });

  it.each([
    [true, true],
    [false, false],
  ])('主页只按服务端 canManage=%s 决定管理入口', async (canManage, visible) => {
    api.getClubProfile.mockResolvedValue({ ...PROFILE, basicInfo: { ...PROFILE.basicInfo, viewer: { following: false, canManage, isMember: false } } });
    const view = await renderApp(<ClubProfileScreen clubId="7" />);

    await waitFor(() => expect(view.getByTestId('club-profile-followers')).toBeTruthy());
    if (visible) expect(view.getByTestId('club-profile-manage')).toBeTruthy();
    else expect(view.queryByTestId('club-profile-manage')).toBeNull();
  });

  it('非法主页参数不请求服务端，并返回发现页', async () => {
    const view = await renderApp(<ClubProfileScreen clubId="not-an-id" />);

    await waitFor(() => expect(view.getByTestId('club-profile-unavailable')).toBeTruthy());
    expect(api.getClubProfile).not.toHaveBeenCalled();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('club-profile-back'));
    expect(routerState.replaced).toEqual(['/clubs']);
  });

  it('未登录点关注出现登录引导，点击前往登录', async () => {
    api.getClubProfile.mockResolvedValue(PROFILE);
    follow.mockReturnValue({ following: false, followers: 3, state: 'login', toggle: jest.fn() });
    const view = await renderApp(<ClubProfileScreen clubId="7" />);

    await waitFor(() => expect(view.getByTestId('club-profile-follow-notice')).toBeTruthy());
    fireEvent.press(within(view.getByTestId('club-profile-follow-notice')).getByText('登录'));
    expect(routerState.pushed).toEqual(['/login']);
  });

  it('关注失败出现可读的原因提示', async () => {
    api.getClubProfile.mockResolvedValue(PROFILE);
    follow.mockReturnValue({ following: false, followers: 3, state: 'failed', toggle: jest.fn() });
    const view = await renderApp(<ClubProfileScreen clubId="7" />);

    await waitFor(() => expect(view.getByTestId('club-profile-follow-notice')).toBeTruthy());
  });

  it('空闲态不渲染任何关注提示', async () => {
    api.getClubProfile.mockResolvedValue(PROFILE);
    const view = await renderApp(<ClubProfileScreen clubId="7" />);

    await waitFor(() => expect(view.getByTestId('club-profile-follow')).toBeTruthy());
    expect(view.queryByTestId('club-profile-follow-notice')).toBeNull();
  });

  it('关键词提交后随列表请求透传', async () => {
    api.listClubs.mockResolvedValue({ list: [CLUB], page: 1, pageSize: 20, hasMore: false });
    const view = await renderApp(<ClubDiscoveryScreen />);

    await waitFor(() => expect(view.getByTestId('club-list-row-7')).toBeTruthy());
    api.listClubs.mockClear();
    await fireEvent.changeText(view.getByTestId('club-search-input'), 'music');
    await fireEvent(view.getByTestId('club-search-input'), 'submitEditing');
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.objectContaining({ q: 'music' })));
  });

  it('分类筛选与关键词可组合，清除后回到未过滤', async () => {
    api.listClubs.mockResolvedValue({ list: [CLUB], page: 1, pageSize: 20, hasMore: false });
    const view = await renderApp(<ClubDiscoveryScreen />);

    await waitFor(() => expect(view.getByTestId('club-filter-music')).toBeTruthy());
    api.listClubs.mockClear();
    await fireEvent.press(view.getByTestId('club-filter-music'));
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.objectContaining({ category: 'music' })));

    api.listClubs.mockClear();
    await fireEvent.changeText(view.getByTestId('club-search-input'), 'choir');
    await fireEvent(view.getByTestId('club-search-input'), 'submitEditing');
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.objectContaining({ q: 'choir', category: 'music' })));

    api.listClubs.mockClear();
    await fireEvent.press(view.getByTestId('club-search-clear'));
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.not.objectContaining({ q: 'choir' })));
  });

  it('分类筛选后翻页仍带该分类，并从第 2 页起', async () => {
    api.listClubs.mockResolvedValue({ list: [CLUB], page: 1, pageSize: 20, hasMore: true });
    const view = await renderApp(<ClubDiscoveryScreen />);

    await waitFor(() => expect(view.getByTestId('club-list-row-7')).toBeTruthy());
    await fireEvent.press(view.getByTestId('club-filter-music'));
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.objectContaining({ category: 'music' })));

    api.listClubs.mockClear();
    await act(async () => { capturedListProps.onEndReached(); });
    await waitFor(() => expect(api.listClubs).toHaveBeenCalledWith(expect.objectContaining({ page: 2, category: 'music' })));
  });

  it('主页帖子行不再把全文当按钮 label，且仍可点进详情', async () => {
    const LONG = '这是一条非常非常长的社团动态内容，用来验证按钮文案收敛后不再被全文撑爆。';
    api.getClubProfile.mockResolvedValue({ ...PROFILE, posts: [{ id: 12, content: LONG }] });
    const view = await renderApp(<ClubProfileScreen clubId="7" />);

    await waitFor(() => expect(view.getByTestId('club-profile-post-12')).toBeTruthy());
    // 行不再是 Button：全文不再作为按钮 label prop 存在（ListItem 的读屏名是行内容，不是动作词）
    expect(view.getByTestId('club-profile-post-12').props.label).toBeUndefined();
    await fireEvent.press(view.getByTestId('club-profile-post-12'));
    expect(routerState.pushed).toEqual(['/clubs/post/12']);
  });

  it('迟到的未筛选响应不覆盖已筛选列表', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    api.listClubs.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const view = await renderApp(<ClubDiscoveryScreen />);

    await waitFor(() => expect(api.listClubs).toHaveBeenCalledTimes(1));
    const ORCHESTRA = { ...CLUB, id: 8, name: 'Orchestra' };
    api.listClubs.mockResolvedValueOnce({ list: [ORCHESTRA], page: 1, pageSize: 20, hasMore: false });
    await fireEvent.press(view.getByTestId('club-filter-music'));
    await waitFor(() => expect(view.getByTestId('club-list-row-8')).toBeTruthy());

    await act(async () => { resolveFirst({ list: [{ ...CLUB, id: 9, name: 'Stale' }], page: 1, pageSize: 20, hasMore: false }); });
    expect(view.queryByTestId('club-list-row-9')).toBeNull();
    expect(view.getByTestId('club-list-row-8')).toBeTruthy();
  });
});
