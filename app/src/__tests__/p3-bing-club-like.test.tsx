import {act, renderHook} from '@testing-library/react-native';
import {useClubLike} from '@/features/clubs/useClubLike';
import {toggleClubLike} from '../../../shared/api/clubs';

const mockSession = {isSignedIn: true, handleAuthFailure: jest.fn()};
jest.mock('@/features/auth/session', () => ({useSession: () => mockSession}));
jest.mock('../../../shared/api/clubs', () => ({toggleClubLike: jest.fn()}));
const toggle = toggleClubLike as jest.Mock;

beforeEach(() => { toggle.mockReset(); mockSession.isSignedIn = true; mockSession.handleAuthFailure.mockReset(); });

describe('社团点赞状态', () => {
  it('游客不触发写入', async () => {
    mockSession.isSignedIn = false;
    const hook = await renderHook(() => useClubLike({targetType: 'post', targetId: 9, liked: false, count: 1}));
    await act(async () => { await hook.result.current.toggle(); });
    expect(toggle).not.toHaveBeenCalled();
    expect(hook.result.current.state).toBe('login');
  });

  it('只采用匹配目标的服务端状态和数量', async () => {
    toggle.mockResolvedValue({targetType: 'activity', targetId: 9, liked: true, count: 8});
    const hook = await renderHook(() => useClubLike({targetType: 'activity', targetId: 9, liked: false, count: 1}));
    await act(async () => { await hook.result.current.toggle(); });
    expect(toggle).toHaveBeenCalledWith('activity', 9);
    expect(hook.result.current).toMatchObject({liked: true, count: 8, state: 'success'});
  });

  it('拒绝错误目标的回执，不污染当前内容', async () => {
    toggle.mockResolvedValue({targetType: 'post', targetId: 10, liked: true, count: 8});
    const hook = await renderHook(() => useClubLike({targetType: 'post', targetId: 9, liked: false, count: 1}));
    await act(async () => { await hook.result.current.toggle(); });
    expect(hook.result.current).toMatchObject({liked: false, count: 1, state: 'failed'});
  });

  it('令牌失效交给统一会话处理，处罚不登出', async () => {
    toggle.mockRejectedValueOnce({status: 401}).mockRejectedValueOnce({status: 403, body: {banned: true}});
    const hook = await renderHook(() => useClubLike({targetType: 'post', targetId: 9, liked: false, count: 1}));
    await act(async () => { await hook.result.current.toggle(); });
    expect(mockSession.handleAuthFailure).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toBe('login');
    await act(async () => { await hook.result.current.toggle(); });
    expect(mockSession.handleAuthFailure).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toBe('denied');
  });

  it('请求中防重复，切换内容后忽略旧回执', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    toggle.mockImplementation(() => new Promise((resolve) => { resolveOld = resolve; }));
    const hook = await renderHook(({id}: {id: number}) => useClubLike({targetType: 'post', targetId: id, liked: false, count: 1}), {initialProps: {id: 9}});
    let pending: Promise<void>;
    await act(async () => { pending = hook.result.current.toggle(); void hook.result.current.toggle(); });
    expect(toggle).toHaveBeenCalledTimes(1);
    await hook.rerender({id: 10});
    await act(async () => { resolveOld({targetType: 'post', targetId: 9, liked: true, count: 2}); await pending; });
    expect(hook.result.current).toMatchObject({liked: false, count: 1, state: 'idle'});
  });
});
