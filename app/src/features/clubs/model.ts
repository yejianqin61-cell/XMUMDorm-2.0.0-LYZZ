type Row = Record<string, unknown>;

export const CLUB_CATEGORIES = ['music', 'tech', 'culture', 'sport', 'art'] as const;
export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export type ClubSummary = {
  id: number;
  name: string;
  category: ClubCategory | null;
  description: string;
  avatar: string | null;
  followers: number;
  viewer: { following: boolean };
};

function record(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid club page');
  return value as Row;
}

function club(value: unknown): ClubSummary {
  const row = record(value);
  const viewer = record(row.viewer);
  const category = row.category === null ? null : String(row.category);
  if (
    !Number.isSafeInteger(row.id) || Number(row.id) <= 0 ||
    typeof row.name !== 'string' || !row.name.trim() ||
    (category !== null && !CLUB_CATEGORIES.includes(category as ClubCategory)) ||
    typeof row.description !== 'string' ||
    (row.avatar !== null && typeof row.avatar !== 'string') ||
    typeof row.followers !== 'number' || !Number.isFinite(row.followers) || row.followers < 0 ||
    typeof viewer.following !== 'boolean'
  ) throw new Error('Invalid club page');
  return {
    id: row.id as number,
    name: row.name,
    category: category as ClubCategory | null,
    description: row.description,
    avatar: row.avatar as string | null,
    followers: row.followers as number,
    viewer: { following: viewer.following },
  };
}

/** Reads only the server-owned discovery contract; UI never guesses a club category. */
export function readClubPage(value: unknown): { rows: readonly ClubSummary[]; hasMore: boolean } {
  const page = record(value);
  if (
    !Array.isArray(page.list) ||
    !Number.isSafeInteger(page.page) || Number(page.page) < 1 ||
    !Number.isSafeInteger(page.pageSize) || Number(page.pageSize) < 1 ||
    typeof page.hasMore !== 'boolean'
  ) throw new Error('Invalid club page');
  return { rows: page.list.map(club), hasMore: page.hasMore };
}
