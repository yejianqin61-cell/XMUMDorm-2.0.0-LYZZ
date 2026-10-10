import * as React from 'react';

import {useSession} from '@/features/auth/session';
import {classifyAuthFailure, isSessionInvalid} from '@/features/auth/authFailure';
import {toggleClubLike} from '../../../../shared/api/clubs';

export type ClubLikeTargetType = 'activity' | 'post';
export type ClubLikeState = 'idle' | 'working' | 'success' | 'login' | 'denied' | 'failed';

type ClubLikeTarget = {
  targetType: ClubLikeTargetType;
  targetId: number;
  liked: boolean;
  count: number;
};

function readAcknowledgement(value: unknown, target: Pick<ClubLikeTarget, 'targetType' | 'targetId'>): Pick<ClubLikeTarget, 'liked' | 'count'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid club like acknowledgement');
  const row = value as Record<string, unknown>;
  if (
    row.targetType !== target.targetType || row.targetId !== target.targetId ||
    typeof row.liked !== 'boolean' || !Number.isSafeInteger(row.count) || Number(row.count) < 0
  ) throw new Error('Invalid club like acknowledgement');
  return {liked: row.liked, count: row.count as number};
}

/** Shared activity/post like state. It accepts only a matching server acknowledgement. */
export function useClubLike(target: ClubLikeTarget): {
  liked: boolean;
  count: number;
  state: ClubLikeState;
  toggle: () => Promise<void>;
} {
  const session = useSession();
  const [liked, setLiked] = React.useState(target.liked);
  const [count, setCount] = React.useState(target.count);
  const [state, setState] = React.useState<ClubLikeState>('idle');
  const epoch = React.useRef(0);
  const locked = React.useRef(false);

  React.useEffect(() => {
    epoch.current += 1;
    locked.current = false;
    setLiked(target.liked);
    setCount(target.count);
    setState('idle');
    return () => { epoch.current += 1; };
  }, [target.targetType, target.targetId, target.liked, target.count]);

  const toggle = React.useCallback(async (): Promise<void> => {
    if (!Number.isSafeInteger(target.targetId) || target.targetId <= 0 || locked.current) return;
    if (!session.isSignedIn) {
      setState('login');
      return;
    }
    const request = epoch.current;
    locked.current = true;
    setState('working');
    try {
      const value = await toggleClubLike(target.targetType, target.targetId);
      const next = readAcknowledgement(value, target);
      if (request !== epoch.current) return;
      setLiked(next.liked);
      setCount(next.count);
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

  return {liked, count, state, toggle};
}
