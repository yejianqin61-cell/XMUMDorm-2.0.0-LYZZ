import { readTokenSync, tokenAccountId } from '@/features/auth/tokenStore';
import { resolveSemesterContext } from '../../../../shared/config/semesters';

let lastIdentity: string | null | undefined;
let epoch = 0;
export function timetableIdentity(): { scope: string; epoch: number; persist: boolean } {
  const identity = readTokenSync();
  if (lastIdentity !== identity) { lastIdentity = identity; epoch += 1; }
  const owner = identity === null ? 'guest' : tokenAccountId(identity);
  const semester = (resolveSemesterContext().semester as { id?: string } | null)?.id ?? 'between';
  return { scope: `user:${owner ?? 'unresolved'}:semester:${semester}`, epoch, persist: owner !== null };
}
