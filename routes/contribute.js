/**
 * Dorm 贡献站（任务管理表 #5「web:Dorm专属的贡献站的搭建」）
 *
 * 只读接口，数据全部来自已有的等级系统流水 `exp_logs`，不新建表：
 *   GET /api/contribute/leaderboard?range=30d|all   贡献榜（公开，Top 20，缓存 5 分钟）
 *   GET /api/contribute/me                          我的贡献（需登录）
 *
 * "贡献"只算产出内容的行为：发帖、评论、食堂点评、优质内容奖励、帖子受欢迎奖励。
 * 登录、点赞这类不产出内容的经验不算；只统计学生账号（商家、官方号不上榜）。
 */
const express = require('express');

const CONTRIBUTION_ACTIONS = Object.freeze([
  'post',
  'comment',
  'cafeteria_review',
  'quality_bonus',
  'post_popular_like',
  'post_popular_comment',
]);
const RANGES = Object.freeze({ '30d': 30, all: null });
const LEADERBOARD_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000;

const ACTION_SQL = CONTRIBUTION_ACTIONS.map(() => '?').join(', ');

// pool.execute 下 LIMIT / INTERVAL 绑参数在 MySQL 8 会报错；这两个值只来自上面的常量白名单，直接写进 SQL
function rangeWhere(days) {
  return days ? ` AND l.created_at >= DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)` : '';
}

function displayName(row) {
  const nick = row.nickname && String(row.nickname).trim();
  return nick || row.username || null;
}

function createContributeRouter({ query, cache, auth, assetUrl }) {
  const router = express.Router();

  async function loadLeaderboard(days) {
    const params = [...CONTRIBUTION_ACTIONS];
    const rows = await query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.level,
              SUM(l.exp) AS points, COUNT(*) AS contributions
         FROM exp_logs l
         JOIN users u ON u.id = l.user_id
        WHERE l.action IN (${ACTION_SQL}) AND l.exp > 0 AND u.role = 'student'${rangeWhere(days)}
        GROUP BY u.id, u.username, u.nickname, u.avatar, u.level
        ORDER BY points DESC, contributions DESC, u.id ASC
        LIMIT ${LEADERBOARD_SIZE}`,
      params
    );
    return (rows || []).map((r, i) => ({
      rank: i + 1,
      user: {
        id: r.id,
        name: displayName(r) || 'Dormer',
        avatar: r.avatar ? assetUrl(r.avatar) : null,
        level: Number(r.level) || 1,
      },
      points: Number(r.points) || 0,
      contributions: Number(r.contributions) || 0,
    }));
  }

  router.get('/leaderboard', async (req, res) => {
    const range = String(req.query.range || '30d');
    if (!Object.hasOwn(RANGES, range)) {
      return res.status(400).json({ status: -1, message: 'range 只能是 30d 或 all' });
    }
    try {
      const days = RANGES[range];
      const list = await cache.getOrSet(`contribute:leaderboard:v1:${range}`, CACHE_TTL_MS, () => loadLeaderboard(days));
      res.status(200).json({ status: 0, message: 'ok', data: { range, list } });
    } catch (e) {
      console.error('contribute leaderboard error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  router.get('/me', auth, async (req, res) => {
    try {
      const userId = Number(req.user.id);
      const days = RANGES['30d'];
      const byActionRows = await query(
        `SELECT l.action, SUM(l.exp) AS points, COUNT(*) AS contributions
           FROM exp_logs l
          WHERE l.user_id = ? AND l.action IN (${ACTION_SQL}) AND l.exp > 0${rangeWhere(days)}
          GROUP BY l.action`,
        [userId, ...CONTRIBUTION_ACTIONS]
      );
      const totalRows = await query(
        `SELECT COALESCE(SUM(l.exp), 0) AS points, COUNT(*) AS contributions
           FROM exp_logs l
          WHERE l.user_id = ? AND l.action IN (${ACTION_SQL}) AND l.exp > 0`,
        [userId, ...CONTRIBUTION_ACTIONS]
      );

      const byAction = {};
      let points30d = 0;
      let contributions30d = 0;
      for (const r of byActionRows || []) {
        const p = Number(r.points) || 0;
        const c = Number(r.contributions) || 0;
        byAction[r.action] = { points: p, contributions: c };
        points30d += p;
        contributions30d += c;
      }

      // 30 天排名：比我分高的学生有几个 + 1；没贡献就不排名
      let rank30d = null;
      if (points30d > 0) {
        const rankRows = await query(
          `SELECT COUNT(*) AS ahead FROM (
             SELECT l.user_id, SUM(l.exp) AS points
               FROM exp_logs l
               JOIN users u ON u.id = l.user_id
              WHERE l.action IN (${ACTION_SQL}) AND l.exp > 0 AND u.role = 'student'${rangeWhere(days)}
              GROUP BY l.user_id
             HAVING points > ?
           ) t`,
          [...CONTRIBUTION_ACTIONS, points30d]
        );
        rank30d = (Number(rankRows && rankRows[0] && rankRows[0].ahead) || 0) + 1;
      }

      const total = (totalRows && totalRows[0]) || {};
      res.status(200).json({
        status: 0,
        message: 'ok',
        data: {
          last30d: { points: points30d, contributions: contributions30d, rank: rank30d, byAction },
          total: { points: Number(total.points) || 0, contributions: Number(total.contributions) || 0 },
        },
      });
    } catch (e) {
      console.error('contribute me error:', e);
      res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
    }
  });

  return router;
}

function createDefaultRouter() {
  const { query } = require('../database');
  const { simpleCache } = require('../utils/simpleCache');
  const { assetUrl } = require('../utils/assets');
  const authenticateToken = require('../middleware/auth');
  return createContributeRouter({ query, cache: simpleCache, auth: authenticateToken, assetUrl });
}

module.exports = createDefaultRouter();
module.exports.createContributeRouter = createContributeRouter;
module.exports.CONTRIBUTION_ACTIONS = CONTRIBUTION_ACTIONS;
