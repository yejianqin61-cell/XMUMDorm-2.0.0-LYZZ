'use strict';

const {
  COLLEGE_IDS
} = require('./academicIdentity');
const TYPE = 'campus_news_publication';
const ELIGIBLE = `u.role='student' AND u.status='active' AND (u.banned_until IS NULL OR u.banned_until<=CURRENT_TIMESTAMP(3)) AND NOT EXISTS (SELECT 1 FROM user_sanctions s WHERE s.user_id=u.id AND s.type='ban' AND s.revoked_at IS NULL AND (s.ends_at IS NULL OR s.ends_at>CURRENT_TIMESTAMP(3)))`;
async function freezeRecipients(session, post, versionId) {
  if (post.sourceKind !== 'news' || post.lifecycleStatus !== 'published' || post.hiddenByAdmin || post.deletedAt || post.audience.scope !== 'colleges') return 0;
  const ids = [...post.audience.collegeIds].sort();
  // Existing test audiences remain valid legacy content but are never official notification identities.
  const official = ids.filter(id => COLLEGE_IDS.includes(id));
  if (!official.length) return 0;
  const users = await session.sql(`SELECT u.id,u.college_id FROM users u JOIN colleges c ON c.id=u.college_id AND c.is_active=1 WHERE u.college_id IN (${official.map(() => '?').join(',')}) AND ${ELIGIBLE} ORDER BY u.college_id,u.id FOR SHARE`, official);
  for (let i = 0; i < users.length; i += 100) {
    const batch = users.slice(i, i + 100);
    await session.sql('INSERT INTO campus_news_notification_deliveries(publication_version_id,user_id,matched_college_id) VALUES ' + batch.map(() => '(?,?,?)').join(','), batch.flatMap(u => [versionId, u.id, u.college_id]));
  }
  return users.length;
}
async function currentReader(sql, userId) {
  const rows = await sql(`SELECT u.id FROM users u WHERE u.id=? AND u.status='active' AND (u.banned_until IS NULL OR u.banned_until<=CURRENT_TIMESTAMP(3)) AND NOT EXISTS (SELECT 1 FROM user_sanctions s WHERE s.user_id=u.id AND s.type='ban' AND s.revoked_at IS NULL AND (s.ends_at IS NULL OR s.ends_at>CURRENT_TIMESTAMP(3)))`, [userId]);
  return rows.length === 1;
}
async function mailboxItem(sql, row, userId) {
  const found = await sql(`SELECT d.publication_version_id,v.post_id,p.title,p.source_kind,p.lifecycle_status,p.hidden_by_admin,p.deleted_at FROM campus_news_notification_deliveries d JOIN campus_news_versions v ON v.id=d.publication_version_id JOIN campus_posts p ON p.id=v.post_id WHERE d.notification_id=? AND d.user_id=? AND d.state='delivered'`, [row.id, userId]);
  const p = found[0],
    available = !!(p && p.source_kind === 'news' && p.lifecycle_status === 'published' && !p.hidden_by_admin && !p.deleted_at && (await currentReader(sql, userId)));
  return {
    id: row.id,
    type: TYPE,
    is_read: !!row.is_read,
    post_id: null,
    post_title: null,
    comment_id: null,
    from_user_id: null,
    created_at: row.created_at,
    category: 'system',
    module: 'campus',
    extra: {
      publicationVersionId: p ? String(p.publication_version_id) : null
    },
    target: {
      type: 'campus_news',
      id: available ? p.post_id : null,
      key: 'campus-news-event:' + (p?.publication_version_id || row.id),
      title: available ? p.title : null,
      path: available ? `/about/campus/${p.post_id}` : '#',
      available
    }
  };
}
function createDeliveryWorker(pool, {
  logger = console.error
} = {}) {
  let running = false,
    busy = false,
    timer = null;
  async function runOne() {
    const c = await pool.getConnection();
    let selected;
    try {
      await c.beginTransaction();
      const [rows] = await c.query("SELECT publication_version_id,user_id FROM campus_news_notification_deliveries WHERE state='pending' AND next_attempt_at<=CURRENT_TIMESTAMP(3) ORDER BY next_attempt_at,publication_version_id,user_id LIMIT 1 FOR UPDATE SKIP LOCKED");
      selected = rows[0];
      if (!selected) {
        await c.commit();
        return false;
      }
      const [users] = await c.execute(`SELECT u.id FROM users u WHERE u.id=? AND ${ELIGIBLE} FOR SHARE`, [selected.user_id]);
      if (!users.length) {
        const e = new Error('Recipient currently ineligible');
        e.code = 'RECIPIENT_INELIGIBLE';
        throw e;
      }
      const [versions] = await c.execute('SELECT post_id FROM campus_news_versions WHERE id=?', [selected.publication_version_id]);
      if (!versions.length) throw new Error('Publication version missing');
      // No title/content snapshot in public notification JSON; read-time DTO checks current visibility.
      const extra = JSON.stringify({
        targetType: 'campus_news',
        targetId: versions[0].post_id,
        publicationVersionId: String(selected.publication_version_id)
      });
      const [insert] = await c.execute('INSERT INTO notifications(user_id,type,post_id,comment_id,from_user_id,extra) VALUES(?,?,NULL,NULL,NULL,?)', [selected.user_id, TYPE, extra]);
      const [update] = await c.execute("UPDATE campus_news_notification_deliveries SET state='delivered',notification_id=?,delivered_at=CURRENT_TIMESTAMP(3),last_error_code=NULL WHERE publication_version_id=? AND user_id=? AND state='pending'", [insert.insertId, selected.publication_version_id, selected.user_id]);
      if (update.affectedRows !== 1) throw new Error('Delivery state update failed');
      await c.commit();
      return true;
    } catch (e) {
      await c.rollback();
      if (selected) {
        try {
          await c.execute("UPDATE campus_news_notification_deliveries SET attempts=LEAST(attempts+1,4294967295),last_error_code=?,next_attempt_at=TIMESTAMPADD(SECOND,LEAST(3600,POW(2,LEAST(attempts+1,12))),CURRENT_TIMESTAMP(3)) WHERE publication_version_id=? AND user_id=? AND state='pending'", [String(e.code || 'DELIVERY_FAILED').slice(0, 64), selected.publication_version_id, selected.user_id]);
        } catch (recordError) {
          logger('[campus-delivery] persistent retry record failed', recordError.code || 'DB_ERROR');
        }
      }
      logger('[campus-delivery] retained pending', e.code || 'DELIVERY_FAILED');
      return false;
    } finally {
      c.release();
    }
  }
  async function drain(limit = 50) {
    if (busy) return;
    busy = true;
    try {
      for (let i = 0; i < limit; i++) if (!(await runOne())) break;
    } finally {
      busy = false;
    }
  }
  function wake() {
    if (running) void drain().catch(e => logger('[campus-delivery] scan failed', e.code || 'DB_ERROR'));
  }
  function start() {
    if (running) return;
    running = true;
    timer = setInterval(wake, 1500);
    timer.unref();
    wake();
  }
  function stop() {
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
  }
  return {
    runOne,
    drain,
    wake,
    start,
    stop
  };
}
module.exports = {
  TYPE,
  ELIGIBLE,
  freezeRecipients,
  currentReader,
  mailboxItem,
  createDeliveryWorker
};
