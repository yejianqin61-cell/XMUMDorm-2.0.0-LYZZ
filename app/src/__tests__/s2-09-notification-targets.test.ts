/**
 * S2-09 · App 侧唯一目标映射函数（阶段3-03）—— 自动化用例
 *
 * 测什么（纯函数，表驱动）：
 *   1. 已存在路由的类型映射正确（帖子 / 社团三种 / 二手 / 攻略 / 会话）；
 *   2. 失效目标（`available:false`）→ unavailable，不产出路由；
 *   3. 落点待定/未建（`campus_post` / `course_review` / `trending_post` / `announcement` / 未知类型）→ pending；
 *   4. 非法 id → unavailable；
 *   5. 评论定位：把 `comment_id` 带成查询参数（只带参数，不做滚动）。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段3-03-App侧唯一目标映射函数.md`。
 */
import { resolveNotificationRoute, resolveTarget } from '@/features/mailbox/targets';
import type { NotificationTarget } from '@/features/mailbox/notifications';

const target = (over: Partial<NotificationTarget> = {}): NotificationTarget => ({
  type: 'post',
  id: 12,
  title: '标题',
  path: '/post/12',
  available: true,
  comment_id: null,
  ...over,
});

describe('S2-09 通知目标映射', () => {
  it('已存在路由的类型全部映射正确', () => {
    expect(resolveTarget(target({ type: 'post', id: 12 }))).toEqual({ kind: 'route', href: '/campus/12' });
    expect(resolveTarget(target({ type: 'club', id: 3 }))).toEqual({ kind: 'route', href: '/clubs/3' });
    expect(resolveTarget(target({ type: 'club_activity', id: 4 }))).toEqual({
      kind: 'route',
      href: '/clubs/activity/4',
    });
    expect(resolveTarget(target({ type: 'club_post', id: 5 }))).toEqual({ kind: 'route', href: '/clubs/post/5' });
    expect(resolveTarget(target({ type: 'marketplace_item', id: 6 }))).toEqual({ kind: 'route', href: '/market/6' });
    expect(resolveTarget(target({ type: 'handbook_article', id: 7 }))).toEqual({
      kind: 'route',
      href: '/guides/7',
    });
    expect(resolveTarget(target({ type: 'marketplace_thread', id: 8 }))).toEqual({
      kind: 'route',
      href: '/me/chat/8',
    });
  });

  it('失效目标：unavailable(gone)，不产出路由', () => {
    const resolution = resolveTarget(target({ available: false }));
    expect(resolution).toEqual({ kind: 'unavailable', reason: 'gone' });
    expect(resolveNotificationRoute({ target: target({ available: false }) } as never)).toBeNull();
  });

  it('落点待定/未建的类型一律 pending，不猜 Web 路径', () => {
    expect(resolveTarget(target({ type: 'campus_post', id: 9 }))).toEqual({
      kind: 'pending',
      reason: 'needs-owner',
    });
    for (const type of ['course_review', 'trending_post', 'announcement', 'unknown', 'whatever']) {
      expect(resolveTarget(target({ type, id: 9, path: '/web-only/9' }))).toEqual({
        kind: 'pending',
        reason: 'missing-route',
      });
    }
  });

  it('非法 id → unavailable(invalid)', () => {
    expect(resolveTarget(target({ id: 0 }))).toEqual({ kind: 'unavailable', reason: 'invalid' });
    expect(resolveTarget(target({ id: 1.5 }))).toEqual({ kind: 'unavailable', reason: 'invalid' });
    expect(resolveTarget(target({ id: -3 }))).toEqual({ kind: 'unavailable', reason: 'invalid' });
  });

  it('评论定位：comment_id 作为查询参数带在路由上', () => {
    const resolution = resolveTarget(target({ type: 'post', id: 12, comment_id: 34 }));
    expect(resolution).toEqual({ kind: 'route', href: '/campus/12?comment=34' });
    // 非法 comment_id 不带参数
    expect(resolveTarget(target({ type: 'post', id: 12, comment_id: 0 }))).toEqual({
      kind: 'route',
      href: '/campus/12',
    });
  });
});
