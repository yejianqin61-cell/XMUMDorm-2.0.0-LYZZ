import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { ReminderRuntimeHost } from '@/features/tools/reminders/ReminderRuntimeHost';

let mockCurrentScope = 'user:7:semester:2026-09';
beforeEach(() => { jest.clearAllMocks(); mockCurrentScope = 'user:7:semester:2026-09'; });
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn' }) }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('@/features/tools/cacheIdentity', () => ({ timetableIdentity: () => ({ scope: mockCurrentScope }) }));
jest.mock('@/features/tools/reminders/native', () => ({
  clearReminderOwner: jest.fn(async () => {}), invalidateReminderSession: jest.fn(),
  refreshClassReminders: jest.fn(async () => null),
}));

it('invalidates and clears the previous account when switching directly to another account', async () => {
  const native = jest.requireMock('@/features/tools/reminders/native');
  const view = await render(<ReminderRuntimeHost />);
  mockCurrentScope = 'user:8:semester:2026-09';
  await view.rerender(<ReminderRuntimeHost />);
  await waitFor(() => expect(native.clearReminderOwner).toHaveBeenCalledWith('user:7'));
  expect(native.invalidateReminderSession).toHaveBeenCalled();
});

it('refreshes on startup, semester changes and foreground return, then removes its listener', async () => {
  const native = jest.requireMock('@/features/tools/reminders/native');
  let changed!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    changed = listener; return { remove };
  });
  try {
    const view = await render(<ReminderRuntimeHost />);
    await waitFor(() => expect(native.refreshClassReminders).toHaveBeenCalledTimes(1));
    mockCurrentScope = 'user:7:semester:2027-02';
    await view.rerender(<ReminderRuntimeHost />);
    await waitFor(() => expect(native.refreshClassReminders).toHaveBeenCalledTimes(2));
    expect(native.clearReminderOwner).not.toHaveBeenCalled();
    await act(() => changed('background'));
    expect(native.refreshClassReminders).toHaveBeenCalledTimes(2);
    await act(() => changed('active'));
    await waitFor(() => expect(native.refreshClassReminders).toHaveBeenCalledTimes(3));
    await view.unmount();
    expect(remove).toHaveBeenCalled();
  } finally { spy.mockRestore(); }
});
