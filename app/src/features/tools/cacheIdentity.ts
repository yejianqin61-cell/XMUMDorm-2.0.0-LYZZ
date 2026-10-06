import { readTokenSync } from '@/features/auth/tokenStore';
import { resolveSemesterContext } from '../../../../shared/config/semesters';

// Read only the backend's numeric id claim for cache partitioning. This is not
// authentication or permission checking. Credentials never enter a disk key.
function cacheOwner(value: string | null): string | null {
  if (value === null) return 'guest';
  try {
    const payload = value.split('.')[1];
    if (!payload || payload.length > 8192) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let buffer = 0;
    let bits = 0;
    let decoded = '';
    for (const char of payload.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
      const digit = alphabet.indexOf(char);
      if (digit < 0) return null;
      buffer = (buffer << 6) | digit;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        decoded += String.fromCharCode((buffer >> bits) & 255);
      }
    }
    const { id } = JSON.parse(decoded) as { id?: unknown };
    return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? String(id) : null;
  } catch { return null; }
}

let lastIdentity: string | null | undefined;
let epoch = 0;
export function timetableIdentity(): { scope: string; epoch: number; persist: boolean } {
  const identity = readTokenSync();
  if (lastIdentity !== identity) { lastIdentity = identity; epoch += 1; }
  const owner = cacheOwner(identity);
  const semester = (resolveSemesterContext().semester as { id?: string } | null)?.id ?? 'between';
  return { scope: `user:${owner ?? 'unresolved'}:semester:${semester}`, epoch, persist: owner !== null };
}
