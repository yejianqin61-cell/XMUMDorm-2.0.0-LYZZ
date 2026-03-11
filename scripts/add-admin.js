/**
 * 添加或修复账号（直接写库，不走注册接口）
 *
 * 使用前：把 Railway 的数据库连接信息填到 .env（或临时设置环境变量），
 * 然后在本机项目根目录执行。
 *
 * 用法一（管理员，邮箱 + 用户名 + 密码）：
 *   node scripts/add-admin.js <邮箱> <用户名> <密码>
 *
 * 用法二（指定角色：学生/商家/管理员）：
 *   node scripts/add-admin.js <邮箱> <用户名> <密码> <角色>
 *   角色可选：student / merchant / admin
 *
 * 用法三（仅用户名 + 密码，无邮箱，适合商家/管理员）：
 *   node scripts/add-admin.js <用户名> <密码>
 *
 * 示例：
 *   node scripts/add-admin.js CST2509054@xmu.edu.my yjq 20061016177Jack
 *   node scripts/add-admin.js student1@xmu.edu.my student1 123456 student
 *   node scripts/add-admin.js admin2 密码123
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { query, pool } = require('../database');

const ALLOWED_ROLES = ['student', 'merchant', 'admin'];

async function addOrUpdateUser(email, username, password, role = 'admin') {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`角色必须是 ${ALLOWED_ROLES.join(' / ')} 之一`);
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const byEmail = email ? await query('SELECT id, username, email FROM users WHERE email = ?', [email]) : [];
  const byUsername = await query('SELECT id, username, email FROM users WHERE username = ?', [username]);

  if (byEmail.length > 0) {
    await query('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [passwordHash, role, byEmail[0].id]);
    console.log(`✅ 已更新账号（按邮箱）：${byEmail[0].email} / ${byEmail[0].username}，密码已重置，角色：${role}`);
    return;
  }
  if (byUsername.length > 0) {
    await query('UPDATE users SET password_hash = ?, role = ?, email = ? WHERE id = ?', [
      passwordHash,
      role,
      email || null,
      byUsername[0].id,
    ]);
    console.log(`✅ 已更新账号（按用户名）：${byUsername[0].username}，密码已重置，角色：${role}`);
    return;
  }

  const emailVerified = email ? 1 : 0;
  await query(
    'INSERT INTO users (username, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)',
    [username, email || null, passwordHash, role, emailVerified]
  );
  console.log(`✅ 已新建账号：${username}${email ? ' / ' + email : ''}，角色：${role}`);
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);

  if (args.length === 2) {
    const [username, password] = args;
    await addOrUpdateUser(null, username, password, 'admin');
  } else if (args.length === 3) {
    const [email, username, password] = args;
    await addOrUpdateUser(email, username, password, 'admin');
  } else if (args.length === 4) {
    const [email, username, password, role] = args;
    await addOrUpdateUser(email, username, password, role.toLowerCase());
  } else {
    console.log('用法：');
    console.log('  node scripts/add-admin.js <邮箱> <用户名> <密码>           # 管理员');
    console.log('  node scripts/add-admin.js <邮箱> <用户名> <密码> <角色>     # 角色: student / merchant / admin');
    console.log('  node scripts/add-admin.js <用户名> <密码>                   # 管理员（无邮箱）');
    console.log('示例：');
    console.log('  node scripts/add-admin.js CST2509054@xmu.edu.my yjq 20061016177Jack');
    console.log('  node scripts/add-admin.js student1@xmu.edu.my student1 123456 student');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 执行失败:', err.message || err);
    process.exit(1);
  })
  .finally(() => {
    pool.end().catch(() => {});
  });
