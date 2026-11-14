#!/usr/bin/env node
/**
 * devicectl —— 本机 App 预览与自测工具（给 agent 和人共用）
 *
 * 一条命令一个动作，输出是纯文本，agent 读得懂、人也读得懂。
 * 产物（截图 / UI 树 / 日志 / 进程号）全部落在 app/.preview/（已 gitignore）。
 *
 * 用法：在 app/ 下 `node tools/preview/devicectl.mjs <命令>`，或 `npm run preview -- <命令>`
 * 完整说明：`node tools/preview/devicectl.mjs help`；手册：docs/app/test/本机预览与自测.md
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(APP_DIR, '.preview');
const SHOT_DIR = path.join(STATE_DIR, 'shots');
const PKG = 'com.xmumdorm.app';
const SCHEME = 'xmumdorm';
const METRO_PORT = 8081;
const API_PORT = 4040;
const DEFAULT_AVD = process.env.PREVIEW_AVD || 'Pixel_API35';
const PROD_API = 'https://xmumdorm-200-lyzz-production.up.railway.app';
const IS_WIN = process.platform === 'win32';

fs.mkdirSync(SHOT_DIR, { recursive: true });

// ───────────────────────── 基础工具 ─────────────────────────

function sdkRoot() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    (IS_WIN ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk') : path.join(process.env.HOME || '', 'Android', 'Sdk'))
  );
}
function bin(dir, name) {
  const p = path.join(sdkRoot(), dir, IS_WIN ? `${name}.exe` : name);
  return fs.existsSync(p) ? p : name;
}
const ADB = bin('platform-tools', 'adb');
const EMULATOR = bin('emulator', 'emulator');

function die(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  return r;
}
function adbArgs(args) {
  const serial = process.env.ANDROID_SERIAL || readState('serial');
  return serial ? ['-s', serial, ...args] : args;
}
function adb(args, opts = {}) {
  const r = run(ADB, adbArgs(args), opts);
  if (r.status !== 0 && !opts.allowFail) {
    die(`adb ${args.join(' ')} 失败：${(r.stderr || '').toString().trim() || r.status}`);
  }
  return r;
}
function sh(cmd, opts) {
  return adb(['shell', cmd], opts).stdout.toString();
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function readState(key) {
  try {
    return fs.readFileSync(path.join(STATE_DIR, key), 'utf8').trim() || null;
  } catch {
    return null;
  }
}
function writeState(key, value) {
  fs.writeFileSync(path.join(STATE_DIR, key), String(value));
}
/** Metro 在 Windows 上可能只监听 ::1，所以 v4/v6 都试 */
async function portOpen(port) {
  return (await portOpenOn(port, '127.0.0.1')) || (await portOpenOn(port, '::1'));
}
function portOpenOn(port, host) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    s.setTimeout(800);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('timeout', () => (s.destroy(), resolve(false)));
    s.once('error', () => resolve(false));
  });
}
function killTree(pid) {
  if (!pid) return;
  if (IS_WIN) run('taskkill', ['/PID', String(pid), '/T', '/F']);
  else {
    try {
      process.kill(-Number(pid), 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
}
function pidsOnPort(port) {
  if (IS_WIN) {
    const out = run('netstat', ['-ano']).stdout || '';
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((l) => l.trim().split(/\s+/))
          .filter((c) => c[3] === 'LISTENING' && c[1] && c[1].endsWith(`:${port}`))
          .map((c) => c[4]),
      ),
    ];
  }
  return (run('lsof', ['-ti', `tcp:${port}`]).stdout || '').split(/\s+/).filter(Boolean);
}
/** 跑 npx：Windows 上必须经 shell，且传整条命令字符串（避免 Node 的 DEP0190 告警） */
function spawnNpx(args, opts) {
  if (!IS_WIN) return spawn('npx', args, opts);
  const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
  return spawn(`npx ${quoted}`, { ...opts, shell: true });
}

/**
 * Windows 路径长度：RN 原生库的 CMake 会把源文件绝对路径拼进 .o 路径，上限 250 字符；
 * worktree 这种深路径会让 ninja 报 "build.ninja still dirty"。subst / 目录联接都不行
 * （Node 会 realpath 回长路径，Gradle 报 "different roots"）。
 * 所以 Windows 深路径下：把 app/ 源文件镜像到一个**物理短目录**，在那里 npm ci + 构建原生壳。
 * debug 包不内置 JS（运行时从 Metro 取），所以镜像只需与原生依赖一致，改 JS 不用重建。
 */
function buildDir() {
  if (process.env.PREVIEW_BUILD_DIR) return path.resolve(process.env.PREVIEW_BUILD_DIR);
  if (!IS_WIN || APP_DIR.length <= 60) return APP_DIR;
  const hash = crypto.createHash('sha1').update(APP_DIR.toLowerCase()).digest('hex').slice(0, 6);
  return path.join(path.parse(APP_DIR).root, 'xmdb', hash);
}
function fileHash(f) {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
  } catch {
    return null;
  }
}
function syncMirror(dest) {
  fs.mkdirSync(dest, { recursive: true });
  console.log(`… 同步源文件到短路径镜像 ${dest}`);
  const r = run('robocopy', [APP_DIR, dest, '/MIR', '/XD', 'node_modules', 'android', 'ios', '.preview', '.expo', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1']);
  if (r.status >= 8) die(`robocopy 失败（退出码 ${r.status}）：${r.stdout || ''}${r.stderr || ''}`);
  const lock = fileHash(path.join(APP_DIR, 'package-lock.json'));
  const marker = path.join(dest, '.preview-lock-hash');
  const had = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : null;
  if (had !== lock || !fs.existsSync(path.join(dest, 'node_modules', 'expo'))) {
    console.log('… 依赖有变化，在镜像里 npm ci');
    const ci = spawnSync('npm ci --no-audit --no-fund', { cwd: dest, shell: true, stdio: 'inherit' });
    if (ci.status !== 0) die('镜像里 npm ci 失败');
    fs.writeFileSync(marker, lock || '');
  }
}

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
      else flags[k] = true;
    } else rest.push(a);
  }
  return { flags, rest };
}
function onlineDevices() {
  const out = run(ADB, ['devices']).stdout || '';
  return out
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p[1] === 'device')
    .map((p) => p[0]);
}
function requireDevice() {
  const devs = onlineDevices();
  if (devs.length === 0) die('没有在线设备。先运行：devicectl boot');
  const want = process.env.ANDROID_SERIAL || readState('serial');
  if (!want || !devs.includes(want)) writeState('serial', devs[0]);
}
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ───────────────────────── UI 树 ─────────────────────────

function decode(s) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '⏎').replace(/&amp;/g, '&');
}
function dumpUi() {
  // uiautomator 在动画中偶尔返回 "could not get idle state"，重试几次
  for (let i = 0; i < 4; i++) {
    const r = adb(['exec-out', 'uiautomator', 'dump', '/dev/tty'], { allowFail: true });
    const xml = r.stdout.toString();
    const start = xml.indexOf('<?xml');
    const end = xml.lastIndexOf('</hierarchy>');
    if (start >= 0 && end > start) {
      const clean = xml.slice(start, end + '</hierarchy>'.length);
      fs.writeFileSync(path.join(STATE_DIR, 'ui.xml'), clean);
      return parseNodes(clean);
    }
  }
  die('uiautomator dump 失败（页面可能一直在动画，或 App 卡死）。可先 devicectl shot 看画面');
}
function parseNodes(xml) {
  const nodes = [];
  const re = /<node\b([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
    const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(attrs.bounds || '');
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    nodes.push({
      text: attrs.text || '',
      desc: attrs['content-desc'] || '',
      id: (attrs['resource-id'] || '').replace(`${PKG}:id/`, ''),
      cls: (attrs.class || '').split('.').pop(),
      clickable: attrs.clickable === 'true',
      scrollable: attrs.scrollable === 'true',
      checked: attrs.checked === 'true',
      selected: attrs.selected === 'true',
      enabled: attrs.enabled !== 'false',
      focused: attrs.focused === 'true',
      x1,
      y1,
      x2,
      y2,
      cx: Math.round((x1 + x2) / 2),
      cy: Math.round((y1 + y2) / 2),
    });
  }
  return nodes;
}
function label(n) {
  return n.text || n.desc || n.id;
}
function findNode(nodes, { text, id, desc, exact, index = 0 }) {
  const norm = (s) => s.toLowerCase();
  const hit = nodes.filter((n) => {
    if (n.x2 - n.x1 <= 0 || n.y2 - n.y1 <= 0) return false;
    if (id) return n.id === id;
    const q = text ?? desc;
    const hay = desc ? [n.desc] : [n.text, n.desc];
    return hay.some((h) => h && (exact ? h === q : norm(h).includes(norm(q))));
  });
  return hit[index] || null;
}
function screenSize() {
  const m = /(\d+)x(\d+)/.exec(sh('wm size'));
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 1080, h: 2400 };
}

// ───────────────────────── 命令 ─────────────────────────

const commands = {};

commands.help = () => {
  console.log(`devicectl —— 本机 App 预览与自测（Android 模拟器 + Metro）

起步：
  doctor                     检查工具链、设备、Metro、后端是否就绪
  boot [--avd 名] [--headless] [--cold]  启动模拟器并等到开机完成（默认 ${DEFAULT_AVD}）
  build                      编译并安装 debug 原生壳（首次 5–15 分钟；改 app.json/原生依赖后要重跑）
  metro [--api local|prod|<url>] [--clear]  后台启动 Metro（打包服务器）
  up [--api ...]             = boot + reverse + metro + (未安装则 build) + 启动 App
  backend init|db|seed|start|stop|status|reset   本机隔离后端（库 xmumdorm_preview，见手册 §4）
  login                      用测试账号自动登录（仅 --api local）

运行：
  launch [路由]              打开 App；带路由走深链，如 launch /tools/timetable
  restart                    杀进程重开 App（重新拉 JS）
  reverse                    adb reverse 8081/4040（重启模拟器后需要）
  metro stop | metro status  停止 / 查看 Metro

看：
  shot [名字]                截图 → .preview/shots/<名字>.png，打印路径（用 Read 打开）
  ui [--all] [--grep 词]     列出当前页元素：序号 / 文本 / 标签 / testID / 中心坐标
  wait <文本> [--timeout 秒] [--exact]  等某文本出现（默认 20 秒）
  logs [--lines N] [--all]   JS 日志与崩溃；logs clear 清空
  dismiss                    关掉 LogBox 底部黄条（它压在底栏上，会吃掉对底栏的点击）

操作：
  tap <x> <y> | tap <文本> | tap --text 文本 [--exact] [--index n] | tap --id testID | tap --desc 标签
  type <文本>                向当前焦点输入（仅 ASCII）
  key back|home|enter|menu|del ...
  swipe <x1> <y1> <x2> <y2> [ms] | scroll up|down|left|right
  theme dark|light           切换系统深/浅色
  font <倍数>                系统字体缩放（1 / 1.3 / 2）

自测：
  smoke                      冒烟：重启 App → 逐个点底栏截图 → 查红屏/JS 报错；失败退出码 1

环境变量：ANDROID_SERIAL 指定设备；PREVIEW_AVD 默认模拟器；PREVIEW_BUILD_DIR 原生构建目录。`);
};

commands.doctor = async () => {
  const rows = [];
  const ok = (name, good, note) => rows.push(`${good ? '✓' : '✗'} ${name.padEnd(14)} ${note}`);
  ok('node', true, process.version);
  ok('ANDROID_HOME', fs.existsSync(sdkRoot()), sdkRoot());
  ok('adb', fs.existsSync(ADB), ADB);
  ok('emulator', fs.existsSync(EMULATOR), EMULATOR);
  const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
  let javaLine = '未找到';
  try {
    javaLine = (run(javaBin, ['-version']).stderr || '').split('\n')[0].trim();
  } catch {
    /* 未安装 */
  }
  ok('java', javaLine !== '未找到', javaLine);
  const avds = fs.existsSync(EMULATOR) ? (run(EMULATOR, ['-list-avds']).stdout || '').trim().split(/\r?\n/).filter(Boolean) : [];
  ok('AVD', avds.length > 0, avds.join(', ') || '无，需在 Android Studio 建一个');
  ok('node_modules', fs.existsSync(path.join(APP_DIR, 'node_modules', 'expo')), fs.existsSync(path.join(APP_DIR, 'node_modules')) ? '已安装' : '缺失 → 在 app/ 运行 npm ci');
  const bd = buildDir();
  ok('构建目录', true, bd === APP_DIR ? '就地构建' : `短路径镜像 ${bd}${fs.existsSync(path.join(bd, 'android')) ? '（已有原生工程）' : '（尚未构建）'}`);
  const devs = onlineDevices();
  ok('设备', devs.length > 0, devs.join(', ') || '无在线设备 → devicectl boot');
  if (devs.length) {
    requireDevice();
    const installed = sh(`pm list packages ${PKG}`, { allowFail: true }).includes(PKG);
    ok('App 已安装', installed, installed ? PKG : '未安装 → devicectl build');
  }
  const metro = await portOpen(METRO_PORT);
  ok('Metro :8081', metro, metro ? `运行中（api=${readState('api') || '?'}）` : '未运行 → devicectl metro');
  const api = await portOpen(API_PORT);
  ok('后端 :4040', api, api ? '本机后端在跑' : '未运行（--api local 时需要；可用 --api prod 只读浏览）');
  console.log(rows.join('\n'));
};

commands.boot = async (argv) => {
  const { flags } = parseFlags(argv);
  if (onlineDevices().length) {
    requireDevice();
    console.log(`✓ 已有在线设备：${onlineDevices().join(', ')}`);
  } else {
    const avd = flags.avd || DEFAULT_AVD;
    const args = ['-avd', avd, '-no-boot-anim', '-netdelay', 'none', '-netspeed', 'full'];
    if (flags.headless) args.push('-no-window');
    if (flags.cold) args.push('-no-snapshot-load');
    const log = fs.openSync(path.join(STATE_DIR, 'emulator.log'), 'w');
    const child = spawn(EMULATOR, args, { detached: true, stdio: ['ignore', log, log], windowsHide: !!flags.headless });
    child.unref();
    writeState('emulator.pid', child.pid);
    console.log(`… 启动模拟器 ${avd}（pid ${child.pid}），等待开机`);
    const t0 = Date.now();
    let booted = false;
    while (Date.now() - t0 < 240_000 && !booted) {
      await sleep(2000);
      const devs = onlineDevices();
      if (!devs.length) continue;
      writeState('serial', devs[0]);
      booted = sh('getprop sys.boot_completed', { allowFail: true }).trim() === '1';
    }
    if (!booted) die('模拟器 4 分钟内未开机完成，看 .preview/emulator.log');
  }
  // 关掉系统动画：截图与 UI 树更稳定
  for (const k of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) {
    sh(`settings put global ${k} 0`, { allowFail: true });
  }
  sh('settings put system screen_off_timeout 1800000', { allowFail: true });
  sh('input keyevent 82', { allowFail: true }); // 解锁
  console.log(`✓ 设备就绪：${readState('serial')}（已关闭系统动画）`);
};

commands.reverse = () => {
  requireDevice();
  adb(['reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  adb(['reverse', `tcp:${API_PORT}`, `tcp:${API_PORT}`]);
  console.log(`✓ adb reverse：设备 127.0.0.1:${METRO_PORT} / :${API_PORT} → 本机`);
};

commands.build = (argv) => {
  const { flags } = parseFlags(argv);
  requireDevice();
  const cwd = buildDir();
  if (cwd !== APP_DIR) syncMirror(cwd);
  console.log(`… expo run:android（目录 ${cwd}；日志同时写到 .preview/build.log）`);
  const logFile = path.join(STATE_DIR, 'build.log');
  const log = fs.createWriteStream(logFile);
  // 只有一台设备时 expo 自动选中；多台时 --device <设备名>
  const args = ['expo', 'run:android', '--no-bundler'];
  if (flags.device) args.push('--device', String(flags.device));
  if (flags.variant) args.push('--variant', String(flags.variant));
  return new Promise((resolve) => {
    const child = spawnNpx(args, { cwd, env: { ...process.env, CI: '1' } });
    const tee = (d) => (process.stdout.write(d), log.write(d));
    child.stdout.on('data', tee);
    child.stderr.on('data', tee);
    child.on('close', (code) => {
      log.end();
      if (code !== 0) die(`构建失败（退出码 ${code}），完整日志：${logFile}`);
      console.log('✓ debug 原生壳已安装。下一步：devicectl metro && devicectl restart');
      resolve();
    });
  });
};

function resolveApi(v) {
  if (!v || v === true || v === 'local') return { name: 'local', url: `http://127.0.0.1:${API_PORT}` };
  if (v === 'prod') return { name: 'prod', url: PROD_API };
  return { name: 'custom', url: v };
}
function stopMetro() {
  killTree(readState('metro.pid'));
  for (const pid of pidsOnPort(METRO_PORT)) killTree(pid);
  fs.rmSync(path.join(STATE_DIR, 'metro.pid'), { force: true });
}

commands.metro = async (argv) => {
  const { flags, rest } = parseFlags(argv);
  if (rest[0] === 'stop') {
    stopMetro();
    console.log('✓ Metro 已停止');
    return;
  }
  if (rest[0] === 'status') {
    console.log((await portOpen(METRO_PORT)) ? `✓ Metro 运行中（api=${readState('api') || '?'}）` : '✗ Metro 未运行');
    return;
  }
  const api = resolveApi(flags.api);
  if (await portOpen(METRO_PORT)) {
    if (readState('api') === api.url && !flags.clear) {
      console.log(`✓ Metro 已在运行（api=${api.url}）`);
      return;
    }
    console.log('… Metro 在跑但 api 不同 / 要求清缓存，重启');
    stopMetro();
    await sleep(1500);
  }
  const log = fs.openSync(path.join(STATE_DIR, 'metro.log'), 'w');
  const args = ['expo', 'start', '--port', String(METRO_PORT)];
  if (flags.clear) args.push('--clear');
  const child = spawnNpx(args, {
    cwd: APP_DIR,
    detached: !IS_WIN,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, CI: '1', EXPO_PUBLIC_API_BASE_URL: api.url, BROWSER: 'none' },
  });
  child.unref();
  writeState('metro.pid', child.pid);
  writeState('api', api.url);
  const t0 = Date.now();
  while (Date.now() - t0 < 90_000) {
    await sleep(1000);
    if (await portOpen(METRO_PORT)) {
      console.log(`✓ Metro 已启动（api=${api.url}，日志 .preview/metro.log）`);
      if (api.name === 'prod') console.log('⚠ 连的是生产后端：只浏览，不发帖 / 不下单 / 不改资料 / 不用真实账号登录');
      return;
    }
  }
  die('Metro 90 秒内没起来，看 .preview/metro.log');
};

/** 预览后端（隔离库）：转发给仓库根的 scripts/preview-backend.js */
commands.backend = (argv) => {
  const r = spawnSync(process.execPath, [path.join(APP_DIR, '..', 'scripts', 'preview-backend.js'), ...argv], { cwd: path.join(APP_DIR, '..'), stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/** 用 app/.preview/test-account.json 的测试账号走登录页（只用于 --api local） */
commands.login = async () => {
  requireDevice();
  const file = path.join(STATE_DIR, 'test-account.json');
  if (!fs.existsSync(file)) {
    die(
      liveData()
        ? `没有测试账号。线上数据下请由所有者注册一个专用测试账号，把 {"email":"…","password":"…"} 写进 ${file}（已 gitignore）。⛔ 不要用任何人的真实账号`
        : '没有测试账号。先运行：devicectl backend seed',
    );
  }
  const acct = JSON.parse(fs.readFileSync(file, 'utf8'));
  let nodes = dumpUi();
  if (!nodes.some((n) => /^(登录|Sign in)$/i.test(n.text))) {
    await commands.launch(['/login']);
    nodes = dumpUi();
  }
  const fields = nodes.filter((n) => n.cls === 'EditText');
  if (fields.length < 2) die('登录页上没找到两个输入框，用 devicectl ui 看看');
  sh(`input tap ${fields[0].cx} ${fields[0].cy}`);
  commands.type([acct.email]);
  sh(`input tap ${fields[1].cx} ${fields[1].cy}`);
  commands.type([acct.password]);
  sh('input keyevent 111');
  await sleep(400);
  await commands.tap(['--text', /[一-龥]/.test(nodes.map(label).join('')) ? '登录' : 'Sign in', '--exact']);
  await sleep(2500);
  const still = dumpUi().some((n) => /^(登录|Sign in)$/i.test(n.text));
  if (still) die('点了登录仍停在登录页：看 devicectl shot / devicectl logs / app/.preview/backend.log');
  console.log(`✓ 已用测试账号 ${acct.email} 登录`);
};

commands.launch = async (argv) => {
  requireDevice();
  const route = argv[0];
  if (route) {
    const url = `${SCHEME}://${route.replace(/^\//, '')}`;
    sh(`am start -W -a android.intent.action.VIEW -d '${url}' ${PKG}`);
    console.log(`✓ 深链打开 ${url}`);
  } else {
    sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`, { allowFail: true });
    console.log('✓ App 已启动');
  }
  await sleep(1500);
};

commands.restart = async () => {
  requireDevice();
  sh(`am force-stop ${PKG}`);
  await commands.launch([]);
};

commands.up = async (argv) => {
  await commands.boot(argv);
  commands.reverse();
  await commands.metro(argv);
  const installed = sh(`pm list packages ${PKG}`, { allowFail: true }).includes(PKG);
  if (!installed) await commands.build([]);
  await commands.restart();
  console.log('✓ 就绪。下一步：devicectl wait <文字> / devicectl shot');
};

commands.shot = (argv) => {
  requireDevice();
  const name = (argv[0] || `shot-${stamp()}`).replace(/[^\w\-.\u4e00-\u9fa5]/g, '_');
  const file = path.join(SHOT_DIR, name.endsWith('.png') ? name : `${name}.png`);
  const r = adb(['exec-out', 'screencap', '-p'], { binary: true });
  fs.writeFileSync(file, r.stdout);
  console.log(file);
};

commands.ui = (argv) => {
  requireDevice();
  const { flags } = parseFlags(argv);
  const nodes = dumpUi();
  const rows = nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => flags.all || n.clickable || n.scrollable || n.text || n.desc)
    .filter(({ n }) => !flags.grep || label(n).toLowerCase().includes(String(flags.grep).toLowerCase()));
  const focus = sh('dumpsys window | grep -E "mCurrentFocus"', { allowFail: true }).trim();
  console.log(`# ${focus || '当前窗口未知'}  （共 ${nodes.length} 节点，列出 ${rows.length}）`);
  for (const { n, i } of rows) {
    const f = [n.clickable && 'tap', n.scrollable && 'scroll', n.selected && 'selected', n.checked && 'checked', !n.enabled && 'disabled', n.focused && 'focused'].filter(Boolean).join(',');
    const parts = [];
    if (n.text) parts.push(`"${n.text}"`);
    if (n.desc && n.desc !== n.text) parts.push(`desc="${n.desc}"`);
    if (n.id) parts.push(`id=${n.id}`);
    console.log(`[${i}] ${n.cls} ${parts.join(' ')} @(${n.cx},${n.cy})${f ? ` {${f}}` : ''}`);
  }
};

commands.tap = async (argv) => {
  requireDevice();
  const { flags, rest } = parseFlags(argv);
  let x;
  let y;
  let what;
  if (rest.length === 2 && rest.every((v) => /^\d+$/.test(v)) && !flags.text && !flags.id && !flags.desc) {
    [x, y] = rest.map(Number);
    what = `(${x},${y})`;
    if (liveData()) dumpUi(); // 写守卫要知道落点上是什么
  } else {
    const q = { text: flags.text ?? (rest.length ? rest.join(' ') : undefined), id: flags.id, desc: flags.desc, exact: !!flags.exact, index: Number(flags.index || 0) };
    const n = findNode(dumpUi(), q);
    if (!n) die(`屏幕上找不到 ${JSON.stringify(q)}。用 devicectl ui 看看有什么`);
    x = n.cx;
    y = n.cy;
    what = `"${label(n)}" @(${x},${y})`;
  }
  const blocked = writeGuard(x, y, flags);
  if (blocked) die(blocked);
  sh(`input tap ${x} ${y}`);
  console.log(`✓ tap ${what}`);
  await sleep(Number(flags.wait || 700));
};

/** 当前数据是不是线上的：Metro 连生产 API，或本机后端以 --prod-db 启动 */
function liveData() {
  const api = readState('api') || '';
  if (api.startsWith(PROD_API)) return '生产 API';
  if (api.includes(`127.0.0.1:${API_PORT}`) && readState('backend.mode') !== 'isolated') return '本机后端（连生产数据库）';
  return null;
}
const WRITE_WORDS = /^(发布|发送|提交|确认|确定|下单|支付|付款|删除|保存|上传|接单|完成|报名|举报|注销|退出登录|Post|Publish|Send|Submit|Confirm|OK|Place order|Pay|Delete|Save|Upload|Take|Done|Report|Sign up|Register|Log out|Sign out|Delete account)$/i;
/** 线上数据下，点到"写"类按钮就拦下（按坐标点也会反查落点上的控件） */
function writeGuard(x, y, flags) {
  const live = liveData();
  if (!live || flags['allow-write']) return null;
  const nodes = parseNodes(fs.readFileSync(path.join(STATE_DIR, 'ui.xml'), 'utf8'));
  const tabs = new Set(bottomTabs(nodes, screenSize().h)); // 底栏"发布"格只打开发布中心，不算写
  const under = nodes.filter((n) => n.x1 <= x && x <= n.x2 && n.y1 <= y && y <= n.y2);
  if (under.some((n) => tabs.has(n))) return null;
  const hit = under.find((n) => WRITE_WORDS.test((n.text || n.desc || '').trim()));
  if (!hit) return null;
  return `拦下：数据是线上的（${live}），「${label(hit)}」会写入线上。确实要写就加 --allow-write（并在汇报里写明写了什么）`;
}

commands.type = (argv) => {
  requireDevice();
  const text = argv.join(' ');
  if (/[^\x20-\x7e]/.test(text)) die('adb input 只支持 ASCII。中文输入见 docs/app/test/本机预览与自测.md「已知限制」');
  const esc = text.replace(/([\\'"`$&|;<>()*?!#~{}[\]])/g, '\\$1').replace(/ /g, '%s');
  sh(`input text ${esc}`);
  console.log(`✓ type "${text}"`);
};

const KEYS = { back: 4, home: 3, enter: 66, menu: 82, del: 67, tab: 61, up: 19, down: 20, left: 21, right: 22, escape: 111 };
commands.key = (argv) => {
  requireDevice();
  for (const k of argv) sh(`input keyevent ${KEYS[k] ?? k}`);
  console.log(`✓ key ${argv.join(' ')}`);
};

commands.swipe = async (argv) => {
  requireDevice();
  const [x1, y1, x2, y2, ms = 300] = argv.map(Number);
  sh(`input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
  console.log(`✓ swipe (${x1},${y1})→(${x2},${y2})`);
  await sleep(600);
};
commands.scroll = async (argv) => {
  requireDevice();
  const { w, h } = screenSize();
  const dir = argv[0] || 'down';
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  const dy = Math.round(h * 0.3);
  const dx = Math.round(w * 0.35);
  const map = {
    down: [cx, cy + dy, cx, cy - dy],
    up: [cx, cy - dy, cx, cy + dy],
    left: [cx + dx, cy, cx - dx, cy],
    right: [cx - dx, cy, cx + dx, cy],
  };
  if (!map[dir]) die('scroll up|down|left|right');
  await commands.swipe([...map[dir], 350]);
};

commands.wait = async (argv) => {
  requireDevice();
  const { flags, rest } = parseFlags(argv);
  const text = rest.join(' ');
  const timeout = Number(flags.timeout || 20) * 1000;
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const n = findNode(dumpUi(), { text, exact: !!flags.exact });
    if (n) {
      console.log(`✓ 出现 "${label(n)}" @(${n.cx},${n.cy})，用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return;
    }
    await sleep(800);
  }
  die(`${timeout / 1000}s 内没等到 "${text}"`);
};

commands.logs = (argv) => {
  requireDevice();
  const { flags, rest } = parseFlags(argv);
  if (rest[0] === 'clear') {
    adb(['logcat', '-c']);
    console.log('✓ 日志已清空');
    return;
  }
  const lines = Number(flags.lines || 80);
  const filter = flags.all ? [] : ['ReactNativeJS:V', 'ReactNative:W', 'AndroidRuntime:E', 'Expo:V', '*:F', '*:S'];
  const out = adb(['logcat', '-d', '-v', 'time', ...filter]).stdout.toString().split(/\r?\n/).filter(Boolean);
  console.log(out.slice(-lines).join('\n') || '（无日志）');
};

commands.theme = (argv) => {
  requireDevice();
  sh(`cmd uimode night ${argv[0] === 'dark' ? 'yes' : 'no'}`);
  console.log(`✓ 系统主题 → ${argv[0] === 'dark' ? '深色' : '浅色'}`);
};

commands.font = (argv) => {
  requireDevice();
  sh(`settings put system font_scale ${Number(argv[0] || 1)}`);
  console.log(`✓ 字体缩放 → ${argv[0] || 1}`);
};

/** 底栏格位：屏幕底部 12% 内、可点、有文本或无障碍标签（不认原生内部 resource-id），按名字去重 */
function tabName(n) {
  return n.desc;
}
/** 原生底栏：每格是一个带 content-desc 的 FrameLayout；选中格 clickable=false、selected=true */
function bottomTabs(nodes, h) {
  const seen = new Set();
  const cand = nodes.filter((n) => {
    const name = tabName(n);
    if (!(n.clickable || n.selected) || n.cy < h * 0.88 || !name || /debugger|warning/i.test(name) || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  // 底栏 = 同一水平线上 ≥3 个格位；页面里恰好落在底部的按钮不算
  const rows = new Map();
  for (const n of cand) {
    const key = Math.round(n.cy / 16);
    rows.set(key, [...(rows.get(key) || []), n]);
  }
  const best = [...rows.values()].sort((a, b) => b.length - a.length)[0] || [];
  return best.length >= 3 ? best.sort((a, b) => a.cx - b.cx) : [];
}
/**
 * 关掉 LogBox 底部黄条：它压在底栏上方（实测 y≈2209 vs 底栏 y≈2232），不关会把点击吃掉。
 * 返回告警文本（没有则 null）。
 */
function dismissLogBox() {
  const nodes = dumpUi();
  const i = nodes.findIndex((n) => /Open debugger to view (warnings|errors)/i.test(n.desc));
  if (i < 0) return null;
  const banner = nodes[i];
  const close = nodes.slice(i + 1).find((n) => n.clickable && !label(n) && Math.abs(n.cy - banner.cy) < 40 && n.cx > banner.x2 - 200);
  if (close) sh(`input tap ${close.cx} ${close.cy}`);
  return banner.desc;
}
commands.dismiss = () => {
  requireDevice();
  const w = dismissLogBox();
  console.log(w ? `✓ 已关闭 LogBox 黄条：${w}` : 'ℹ 没有 LogBox 黄条');
};
function appInForeground() {
  return sh('dumpsys window | grep -E "mCurrentFocus|mFocusedApp"', { allowFail: true }).includes(PKG);
}

/** RN 红屏 / LogBox 的典型文本 */
function redScreen(nodes) {
  const bad = nodes.find(
    (n) =>
      /^(Render Error|Uncaught Error|TypeError|ReferenceError|SyntaxError|Unable to load script|Invariant Violation|Unable to resolve module)/i.test(n.text) ||
      /Console Error|Log ?Box/i.test(n.text),
  );
  return bad ? bad.text : null;
}

commands.smoke = async () => {
  requireDevice();
  const failures = [];
  adb(['logcat', '-c'], { allowFail: true });
  await commands.restart();
  const { h } = screenSize();
  let state = null;
  for (let i = 0; i < 45 && !state; i++) {
    const nodes = dumpUi();
    const err = redScreen(nodes);
    if (err) {
      failures.push(`启动红屏：${err}`);
      break;
    }
    if (bottomTabs(nodes, h).length >= 3) state = 'tabs';
    else if (nodes.some((n) => /^(登录|Log in|Sign in)$/i.test(n.text))) state = 'login';
    else await sleep(1500);
  }
  if (!state && !failures.length) failures.push('约 70 秒内既没看到底栏也没看到登录页（白屏或一直在加载）');
  if (state === 'login') {
    console.log('ℹ 停在登录页（未登录），只检查登录页');
    commands.shot(['smoke-0-login']);
  }
  if (state === 'tabs') {
    await sleep(1500);
    const lb = dismissLogBox();
    if (lb) {
      console.log(`⚠ 启动即有 LogBox 告警：${lb}（已关闭黄条；详情 devicectl logs）`);
      await sleep(500);
    }
    const tabs = bottomTabs(dumpUi(), h);
    console.log(`ℹ 底栏：${tabs.map(tabName).join(' / ')}`);
    let k = 0;
    for (const t of tabs) {
      const name = tabName(t);
      sh(`input tap ${t.cx} ${t.cy}`);
      await sleep(2000);
      if (!appInForeground()) {
        failures.push(`点底栏「${name}」后 App 不在前台（崩溃或跳出）`);
        await commands.restart();
        await sleep(3000);
        continue;
      }
      dismissLogBox();
      const nodes = dumpUi();
      const err = redScreen(nodes);
      if (err) failures.push(`底栏「${name}」红屏：${err}`);
      commands.shot([`smoke-${++k}-${name}`]);
      const onLogin = nodes.some((n) => /^(登录|Sign in|Log in)$/i.test(n.text)) && bottomTabs(nodes, h).length < 3;
      if (onLogin) {
        console.log(`ℹ 底栏「${name}」→ 需登录，跳到了登录页`);
        await commands.restart();
        await sleep(3000);
        dismissLogBox();
        continue;
      }
      // 动作格（发布）会推出发布中心、底栏消失 → 返回一次回到 Tab
      if (bottomTabs(nodes, h).length < 3) {
        sh('input keyevent 4');
        await sleep(800);
        if (!appInForeground()) await commands.restart();
      }
    }
  }
  const crash = adb(['logcat', '-d', 'AndroidRuntime:E', 'ReactNativeJS:E', '*:S'], { allowFail: true })
    .stdout.toString()
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('-----'));
  if (crash.length) failures.push(`日志中有 ${crash.length} 行错误（最后 10 行）：\n    ${crash.slice(-10).join('\n    ')}`);
  if (failures.length) {
    console.log(`\n✗ 冒烟失败：\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('\n✓ 冒烟通过（截图在 .preview/shots/smoke-*.png）');
};

// ───────────────────────── 入口 ─────────────────────────

const [cmd = 'help', ...argv] = process.argv.slice(2);
const fn = commands[cmd];
if (!fn) die(`未知命令：${cmd}。运行 devicectl help`);
Promise.resolve(fn(argv)).catch((e) => die(e?.stack || String(e)));
