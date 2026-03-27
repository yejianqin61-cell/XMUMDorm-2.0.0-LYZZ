/**
 * Web Push：VAPID 公钥、订阅/取消、测试推送
 */
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { query } = require('../database');
const { configureWebPush, sendPushToUser } = require('../services/pushSend');

function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** 前端订阅前获取公钥（可不登录） */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      status: -1,
      message: 'Web Push 未配置：请设置 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY',
    });
  }
  res.status(200).json({ status: 0, data: { publicKey } });
});

/** 保存浏览器 PushSubscription */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const sub = req.body || {};
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({ status: -1, message: 'subscription 无效 Invalid subscription' });
    }
    const endpoint = String(sub.endpoint).slice(0, 768);
    const p256dh = String(sub.keys.p256dh).slice(0, 255);
    const auth = String(sub.keys.auth).slice(0, 255);
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, endpoint, p256dh, auth]
    );
    res.status(200).json({ status: 0, message: '订阅成功 Subscribed' });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 012_web_push.sql Run migration 012' });
    }
    console.error('push subscribe:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ status: -1, message: '缺少 endpoint' });
    }
    await query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [
      req.user.id,
      String(endpoint).slice(0, 768),
    ]);
    res.status(200).json({ status: 0, message: '已取消 Unsubscribed' });
  } catch (e) {
    console.error('push unsubscribe:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

/** 手动测一条推送（需登录） */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { ok } = await sendPushToUser(req.user.id, {
      title: 'Dorm 推送测试 Push test',
      body: '若看到此条，说明 Web Push 已打通 If you see this, push works.',
      url: '/about/schedule',
      tag: 'test',
    });
    if (!ok) {
      return res.status(503).json({
        status: -1,
        message: '未发送：未配置 VAPID 或当前账号无订阅',
      });
    }
    res.status(200).json({ status: 0, message: '已尝试发送 Sent' });
  } catch (e) {
    console.error('push test:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

module.exports = router;
