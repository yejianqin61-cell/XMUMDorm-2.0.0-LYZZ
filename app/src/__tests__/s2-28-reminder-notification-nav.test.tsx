/**
 * 阶段C-02 · 提醒通知点击的公共导航宿主
 *
 * 宿主只做两件事：接前台事件 + 冷启动取最后响应，然后交给唯一映射（mock 掉）。
 * 全局只挂一次由源码断言（根布局里恰好一处）。
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ identifier: mockOwner }),
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock('@/features/notifications/reminderRoute', () => ({
  resolveReminderRoute: jest.fn(),
}));

import * as fs from 'node:fs';
import * as path from 'node:path';
import { act, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { renderApp } from './helpers/renderApp';
import { ReminderNotificationHost } from '@/features/notifications/ReminderNotificationHost';
import { resolveReminderRoute } from '@/features/notifications/reminderRoute';

const mockPush = jest.fn();
let mockOwner: string | null = 'owner-1';
let listener: ((response: unknown) => void) | null = null;
const remove = jest.fn();

const responseFor = (data: unknown) => ({ notification: { request: { content: { data } } } });
const mockedLast = Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockedListen = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockedResolve = resolveReminderRoute as jest.MockedFunction<typeof resolveReminderRoute>;

beforeEach(() => {
  mockPush.mockClear();
  mockOwner = 'owner-1';
  listener = null;
  remove.mockClear();
  mockedLast.mockReset().mockResolvedValue(null);
  mockedListen.mockReset().mockImplementation((handler: (response: unknown) => void) => {
    listener = handler;
    return { remove };
  });
  mockedResolve.mockReset().mockReturnValue({ kind: 'route', href: '/tools/timetable?week=5&course=CS101' });
});

describe('提醒通知导航宿主（阶段C-02）', () => {
  it('前台收到点击：交给映射并跳转一次', async () => {
    await renderApp(<ReminderNotificationHost />);
    await waitFor(() => expect(listener).not.toBeNull());
    await act(async () => listener?.(responseFor({ domain: 'class' })));
    expect(mockedResolve).toHaveBeenCalledWith({ domain: 'class' }, 'owner-1');
    expect(mockPush).toHaveBeenCalledWith('/tools/timetable?week=5&course=CS101');
  });

  it('冷启动取到上次响应：同样跳转一次', async () => {
    mockedLast.mockResolvedValue(responseFor({ domain: 'class' }));
    await renderApp(<ReminderNotificationHost />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  });

  it('映射判为忽略/不可用时：不跳转', async () => {
    mockedResolve.mockReturnValue({ kind: 'ignore' });
    await renderApp(<ReminderNotificationHost />);
    await waitFor(() => expect(listener).not.toBeNull());
    await act(async () => listener?.(responseFor({ domain: 'class' })));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('卸载后移除监听', async () => {
    const view = await renderApp(<ReminderNotificationHost />);
    await waitFor(() => expect(listener).not.toBeNull());
    await act(async () => {
      view.unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('根布局只挂一个宿主（源码断言）', () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, '../app/_layout.tsx'),
      'utf8'
    );
    expect(layout.match(/<ReminderNotificationHost\b/g) ?? []).toHaveLength(1);
  });
});
