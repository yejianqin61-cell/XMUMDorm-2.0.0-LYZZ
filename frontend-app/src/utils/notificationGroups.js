export function displayNotificationName(user, fallback = 'Someone') {
  return [user?.nickname, user?.username]
    .map((value) => String(value || '').trim())
    .find(Boolean) || fallback;
}

export function getAnnouncementCopy(group, emptyBody) {
  const latest = group?.latest || {};
  const title = [group?.contentTitle, latest.extra?.title]
    .map((value) => String(value || '').trim())
    .find(Boolean) || null;
  const body = String(latest.extra?.content || '').trim() || emptyBody;
  return { title, body };
}

function compareNewestFirst(a, b) {
  const timeDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
  return timeDiff || Number(b.id || 0) - Number(a.id || 0);
}

export function buildNotificationGroups(notifications) {
  const map = new Map();
  for (const notification of Array.isArray(notifications) ? notifications : []) {
    const target = notification?.target || null;
    const isAffair = ['activity_register_success', 'activity_start_reminder', 'activity_deadline_reminder'].includes(notification.type);
    const baseKey = target?.key || `unknown:${notification.id}`;
    const key = isAffair ? `affair:${baseKey}` : baseKey;
    if (!map.has(key)) {
      map.set(key, {
        key,
        isPost: ['post', 'trending_post', 'campus_post', 'announcement'].includes(target?.type),
        isExpandablePost: target?.type === 'post' && target?.available !== false,
        isAffair,
        target,
        items: [],
      });
    }
    map.get(key).items.push(notification);
  }

  return Array.from(map.values()).map((group) => {
    const sorted = [...group.items].sort(compareNewestFirst);
    const seen = new Set();
    const users = sorted.filter((item) => {
      const id = item.from_user?.id != null ? String(item.from_user.id) : null;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map((item) => item.from_user);
    const latest = sorted[0] || null;
    return {
      ...group,
      sorted,
      latest,
      unreadCount: sorted.filter((item) => !item.is_read).length,
      likeCount: sorted.filter((item) => item.type === 'like' || item.type?.endsWith('_like')).length,
      commentCount: sorted.filter((item) => ['comment', 'handbook_comment', 'course_review_comment'].includes(item.type) || item.type?.endsWith('_comment')).length,
      topUsers: users.slice(0, 3),
      othersCount: Math.max(0, users.length - 3),
      names: users.slice(0, 3).map(displayNotificationName),
      contentTitle: group.target?.title || latest?.post_title || latest?.extra?.targetTitle || null,
      contentPath: group.target?.available === false ? '#' : (group.target?.path || '#'),
      createdAt: latest?.created_at,
      category: latest?.category || 'interaction',
    };
  }).sort((a, b) => compareNewestFirst(a.latest || {}, b.latest || {}));
}

function decrement(count, amount) {
  return Math.max(0, (Number(count) || 0) - amount);
}

export function applyNotificationsReadToSummary(summary, notifications) {
  if (!summary || typeof summary !== 'object') return summary;
  const unread = Array.from(new Map(
    (notifications || []).filter((item) => !item.is_read).map((item) => [item.id, item])
  ).values());
  if (unread.length === 0) return summary;

  const byType = { ...(summary.byType || {}) };
  const byModule = { ...(summary.byModule || {}) };
  const byCategory = { ...(summary.byCategory || {}) };
  for (const item of unread) {
    if (item.type) byType[item.type] = decrement(byType[item.type], 1);
    if (item.module) byModule[item.module] = decrement(byModule[item.module], 1);
    if (item.category) byCategory[item.category] = decrement(byCategory[item.category], 1);
  }
  return {
    ...summary,
    total: decrement(summary.total, unread.length),
    byType,
    byModule,
    byCategory,
  };
}

export function applyNotificationsReadToInfiniteData(data, ids, notifications) {
  if (!data?.pages) return data;
  const idSet = new Set(ids);
  const unreadSummary = (summary) => applyNotificationsReadToSummary(summary, notifications);
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      list: (page?.list || []).map((item) => (
        idSet.has(item.id) ? { ...item, is_read: true } : item
      )),
      unreadSummary: unreadSummary(page?.unreadSummary),
    })),
  };
}
