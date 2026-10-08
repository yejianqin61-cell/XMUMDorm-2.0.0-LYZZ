import * as React from 'react';
import { View } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import SchoolSystemScreen from '@/app/system/[id]';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SchoolSystemWebView } from '@/features/tools/SchoolSystemWebView';
import { SCRAPE_KIND } from '@/features/tools/injectedScripts';
import { renderApp } from './helpers/renderApp';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReadSchedule = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: jest.fn(),
  Redirect: jest.fn(() => null),
}));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: jest.fn() }));
jest.mock('@/features/tools/SchoolSystemWebView', () => ({ SchoolSystemWebView: jest.fn() }));

const badgeHook = jest.mocked(useMailboxBadge);
const paramsHook = jest.mocked(useLocalSearchParams);
const schoolView = jest.mocked(SchoolSystemWebView);

beforeEach(() => {
  jest.clearAllMocks();
  paramsHook.mockReturnValue({ id: 'ac' });
  badgeHook.mockReturnValue({
    unreadCount: 7,
    onMailboxPress: () => mockPush('/mailbox'),
  });
  schoolView.mockImplementation(function SchoolSystemStub(props) {
    React.useImperativeHandle(props.ref, () => ({
      readSchedule: mockReadSchedule,
      probeSession: jest.fn(),
    }));
    return <View testID={props.testID} />;
  });
});

it('shows one tools TopBar with the shared unread badge and mailbox destination', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  expect(view.getByText('工具')).toBeTruthy();
  expect(view.getAllByTestId('topbar-mailbox')).toHaveLength(1);
  expect(view.getByTestId('topbar-mailbox').props.accessibilityLabel).toContain('7');
  await fireEvent.press(view.getByTestId('topbar-mailbox'));
  expect(mockPush).toHaveBeenCalledWith('/mailbox');
  expect(mockBack).not.toHaveBeenCalled();
});

it('keeps the close action independent from opening the mailbox', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  await fireEvent.press(view.getByTestId('school-system-close'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
});

it('preserves AC reading, its import destination, and mailbox access after results arrive', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  await fireEvent.press(view.getByTestId('school-read-schedule'));
  expect(mockReadSchedule).toHaveBeenCalledTimes(1);

  const rows = [['Course', 'Time'], ['Algorithms', '08:00']];
  const props = schoolView.mock.calls[schoolView.mock.calls.length - 1][0];
  await act(async () => props.onScheduleMessage?.(JSON.stringify({ kind: SCRAPE_KIND, rows })));
  expect(view.getByTestId('school-schedule-notice')).toBeTruthy();
  await fireEvent.press(view.getByText('课表导入'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/tools/schedule-import',
    params: { text: 'Course\tTime\nAlgorithms\t08:00' },
  });
  await fireEvent.press(view.getByTestId('topbar-mailbox'));
  expect(mockPush).toHaveBeenLastCalledWith('/mailbox');
  expect(view.getAllByTestId('topbar-mailbox')).toHaveLength(1);
});

it('keeps a mailbox and close action on Moodle without exposing AC reading', async () => {
  paramsHook.mockReturnValue({ id: 'moodle' });
  const view = await renderApp(<SchoolSystemScreen />);
  expect(view.getByTestId('webview-moodle')).toBeTruthy();
  expect(view.queryByTestId('school-read-schedule')).toBeNull();
  expect(view.getByTestId('school-system-close')).toBeTruthy();
  await fireEvent.press(view.getByTestId('topbar-mailbox'));
  expect(mockPush).toHaveBeenCalledWith('/mailbox');
});

it('redirects an unknown system to tools without mounting browser controls', async () => {
  paramsHook.mockReturnValue({ id: 'unknown-system' });
  const view = await renderApp(<SchoolSystemScreen />);
  expect(jest.mocked(Redirect).mock.calls.some(([props]) => props.href === '/tools')).toBe(true);
  expect(view.queryByTestId('school-system-close')).toBeNull();
  expect(schoolView).not.toHaveBeenCalled();
});
