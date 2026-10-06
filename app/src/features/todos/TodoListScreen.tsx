import * as React from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash from 'lucide-react-native/icons/trash';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { useSession } from '@/features/auth/session';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import { getTodos, toggleTodo, deleteTodo } from '../../../../shared/api/todos';
import { normalizeTodos, mergeTodos, notifyTodosChanged, TODO_PRIORITY_KEYS, type Todo } from './todos';

export function TodoListScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const session = useSession();
  const authRef = React.useRef(session.handleAuthFailure); authRef.current = session.handleAuthFailure;
  const [rows, setRows] = React.useState<readonly Todo[]>([]);
  const [filter, setFilter] = React.useState('all');
  const [deleting, setDeleting] = React.useState<Todo | null>(null);
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const retryWrite = React.useRef<(() => Promise<unknown>) | null>(null);
  const [writeError, setWriteError] = React.useState<AppError | null>(null);
  const { pagination, dispatch } = useListPagination();
  const pageRef = React.useRef(1);
  const version = React.useRef(0);
  const loading = React.useRef(false);
  const hasMore = React.useRef(true);
  const epoch = timetableIdentity().epoch;

  const load = React.useCallback(async (mode: 'refresh' | 'append') => {
    if (mode === 'append' && (loading.current || !hasMore.current)) return;
    const request = ++version.current;
    const owner = timetableIdentity().epoch;
    loading.current = true;
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const page = mode === 'refresh' ? 1 : pageRef.current + 1;
      const result = normalizeTodos(await getTodos({ page, pageSize: 20 }));
      if (result === null) throw { kind: 'unknown' };
      if (request !== version.current || owner !== timetableIdentity().epoch) return;
      pageRef.current = page; hasMore.current = result.hasMore;
      setRows((previous) => mode === 'refresh' ? result.list : mergeTodos(previous, result.list));
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: result.hasMore });
    } catch (error) {
      const auth = await authRef.current(error);
      if (request !== version.current || owner !== timetableIdentity().epoch) return;
      dispatch({ type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: toToolsError(error, auth) });
    } finally { if (request === version.current) loading.current = false; }
  }, [dispatch]);

  useFocusEffect(React.useCallback(() => {
    setRows([]); setWriteError(null); void load('refresh');
    return () => { version.current += 1; loading.current = false; };
  }, [load, epoch]));

  const mutate = async (operation: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setWriteError(null); retryWrite.current = operation;
    const owner = timetableIdentity().epoch;
    try {
      await operation();
      if (owner !== timetableIdentity().epoch) return;
      retryWrite.current = null; notifyTodosChanged(); await load('refresh');
    } catch (error) {
      const auth = await authRef.current(error);
      if (owner === timetableIdentity().epoch) setWriteError(toToolsError(error, auth));
    } finally { busyRef.current = false; setBusy(false); }
  };
  const visible = filter === 'all' ? rows : rows.filter((row) => row.priority === Number(filter));
  return (
    <Screen titleKey="tools.todos.title" testID="screen-todos" bottomMode="own">
      <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_3') }}>
        <Button testID="todos-create" label={t('tools.todos.create')} onPress={() => router.push('/tools/todos/new')} />
        <SegmentedControl testID="todos-filter" value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('tools.todos.all') }, ...[3, 2, 1, 0].map((priority) => ({ value: String(priority), label: t(TODO_PRIORITY_KEYS[priority]) })),
        ]} />
        {writeError ? <ErrorState testID="todos-write-error" error={writeError} onAction={() => { if (retryWrite.current) void mutate(retryWrite.current); }} /> : null}
        <ListScreen testID="todos-list" data={visible} keyExtractor={(row) => String(row.id)} pagination={pagination}
          onRefresh={() => void load('refresh')} onEndReached={() => void load('append')} onRetryRefresh={() => void load('refresh')} onRetryAppend={() => void load('append')}
          labels={{ empty: { kind: 'firstRun', title: t('tools.todos.empty'), description: t('tools.todos.emptyHelp'), actionLabel: t('tools.todos.create'), onAction: () => router.push('/tools/todos/new') }, retryLabel: t('action.retry'), endLabel: t('tools.todos.end') }}
          renderItem={(row) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}>
            <View style={{ flex: 1 }}><ListItem testID={`todo-toggle-${row.id}`} title={row.title} subtitle={[t(TODO_PRIORITY_KEYS[row.priority]), row.dueDate, row.dueTime].filter(Boolean).join(' · ')} variant="select" selected={row.completed} disabled={busy} onToggleSelect={() => void mutate(() => toggleTodo(row.id))} /></View>
            <IconButton testID={`todo-edit-${row.id}`} Icon={Pencil} accessibilityLabel={t('tools.todos.edit')} disabled={busy} onPress={() => router.push({ pathname: '/tools/todos/[id]', params: { id: String(row.id) } })} />
            <IconButton testID={`todo-delete-${row.id}`} Icon={Trash} accessibilityLabel={t('tools.todos.delete')} disabled={busy} onPress={() => setDeleting(row)} />
          </View>} />
        {visible.length === 0 && pagination.hasMore && rows.length > 0 ? <Button label={t('tools.todos.more')} loading={pagination.append === 'loading'} onPress={() => void load('append')} /> : null}
      </View>
      <AlertDialog testID="todo-delete-dialog" visible={deleting !== null} variant="danger" title={t('tools.todos.deleteTitle')} body={t('tools.todos.deleteBody')} confirmLabel={t('tools.todos.deleteConfirm')} cancelLabel={t('action.cancel')} onCancel={() => setDeleting(null)} onConfirm={() => { const target = deleting; setDeleting(null); if (target) void mutate(() => deleteTodo(target.id)); }} />
    </Screen>
  );
}
