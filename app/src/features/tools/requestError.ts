import { onlineManager } from '@tanstack/react-query';
import type { AppError } from '@/i18n/errors';

export function toToolsError(error: unknown, authError?: AppError): AppError {
  if (authError && authError.kind !== 'unknown') return authError;
  if (error && typeof error === 'object' && 'kind' in error) return error as AppError;
  const failure = error as { status?: number; name?: string; apiStatus?: number } | null;
  if (failure?.status === 400 || (failure?.status === 200 && failure.apiStatus !== undefined)) return { kind: 'validation' };
  if (failure?.status === undefined) {
    if (!onlineManager.isOnline()) return { kind: 'offline' };
    if (failure?.name === 'AbortError' || failure?.name === 'TimeoutError') return { kind: 'timeout' };
    if (error instanceof TypeError) return { kind: 'unreachable' };
  }
  return { kind: 'unknown' };
}
