const { query } = require('../database');

async function safeQuery(label, sql, params = [], fallback = []) {
  try {
    const rows = await query(sql, params);
    return Array.isArray(rows) ? rows : fallback;
  } catch (error) {
    console.warn(`[squareRecommendationService] ${label} failed:`, error.message);
    return fallback;
  }
}

function toTagLabel(row) {
  return row?.name_zh || row?.name_en || row?.slug || '话题';
}

function mapHotTag(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: toTagLabel(row),
    usage_count: Number(row.usage_count) || 0,
  };
}

async function getHotTags(limit = 8) {
  const safeLimit = Math.min(12, Math.max(1, Number(limit) || 8));
  const rows = await safeQuery(
    'hot_tags',
    `SELECT t.id, t.slug, t.name_zh, t.name_en, COUNT(*) AS usage_count
       FROM post_tag_map ptm
       JOIN tags t ON t.id = ptm.tag_id
       JOIN posts p ON p.id = ptm.post_id
      WHERE p.deleted_at IS NULL
        AND p.hidden_by_admin = 0
        AND p.type = 'normal'
      GROUP BY t.id, t.slug, t.name_zh, t.name_en
      ORDER BY usage_count DESC, t.created_at ASC, t.id ASC
      LIMIT ${safeLimit}`
  );
  return rows.map(mapHotTag);
}

async function getViewerProfile(userId) {
  if (!userId) return null;
  const rows = await safeQuery(
    'viewer_profile',
    'SELECT id, username, nickname, college FROM users WHERE id = ? LIMIT 1',
    [userId],
    []
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    nickname: row.nickname || row.username || '同学',
    college: row.college || '',
  };
}

async function getViewerClubs(userId) {
  if (!userId) return [];
  return await safeQuery(
    'viewer_clubs',
    `SELECT DISTINCT c.id, c.name, c.category
       FROM clubs c
       JOIN (
         SELECT club_id FROM club_follows WHERE user_id = ?
         UNION
         SELECT club_id FROM club_members WHERE user_id = ?
       ) x ON x.club_id = c.id
      ORDER BY c.name ASC
      LIMIT 6`,
    [userId, userId],
    []
  );
}

async function getViewerOrganizations(userId) {
  if (!userId) return [];
  return await safeQuery(
    'viewer_organizations',
    `SELECT o.id, o.name, o.type
       FROM organization_memberships om
       JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = ?
        AND o.is_active = 1
      ORDER BY o.name ASC
      LIMIT 6`,
    [userId],
    []
  );
}

async function getViewerInterestTags(userId) {
  if (!userId) return [];
  const rows = await safeQuery(
    'viewer_interest_tags',
    `SELECT t.id, t.slug, t.name_zh, t.name_en, SUM(s.score) AS signal_score
       FROM (
         SELECT ptm.tag_id, 4 AS score
           FROM posts p
           JOIN post_tag_map ptm ON ptm.post_id = p.id
          WHERE p.user_id = ?
            AND p.deleted_at IS NULL
         UNION ALL
         SELECT ptm.tag_id, 2 AS score
           FROM post_likes pl
           JOIN post_tag_map ptm ON ptm.post_id = pl.post_id
          WHERE pl.user_id = ?
         UNION ALL
         SELECT ptm.tag_id, 1 AS score
           FROM comments c
           JOIN post_tag_map ptm ON ptm.post_id = c.post_id
          WHERE c.user_id = ?
            AND c.deleted_at IS NULL
       ) s
       JOIN tags t ON t.id = s.tag_id
      GROUP BY t.id, t.slug, t.name_zh, t.name_en
      ORDER BY signal_score DESC, t.created_at ASC, t.id ASC
      LIMIT 6`,
    [userId, userId, userId],
    []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    name: toTagLabel(row),
    signal_score: Number(row.signal_score) || 0,
  }));
}

async function getInterestPosts(userId, tags) {
  const tagIds = (tags || []).map((tag) => Number(tag.id)).filter((id) => id > 0);
  if (tagIds.length === 0) return [];
  const placeholders = tagIds.map(() => '?').join(',');
  const params = [...tagIds];
  let excludeClause = '';
  if (userId) {
    excludeClause = 'AND p.user_id <> ?';
    params.push(userId);
  }
  const rows = await safeQuery(
    'interest_posts',
    `SELECT p.id, p.title, p.content, p.created_at,
            COUNT(DISTINCT ptm.tag_id) AS match_count,
            COALESCE(pl.like_count, 0) AS like_count,
            COALESCE(cc.comment_count, 0) AS comment_count
       FROM posts p
       JOIN post_tag_map ptm ON ptm.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*) AS like_count
           FROM post_likes
          GROUP BY post_id
       ) pl ON pl.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*) AS comment_count
           FROM comments
          WHERE deleted_at IS NULL
          GROUP BY post_id
       ) cc ON cc.post_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.hidden_by_admin = 0
        AND p.type = 'normal'
        AND ptm.tag_id IN (${placeholders})
        ${excludeClause}
      GROUP BY p.id, p.title, p.content, p.created_at, pl.like_count, cc.comment_count
      ORDER BY match_count DESC,
               (COALESCE(pl.like_count, 0) * 2 + COALESCE(cc.comment_count, 0)) DESC,
               p.created_at DESC
      LIMIT 4`,
    params,
    []
  );
  const leadingTag = tags[0]?.name || '你的兴趣';
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title || String(row.content || '').slice(0, 28) || '推荐树洞',
    excerpt: String(row.content || '').slice(0, 72),
    href: `/post/${row.id}`,
    reason: `因为你最近更关注 ${leadingTag}`,
    meta: `${Number(row.like_count) || 0} 赞 · ${Number(row.comment_count) || 0} 评论`,
  }));
}

async function getCollegeCampusTopics(college) {
  const keyword = String(college || '').trim();
  if (!keyword) return [];
  const like = `%${keyword}%`;
  const rows = await safeQuery(
    'college_campus_topics',
    `SELECT cp.id, cp.title, cp.created_at, o.name AS organization_name
       FROM campus_posts cp
       JOIN organizations o ON o.id = cp.organization_id
      WHERE cp.deleted_at IS NULL
        AND cp.hidden_by_admin = 0
        AND o.type = 'College'
        AND (o.name LIKE ? OR cp.title LIKE ?)
      ORDER BY cp.created_at DESC
      LIMIT 3`,
    [like, like],
    []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    subtitle: row.organization_name || keyword,
    href: `/about/campus/${row.id}`,
    reason: `来自 ${keyword} 相关学院`,
  }));
}

async function getClubActivities(clubs) {
  const clubIds = (clubs || []).map((club) => Number(club.id)).filter((id) => id > 0);
  if (clubIds.length === 0) return [];
  const rows = await safeQuery(
    'club_activities',
    `SELECT a.id, a.title, a.start_time, c.name AS club_name
       FROM club_activities a
       JOIN clubs c ON c.id = a.club_id
      WHERE a.club_id IN (${clubIds.map(() => '?').join(',')})
      ORDER BY
        CASE
          WHEN a.start_time IS NULL THEN 1
          WHEN a.start_time >= NOW() THEN 0
          ELSE 1
        END ASC,
        ABS(TIMESTAMPDIFF(HOUR, NOW(), COALESCE(a.start_time, a.created_at))) ASC,
        a.created_at DESC
      LIMIT 3`,
    clubIds,
    []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    subtitle: row.club_name || '社团活动',
    href: `/about/club/activity/${row.id}`,
    reason: '来自你关注或加入的社团',
  }));
}

async function getHotTopicsFallback() {
  const rows = await safeQuery(
    'hot_topics_fallback',
    `SELECT t.id, t.title,
            (SELECT COUNT(*)
               FROM trending_posts p
              WHERE p.topic_id = t.id
                AND p.deleted_at IS NULL
                AND p.hidden_by_admin = 0) AS post_count
       FROM trending_topics t
      WHERE t.is_active = 1
      ORDER BY post_count DESC, t.sort_order ASC, t.id DESC
      LIMIT 3`,
    [],
    []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    subtitle: `${Number(row.post_count) || 0} 条讨论`,
    href: `/about/trending/${row.id}`,
    reason: '校园里正在升温',
  }));
}

function buildPersonalizedCards({ collegeTopics, clubActivities, interestPosts, fallbackTopics }) {
  const cards = [];
  for (const item of collegeTopics || []) {
    cards.push({ ...item, badge: '同学院' });
  }
  for (const item of clubActivities || []) {
    cards.push({ ...item, badge: '社团向' });
  }
  for (const item of interestPosts || []) {
    cards.push({ ...item, badge: '兴趣向' });
  }
  if (cards.length === 0) {
    for (const item of fallbackTopics || []) {
      cards.push({ ...item, badge: '校园热议' });
    }
  }
  return cards.slice(0, 4);
}

async function getSquarePersonalizedSummary(userId) {
  const [profile, clubs, organizations, interestTags, hotTags] = await Promise.all([
    getViewerProfile(userId),
    getViewerClubs(userId),
    getViewerOrganizations(userId),
    getViewerInterestTags(userId),
    getHotTags(8),
  ]);
  const [collegeTopics, clubActivities, interestPosts, fallbackTopics] = await Promise.all([
    getCollegeCampusTopics(profile?.college || ''),
    getClubActivities(clubs),
    getInterestPosts(userId, interestTags),
    getHotTopicsFallback(),
  ]);

  return {
    is_personalized: !!userId && (
      Boolean(profile?.college) ||
      clubs.length > 0 ||
      organizations.length > 0 ||
      interestTags.length > 0
    ),
    profile: {
      nickname: profile?.nickname || '同学',
      college: profile?.college || '',
      club_count: clubs.length,
      organization_count: organizations.length,
      interest_tag_count: interestTags.length,
    },
    hot_tags: hotTags,
    cards: buildPersonalizedCards({
      collegeTopics,
      clubActivities,
      interestPosts,
      fallbackTopics,
    }),
  };
}

async function getSquareRecommendations(userId) {
  const [summary, fallbackTopics] = await Promise.all([
    getSquarePersonalizedSummary(userId),
    getHotTopicsFallback(),
  ]);
  return {
    hot_tags: summary.hot_tags || [],
    interest_posts: (summary.cards || []).filter((item) => item.badge === '兴趣向').slice(0, 3),
    campus_topics: (summary.cards || []).filter((item) => item.badge === '同学院').slice(0, 3),
    fallback_topics: fallbackTopics,
  };
}

module.exports = {
  getHotTags,
  getSquarePersonalizedSummary,
  getSquareRecommendations,
};
