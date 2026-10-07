import { toTodoError } from '@/features/todos/todos';
import { translate } from '@/i18n';
import { toErrorCopy } from '@/i18n/errors';

it.each(['zh', 'en'] as const)('provides an object, server rule and correction for todo HTTP400 in %s', (locale) => {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const error = toTodoError({ status: 400 }, { kind: 'unknown' }, t);
  const copy = toErrorCopy(error, (key, params) => translate(locale, key, params));
  expect(copy.objectLabel).toBe(t('tools.todos.title'));
  expect(copy.understand).toContain('500');
  expect(copy.understand).toContain('0–3');
  expect(copy.fix.length).toBeGreaterThan(0);
  expect(copy.actionKind).toBe('edit');
});
