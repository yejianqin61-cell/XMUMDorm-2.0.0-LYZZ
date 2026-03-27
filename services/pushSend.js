/**
 * Web Push 发送（依赖 web-push + 环境变量 VAPID_*）
 */
const webpush = require('web-push');
const { query } = require('../database');

let vapidConfigured = false;

function configureWebPush() {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:dorm-app@localhost';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

function resetVapidConfigured() {
  vapidConfigured = false;
}

/**
 * @param {number} userId
 * @param {{ title?: string, body?: string, url?: string, tag?: string }} payloadObj
 * @returns {Promise<{ ok: boolean }>}
 */
async function sendPushToUser(userId, payloadObj) {
  if (!configureWebPush()) return { ok: false };
  const rows = await query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );
  const payload = JSON.stringify(payloadObj);
  let anyOk = false;
  for (const r of rows || []) {
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        payload,
        { TTL: 3600 }
      );
      anyOk = true;
    } catch (e) {
      const status = e.statusCode;
      if (status === 410 || status === 404) {
        try {
          await query('DELETE FROM push_subscriptions WHERE endpoint = ?', [r.endpoint]);
        } catch (_) {
          /* ignore */
        }
      }
      console.warn('[web-push] send failed:', e.message || e);
    }
  }
  return { ok: anyOk };
}

module.exports = {
  configureWebPush,
  resetVapidConfigured,
  sendPushToUser,
};
