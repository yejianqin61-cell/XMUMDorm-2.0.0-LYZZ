const { query } = require('../database');

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function endOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

async function safeQuery(label, sql, params = [], fallback = []) {
  try {
    const rows = await query(sql, params);
    return Array.isArray(rows) ? rows : fallback;
  } catch (error) {
    console.warn(`[squareHomeService] ${label} failed:`, error.message);
    return fallback;
  }
}

function computeActivityStatusLabel(row) {
  const now = Date.now();
  const start = row?.start_time ? new Date(row.start_time).getTime() : NaN;
  const end = row?.end_time ? new Date(row.end_time).getTime() : NaN;
  if (Number.isFinite(start) && now < start) return '即将开始';
  if (Number.isFinite(end) && now > end) return '已结束';
  return '进行中';
}

async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const rows = await safeQuery(
    'unread_notifications',
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    [{ total: 0 }]
  );
  return Number(rows[0]?.total) || 0;
}

async function getCampusNoticeCount() {
  const rows = await safeQuery(
    'campus_notice_count',
    'SELECT COUNT(*) AS total FROM campus_posts WHERE deleted_at IS NULL AND hidden_by_admin = 0',
    [],
    [{ total: 0 }]
  );
  return Number(rows[0]?.total) || 0;
}

async function getEventsTodayCount() {
  const rows = await safeQuery(
    'events_today',
    `SELECT COUNT(*) AS total
       FROM club_activities
      WHERE start_time IS NOT NULL
        AND start_time >= ?
        AND start_time <= ?`,
    [startOfToday(), endOfToday()],
    [{ total: 0 }]
  );
  return Number(rows[0]?.total) || 0;
}

async function getHotTopics() {
  const now = new Date();
  const rows = await safeQuery(
    'hot_topics',
    `SELECT t.id, t.title, t.description, t.sort_order,
            (SELECT COUNT(*)
               FROM trending_posts p
              WHERE p.topic_id = t.id
                AND p.deleted_at IS NULL
                AND p.hidden_by_admin = 0) AS post_count
       FROM trending_topics t
      WHERE t.is_active = 1
        AND (t.starts_at IS NULL OR t.starts_at <= ?)
        AND (t.ends_at IS NULL OR t.ends_at >= ?)
      ORDER BY post_count DESC, t.sort_order ASC, t.id DESC
      LIMIT 4`,
    [now, now]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
    post_count: Number(row.post_count) || 0,
  }));
}

async function getHotActivities() {
  const rows = await safeQuery(
    'hot_activities',
    `SELECT a.id, a.title, a.summary, a.location, a.start_time, a.end_time, a.created_at,
            c.name AS club_name
       FROM club_activities a
       JOIN clubs c ON c.id = a.club_id
      ORDER BY
        CASE
          WHEN a.start_time IS NULL THEN 1
          WHEN a.start_time >= NOW() THEN 0
          ELSE 1
        END ASC,
        ABS(TIMESTAMPDIFF(HOUR, NOW(), COALESCE(a.start_time, a.created_at))) ASC,
        a.created_at DESC
      LIMIT 4`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    summary: row.summary || '',
    location: row.location || '',
    start_time: row.start_time,
    created_at: row.created_at,
    club_name: row.club_name || '',
    status_label: computeActivityStatusLabel(row),
  }));
}

async function getHotTreeholes() {
  const rows = await safeQuery(
    'hot_treeholes',
    `SELECT p.id, p.content, p.created_at,
            COALESCE(pl.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count
       FROM posts p
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
       ) c ON c.post_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.hidden_by_admin = 0
        AND p.type = 'normal'
      ORDER BY (COALESCE(pl.like_count, 0) * 2 + COALESCE(c.comment_count, 0)) DESC, p.created_at DESC
      LIMIT 3`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    excerpt: String(row.content || '').slice(0, 72),
    created_at: row.created_at,
    like_count: Number(row.like_count) || 0,
    comment_count: Number(row.comment_count) || 0,
  }));
}

async function getCampusHighlights() {
  const rows = await safeQuery(
    'campus_highlights',
    `SELECT cp.id, cp.title, cp.created_at, o.name AS organization_name
       FROM campus_posts cp
       JOIN organizations o ON o.id = cp.organization_id
      WHERE cp.deleted_at IS NULL
        AND cp.hidden_by_admin = 0
      ORDER BY cp.created_at DESC
      LIMIT 3`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    created_at: row.created_at,
    organization_name: row.organization_name || '',
  }));
}

async function getSquareHomeSummary(userId) {
  const [
    unreadCount,
    eventsToday,
    campusNoticeCount,
    hotTopics,
    hotActivities,
    hotTreeholes,
    campusHighlights,
  ] = await Promise.all([
    getUnreadNotificationCount(userId),
    getEventsTodayCount(),
    getCampusNoticeCount(),
    getHotTopics(),
    getHotActivities(),
    getHotTreeholes(),
    getCampusHighlights(),
  ]);

  return {
    unread_count: unreadCount,
    hot_treeholes: hotTreeholes,
    hot_topics: hotTopics,
    hot_activities: hotActivities,
    campus_highlights: campusHighlights,
    quick_stats: {
      events_today: eventsToday,
      unread_notifications: unreadCount,
      campus_notice_count: campusNoticeCount,
    },
  };
}

module.exports = {
  getSquareHomeSummary,
};
