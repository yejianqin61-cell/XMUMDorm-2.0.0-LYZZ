import * as React from 'react';
import { Text, Pressable } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { useTodayTodos } from '@/features/todos/useTodayTodos';
import { useSession } from '@/features/auth/session';
import { clearNamespace, getItem } from '@/shared/storage';
import { resetTokenMirrorForTests, saveToken } from '@/features/auth/tokenStore';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }) }));
jest.mock('@/features/auth/session', () => {
  const context = require('react').createContext(null);
  return { __context: context, useSession: () => require('react').useContext(context) };
});
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn() }));
jest.mock('../../../shared/api/canteen', () => ({ postProductComment: jest.fn() }));
const api = require('../../../shared/api/todos') as Record<string, jest.Mock>;
const token = (id: number) => `header.${btoa(JSON.stringify({ id }))}.signature`;
const failures: number[] = [];
function Harness({ child }: { child: React.ReactElement }) {
  const [account, setAccount] = React.useState(7);
  const context = require('@/features/auth/session').__context;
  const value = React.useMemo(() => ({ status: 'signedIn', handleAuthFailure: async () => { failures.push(account); return { kind: 'unknown' }; } }), [account]);
  return <context.Provider value={value}>{child}<Pressable testID="switch" onPress={() => { void saveToken(token(8)).then(() => setAccount(8)); }}><Text>Switch</Text></Pressable></context.Provider>;
}
function TodosProbe() {
  const session = useSession(); const state = useTodayTodos(session.handleAuthFailure);
  return <Text testID="count">{state.data?.total ?? -1}</Text>;
}
beforeEach(async () => { resetTokenMirrorForTests(); await clearNamespace(); await saveToken(token(7)); failures.length = 0; jest.clearAllMocks(); });
it('remounts review form on a session change without moving the old draft', async () => {
  const view = await renderApp(<Harness child={<ReviewScreen productId={9} />} />);
  await fireEvent.changeText(view.getByLabelText(/正文/), 'A private draft');
  await fireEvent.press(view.getByTestId('switch'));
  await waitFor(() => expect(view.queryByDisplayValue('A private draft')).toBeNull());
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
  const draft = await getItem<{ content: string }>('draft:canteen-review-user8:semesterbetween-9');
  expect(draft?.content).not.toBe('A private draft');
});
it('ignores the old account unauthorized response before auth side effects', async () => {
  let reject!: (error: unknown) => void;
  api.getTodayTodos.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; })).mockResolvedValue({ total: 1, completed: 0, active: 1, topItems: [] });
  const view = await renderApp(<Harness child={<TodosProbe />} />);
  await waitFor(() => expect(api.getTodayTodos).toHaveBeenCalledTimes(1));
  await fireEvent.press(view.getByTestId('switch'));
  await waitFor(() => expect(view.getByTestId('count').props.children).toBe(1));
  await act(async () => reject({ status: 401 }));
  expect(failures).toEqual([]);
});
