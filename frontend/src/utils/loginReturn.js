// Keep the target in the URL so reloads and copied login URLs retain it.
// Never accept absolute URLs, authority paths, backslashes or encoded bypasses.
export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    if ([...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
    if (value.split(/[?#]/, 1)[0].includes('\\')) return null;
    const parsed = new URL(value, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid') return null;
    // Only the pathname can change navigation authority. Query values may
    // legitimately contain encoded URLs, percent signs, spaces or file paths.
    let decoded = parsed.pathname;
    for (let i = 0; i < 5; i += 1) {
      if (decoded.includes('\\') || [...decoded].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
        || decoded.startsWith('//')) return null;
      const normalized = new URL(decoded, 'https://internal.invalid');
      if (normalized.origin !== 'https://internal.invalid' || normalized.pathname.startsWith('//')
        || /^\/(login|register|reset-password)(\/|$)/i.test(normalized.pathname)) return null;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      if (i === 4) return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return null; }
}

export function locationPath(location) {
  if (typeof location === 'string') return safeReturnPath(location);
  return location && safeReturnPath(`${location.pathname || '/'}${location.search || ''}${location.hash || ''}`);
}

export function loginPath(location) {
  const target = locationPath(location);
  return target ? `/login?${new URLSearchParams({ returnTo: target })}` : '/login';
}

export function loginReturnTarget(location) {
  const params = new URLSearchParams(location.search);
  // An explicitly supplied invalid target must not revive a stale state target.
  return params.has('returnTo') ? safeReturnPath(params.get('returnTo')) || '/'
    : locationPath(location.state?.from) || '/';
}
