import {act, renderHook} from '@testing-library/react-native';
import {useClubActivityRegistration} from '@/features/clubs/useClubActivityRegistration';
import {cancelClubActivityRegistration, registerClubActivity} from '../../../shared/api/clubs';

const mockSession = {isSignedIn: true, handleAuthFailure: jest.fn()};
jest.mock('@/features/auth/session', () => ({useSession: () => mockSession}));
jest.mock('../../../shared/api/clubs', () => ({
  registerClubActivity: jest.fn(),
  cancelClubActivityRegistration: jest.fn(),
}));

const register = registerClubActivity as jest.Mock;
const cancel = cancelClubActivityRegistration as jest.Mock;

beforeEach(() => {
  register.mockReset();
  cancel.mockReset();
  mockSession.isSignedIn = true;
  mockSession.handleAuthFailure.mockReset();
});

describe('社团活动报名状态', () => {
  it('游客不发送请求，直接进入登录态', async () => {
    mockSession.isSignedIn = false;
    const hook = await renderHook(() => useClubActivityRegistration(7));
    await act(async () => { await hook.result.current.register(); });
    expect(register).not.toHaveBeenCalled();
    expect(hook.result.current.state).toBe('login');
  });

  it('只采用服务端返回的报名状态，不在客户端猜测人数', async () => {
    register.mockResolvedValue({activityId: 7, registered: true, count: 23, deadline: '2026-10-20T12:00:00.000Z'});
    cancel.mockResolvedValue({activityId: 7, registered: false, count: 22, deadline: '2026-10-20T12:00:00.000Z'});
    const hook = await renderHook(() => useClubActivityRegistration(7));

    await act(async () => { await hook.result.current.register(); });
    expect(register).toHaveBeenCalledWith(7);
    expect(hook.result.current.snapshot).toEqual({activityId: 7, registered: true, count: 23, deadline: '2026-10-20T12:00:00.000Z'});
    expect(hook.result.current.state).toBe('registered');

    await act(async () => { await hook.result.current.cancel(); });
    expect(cancel).toHaveBeenCalledWith(7);
    expect(hook.result.current.snapshot).toEqual({activityId: 7, registered: false, count: 22, deadline: '2026-10-20T12:00:00.000Z'});
    expect(hook.result.current.state).toBe('cancelled');
  });

  it('过期会话统一处理，处罚不登出', async () => {
    register.mockRejectedValueOnce({status: 403}).mockRejectedValueOnce({status: 403, body: {muted: true}});
    const hook = await renderHook(() => useClubActivityRegistration(7));

    await act(async () => { await hook.result.current.register(); });
    expect(mockSession.handleAuthFailure).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toBe('login');

    await act(async () => { await hook.result.current.register(); });
    expect(mockSession.handleAuthFailure).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toBe('denied');
  });

  it('同一请求不重复提交，切换活动后忽略旧返回', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    register.mockImplementation(() => new Promise((resolve) => { resolveOld = resolve; }));
    const hook = await renderHook(({id}: {id: number}) => useClubActivityRegistration(id), {initialProps: {id: 7}});
    let pending: Promise<void>;
    await act(async () => {
      pending = hook.result.current.register();
      void hook.result.current.register();
    });
    expect(register).toHaveBeenCalledTimes(1);

    await hook.rerender({id: 8});
    await act(async () => { resolveOld({activityId: 7, registered: true, count: 23, deadline: null}); await pending; });
    expect(hook.result.current.snapshot).toBeNull();
    expect(hook.result.current.state).toBe('idle');
  });
});
