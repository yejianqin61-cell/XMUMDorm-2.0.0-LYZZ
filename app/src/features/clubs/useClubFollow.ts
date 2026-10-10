import * as React from 'react';

import {useSession} from '@/features/auth/session';
import {classifyAuthFailure, isSessionInvalid} from '@/features/auth/authFailure';
import {toggleClubFollow} from '../../../../shared/api/clubs';

export type ClubFollowState = 'idle' | 'working' | 'success' | 'login' | 'denied' | 'failed';
type ClubFollowTarget = {clubId: number; following: boolean; followers: number};

function readAcknowledgement(value: unknown, clubId: number): Pick<ClubFollowTarget, 'following' | 'followers'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid club follow acknowledgement');
  const row = value as Record<string, unknown>;
  if (
    row.clubId !== clubId || typeof row.following !== 'boolean' ||
    !Number.isSafeInteger(row.followers) || Number(row.followers) < 0
  ) throw new Error('Invalid club follow acknowledgement');
  return {following: row.following, followers: row.followers as number};
}

/** Shares a server-authoritative follow state between discovery and profile consumers. */
export function useClubFollow(target: ClubFollowTarget): {
  following: boolean;
  followers: number;
  state: ClubFollowState;
  toggle: () => Promise<void>;
} {
  const session = useSession();
  const [following, setFollowing] = React.useState(target.following);
  const [followers, setFollowers] = React.useState(target.followers);
  const [state, setState] = React.useState<ClubFollowState>('idle');
  const epoch = React.useRef(0);
  const locked = React.useRef(false);

  React.useEffect(() => {
    epoch.current += 1;
    locked.current = false;
    setFollowing(target.following);
    setFollowers(target.followers);
    setState('idle');
    return () => { epoch.current += 1; };
  }, [target.clubId, target.following, target.followers]);

  const toggle = React.useCallback(async (): Promise<void> => {
    if (!Number.isSafeInteger(target.clubId) || target.clubId <= 0 || locked.current) return;
    if (!session.isSignedIn) {
      setState('login');
      return;
    }
    const request = epoch.current;
    locked.current = true;
    setState('working');
    try {
      const value = await toggleClubFollow(target.clubId);
      const next = readAcknowledgement(value, target.clubId);
      if (request !== epoch.current) return;
      setFollowing(next.following);
      setFollowers(next.followers);
      setState('success');
    } catch (error) {
      if (request !== epoch.current) return;
      const failure = classifyAuthFailure(error);
      if (isSessionInvalid(failure)) await session.handleAuthFailure(error);
      if (request !== epoch.current) return;
      setState(isSessionInvalid(failure) ? 'login' : failure === 'sanctioned' ? 'denied' : 'failed');
    } finally {
      if (request === epoch.current) locked.current = false;
    }
  }, [session, target]);

  return {following, followers, state, toggle};
}
