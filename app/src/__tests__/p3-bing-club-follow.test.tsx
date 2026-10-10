import {act, renderHook} from '@testing-library/react-native';
import {useClubFollow} from '@/features/clubs/useClubFollow';
import {toggleClubFollow} from '../../../shared/api/clubs';

const mockSession = {isSignedIn: true, handleAuthFailure: jest.fn()};
jest.mock('@/features/auth/session', () => ({useSession: () => mockSession}));
jest.mock('../../../shared/api/clubs', () => ({toggleClubFollow: jest.fn()}));
const toggle = toggleClubFollow as jest.Mock;

beforeEach(() => { toggle.mockReset(); mockSession.isSignedIn = true; mockSession.handleAuthFailure.mockReset(); });

describe('社团关注状态', () => {
  it('游客不写入，成功时只采用匹配的服务端回执', async () => {
    mockSession.isSignedIn = false;
    const guest = await renderHook(() => useClubFollow({clubId: 7, following: false, followers: 3}));
    await act(async () => { await guest.result.current.toggle(); });
    expect(toggle).not.toHaveBeenCalled();
    expect(guest.result.current.state).toBe('login');

    mockSession.isSignedIn = true;
    toggle.mockResolvedValue({clubId: 7, following: true, followers: 4});
    const signedIn = await renderHook(() => useClubFollow({clubId: 7, following: false, followers: 3}));
    await act(async () => { await signedIn.result.current.toggle(); });
    expect(signedIn.result.current).toMatchObject({following: true, followers: 4, state: 'success'});
  });

  it('错误目标与处罚不会伪造成功或清除会话', async () => {
    toggle.mockResolvedValueOnce({clubId: 8, following: true, followers: 4}).mockRejectedValueOnce({status: 403, body: {muted: true}});
    const hook = await renderHook(() => useClubFollow({clubId: 7, following: false, followers: 3}));
    await act(async () => { await hook.result.current.toggle(); });
    expect(hook.result.current).toMatchObject({following: false, followers: 3, state: 'failed'});
    await act(async () => { await hook.result.current.toggle(); });
    expect(mockSession.handleAuthFailure).not.toHaveBeenCalled();
    expect(hook.result.current.state).toBe('denied');
  });

  it('防止重复请求且在社团切换后忽略旧结果', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    toggle.mockImplementation(() => new Promise((resolve) => { resolveOld = resolve; }));
    const hook = await renderHook(({clubId}: {clubId: number}) => useClubFollow({clubId, following: false, followers: 3}), {initialProps: {clubId: 7}});
    let pending: Promise<void>;
    await act(async () => { pending = hook.result.current.toggle(); void hook.result.current.toggle(); });
    expect(toggle).toHaveBeenCalledTimes(1);
    await hook.rerender({clubId: 8});
    await act(async () => { resolveOld({clubId: 7, following: true, followers: 4}); await pending; });
    expect(hook.result.current).toMatchObject({following: false, followers: 3, state: 'idle'});
  });
});
