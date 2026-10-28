import * as React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ReminderRuntimeHost } from '@/features/tools/reminders/ReminderRuntimeHost';

let mockCurrentScope = 'user:7:semester:2026-09';
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
