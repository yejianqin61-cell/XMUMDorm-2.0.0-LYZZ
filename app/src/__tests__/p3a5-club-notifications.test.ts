import { resolveNotificationRoute } from '@/features/mailbox/MailboxScreen';
import type { NotificationRow } from '@/features/mailbox/notifications';

function row(target: Partial<NotificationRow['target']>): NotificationRow {
  return {
    id: 1,
    type: 'club_like',
    isRead: false,
    title: null,
    target: { type: 'club', id: 7, title: null, path: '/about/club/7', available: true, ...target },
    category: 'interaction',
    module: 'clubs',
    fromName: null,
    createdAt: null,
  };
}

describe('P3A5-05 社团通知接线', () => {
  it.each([
    ['club', 7, '/clubs/7'],
    ['club_activity', 9, '/clubs/activity/9'],
    ['club_post', 10, '/clubs/post/10'],
  ])('将服务端 %s 目标映射到 App 路由', (type, id, route) => {
    expect(resolveNotificationRoute(row({ type, id }))).toBe(route);
  });

  it.each([
    ['post', 3, '/campus/3'],
    ['announcement', 4, '/campus/4'],
    ['confession', 5, '/campus/wall/5'],
    ['marketplace_item', 6, '/market/6'],
    ['marketplace_thread', 1, '/me/chat/1'],
    ['product', 8, '/canteen/product/8'],
    ['shop', 2, '/canteen/shop/2'],
    ['handbook_article', 9, '/guides/9'],
  ])('R4-31：%s 通知能跳到对应内容', (type, id, route) => {
    expect(resolveNotificationRoute(row({ type, id }))).toBe(route);
  });

  it('拒绝不可用、未知或无效目标，不将 Web path 作为 App 路由', () => {
    expect(resolveNotificationRoute(row({ available: false }))).toBeNull();
    expect(resolveNotificationRoute(row({ type: 'unknown', path: '/clubs/7' }))).toBeNull();
    expect(resolveNotificationRoute(row({ id: 0, path: '/about/club/0' }))).toBeNull();
  });
});
