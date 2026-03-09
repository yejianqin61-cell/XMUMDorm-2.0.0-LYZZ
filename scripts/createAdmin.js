/**
 * 一次性脚本：创建管理员账号
 * 账号：admin
 * 密码：20061016
 *
 * 使用方法（在项目根目录执行）：
 *   node scripts/createAdmin.js
 *
 * 要求：
 * - .env 中的数据库配置已正确填写（与后端一致）
 * - 已执行 migrations/001_posts_system_2.0.0.sql（确保 users.role 包含 'admin'）
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('../database');

async function main() {
  const username = 'admin';
  const password = '20061016';

  try {
    // 检查是否已存在 admin
    const existing = await query('SELECT id, username, role FROM users WHERE username = ?', [username]);
    if (existing && existing.length > 0) {
      console.log(`用户 "${username}" 已存在，当前角色为: ${existing[0].role} (id=${existing[0].id})`);
      // 若不是 admin，可按需手动 UPDATE users SET role='admin' WHERE id=...
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, 'admin']
    );

    console.log('✅ 管理员账号已创建：');
    console.log(`  username: ${username}`);
    console.log(`  password: ${password}`);
    console.log(`  id: ${result.insertId}`);
  } catch (err) {
    console.error('❌ 创建管理员账号失败:', err.message || err);
  } finally {
    try {
      await pool.end();
    } catch (_) {}
  }
}

main();

