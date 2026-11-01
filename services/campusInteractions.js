'use strict';
const { campusLikeStats } = require('./campusLikeStats');
const { createCampusComments } = require('./campusComments');

// Campus only. Existing toggle/comment operations share this transaction boundary.
// No notifications, experience, new interaction features or schema dependencies.
class InteractionError extends Error {
  constructor(status, code, message, reconcile = false) {
    super(message);
    this.status = status;
    this.code = code;
    this.reconcile = reconcile;
  }
}
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new InteractionError(400, 'INVALID_CAMPUS_ID', '校园帖子或评论标识无效');
  }
  return Number(value);
}
function unavailable() {
  return new InteractionError(503, 'CAMPUS_INTERACTION_UNAVAILABLE', '校园互动暂不可用，未确认保存成功');
}
function writeResult(result) {
  if (result?.affectedRows !== 1) throw unavailable();
}
function createCampusInteractions({ pool, cleanText, mapAuthor }) {
  async function transaction(actorId, postId, work, reading = false) {
    if (actorId == null && !reading) throw new InteractionError(401, 'AUTH_REQUIRED', '请先登录');
    actorId = actorId == null ? null : id(actorId); postId = id(postId);
    let connection, begun = false, committing = false, discard = false;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      begun = true;
      const sql = async (statement, params = []) => {
        const [rows] = await connection.execute(statement, params);
        return rows;
      };
      // Matches campusNews writes: current actor FOR SHARE -> post FOR UPDATE.
      const users = actorId == null ? [] : await sql('SELECT id,role,status FROM users WHERE id=? FOR SHARE', [actorId]);
      if (actorId != null && !users.length) throw new InteractionError(401, 'AUTH_REQUIRED', '当前账号不存在');
      const user = users[0];
      if (user && user.status !== 'active') throw new InteractionError(403, 'ACCOUNT_INACTIVE', '当前账号不可互动');
      const posts = await sql(`SELECT id,source_kind,lifecycle_status,hidden_by_admin,deleted_at,category,audience_scope FROM campus_posts WHERE id=? FOR ${reading ? 'SHARE' : 'UPDATE'}`, [postId]);
      const post = posts[0];
      if (!post || !['legacy', 'news'].includes(post.source_kind) || post.lifecycle_status !== 'published'
        || Number(post.hidden_by_admin) !== 0 || post.deleted_at) {
        throw new InteractionError(404, 'CAMPUS_POST_UNAVAILABLE', '校园帖子不可互动');
      }
      if (actorId == null && post.source_kind === 'news') throw new InteractionError(401, 'AUTH_REQUIRED', '请先登录');
      // Legacy content can still be read anonymously; incomplete content cannot be written.
      let complete = ['competition', 'lecture', 'campus-life'].includes(post.category) && ['all', 'colleges'].includes(post.audience_scope);
      if (post.audience_scope === 'colleges') {
        const audiences = await sql('SELECT college_id FROM campus_post_audiences WHERE post_id=? LIMIT 1 FOR SHARE', [postId]);
        complete = complete && audiences.length > 0;
      }
      if (!reading && !complete) throw new InteractionError(404, 'CAMPUS_POST_UNAVAILABLE', '校园帖子不可互动');
      const data = await work({ sql, user, post, postId, actorId, complete });
      committing = true;
      await connection.commit();
      begun = false;
      return data;
    } catch (error) {
      if (begun) {
        try { await connection.rollback(); }
        catch { discard = true; }
      }
      // A lost COMMIT acknowledgement must never trigger an automatic toggle retry.
      if (committing) throw new InteractionError(503, 'CAMPUS_INTERACTION_OUTCOME_UNKNOWN', '提交结果尚未确认，请刷新核对，不要自动重试', true);
      if (error instanceof InteractionError) throw error;
      if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) {
        throw new InteractionError(503, 'CAMPUS_INTERACTION_BUSY', '校园互动繁忙，本次事务已停止，请刷新后再操作');
      }
      throw unavailable();
    } finally {
      if (connection) {
        if (discard) connection.destroy();
        else connection.release();
      }
    }
  }
  return {
    ...createCampusComments({ transaction, cleanText, mapAuthor, InteractionError, id, writeResult }),
    interactions(actorId, postId) {
      return transaction(actorId, postId, async ({ sql, postId, actorId, complete }) => ({
        ...(await campusLikeStats(sql, [postId], actorId)).get(String(postId)), can_like: actorId != null && complete,
      }), true);
    },
    setLike(actorId, postId, desired) {
      if (typeof desired !== 'boolean') return Promise.reject(new InteractionError(400, 'INVALID_LIKE_STATE', '点赞状态必须为布尔值'));
      return transaction(actorId, postId, async ({ sql, postId, actorId }) => {
        const existing = await sql('SELECT 1 FROM campus_post_likes WHERE post_id=? AND user_id=?', [postId, actorId]);
        const changed = desired !== (existing.length > 0);
        if (changed) writeResult(desired
          ? await sql('INSERT INTO campus_post_likes (post_id,user_id) VALUES (?,?)', [postId, actorId])
          : await sql('DELETE FROM campus_post_likes WHERE post_id=? AND user_id=?', [postId, actorId]));
        return { ...(await campusLikeStats(sql, [postId], actorId)).get(String(postId)), changed, can_like: true };
      });
    },
    // Deprecated transition path. No automatic retry or idempotence claim.
    toggleLike(actorId, postId, legacyOnly = false) {
      return transaction(actorId, postId, async ({ sql, postId, actorId, post }) => {
        if (legacyOnly === true && post.source_kind !== 'legacy') throw new InteractionError(409, 'INTERACTION_CLIENT_UPGRADE_REQUIRED', '请使用 PUT/DELETE 点赞接口');
        const existing = await sql('SELECT 1 FROM campus_post_likes WHERE post_id=? AND user_id=?', [postId, actorId]);
        const liked = existing.length === 0;
        const result = liked
          ? await sql('INSERT INTO campus_post_likes (post_id,user_id) VALUES (?,?)', [postId, actorId])
          : await sql('DELETE FROM campus_post_likes WHERE post_id=? AND user_id=?', [postId, actorId]);
        writeResult(result);
        const counts = await sql('SELECT COUNT(*) AS cnt FROM campus_post_likes WHERE post_id=?', [postId]);
        const count = Number(counts[0]?.cnt);
        if (!Number.isSafeInteger(count) || count < 0) throw unavailable();
        return { liked, like_count: count };
      });
    },
  };
}
function replyInteractionError(error, res) {
  const known = error instanceof InteractionError ? error : unavailable();
  return res.status(known.status).json({ status: -1, message: known.message, code: known.code,
    retry_safe: false, ...(known.reconcile ? { reconcile: true } : {}) });
}
module.exports = { createCampusInteractions, InteractionError, replyInteractionError };
