const CACHE_PREFIX = 'dorm_square_cache_v1';

function keyFor(name) {
  return `${CACHE_PREFIX}_${name}`;
}

function read(name) {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(keyFor(name));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.data == null) return undefined;
    return { data: parsed.data, updatedAt: Number(parsed.updatedAt) || 0 };
  } catch {
    return undefined;
  }
}

function write(name, data) {
  if (typeof window === 'undefined' || data == null) return;
  try {
    localStorage.setItem(keyFor(name), JSON.stringify({ data, updatedAt: Date.now() }));
  } catch {
    // ponytail: localStorage is only a first-paint cache; the API remains authoritative.
  }
}

export function readPersistedSquareBanners() {
  return read('banners');
}

export function writePersistedSquareBanners(data) {
  write('banners', data);
}

export function readPersistedCampusFeed(tab) {
  return read(`campus_${tab === 'college' ? 'college' : 'school'}`);
}

export function writePersistedCampusFeed(tab, data) {
  write(`campus_${tab === 'college' ? 'college' : 'school'}`, data);
}
