/**
 * 统一通知写入服务
 * 所有模块通过此服务写入通知，确保格式一致
 */

const { query } = require('../database');

/**
 * 通知类型 → 模块映射
 */
const MODULE_MAP = {
  treehole_like: 'treehole',
  treehole_comment: 'treehole',
  trending_like: 'trending',
  trending_comment: 'trending',
  campus_like: 'campus',
  campus_comment: 'campus',
  canteen_review: 'canteen',
  canteen_reply: 'canteen',
  marketplace_want: 'marketplace',
  marketplace_chat: 'marketplace',
  club_follow: 'club',
  club_like: 'club',
  club_comment: 'club',
  activity_register_success: 'affairs',
  activity_start_reminder: 'affairs',
  activity_deadline_reminder: 'affairs',
  system_announcement: 'system',
  system_ban: 'system',
  // 兼容旧类型
  like: 'treehole',
  comment: 'treehole',
  announcement: 'system',
  marketplace: 'marketplace',
  handbook_comment: 'handbook',
  course_review_comment: 'course_review',
};

/**
 * 各模块包含的通知类型（供前端按模块筛选）
 */
const MODULE_TYPES = {
  treehole: ['treehole_like', 'treehole_comment', 'like', 'comment'],
  trending: ['trending_like', 'trending_comment', 'campus_like', 'campus_comment'],
  canteen: ['canteen_review', 'canteen_reply'],
  marketplace: ['marketplace_want', 'marketplace_chat', 'marketplace'],
  club: ['club_follow', 'club_like', 'club_comment'],
  affairs: ['activity_register_success', 'activity_start_reminder', 'activity_deadline_reminder'],
  system: ['system_announcement', 'system_ban', 'announcement'],
};

/**
 * 通知类型 → 分类（D2-12，2026-10-28 领导裁决；阶段D-02 落地）
 *
 *   interaction ← 互动：帖子/树洞/食堂/社团/手册与测评评论，加上**商品想要**
 *   transaction ← 交易：**只有二手私聊**（契约：交易 Tab 仅列二手私聊会话）
 *   system      ← 系统：公告/封禁 + **活动报名与提醒**
 *
 * ⚠️ 历史泛型 `marketplace`（全仓无写入方）按契约「不能仅凭名称算作聊天未读」
 *    **显式落在 interaction**：若漏掉，它就不在任何分类里，`byCategory` 求和会小于
 *    `total` —— 表现正是契约警告的「有角标但列表空」。它的真实含义待丁的存量样例确认。
 * ⚠️ `MODULE_TYPES.marketplace` 仍保留三类：**模块筛选 ≠ 分类**（契约 L80）。
 */
const CATEGORY_TYPES = {
  interaction: [
    ...MODULE_TYPES.treehole,
    ...MODULE_TYPES.trending,
    ...MODULE_TYPES.canteen,
    ...MODULE_TYPES.club,
    'handbook_comment',
    'course_review_comment',
    'marketplace_want',
    // 历史泛型（无写入方）：暂落互动，待丁的存量样例确认
    'marketplace',
  ],
  transaction: ['marketplace_chat'],
  system: [...MODULE_TYPES.system, ...MODULE_TYPES.affairs],
};

/**
 * 写入一条通知
 * @param {Object} options
 * @param {number} options.userId - 接收者 ID
 * @param {string} options.type - 通知类型（{module}_{action}）
 * @param {number} [options.fromUserId] - 触发者 ID
 * @param {number} [options.postId] - 关联帖子 ID
 * @param {number} [options.commentId] - 关联评论 ID
 * @param {Object} [options.extra] - 额外数据（JSON）
 */
async function createNotification({ userId, type, fromUserId, postId, commentId, extra }) {
  if (!userId || !type) return;
  // 不给自己发通知
  if (fromUserId && userId === fromUserId) return;

  try {
    const extraJson = extra ? JSON.stringify(extra) : null;
    await query(
      `INSERT INTO notifications (user_id, type, post_id, comment_id, from_user_id, extra)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, postId || null, commentId || null, fromUserId || null, extraJson]
    );
  } catch (err) {
    console.error('[notificationService] createNotification error:', err.message);
  }
}

/**
 * 向多个用户批量写入同一条通知
 * @param {number[]} userIds - 接收者 ID 列表
 * @param {Object} options - 同 createNotification
 */
async function createNotificationBatch(userIds, { type, fromUserId, postId, commentId, extra }) {
  if (!userIds || userIds.length === 0 || !type) return;

  const filtered = fromUserId ? userIds.filter((id) => id !== fromUserId) : userIds;
  if (filtered.length === 0) return;

  try {
    const extraJson = extra ? JSON.stringify(extra) : null;
    const placeholders = filtered.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];
    for (const uid of filtered) {
      params.push(uid, type, postId || null, commentId || null, fromUserId || null, extraJson);
    }
    await query(
      `INSERT INTO notifications (user_id, type, post_id, comment_id, from_user_id, extra) VALUES ${placeholders}`,
      params
    );
  } catch (err) {
    console.error('[notificationService] createNotificationBatch error:', err.message);
  }
}

/**
 * 根据 module 参数返回对应的 type 筛选条件
 * @param {string} moduleName
 * @returns {{ types: string[] } | null}
 */
function getModuleTypes(moduleName) {
  return MODULE_TYPES[moduleName] || null;
}

function getCategoryTypes(categoryName) {
  return CATEGORY_TYPES[categoryName] || null;
}

function getNotificationCategory(type) {
  if (!type) return 'interaction';
  for (const [categoryName, types] of Object.entries(CATEGORY_TYPES)) {
    if (types.includes(type)) return categoryName;
  }
  return 'interaction';
}

function getNotificationModule(type) {
  return MODULE_MAP[type] || 'unknown';
}

module.exports = {
  createNotification,
  createNotificationBatch,
  getModuleTypes,
  getCategoryTypes,
  getNotificationCategory,
  getNotificationModule,
  MODULE_MAP,
  MODULE_TYPES,
  CATEGORY_TYPES,
};
