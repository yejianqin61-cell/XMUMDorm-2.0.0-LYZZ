import * as React from 'react';
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
  const currentOwner = reminderOwnerFromScope(timetableIdentity().scope);
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
  return null;
}
