/**
 * 交友模块（任务管理表 #9「web:date交友模块」）
 *
 * 规则（安全优先）：
 *   - 只有自己挂出名片（visible=1）的人才能浏览别人的名片，也才会被别人看到
 *   - 列表永远不返回联系方式；双方互相「打招呼」后，联系方式才对彼此可见
 *   - 单方面打招呼不通知对方（避免骚扰）；互相打招呼时双方各收到一条通知
 *   - 拉黑后双向互不可见，并清掉双方之间的招呼
 *   - 只限学生账号、正常状态；被封禁、注销的人不出现
 *
 *   GET    /api/date/me                 我的名片
 *   PUT    /api/date/me                 新建或更新名片
 *   DELETE /api/date/me                 删除名片（连同我发出的招呼）
 *   GET    /api/date/cards              发现：别人的名片（?looking_for=&cursor=）
 *   POST   /api/date/cards/:userId/like 打招呼
 *   DELETE /api/date/cards/:userId/like 撤回招呼
 *   GET    /api/date/matches            互相打招呼的人（含联系方式）
 *   POST   /api/date/blocks/:userId     拉黑
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

const LOOKING_FOR = Object.freeze(['friends', 'study', 'activity', 'dating']);
const INTRO_MAX = 300;
const CONTACT_MAX = 100;
const TAG_MAX = 6;
const TAG_LEN_MAX = 12;
const PAGE_SIZE = 20;

function displayName(row, prefix = '') {
  const nick = row[`${prefix}nickname`] && String(row[`${prefix}nickname`]).trim();
  return nick || row[`${prefix}username`] || 'Dormer';
}

function parseTags(raw) {
  if (raw == null) return [];
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function cleanLine(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

/** 校验名片输入；返回 { value } 或 { error } */
function validateProfile(body) {
  const b = body || {};
  const intro = cleanLine(b.content, INTRO_MAX + 1);
  if (!intro) return { error: '请写一段自我介绍' };
  if (intro.length > INTRO_MAX) return { error: `自我介绍最多 ${INTRO_MAX} 字` };
  const contact = cleanLine(b.contact, CONTACT_MAX + 1).replace(/\s+/g, ' ');
  if (!contact) return { error: '请填写联系方式（只有互相打招呼的人能看到）' };
  if (contact.length > CONTACT_MAX) return { error: `联系方式最多 ${CONTACT_MAX} 字` };
  const lookingFor = String(b.looking_for || 'friends');
  if (!LOOKING_FOR.includes(lookingFor)) return { error: 'looking_for 不合法' };
  if (b.tags != null && !Array.isArray(b.tags)) return { error: 'tags 必须是数组' };
  const tags = [];
  for (const t of b.tags || []) {
    const tag = cleanLine(t, TAG_LEN_MAX + 1).replace(/\s+/g, ' ');
    if (!tag) continue;
    if (tag.length > TAG_LEN_MAX) return { error: `每个标签最多 ${TAG_LEN_MAX} 字` };
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > TAG_MAX) return { error: `标签最多 ${TAG_MAX} 个` };
  return { value: { intro, contact, lookingFor, tags, visible: b.visible === false ? 0 : 1 } };
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ u: row.updated_at, id: row.user_id })).toString('base64url');
}

function decodeCursor(raw) {
  try {
    const v = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'));
    if (!v || v.u == null || !Number.isInteger(v.id)) return null;
    return { updatedAt: v.u, id: v.id };
  } catch {
    return null;
  }
}

function toUserId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function createDateRouter({ query, auth, guards = [], sensitiveWordFilter, notify, assetUrl, likeLimiter }) {
  const router = express.Router();
  router.use(auth);

  const limiter = likeLimiter || rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 60,
    keyGenerator: (req) => String(req.user.id),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: -1, message: '打招呼太频繁了，休息一下再来' },
  });

  // 敏感词中间件只扫固定字段：把标签拼进 summary 让它一起检查
  const exposeTagsForFilter = (req, _res, next) => {
    if (req.body && Array.isArray(req.body.tags)) req.body.summary = req.body.tags.filter((t) => typeof t === 'string').join(' ');
    next();
  };

  async function myProfile(userId) {
    const rows = await query('SELECT user_id, visible FROM date_profiles WHERE user_id = ? LIMIT 1', [userId]);
    return (rows && rows[0]) || null;
  }

  async function isBlockedEitherWay(a, b) {
    const rows = await query(
      'SELECT 1 FROM date_blocks WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?) LIMIT 1',
      [a, b, b, a]
    );
    return !!(rows && rows.length);
  }

  const card = (r) => ({
    user: { id: r.user_id, name: displayName(r), avatar: r.avatar ? assetUrl(r.avatar) : null, level: Number(r.level) || 1 },
    intro: r.intro,
    tags: parseTags(r.tags_json),
    looking_for: r.looking_for,
    updated_at: r.updated_at,
  });

  router.get('/me', async (req, res) => {
    try {
      const rows = await query(
        'SELECT user_id, visible, intro, tags_json, looking_for, contact, updated_at FROM date_profiles WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      const r = rows && rows[0];
      res.status(200).json({
        status: 0,
        message: 'ok',
        data: r
          ? { visible: !!r.visible, intro: r.intro, tags: parseTags(r.tags_json), looking_for: r.looking_for, contact: r.contact, updated_at: r.updated_at }
          : null,
      });
    } catch (e) {
      console.error('date me get error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.put('/me', ...guards, exposeTagsForFilter, sensitiveWordFilter, async (req, res) => {
    const { value, error } = validateProfile(req.body);
    if (error) return res.status(400).json({ status: -1, message: error });
    try {
      await query(
        `INSERT INTO date_profiles (user_id, visible, intro, tags_json, looking_for, contact)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE visible = VALUES(visible), intro = VALUES(intro), tags_json = VALUES(tags_json),
           looking_for = VALUES(looking_for), contact = VALUES(contact)`,
        [req.user.id, value.visible, value.intro, JSON.stringify(value.tags), value.lookingFor, value.contact]
      );
      res.status(200).json({
        status: 0,
        message: 'ok',
        data: { visible: !!value.visible, intro: value.intro, tags: value.tags, looking_for: value.lookingFor, contact: value.contact },
      });
    } catch (e) {
      console.error('date me put error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.delete('/me', async (req, res) => {
    try {
      await query('DELETE FROM date_likes WHERE from_user_id = ?', [req.user.id]);
      await query('DELETE FROM date_profiles WHERE user_id = ?', [req.user.id]);
      res.status(200).json({ status: 0, message: 'ok', data: null });
    } catch (e) {
      console.error('date me delete error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.get('/cards', async (req, res) => {
    const lookingFor = req.query.looking_for == null || req.query.looking_for === '' ? null : String(req.query.looking_for);
    if (lookingFor && !LOOKING_FOR.includes(lookingFor)) return res.status(400).json({ status: -1, message: 'looking_for 不合法' });
    const cursor = req.query.cursor == null ? null : decodeCursor(req.query.cursor);
    if (req.query.cursor != null && !cursor) return res.status(400).json({ status: -1, message: 'cursor 不合法' });
    try {
      const me = Number(req.user.id);
      const mine = await myProfile(me);
      if (!mine || !mine.visible) {
        return res.status(403).json({ status: -1, code: 'NEED_PROFILE', message: '先挂出自己的名片，才能看到别人的' });
      }
      const params = [me, me, me, me];
      let extra = '';
      if (lookingFor) { extra += ' AND p.looking_for = ?'; params.push(lookingFor); }
      if (cursor) { extra += ' AND (p.updated_at < ? OR (p.updated_at = ? AND p.user_id < ?))'; params.push(cursor.updatedAt, cursor.updatedAt, cursor.id); }
      const rows = await query(
        `SELECT p.user_id, p.intro, p.tags_json, p.looking_for, p.updated_at,
                u.username, u.nickname, u.avatar, u.level
           FROM date_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE p.visible = 1 AND u.role = 'student' AND u.status = 'active'
            AND p.user_id <> ?
            AND NOT EXISTS (SELECT 1 FROM date_likes l WHERE l.from_user_id = ? AND l.to_user_id = p.user_id)
            AND NOT EXISTS (SELECT 1 FROM date_blocks b WHERE b.user_id = ? AND b.blocked_user_id = p.user_id)
            AND NOT EXISTS (SELECT 1 FROM date_blocks b2 WHERE b2.user_id = p.user_id AND b2.blocked_user_id = ?)${extra}
          ORDER BY p.updated_at DESC, p.user_id DESC
          LIMIT ${PAGE_SIZE + 1}`,
        params
      );
      const page = rows || [];
      const hasMore = page.length > PAGE_SIZE;
      const visible = page.slice(0, PAGE_SIZE);
      res.status(200).json({
        status: 0,
        message: 'ok',
        data: { list: visible.map(card), hasMore, nextCursor: hasMore ? encodeCursor(visible[visible.length - 1]) : null },
      });
    } catch (e) {
      console.error('date cards error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.post('/cards/:userId/like', limiter, ...guards, async (req, res) => {
    const me = Number(req.user.id);
    const target = toUserId(req.params.userId);
    if (!target) return res.status(400).json({ status: -1, message: 'userId 不合法' });
    if (target === me) return res.status(400).json({ status: -1, message: '不能和自己打招呼' });
    try {
      const mine = await myProfile(me);
      if (!mine || !mine.visible) {
        return res.status(403).json({ status: -1, code: 'NEED_PROFILE', message: '先挂出自己的名片，才能打招呼' });
      }
      const targetRows = await query(
        `SELECT p.user_id FROM date_profiles p JOIN users u ON u.id = p.user_id
          WHERE p.user_id = ? AND p.visible = 1 AND u.role = 'student' AND u.status = 'active' LIMIT 1`,
        [target]
      );
      if (!targetRows || !targetRows[0]) return res.status(404).json({ status: -1, message: '对方的名片不存在或已隐藏' });
      if (await isBlockedEitherWay(me, target)) return res.status(404).json({ status: -1, message: '对方的名片不存在或已隐藏' });

      const ins = await query('INSERT IGNORE INTO date_likes (from_user_id, to_user_id) VALUES (?, ?)', [me, target]);
      const reverse = await query('SELECT 1 FROM date_likes WHERE from_user_id = ? AND to_user_id = ? LIMIT 1', [target, me]);
      const matched = !!(reverse && reverse.length);
      // 只在这次真正新插入、并且凑成一对时通知，重复点不会重复通知
      if (matched && ins && ins.affectedRows) {
        // targetId 用对方的 id：信箱按 target 分组，不同的人各占一张卡片
        const extraFor = (peerId) => ({ targetType: 'date_match', targetId: peerId, targetTitle: null, targetPath: '/about/date?tab=matches' });
        await notify({ userId: target, type: 'date_match', fromUserId: me, extra: extraFor(me) });
        await notify({ userId: me, type: 'date_match', fromUserId: target, extra: extraFor(target) });
      }
      res.status(200).json({ status: 0, message: 'ok', data: { matched } });
    } catch (e) {
      console.error('date like error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.delete('/cards/:userId/like', async (req, res) => {
    const target = toUserId(req.params.userId);
    if (!target) return res.status(400).json({ status: -1, message: 'userId 不合法' });
    try {
      await query('DELETE FROM date_likes WHERE from_user_id = ? AND to_user_id = ?', [req.user.id, target]);
      res.status(200).json({ status: 0, message: 'ok', data: null });
    } catch (e) {
      console.error('date unlike error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.get('/matches', async (req, res) => {
    try {
      const me = Number(req.user.id);
      const rows = await query(
        `SELECT p.user_id, p.intro, p.tags_json, p.looking_for, p.contact, p.updated_at,
                u.username, u.nickname, u.avatar, u.level,
                GREATEST(a.created_at, b.created_at) AS matched_at
           FROM date_likes a
           JOIN date_likes b ON b.from_user_id = a.to_user_id AND b.to_user_id = a.from_user_id
           JOIN date_profiles p ON p.user_id = a.to_user_id
           JOIN users u ON u.id = p.user_id
          WHERE a.from_user_id = ? AND u.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM date_blocks x WHERE (x.user_id = ? AND x.blocked_user_id = p.user_id) OR (x.user_id = p.user_id AND x.blocked_user_id = ?))
          ORDER BY matched_at DESC, p.user_id DESC
          LIMIT 200`,
        [me, me, me]
      );
      const list = (rows || []).map((r) => ({ ...card(r), contact: r.contact, matched_at: r.matched_at }));
      res.status(200).json({ status: 0, message: 'ok', data: { list } });
    } catch (e) {
      console.error('date matches error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.post('/blocks/:userId', async (req, res) => {
    const me = Number(req.user.id);
    const target = toUserId(req.params.userId);
    if (!target || target === me) return res.status(400).json({ status: -1, message: 'userId 不合法' });
    try {
      await query('INSERT IGNORE INTO date_blocks (user_id, blocked_user_id) VALUES (?, ?)', [me, target]);
      await query(
        'DELETE FROM date_likes WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)',
        [me, target, target, me]
      );
      res.status(200).json({ status: 0, message: 'ok', data: null });
    } catch (e) {
      console.error('date block error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  return router;
}

function createDefaultRouter() {
  const { query } = require('../database');
  const authenticateToken = require('../middleware/auth');
  const { checkSanction } = require('../middleware/checkSanction');
  const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');
  const { requireCurrentTerms } = require('../services/termsAcceptance');
  const { createNotification } = require('../services/notificationService');
  const { assetUrl } = require('../utils/assets');
  return createDateRouter({
    query,
    auth: authenticateToken,
    guards: [requireCurrentTerms, checkSanction],
    sensitiveWordFilter,
    notify: createNotification,
    assetUrl,
  });
}

module.exports = createDefaultRouter();
module.exports.createDateRouter = createDateRouter;
module.exports.validateProfile = validateProfile;
module.exports.LOOKING_FOR = LOOKING_FOR;
