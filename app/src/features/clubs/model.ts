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

export type ClubProfile = {
  id: number;
  basicInfo: ClubSummary & { viewer: { following: boolean; canManage: boolean; isMember: boolean } };
  joinInfo: { contactText: string; signupLink: string; ig: string; xhs: string };
  members: readonly {
    id: number;
    role: 'admin' | 'member';
    email: string;
    username: string;
    nickname: string;
    avatar: string | null;
  }[];
  activities: readonly unknown[];
  posts: readonly unknown[];
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

/** The profile permission fields are server facts, never a client-side role inference. */
export function readClubProfile(value: unknown): ClubProfile {
  const profile = record(value);
  const basic = record(profile.basicInfo);
  const viewer = record(basic.viewer);
  const normalizedBasic = club({
    ...basic,
    viewer: { following: viewer.following },
  });
  const join = record(profile.joinInfo);
  if (
    !Number.isSafeInteger(profile.id) || Number(profile.id) !== normalizedBasic.id ||
    typeof viewer.canManage !== 'boolean' || typeof viewer.isMember !== 'boolean' ||
    typeof join.contactText !== 'string' || typeof join.signupLink !== 'string' ||
    typeof join.ig !== 'string' || typeof join.xhs !== 'string' ||
    !Array.isArray(profile.members) || !Array.isArray(profile.activities) || !Array.isArray(profile.posts)
  ) throw new Error('Invalid club profile');
  const members = profile.members.map((value) => {
    const member = record(value);
    if (
      !Number.isSafeInteger(member.id) || Number(member.id) <= 0 ||
      !['admin', 'member'].includes(String(member.role)) ||
      typeof member.email !== 'string' || typeof member.username !== 'string' ||
      typeof member.nickname !== 'string' ||
      (member.avatar !== null && typeof member.avatar !== 'string')
    ) throw new Error('Invalid club profile');
    return {
      id: member.id as number,
      role: member.role as 'admin' | 'member',
      email: member.email,
      username: member.username,
      nickname: member.nickname,
      avatar: member.avatar as string | null,
    };
  });
  return {
    id: profile.id as number,
    basicInfo: {
      ...normalizedBasic,
      viewer: {
        following: viewer.following as boolean,
        canManage: viewer.canManage as boolean,
        isMember: viewer.isMember as boolean,
      },
    },
    joinInfo: {
      contactText: join.contactText,
      signupLink: join.signupLink,
      ig: join.ig,
      xhs: join.xhs,
    },
    members,
    activities: profile.activities,
    posts: profile.posts,
  };
}
