import * as React from 'react';
import { useRouter } from 'expo-router';
import { Form, useForm } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { createTodo, updateTodo } from '../../../../shared/api/todos';
import { findTodo, notifyTodosChanged, todoPayload, validateTodoDate, validateTodoTime, TODO_PRIORITY_KEYS, toTodoError, type Todo } from './todos';

function TodoEditor({ todo }: { todo: Todo | null }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const badge = useMailboxBadge();
  const fields = React.useMemo<readonly FormFieldDescriptor[]>(() => [
    { name: 'title', kind: 'text', labelKey: 'tools.todos.field.title', required: true, maxLength: 500, validate: (value) => typeof value === 'string' && value.trim() ? undefined : 'form.error.required' },
    { name: 'description', kind: 'textarea', labelKey: 'tools.todos.field.description' },
    { name: 'priority', kind: 'custom', labelKey: 'tools.todos.field.priority', validate: (value) => ['0', '1', '2', '3'].includes(String(value)) ? undefined : 'form.error.required',
      render: ({ value, onChange, disabled }) => <SegmentedControl testID="todo-priority" value={String(value)} disabled={disabled} onChange={onChange} options={TODO_PRIORITY_KEYS.map((key, priority) => ({ value: String(priority), label: t(key) }))} /> },
    { name: 'dueDate', kind: 'custom', labelKey: 'tools.todos.field.date', validate: validateTodoDate,
      render: ({ value, onChange, disabled }) => <DateTimeField testID="todo-date" mode="date" value={String(value ?? '')} onChange={onChange} disabled={disabled} /> },
    { name: 'dueTime', kind: 'custom', labelKey: 'tools.todos.field.time', validate: validateTodoTime,
      render: ({ value, onChange, disabled }) => <DateTimeField testID="todo-time" mode="time" value={String(value ?? '')} onChange={onChange} disabled={disabled} /> },
  ], [t]);
  const initial = React.useMemo(() => ({ title: todo?.title ?? '', description: todo?.description ?? '', priority: String(todo?.priority ?? 0), dueDate: todo?.dueDate ?? '', dueTime: todo?.dueTime ?? '', listType: todo?.listType ?? 'personal' }), [todo]);
  const form = useForm({ formId: `todo-${timetableIdentity().scope}-${todo?.id ?? 'new'}`, fields, initialValues: initial,
    onSubmit: async (values) => {
      const owner = timetableIdentity().epoch;
      try {
        if (todo) await updateTodo(todo.id, todoPayload(values)); else await createTodo(todoPayload(values));
        if (owner === timetableIdentity().epoch) notifyTodosChanged();
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw error;
        throw toTodoError(error, await session.handleAuthFailure(error), t);
      }
    },
  });
  const leave = () => router.canGoBack() ? router.back() : router.replace('/tools/todos');
  return <Form testID="todo-form" titleKey={todo ? 'tools.todos.edit' : 'tools.todos.create'} {...badge} guardNavigation form={form} sections={[{ title: todo ? 'tools.todos.edit' : 'tools.todos.create', fields }]}
    semantic={todo ? 'update' : 'create'} onSettled={leave} onCancel={leave} onRetrySubmit={() => void form.submit()}
    labels={{ submit: t('action.save'), cancel: t('action.cancel'), errorSummaryTitle: t('tools.todos.saveFailed'), leaveTitle: t('form.leave.title'), leaveBody: t('form.leave.body'), leaveConfirm: t('form.leave.confirm'), leaveCancel: t('form.leave.cancel') }} />;
}

export function TodoFormScreen({ id }: { id?: number }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const authRef = React.useRef(session.handleAuthFailure); authRef.current = session.handleAuthFailure;
  const [state, setState] = React.useState<{ loading: boolean; todo: Todo | null; error: AppError | null }>({ loading: id !== undefined, todo: null, error: null });
  const [nonce, setNonce] = React.useState(0);
  const epoch = timetableIdentity().epoch;
  React.useEffect(() => {
    if (id === undefined) return;
    if (!Number.isSafeInteger(id) || id <= 0) { setState({ loading: false, todo: null, error: null }); return; }
    let cancelled = false;
    setState({ loading: true, todo: null, error: null });
    void findTodo(id).then((todo) => { if (!cancelled) setState({ loading: false, todo, error: null }); }, async (error: unknown) => {
      if (cancelled || epoch !== timetableIdentity().epoch) return;
      const auth = await authRef.current(error);
      if (!cancelled) setState({ loading: false, todo: null, error: toTodoError(error, auth, t) });
    });
    return () => { cancelled = true; };
  }, [id, nonce, epoch]);
  if (id === undefined) return <TodoEditor key={epoch} todo={null} />;
  if (!state.loading && state.todo) return <TodoEditor key={`${epoch}:${id}`} todo={state.todo} />;
  return <Screen testID="todo-editor-state" titleKey="tools.todos.edit" bottomMode="own">
    {state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onAction={() => setNonce((value) => value + 1)} /> : <EmptyState kind="noResult" title={t('tools.todos.notFound')} actionLabel={t('action.back')} onAction={() => router.replace('/tools/todos')} />}
  </Screen>;
}
