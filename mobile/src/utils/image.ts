import { API_BASE_URL } from '../api/config';

/** Prefix relative image URLs with the API base. Absolute URLs pass through unchanged. */
export function prefixImg(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}
