import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { SessionProvider } from '@/features/auth/session';
import { TimetableScreen } from '@/features/tools/TimetableScreen';

jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn(async (week: number) => ({
  week, currentWeek: week, totalWeeks: 14, days: {},
})) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/notifications/permissions', () => ({ notificationPermission: {
  read: jest.fn(), request: jest.fn(), openSettings: jest.fn(),
} }));
jest.mock('@/features/tools/reminders/native', () => ({ refreshClassReminders: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const permissions = jest.requireMock('@/features/notifications/permissions').notificationPermission;
const storage = jest.requireMock('@react-native-async-storage/async-storage').default;
const refresh = jest.requireMock('@/features/tools/reminders/native').refreshClassReminders as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  permissions.read.mockResolvedValue('undetermined');
  permissions.request.mockResolvedValue('granted');
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  refresh.mockResolvedValue({ status: 'scheduled', scheduled: [], deferred: 0 });
});

it('explains class notifications and requests permission on first timetable entry', async () => {
  let finish!: (value: string) => void;
  permissions.request.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  expect(view.getByTestId('timetable-reminder-explanation')).toBeTruthy();
  await waitFor(() => expect(permissions.request).toHaveBeenCalledTimes(1));
  expect(storage.setItem).not.toHaveBeenCalledWith('@dorm:timetable-notification-requested', '1');
  finish('granted');
  await waitFor(() => expect(storage.setItem).toHaveBeenCalledWith('@dorm:timetable-notification-requested', '1'));
});

it('does not record a failed permission request as completed', async () => {
  permissions.request.mockRejectedValueOnce(new Error('notification service unavailable'));
  const view = await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  await waitFor(() => expect(view.getByText('当前预览暂不支持通知')).toBeTruthy());
  expect(storage.setItem).not.toHaveBeenCalledWith('@dorm:timetable-notification-requested', '1');
  await view.unmount();
});

it('does not request again after an earlier request', async () => {
  storage.getItem.mockResolvedValue('1');
  await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  await waitFor(() => expect(permissions.read).toHaveBeenCalled());
  await waitFor(() => expect(storage.getItem).toHaveBeenCalled());
  expect(permissions.request).not.toHaveBeenCalled();
});

it('offers settings when permission is denied', async () => {
  permissions.read.mockResolvedValue('denied');
  const view = await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  await waitFor(() => expect(view.getByTestId('timetable-reminder-settings')).toBeTruthy());
  expect(permissions.request).not.toHaveBeenCalled();
});

it('shows partial scheduling and allows retry after failure', async () => {
  permissions.read.mockResolvedValue('granted');
  refresh.mockRejectedValueOnce(new Error('native failure'))
    .mockResolvedValueOnce({ status: 'scheduled', scheduled: [], deferred: 1 });
  const view = await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  await waitFor(() => expect(view.getByTestId('timetable-reminder-retry')).toBeTruthy());
  await fireEvent.press(view.getByTestId('timetable-reminder-retry'));
  await waitFor(() => expect(view.getByText('部分提醒未安排')).toBeTruthy());
});
