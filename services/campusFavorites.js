'use strict';
const { NewsError, id, filters } = require('./campusNews/domain');
const { currentReader } = require('./campusNewsNotifications');

// Match the existing classified campus feed. College audiences are relevance
// labels, not an additional ACL; account eligibility uses the existing reader rule.
const ELIGIBLE = `p.source_kind IN ('news','legacy') AND p.lifecycle_status='published'
 AND p.hidden_by_admin=0 AND p.deleted_at IS NULL
 AND p.category IN ('competition','lecture','campus-life')
 AND (p.audience_scope='all' OR (p.audience_scope='colleges'
 AND EXISTS(SELECT 1 FROM campus_post_audiences a WHERE a.post_id=p.id)))`;

function createCampusFavorites(pool) {
  async function transaction(actor, work) {
    actor = id(actor);
    const c = await pool.getConnection();
    let committing = false;
    let discard = false;
    try {
      await c.beginTransaction();
      const sql = async (text, args = []) => (await c.execute(text, args))[0];
      const user = await sql('SELECT id FROM users WHERE id=? FOR SHARE', [actor]);
      if (!user.length || !await currentReader(sql, actor)) throw new NewsError(403, '当前账号不可使用收藏');
      const data = await work(sql, actor);
      committing = true;
      await c.commit();
      return data;
    } catch (error) {
      try { await c.rollback(); } catch { discard = true; }
      if (committing) { discard = true; throw new NewsError(503, '收藏结果尚未确认，请刷新状态后再操作'); }
      if (error instanceof NewsError) throw error;
      throw new NewsError(503, '收藏操作失败，请重试或刷新核对');
    } finally { if (discard) c.destroy(); else c.release(); }
  }
  const state = (postId, favorited) => ({ target_type: 'campus_post', post_id: String(postId), favorited });
  async function target(sql, postId, write) {
    const rows = await sql(`SELECT p.id,(${ELIGIBLE}) AS eligible FROM campus_posts p WHERE p.id=? FOR ${write ? 'UPDATE' : 'SHARE'}`, [postId]);
    return rows[0];
  }
  return {
    get(actor, value) {
      const postId = id(value);
      return transaction(actor, async (sql, userId) => {
        if (Number((await target(sql, postId, false))?.eligible) !== 1) throw new NewsError(404, '此快讯不存在或已不再公开');
        const rows = await sql('SELECT 1 FROM campus_post_favorites WHERE user_id=? AND post_id=? FOR SHARE', [userId, postId]);
        return state(postId, rows.length > 0);
      });
    },
    set(actor, value, desired) {
      const postId = id(value);
      if (typeof desired !== 'boolean') throw new NewsError(400, '收藏状态无效');
      return transaction(actor, async (sql, userId) => {
        // Same user -> post lock order as campus management. All writes to one
        // target serialize, and the composite primary key is the final safeguard.
        const post = await target(sql, postId, true);
        if (desired) {
          if (Number(post?.eligible) !== 1) throw new NewsError(404, '此快讯不存在或已不再公开');
          const rows = await sql('SELECT 1 FROM campus_post_favorites WHERE user_id=? AND post_id=? FOR UPDATE', [userId, postId]);
          if (!rows.length) await sql('INSERT INTO campus_post_favorites(user_id,post_id) VALUES (?,?)', [userId, postId]);
        } else {
          // Owned cleanup stays possible after withdrawal/deletion, without
          // disclosing whether the target exists or returning any target content.
          await sql('DELETE FROM campus_post_favorites WHERE user_id=? AND post_id=?', [userId, postId]);
        }
        return state(postId, desired);
      });
    },
    list(actor, query) {
      const { page, pageSize } = filters(query);
      return transaction(actor, async (sql, userId) => {
        const from = `FROM campus_post_favorites f JOIN campus_posts p ON p.id=f.post_id WHERE f.user_id=? AND ${ELIGIBLE}`;
        const counts = await sql(`SELECT COUNT(*) AS total ${from}`, [userId]);
        const rows = await sql(`SELECT p.id,p.title,LEFT(p.content,160) AS summary,f.created_at AS favorited_at,
          CASE WHEN p.source_kind='legacy' THEN p.created_at ELSE COALESCE(p.published_at,p.created_at) END AS published_at
          ${from} ORDER BY f.created_at DESC,f.post_id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, [userId]);
        const total = Number(counts[0].total);
        return { list: rows.map(row => ({ ...row, id: String(row.id) })), total, page, pageSize, hasMore: page * pageSize < total };
      });
    },
  };
}
module.exports = { createCampusFavorites };
