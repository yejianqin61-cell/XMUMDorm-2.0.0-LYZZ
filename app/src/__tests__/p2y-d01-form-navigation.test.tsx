import * as React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { Form, useForm } from '@/components/ui/Form';
const mockDispatch = jest.fn();
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
function Probe() {
  const fields = [{ name: 'title', kind: 'text' as const, labelKey: 'tools.todos.field.title' as const }];
  const form = useForm({ formId: 'guard-test', fields, enableDraft: false, onSubmit: async () => undefined });
  return <Form testID="guard-form" titleKey="tools.todos.create" guardNavigation form={form} sections={[{ title: 'tools.todos.create', fields }]} semantic="create"
    labels={{ submit: 'Save', cancel: 'Cancel', errorSummaryTitle: 'Failed', leaveTitle: 'Leave?', leaveConfirm: 'Discard', leaveCancel: 'Keep' }} />;
}
it('shows the title and blocks system removal until the user confirms', async () => {
  const view = await renderApp(<Probe />);
  expect(view.getByTestId('topbar-mailbox')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('标题'), 'Unsaved');
  const hook = require('expo-router/react-navigation').usePreventRemove as jest.Mock;
  const [prevent, callback] = hook.mock.calls[hook.mock.calls.length - 1];
  expect(prevent).toBe(true);
  await act(async () => callback({ data: { action: { type: 'GO_BACK' } } }));
  expect(mockDispatch).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('Keep'));
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async () => callback({ data: { action: { type: 'GO_BACK' } } }));
  await fireEvent.press(view.getByText('Discard'));
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
});
