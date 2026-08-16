import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNotificationsReadToInfiniteData,
  applyNotificationsReadToSummary,
  buildNotificationGroups,
} from '../src/utils/notificationGroups.js';

function notification(id, type, target) {
  return {
    id,
    type,
    target,
    created_at: `2026-06-03T09:00:0${id}Z`,
    from_user: { id, username: `user-${id}` },
  };
}

test('groups likes and comments for the same standard post', () => {
  const target = { type: 'post', id: 8, key: 'post:8', path: '/post/8', available: true };
  const groups = buildNotificationGroups([
    notification(1, 'treehole_like', target),
    notification(2, 'treehole_comment', target),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].likeCount, 1);
  assert.equal(groups[0].commentCount, 1);
  assert.equal(groups[0].isExpandablePost, true);
});

test('keeps different posts, domains, announcements and unknown targets separate', () => {
  const groups = buildNotificationGroups([
    notification(1, 'treehole_like', { type: 'post', id: 5, key: 'post:5', available: true }),
    notification(2, 'treehole_comment', { type: 'post', id: 6, key: 'post:6', available: true }),
    notification(3, 'trending_like', { type: 'trending_post', id: 5, key: 'trending_post:5' }),
    notification(4, 'system_announcement', { type: 'announcement', id: 5, key: 'announcement:5' }),
    notification(5, 'treehole_like', null),
  ]);

  assert.deepEqual(new Set(groups.map((group) => group.key)), new Set([
    'post:5',
    'post:6',
    'trending_post:5',
    'announcement:5',
    'unknown:5',
  ]));
});

test('does not expose navigation or expansion for an unavailable post', () => {
  const groups = buildNotificationGroups([
    notification(1, 'treehole_comment', {
      type: 'post',
      id: 404,
      key: 'post:404',
      path: '#',
      available: false,
    }),
  ]);

  assert.equal(groups[0].contentPath, '#');
  assert.equal(groups[0].isExpandablePost, false);
});

test('optimistically marks cached notifications and decrements unread summaries once', () => {
  const items = [
    { id: 1, type: 'treehole_like', module: 'treehole', category: 'interaction', is_read: false },
    { id: 2, type: 'treehole_comment', module: 'treehole', category: 'interaction', is_read: false },
  ];
  const summary = {
    total: 3,
    byType: { treehole_like: 1, treehole_comment: 1, system_ban: 1 },
    byModule: { treehole: 2, system: 1 },
    byCategory: { interaction: 2, transaction: 0, system: 1 },
  };
  const data = {
    pages: [{ list: items, unreadSummary: summary }],
    pageParams: [1],
  };

  const next = applyNotificationsReadToInfiniteData(data, [1, 2], items);
  assert.deepEqual(next.pages[0].list.map((item) => item.is_read), [true, true]);
  assert.deepEqual(next.pages[0].unreadSummary, {
    total: 1,
    byType: { treehole_like: 0, treehole_comment: 0, system_ban: 1 },
    byModule: { treehole: 0, system: 1 },
    byCategory: { interaction: 0, transaction: 0, system: 1 },
  });
  assert.equal(data.pages[0].list[0].is_read, false);
});

test('marks every loaded detail while decrementing only newly requested notifications', () => {
  const existing = { id: 1, type: 'treehole_like', module: 'treehole', category: 'interaction', is_read: false };
  const newlyLoaded = { id: 2, type: 'treehole_comment', module: 'treehole', category: 'interaction', is_read: false };
  const data = {
    pages: [{
      list: [existing, newlyLoaded],
      unreadSummary: {
        total: 1,
        byType: { treehole_like: 0, treehole_comment: 1 },
        byModule: { treehole: 1 },
        byCategory: { interaction: 1 },
      },
    }],
    pageParams: [1],
  };

  const next = applyNotificationsReadToInfiniteData(data, [1, 2], [newlyLoaded]);
  assert.deepEqual(next.pages[0].list.map((item) => item.is_read), [true, true]);
  assert.equal(next.pages[0].unreadSummary.total, 0);
  assert.equal(next.pages[0].unreadSummary.byCategory.interaction, 0);
});

test('deduplicates repeated notification ids when updating a standalone summary', () => {
  const item = { id: 1, type: 'treehole_like', module: 'treehole', category: 'interaction', is_read: false };
  const next = applyNotificationsReadToSummary({
    total: 1,
    byType: { treehole_like: 1 },
    byModule: { treehole: 1 },
    byCategory: { interaction: 1 },
  }, [item, item]);

  assert.equal(next.total, 0);
  assert.equal(next.byType.treehole_like, 0);
});
