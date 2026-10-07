import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ToastProvider } from '@/components/ui/Toast';
import ImportScreen from '@/app/tools/schedule-import';
import { clearNamespace, getItem } from '@/shared/storage';
import { draftKeyFor } from '@/components/ui/Form';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import * as scheduleApi from '../../../shared/api/schedule';
import { usePreventRemove } from 'expo-router/react-navigation';

const mockDispatch = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }), useLocalSearchParams: () => ({}), useRouter: () => ({ push: jest.fn(), back: mockBack, canGoBack: () => true, replace: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({ unreadCount: 0, onMailboxPress: jest.fn() }) }));
jest.mock('../../../shared/api/schedule', () => ({ previewScheduleImport: jest.fn(), commitScheduleImport: jest.fn() }));
const api = jest.mocked(scheduleApi);
const hook = jest.mocked(usePreventRemove);
const text = 'Course\tCS101\tAlgorithms\tMonday\t08:00';
const lastGuard = () => hook.mock.calls[hook.mock.calls.length - 1];
const renderImport = () => renderApp(<ToastProvider><ImportScreen /></ToastProvider>);
const importDraftKey = () => draftKeyFor(`schedule-import-${timetableIdentity().scope}`);
beforeEach(async () => { await clearNamespace(); jest.clearAllMocks(); mockBack.mockReset(); api.previewScheduleImport.mockResolvedValue({ courses: [{ course_code: 'CS101', course_name: 'Algorithms' }], meetings: [], errors: [] }); api.commitScheduleImport.mockResolvedValue({}); });

it('keeps edited text when the user cancels system removal', async () => {
  const view = await renderImport();
  await fireEvent.changeText(view.getByLabelText(/粘贴/), text);
  expect(lastGuard()?.[0]).toBe(true);
  await act(async () => lastGuard()[1]({ data: { action: { type: 'GO_BACK' } } }));
  await fireEvent.press(view.getByText('继续编辑'));
  expect(view.getByDisplayValue(text)).toBeTruthy();
  expect(mockDispatch).not.toHaveBeenCalled();
});
it('resumes the original removal only after discard is confirmed', async () => {
  const view = await renderImport();
  await fireEvent.changeText(view.getByLabelText(/粘贴/), text);
  await waitFor(async () => expect(await getItem(importDraftKey())).toEqual({ text }));
  expect(lastGuard()?.[0]).toBe(true);
  await act(async () => lastGuard()[1]({ data: { action: { type: 'GO_BACK' } } }));
  await fireEvent.press(view.getByText('放弃'));
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
  expect(lastGuard()[0]).toBe(false);
  expect(await getItem(importDraftKey())).toBeNull();
});
it.each(['preview', 'commit'] as const)('blocks removal while %s is pending', async (phase) => {
  const view = await renderImport();
  await fireEvent.changeText(view.getByLabelText(/粘贴/), text);
  if (phase === 'preview') api.previewScheduleImport.mockReturnValue(new Promise(() => undefined));
  else api.commitScheduleImport.mockReturnValue(new Promise(() => undefined));
  await fireEvent.press(view.getByTestId('import-preview'));
  if (phase === 'commit') {
    await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
    await fireEvent.press(view.getByTestId('import-commit'));
    await fireEvent.press(view.getByText('覆盖'));
  }
  expect(lastGuard()?.[0]).toBe(true);
  await act(async () => lastGuard()[1]({ data: { action: { type: 'GO_BACK' } } }));
  expect(view.queryByText('放弃')).toBeNull();
  expect(mockDispatch).not.toHaveBeenCalled();
});
it('disables protection before returning from a successful import', async () => {
  mockBack.mockImplementation(() => expect(lastGuard()?.[0]).toBe(false));
  const view = await renderImport();
  await fireEvent.changeText(view.getByLabelText(/粘贴/), text);
  await waitFor(async () => expect(await getItem(importDraftKey())).toEqual({ text }));
  await fireEvent.press(view.getByTestId('import-preview'));
  await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
  await fireEvent.press(view.getByTestId('import-commit'));
  await fireEvent.press(view.getByText('覆盖'));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(lastGuard()?.[0]).toBe(false);
  expect(view.queryByText('放弃')).toBeNull();
  expect(await getItem(importDraftKey())).toBeNull();
});
it('preserves edited text and protection after a failed commit', async () => {
  api.commitScheduleImport.mockRejectedValue({ kind: 'offline' });
  const view = await renderImport();
  await fireEvent.changeText(view.getByLabelText(/粘贴/), text);
  await fireEvent.press(view.getByTestId('import-preview'));
  await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
  await fireEvent.press(view.getByTestId('import-commit'));
  await fireEvent.press(view.getByText('覆盖'));
  await waitFor(() => expect(view.getAllByText(/网络没连上/).length).toBeGreaterThan(0));
  expect(view.getByDisplayValue(text)).toBeTruthy();
  expect(lastGuard()?.[0]).toBe(true);
  expect(mockBack).not.toHaveBeenCalled();
});
