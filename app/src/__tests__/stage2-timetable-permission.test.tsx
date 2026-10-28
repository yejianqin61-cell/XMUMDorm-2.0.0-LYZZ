import * as React from 'react';
import { waitFor } from '@testing-library/react-native';
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
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const permissions = jest.requireMock('@/features/notifications/permissions').notificationPermission;
const storage = jest.requireMock('@react-native-async-storage/async-storage').default;

beforeEach(() => {
  jest.clearAllMocks();
  permissions.read.mockResolvedValue('undetermined');
  permissions.request.mockResolvedValue('granted');
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
});

it('explains class notifications and requests permission on first timetable entry', async () => {
  let finish!: (value: string) => void;
  permissions.request.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = await renderApp(<SessionProvider><TimetableScreen renderGrid={() => null} /></SessionProvider>);
  expect(view.getByTestId('timetable-reminder-explanation')).toBeTruthy();
  await waitFor(() => expect(permissions.request).toHaveBeenCalledTimes(1));
  expect(storage.setItem).toHaveBeenCalled();
  finish('granted');
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
