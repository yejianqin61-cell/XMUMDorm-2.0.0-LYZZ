import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { HolidaysContent, upcomingSchoolHolidays } from '@/features/tools/HolidaysScreen';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { clearNamespace } from '@/shared/storage';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }) }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn(async (week: number) => ({ week, currentWeek: week, days: {} })) }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn(async () => ({ total: 0, active: 0, completed: 0, topItems: [] })) }));

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: [
    'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
    'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  ] });
  jest.setSystemTime(new Date('2026-10-11T00:00:00Z'));
  await clearNamespace();
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('keeps a holiday through its final school date and drops it on the next date', () => {
  expect(upcomingSchoolHolidays(new Date('2026-11-09T15:59:59Z'))[0]?.id).toBe('deepavali-2026');
  expect(upcomingSchoolHolidays(new Date('2026-11-09T16:00:00Z'))[0]?.id).toBe('selangor-sultan-2026');
});

it('puts holidays directly under courses and opens all upcoming dates from the summary', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-today-todos')).toBeTruthy());
  const children = view.getByTestId('tools-dashboard-content').props.children;
  expect(children.slice(1, 4).map((child: React.ReactElement<{ testID?: string }>) => child.props.testID))
    .toEqual(['tools-courses', 'tools-holidays', 'tools-today-todos']);
  await fireEvent.press(view.getByTestId('tools-holiday-open'));
  expect(view.getByTestId('tools-holidays-content')).toBeTruthy();
  expect(view.getByTestId('holiday-deepavali-2026')).toBeTruthy();
  expect(view.getByTestId('holiday-new-year-2028')).toBeTruthy();
  await fireEvent.press(view.getByTestId('tools-holidays-back'));
  expect(view.getByTestId('tools-today-todos')).toBeTruthy();
});

it('exposes a back action for the host without changing native back dispatch', async () => {
  const onBack = jest.fn();
  const view = await renderApp(<HolidaysContent now={new Date('2026-10-11T00:00:00Z')} onBack={onBack} />);
  await fireEvent.press(view.getByTestId('tools-holidays-back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('shows existing empty copy when the local calendar has no later dates', async () => {
  const view = await renderApp(<HolidaysContent now={new Date('2030-01-01T00:00:00Z')} onBack={jest.fn()} />);
  expect(view.getByText('本地日历暂无后续放假日')).toBeTruthy();
});

it('renders English holiday names using the shared calendar data', async () => {
  const view = await renderApp(<HolidaysContent now={new Date('2026-10-11T00:00:00Z')} onBack={jest.fn()} />, { locale: 'en', scheme: 'light' });
  expect(view.getByText('Deepavali · 2026-11-08 to 2026-11-09')).toBeTruthy();
  expect(view.getByText('Back')).toBeTruthy();
});
