/**
 * 用户等级 / 经验服务（V1）
 * 所有经验变动须经 grantExp / revokeByRef
 */
const { pool } = require('../database');
const { shanghaiDateOnly } = require('../utils/timezone');
const {
  EXP_ACTION_CONFIG,
  getLevelByExp,
  getBadgeByLevel,
  getExpProgress,
} = require('../constants/levelThresholds');
const { simpleCache } = require('../utils/simpleCache');

async function execConn(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

function invalidateUserMeCache(userId) {
  simpleCache.delete(`users:me:v1:${userId}`);
}

function buildPublicResult(row, delta, levelUp, previousLevel, messages = []) {
  const badge = getBadgeByLevel(row.level);
  return {
    delta,
    total: row.exp,
    level: row.level,
    levelUp,
    previousLevel: levelUp ? previousLevel : null,
    badge: badge.key,
    badgeLabel: badge.labelZh,
    badgeEmoji: badge.emoji,
    messages,
    progress: getExpProgress(row.exp),
  };
}

/**
 * @param {number} userId
 * @param {{ action: string, amount?: number, refType?: string, refId?: number, meta?: object, skipDailyCap?: boolean }} opts
 */
async function grantExp(userId, opts) {
  const uid = parseInt(userId, 10);
  if (!uid) return { delta: 0, total: 0, level: 1, levelUp: false };

  const action = String(opts.action || '').trim();
  const cfg = EXP_ACTION_CONFIG[action];
  if (!cfg) return { delta: 0, total: 0, level: 1, levelUp: false };

  let amount = opts.amount != null ? Number(opts.amount) : cfg.amount;
  if (!Number.isFinite(amount) || amount === 0) return { delta: 0, total: 0, level: 1, levelUp: false };

  const day = shanghaiDateOnly();
  const refType = opts.refType || null;
  const refId = opts.refId != null ? Number(opts.refId) : null;
  const meta = opts.meta || null;
  const skipDailyCap = !!opts.skipDailyCap;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const users = await execConn(
      conn,
      'SELECT id, level, exp, badge FROM users WHERE id = ? FOR UPDATE',
      [uid]
    );
    if (!users.length) {
      await conn.rollback();
      return { delta: 0, total: 0, level: 1, levelUp: false };
    }
    const user = users[0];
    const previousLevel = user.level;

    if (amount > 0 && !skipDailyCap && cfg.dailyCap != null) {
      const dailyRows = await execConn(
        conn,
        'SELECT exp_sum FROM user_exp_daily WHERE user_id = ? AND day = ? AND action = ? FOR UPDATE',
        [uid, day, action]
      );
      const used = dailyRows.length ? Number(dailyRows[0].exp_sum) : 0;
      const room = cfg.dailyCap - used;
      if (room <= 0) {
        await conn.commit();
        return buildPublicResult(user, 0, false, previousLevel);
      }
      if (amount > room) amount = room;
    }

    if (amount < 0) {
      const nextExp = Math.max(0, Number(user.exp) + amount);
      amount = nextExp - Number(user.exp);
      if (amount === 0) {
        await conn.commit();
        return buildPublicResult(user, 0, false, previousLevel);
      }
      if (!skipDailyCap && cfg.dailyCap != null) {
        await execConn(
          conn,
          `INSERT INTO user_exp_daily (user_id, day, action, exp_sum)
           VALUES (?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE exp_sum = GREATEST(0, exp_sum + ?)`,
          [uid, day, action, amount]
        );
      }
    } else if (!skipDailyCap && cfg.dailyCap != null) {
      await execConn(
        conn,
        `INSERT INTO user_exp_daily (user_id, day, action, exp_sum)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE exp_sum = exp_sum + ?`,
        [uid, day, action, amount, amount]
      );
    }

    const newExp = Math.max(0, Number(user.exp) + amount);
    const newLevel = getLevelByExp(newExp);
    const badge = getBadgeByLevel(newLevel);
    const levelUp = newLevel > Number(user.level);

    await execConn(
      conn,
      'UPDATE users SET exp = ?, level = ?, badge = ? WHERE id = ?',
      [newExp, newLevel, badge.key, uid]
    );

    const metaJson = meta ? JSON.stringify(meta) : null;
    await execConn(
      conn,
      'INSERT INTO exp_logs (user_id, action, exp, ref_type, ref_id, meta_json) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, action, amount, refType, refId, metaJson]
    );

    if (levelUp) {
      await execConn(
        conn,
        'INSERT INTO exp_logs (user_id, action, exp, ref_type, ref_id, meta_json) VALUES (?, ?, 0, ?, ?, ?)',
        [uid, 'level_up', 'user', uid, JSON.stringify({ from: user.level, to: newLevel })]
      );
    }

    await conn.commit();
    invalidateUserMeCache(uid);

    const messages = [];
    if (levelUp) {
      messages.push(`恭喜升级 Lv${newLevel}！`);
    }

    const updated = { level: newLevel, exp: newExp, badge: badge.key };
    return buildPublicResult(updated, amount, levelUp, previousLevel, messages);
  } catch (e) {
    await conn.rollback();
    console.error('[expService] grantExp error:', e);
    return { delta: 0, total: 0, level: 1, levelUp: false };
  } finally {
    conn.release();
  }
}

async function revokeByRef(userId, { action, refType, refId }) {
  const uid = parseInt(userId, 10);
  if (!uid || !refType || refId == null) return { delta: 0 };

  const rows = await pool.execute(
    `SELECT id, exp FROM exp_logs
     WHERE user_id = ? AND action = ? AND ref_type = ? AND ref_id = ? AND exp > 0
     ORDER BY id DESC LIMIT 1`,
    [uid, action, refType, refId]
  );
  const log = rows[0] && rows[0][0];
  if (!log) return { delta: 0 };

  return grantExp(uid, {
    action,
    amount: -Number(log.exp),
    refType,
    refId,
    skipDailyCap: true,
    meta: { revokeOf: log.id, reason: 'unlike' },
  });
}

async function getUserLevelSummary(userId) {
  const uid = parseInt(userId, 10);
  if (!uid) return null;
  const rows = await pool.execute(
    'SELECT id, level, exp, badge FROM users WHERE id = ?',
    [uid]
  );
  const u = rows[0] && rows[0][0];
  if (!u) return null;
  const badge = getBadgeByLevel(u.level);
  const progress = getExpProgress(u.exp);
  return {
    level: u.level,
    exp: u.exp,
    badge: u.badge || badge.key,
    badgeEmoji: badge.emoji,
    badgeLabel: badge.labelZh,
    badgeLabelEn: badge.labelEn,
    ...progress,
  };
}

/** 帖子热度一次性奖励（帖主） */
async function checkAndGrantPostPopularRewards(postKind, postId, authorId) {
  const pid = Number(postId);
  const aid = parseInt(authorId, 10);
  if (!pid || !aid) return [];

  const results = [];
  let likeCount = 0;
  let commentCount = 0;

  if (postKind === 'treehole') {
    const [lc] = await pool.execute('SELECT COUNT(*) AS cnt FROM post_likes WHERE post_id = ?', [pid]);
    const [cc] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM comments WHERE post_id = ? AND deleted_at IS NULL',
      [pid]
    );
    likeCount = Number(lc[0]?.cnt) || 0;
    commentCount = Number(cc[0]?.cnt) || 0;
  } else if (postKind === 'trending') {
    const [lc] = await pool.execute('SELECT COUNT(*) AS cnt FROM trending_post_likes WHERE post_id = ?', [pid]);
    const [cc] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM trending_post_comments WHERE post_id = ? AND deleted_at IS NULL',
      [pid]
    );
    likeCount = Number(lc[0]?.cnt) || 0;
    commentCount = Number(cc[0]?.cnt) || 0;
  } else {
    return results;
  }

  const grants = [];
  if (likeCount >= 10) grants.push({ reward_type: 'likes_10', action: 'post_popular_like' });
  if (commentCount >= 10) grants.push({ reward_type: 'comments_10', action: 'post_popular_comment' });

  for (const g of grants) {
    try {
      await pool.execute(
        'INSERT INTO post_exp_rewards (post_kind, post_id, reward_type, user_id) VALUES (?, ?, ?, ?)',
        [postKind, pid, g.reward_type, aid]
      );
      const r = await grantExp(aid, {
        action: g.action,
        refType: postKind === 'treehole' ? 'treehole_post' : 'trending_post',
        refId: pid,
        skipDailyCap: true,
        meta: { reward_type: g.reward_type },
      });
      if (r.delta) {
        results.push({
          ...r,
          messages: [...(r.messages || []), '你的帖子受到大家欢迎！'],
        });
      }
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') {
        console.error('[expService] popular reward error:', e);
      }
    }
  }
  return results;
}

function formatAuthorLevel(userRow) {
  if (!userRow) return {};
  const level = userRow.level != null ? Number(userRow.level) : 1;
  const badge = getBadgeByLevel(level);
  return {
    level,
    badge: userRow.badge || badge.key,
    badgeEmoji: badge.emoji,
  };
}

module.exports = {
  grantExp,
  revokeByRef,
  getUserLevelSummary,
  checkAndGrantPostPopularRewards,
  formatAuthorLevel,
  getExpProgress,
};
