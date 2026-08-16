import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationGroups } from '../src/utils/notificationGroups.js';

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
