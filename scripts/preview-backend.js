#!/usr/bin/env node
/**
 * preview-backend —— App 本机预览用的**隔离**后端（本地 MySQL 独立库 + 本机 :4040）
 *
 * 为什么不直接 `node server.js`：根目录 `.env` 的 MYSQL_URL 指向云上库，且配了对象存储与发信。
 * 本脚本只认 `.env.preview`（已被 .gitignore 的 `.env.*` 覆盖），并在启动子进程时把
 * 云库连接串 / 对象存储 / 发信 / Moodle 账号 / GitHub token 全部**强制置空**。
 *
 *   node scripts/preview-backend.js init --from <某个 .env>   # 只抄 DB_HOST/PORT/USER/PASSWORD
 *   node scripts/preview-backend.js db                         # 建库 + 跑 init-db 与全部迁移（幂等）
 *   node scripts/preview-backend.js seed                       # 建测试账号，写到 app/.preview/test-account.json
 *   node scripts/preview-backend.js start | stop | status
 *   node scripts/preview-backend.js start --prod-db [--env <.env>]  # 等价根目录 npm start：连生产库，跑本 worktree 代码
 *   node scripts/preview-backend.js reset                      # 删掉预览库后重建（只动 PREVIEW 库）
 */
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.preview');
const STATE_DIR = path.join(ROOT, 'app', '.preview');
const PORT = 4040;
const DEFAULT_DB = 'xmumdorm_preview';
const COPY_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];
/** 这些变量在预览后端里一律置空：防止连到云库、往真桶传图、给真人发信 */
const FORCE_BLANK = [
  'DATABASE_URL', 'MYSQL_URL', 'RAILWAY_MYSQL_URL',
  'OBJECT_STORAGE_ENDPOINT', 'OBJECT_STORAGE_REGION', 'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ACCESS_KEY_ID', 'OBJECT_STORAGE_SECRET_ACCESS_KEY',
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'RESEND_API_KEY',
  'MOODLE_ACCOUNT', 'MOODLE_PASSWORD', 'GITHUB_MATERIALS_TOKEN',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'ENABLE_BACKGROUND_JOBS',
];

fs.mkdirSync(STATE_DIR, { recursive: true });

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
function loadPreviewEnv() {
  if (!fs.existsSync(ENV_FILE)) die(`缺少 ${ENV_FILE}。先运行：node scripts/preview-backend.js init --from <本地 .env 路径>`);
  const env = parseEnv(fs.readFileSync(ENV_FILE, 'utf8'));
  if (!env.DB_NAME || !/preview/i.test(env.DB_NAME)) die('.env.preview 的 DB_NAME 必须含 "preview"（防止误连开发库/线上库）');
  if (env.DB_HOST && !/^(localhost|127\.0\.0\.1|::1)$/i.test(env.DB_HOST)) die(`.env.preview 的 DB_HOST=${env.DB_HOST} 不是本机，拒绝运行`);
  return env;
}
function childEnv() {
  const env = { ...process.env, ...loadPreviewEnv() };
  for (const k of FORCE_BLANK) env[k] = '';
  return env;
}
function mysqlConn(env, withDb = true) {
  const mysql = require('mysql2/promise');
  return mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: withDb ? env.DB_NAME : undefined,
    multipleStatements: true,
  });
}
function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.setTimeout(800);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('timeout', () => (s.destroy(), resolve(false)));
    s.once('error', () => resolve(false));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const commands = {};

commands.init = () => {
  const from = flag('from');
  if (!from) die('用法：init --from <含本地 DB_* 的 .env 路径>（只会抄 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD）');
  if (fs.existsSync(ENV_FILE) && !process.argv.includes('--force')) die(`${ENV_FILE} 已存在（要覆盖加 --force）`);
  const src = parseEnv(fs.readFileSync(path.resolve(from), 'utf8'));
  if (src.DB_HOST && !/^(localhost|127\.0\.0\.1|::1)$/i.test(src.DB_HOST)) die(`源文件的 DB_HOST 不是本机（${src.DB_HOST}），拒绝抄`);
  const lines = [
    '# App 本机预览后端（scripts/preview-backend.js 生成；已被 .gitignore 覆盖，勿提交）',
    '# 只含本地库连接；云库 / 对象存储 / 发信在启动时被强制置空',
    ...COPY_KEYS.filter((k) => src[k] != null).map((k) => `${k}=${src[k]}`),
    `DB_NAME=${DEFAULT_DB}`,
    `PORT=${PORT}`,
    'NODE_ENV=development',
    `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`,
    `PUBLIC_ASSET_BASE_URL=http://127.0.0.1:${PORT}`,
    '',
  ];
  fs.writeFileSync(ENV_FILE, lines.join('\n'));
  console.log(`✓ 已写 ${ENV_FILE}（抄了 ${COPY_KEYS.filter((k) => src[k] != null).join(', ')}；JWT_SECRET 为新生成的随机值）`);
};

commands.db = async () => {
  const env = loadPreviewEnv();
  const c = await mysqlConn(env, false);
  await c.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c.end();
  console.log(`✓ 库 ${env.DB_NAME} 就绪，开始迁移（幂等，可重复跑）`);
  const log = path.join(STATE_DIR, 'migrate.log');
  const out = fs.openSync(log, 'w');
  for (const script of ['scripts/run-migrations-all.js', 'scripts/run-incremental-migrations.js']) {
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, env: childEnv(), stdio: ['ignore', out, out] });
    console.log(`${r.status === 0 ? '✓' : '⚠'} ${script} 退出码 ${r.status}`);
  }
  fs.closeSync(out);
  const text = fs.readFileSync(log, 'utf8');
  const fails = text.split(/\r?\n/).filter((l) => /失败|Error:/.test(l));
  console.log(`  日志 ${log}${fails.length ? `；失败行 ${fails.length} 条（grep 失败 查看）` : ''}`);
  const c2 = await mysqlConn(env);
  const [rows] = await c2.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?', [env.DB_NAME]);
  await c2.end();
  console.log(`✓ 现有 ${rows[0].n} 张表`);
};

commands.reset = async () => {
  const env = loadPreviewEnv();
  const c = await mysqlConn(env, false);
  await c.query(`DROP DATABASE IF EXISTS \`${env.DB_NAME}\``);
  await c.end();
  console.log(`✓ 已删除预览库 ${env.DB_NAME}`);
  await commands.db();
};

commands.seed = async () => {
  const env = loadPreviewEnv();
  const bcrypt = require('bcryptjs');
  const file = path.join(STATE_DIR, 'test-account.json');
  let acct = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!acct) {
    acct = {
      email: 'preview.tester@xmu.edu.my',
      username: 'preview_tester',
      studentId: 'PREVIEW0001',
      password: `Pv${crypto.randomBytes(6).toString('hex')}`,
      note: '仅存在于本机预览库 xmumdorm_preview；随 app/.preview 一起被 gitignore',
    };
  }
  const c = await mysqlConn(env);
  const hash = await bcrypt.hash(acct.password, 10);
  const [exist] = await c.query('SELECT id FROM users WHERE email = ?', [acct.email]);
  if (exist.length) {
    await c.query('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [hash, exist[0].id]);
    acct.id = exist[0].id;
  } else {
    const [r] = await c.query(
      'INSERT INTO users (student_id, username, email, password_hash, role, email_verified, nickname) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [acct.studentId, acct.username, acct.email, hash, 'student', 'Preview Tester'],
    );
    acct.id = r.insertId;
  }
  await c.end();
  fs.writeFileSync(file, JSON.stringify(acct, null, 2));
  console.log(`✓ 测试账号就绪（id ${acct.id}），凭据在 ${file}`);
};

/** 主检出（git common dir 的上一级）里的 .env —— 团队日常 `npm start` 用的那份，连生产库 */
function rootEnvPath() {
  const explicit = flag('env') || process.env.PREVIEW_ROOT_ENV;
  if (explicit) return path.resolve(explicit);
  const local = path.join(ROOT, '.env');
  if (fs.existsSync(local)) return local;
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' });
  const common = path.resolve(ROOT, (r.stdout || '').trim());
  return path.join(path.dirname(common), '.env');
}

/**
 * start            隔离模式：.env.preview（本地预览库）
 * start --prod-db  与根目录 `npm start` 等价：读主检出的 .env，**连生产库**；但跑的是本 worktree 的后端代码
 */
commands.start = async () => {
  if (await portOpen(PORT)) return console.log(`✓ :${PORT} 已有服务在跑（mode=${readMode() || '未知'}；要换模式先 stop）`);
  const prodDb = process.argv.includes('--prod-db');
  let env;
  let desc;
  if (prodDb) {
    const envFile = rootEnvPath();
    if (!fs.existsSync(envFile)) die(`找不到 ${envFile}（用 --env <路径> 指定）`);
    env = { ...process.env, ...parseEnv(fs.readFileSync(envFile, 'utf8')), PORT: String(PORT), ENABLE_BACKGROUND_JOBS: '' };
    desc = `⚠ 生产数据库（env 取自 ${envFile}）`;
  } else {
    env = childEnv();
    desc = `隔离库 ${loadPreviewEnv().DB_NAME}`;
  }
  const log = fs.openSync(path.join(STATE_DIR, 'backend.log'), 'w');
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, detached: true, stdio: ['ignore', log, log], windowsHide: true });
  child.unref();
  fs.writeFileSync(path.join(STATE_DIR, 'backend.pid'), String(child.pid));
  fs.writeFileSync(path.join(STATE_DIR, 'backend.mode'), prodDb ? 'prod-db' : 'isolated');
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await portOpen(PORT)) {
      console.log(`✓ 后端已启动 http://127.0.0.1:${PORT}（pid ${child.pid}，${desc}，日志 app/.preview/backend.log）`);
      if (prodDb) console.log('⚠ 这里的任何写操作都会落到线上。devicectl 默认只读，写操作要显式 --allow-write');
      return;
    }
  }
  die('30 秒内没起来，看 app/.preview/backend.log');
};
function readMode() {
  try {
    return fs.readFileSync(path.join(STATE_DIR, 'backend.mode'), 'utf8').trim();
  } catch {
    return null;
  }
}

commands.stop = () => {
  const f = path.join(STATE_DIR, 'backend.pid');
  const pid = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null;
  if (!pid) return console.log('ℹ 没有记录的预览后端进程');
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', pid, '/T', '/F']);
  else try { process.kill(Number(pid)); } catch { /* gone */ }
  fs.rmSync(f, { force: true });
  fs.rmSync(path.join(STATE_DIR, 'backend.mode'), { force: true });
  console.log('✓ 预览后端已停止');
};

commands.status = async () => {
  console.log((await portOpen(PORT)) ? `✓ :${PORT} 在跑（mode=${readMode() || '未知/非本脚本启动'}）` : `✗ :${PORT} 未运行`);
};

const cmd = process.argv[2];
if (!commands[cmd]) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 15).join('\n'));
  process.exit(cmd ? 1 : 0);
}
Promise.resolve(commands[cmd]()).catch((e) => die(e.stack || e.message));
