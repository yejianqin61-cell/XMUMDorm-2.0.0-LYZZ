const nodemailer = require('nodemailer');

let _transporter = null;

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER / SMTP_PASS 未配置，无法发送邮件');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function transporter() {
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
}

/**
 * 发送验证码邮件
 * @param {string} to 收件人邮箱
 * @param {string} code 6 位验证码明文
 * @param {number} minutes 有效期（分钟），默认 10
 */
async function sendVerificationEmail(to, code, minutes = 10) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('SMTP_FROM 或 SMTP_USER 未配置');
  }

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

  await transporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
};

