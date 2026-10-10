import * as React from 'react';

import {useSession} from '@/features/auth/session';
import {classifyAuthFailure, isSessionInvalid} from '@/features/auth/authFailure';
import {cancelClubActivityRegistration, registerClubActivity} from '../../../../shared/api/clubs';

export type ClubActivityRegistration = {
  activityId: number;
  registered: boolean;
  count: number;
  deadline: string | null;
};

export type ClubActivityRegistrationState =
  | 'idle'
  | 'working'
  | 'registered'
  | 'cancelled'
  | 'login'
  | 'denied'
  | 'failed';

function readRegistration(value: unknown, expectedActivityId: number): ClubActivityRegistration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid activity registration');
  const row = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(row.activityId) || row.activityId !== expectedActivityId ||
    typeof row.registered !== 'boolean' ||
    !Number.isSafeInteger(row.count) || Number(row.count) < 0 ||
    (row.deadline !== null && typeof row.deadline !== 'string')
  ) throw new Error('Invalid activity registration');
  return {
    activityId: row.activityId as number,
    registered: row.registered as boolean,
    count: row.count as number,
    deadline: row.deadline as string | null,
  };
}

/**
 * Activity registration is a server-owned state transition. The returned count is
 * never incremented or decremented locally, so retries and parallel clients cannot
 * make the App display an invented attendance number.
 */
export function useClubActivityRegistration(activityId: number | null): {
  snapshot: ClubActivityRegistration | null;
  state: ClubActivityRegistrationState;
  register: () => Promise<void>;
  cancel: () => Promise<void>;
} {
  const session = useSession();
  const [snapshot, setSnapshot] = React.useState<ClubActivityRegistration | null>(null);
  const [state, setState] = React.useState<ClubActivityRegistrationState>('idle');
  const epoch = React.useRef(0);
  const locked = React.useRef(false);

  React.useEffect(() => {
    epoch.current += 1;
    locked.current = false;
    setSnapshot(null);
    setState('idle');
    return () => { epoch.current += 1; };
  }, [activityId]);

  const update = React.useCallback(async (action: 'register' | 'cancel'): Promise<void> => {
    if (typeof activityId !== 'number' || !Number.isSafeInteger(activityId) || activityId <= 0 || locked.current) return;
    if (!session.isSignedIn) {
      setState('login');
      return;
    }
    const currentActivityId = activityId;
    const request = epoch.current;
    locked.current = true;
    setState('working');
    try {
      const value = action === 'register'
        ? await registerClubActivity(currentActivityId)
        : await cancelClubActivityRegistration(currentActivityId);
      const next = readRegistration(value, currentActivityId);
      if (request !== epoch.current) return;
      setSnapshot(next);
      setState(next.registered ? 'registered' : 'cancelled');
    } catch (error) {
      if (request !== epoch.current) return;
      const failure = classifyAuthFailure(error);
      if (isSessionInvalid(failure)) await session.handleAuthFailure(error);
      if (request !== epoch.current) return;
      setState(isSessionInvalid(failure) ? 'login' : failure === 'sanctioned' ? 'denied' : 'failed');
    } finally {
      if (request === epoch.current) locked.current = false;
    }
  }, [activityId, session]);

  return {
    snapshot,
    state,
    register: () => update('register'),
    cancel: () => update('cancel'),
  };
}
