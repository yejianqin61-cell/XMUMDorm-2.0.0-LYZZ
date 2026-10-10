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

export type ClubContentStats = {likes: number; views: number; comments: number};
export type ClubContentViewer = {liked: boolean; canManage: boolean};
export type ClubActivityDetail = {
  id: number;
  title: string;
  tag: string | null;
  summary: string;
  cover: string | null;
  images: readonly string[];
  time: string | null;
  endTime: string | null;
  location: string | null;
  clubId: number;
  clubName: string;
  status: string;
  signupLink: string | null;
  registration: {count: number; registered: boolean; deadline: string | null};
  stats: ClubContentStats;
  viewer: ClubContentViewer;
};
export type ClubPostDetail = {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  content: string;
  images: readonly string[];
  createdAt: string | null;
  stats: ClubContentStats;
  viewer: ClubContentViewer;
};

function requiredPositiveInt(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}
function nullableText(value: unknown): string | null {
  return value === null ? null : typeof value === 'string' ? value : null;
}
function textList(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}
function statsAndViewer(value: Row): {stats: ClubContentStats; viewer: ClubContentViewer} {
  const stats = record(value.stats);
  const viewer = record(value.viewer);
  if (
    !Number.isSafeInteger(stats.likes) || Number(stats.likes) < 0 ||
    !Number.isSafeInteger(stats.views) || Number(stats.views) < 0 ||
    !Number.isSafeInteger(stats.comments) || Number(stats.comments) < 0 ||
    typeof viewer.liked !== 'boolean' || typeof viewer.canManage !== 'boolean'
  ) throw new Error('Invalid club content detail');
  return {
    stats: {likes: Number(stats.likes), views: Number(stats.views), comments: Number(stats.comments)},
    viewer: {liked: viewer.liked, canManage: viewer.canManage},
  };
}

/** Detail facts are accepted only with the complete interaction and permission contract. */
export function readClubActivityDetail(value: unknown): ClubActivityDetail {
  const row = record(value);
  const id = requiredPositiveInt(row.id);
  const clubId = requiredPositiveInt(row.clubId);
  const images = textList(row.images);
  const registration = record(row.registration);
  const shared = statsAndViewer(row);
  if (
    id === null || clubId === null || typeof row.title !== 'string' || typeof row.summary !== 'string' ||
    typeof row.clubName !== 'string' || typeof row.status !== 'string' || images === null ||
    nullableText(row.tag) === null && row.tag !== null || nullableText(row.cover) === null && row.cover !== null ||
    nullableText(row.time) === null && row.time !== null || nullableText(row.endTime) === null && row.endTime !== null ||
    nullableText(row.location) === null && row.location !== null || nullableText(row.signupLink) === null && row.signupLink !== null ||
    !Number.isSafeInteger(registration.count) || Number(registration.count) < 0 ||
    typeof registration.registered !== 'boolean' ||
    (registration.deadline !== null && typeof registration.deadline !== 'string')
  ) throw new Error('Invalid club content detail');
  return {
    id, title: row.title, tag: nullableText(row.tag), summary: row.summary, cover: nullableText(row.cover), images,
    time: nullableText(row.time), endTime: nullableText(row.endTime), location: nullableText(row.location), clubId,
    clubName: row.clubName, status: row.status, signupLink: nullableText(row.signupLink),
    registration: {count: Number(registration.count), registered: registration.registered, deadline: registration.deadline as string | null},
    ...shared,
  };
}

export function readClubPostDetail(value: unknown): ClubPostDetail {
  const row = record(value);
  const id = requiredPositiveInt(row.id);
  const clubId = requiredPositiveInt(row.clubId);
  const images = textList(row.images);
  const shared = statsAndViewer(row);
  if (
    id === null || clubId === null || typeof row.clubName !== 'string' || typeof row.title !== 'string' ||
    typeof row.content !== 'string' || images === null ||
    (row.createdAt !== null && typeof row.createdAt !== 'string')
  ) throw new Error('Invalid club content detail');
  return {id, clubId, clubName: row.clubName, title: row.title, content: row.content, images, createdAt: row.createdAt as string | null, ...shared};
}
