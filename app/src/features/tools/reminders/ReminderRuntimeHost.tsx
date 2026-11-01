import * as React from 'react';
import { AppState } from 'react-native';
import { useI18n } from '@/i18n';
import { useSession } from '@/features/auth/session';
import { configureTimetableReminderRefresh } from './importRefresh';
import { clearReminderOwner, invalidateReminderSession, refreshClassReminders } from './native';
import { timetableIdentity } from '../cacheIdentity';
import { reminderOwnerFromScope } from './scheduler';

/** Global runtime seam for both class and Moodle reminders. It renders no UI. */
export function ReminderRuntimeHost(): null {
  const { t } = useI18n();
  const session = useSession();
  const previousOwner = React.useRef<string | null>(null);
  const currentScope = timetableIdentity().scope;
  const currentOwner = reminderOwnerFromScope(currentScope);
  const labels = React.useMemo(() => ({
    title: t('tools.reminders.class.title'), body: t('tools.reminders.class.body'),
  }), [t]);
  React.useEffect(() => configureTimetableReminderRefresh({
    refresh: () => refreshClassReminders(labels),
    onError: () => undefined,
  }), [labels]);
  React.useEffect(() => {
    if (session.status === 'signedOut' || session.status === 'expired') {
      const oldOwner = previousOwner.current;
      invalidateReminderSession();
      previousOwner.current = null;
      if (oldOwner) void clearReminderOwner(oldOwner);
    } else if (currentOwner) {
      if (previousOwner.current && previousOwner.current !== currentOwner) {
        invalidateReminderSession();
        void clearReminderOwner(previousOwner.current);
      }
      previousOwner.current = currentOwner;
    }
  }, [currentOwner, session.status]);
  React.useEffect(() => {
    if (session.status !== 'signedIn' || !currentOwner) return;
    // A complete fresh semester scan replaces the plan; failures leave the existing plan intact.
    const refresh = () => { void refreshClassReminders(labels).catch(() => undefined); };
    refresh();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [currentOwner, currentScope, session.status, labels]);
  return null;
}
