/**
 * 邮件发送：优先使用 Resend HTTP API（适合 Railway 等禁止 SMTP 出口的环境），
 * 未配置时回退到 SMTP（本地/自建服务器可用）。
 */

const RESEND_API = 'https://api.resend.com/emails';

/**
 * 使用 Resend API 发邮件（走 HTTPS，无 SMTP 端口限制）
 */
async function sendViaResend(to, subject, html, text) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('RESEND_API_KEY 未配置');
  }
  const from = process.env.RESEND_FROM || 'Dorm <onboarding@resend.dev>';
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: html || text,
      text: text || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.msg || data.error || res.statusText || `HTTP ${res.status}`;
    throw new Error(`Resend 发送失败: ${msg}`);
  }
  return data;
}

/**
 * 使用 SMTP（nodemailer）发邮件
 */
async function sendViaSmtp(to, subject, html, text) {
  const nodemailer = require('nodemailer');
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS 未配置');
  if (!from) throw new Error('SMTP_FROM 或 SMTP_USER 未配置');

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.sendMail({ from, to, subject, text, html });
}

/**
 * 发送验证码邮件
 * @param {string} to 收件人邮箱
 * @param {string} code 6 位验证码明文
 * @param {number} minutes 有效期（分钟），默认 10
 */
async function sendVerificationEmail(to, code, minutes = 10) {
  const subject = 'Dorm 校园平台邮箱验证码';
  const text = [
    `您的验证码为：${code}`,
    '',
    `有效期：${minutes} 分钟，请尽快完成验证。`,
    '请勿将验证码泄露给他人，如非本人操作请忽略本邮件。',
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111;">
      <p>您好，Greetings</p>
      <p>感谢使用 Dorm 校园平台，您的邮箱验证码为：Thank you for using the Dorm campus platform. Your email verification code is:</p>
      <p style="font-size: 20px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>有效期：<strong>${minutes} 分钟</strong>，请尽快在页面上完成验证。</p>
      <p style="color: #666;">请勿将验证码泄露给他人，如非本人操作请忽略本邮件。</p>
      <p style="margin-top: 16px;">—— Dorm 校园平台</p>
    </div>
  `;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    await sendViaResend(to, subject, html, text);
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    await sendViaSmtp(to, subject, html, text);
  } else {
    throw new Error('未配置邮件发送：请设置 RESEND_API_KEY（推荐）或 SMTP_USER/SMTP_PASS');
  }
}

module.exports = {
  sendVerificationEmail,
};
