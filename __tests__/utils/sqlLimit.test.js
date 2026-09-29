/**
 * `LIMIT ?` / `OFFSET ?` 守卫 + `utils/sqlLimit.js` 单测
 *
 * 背景（真实线上事故，2026-09-29）：
 *   `database.js` 的 `query()` 用 mysql2 `pool.execute()`（**二进制预处理协议**）。
 *   在 Railway 托管的 MySQL 上，把 JS number 绑到 LIMIT 占位符会抛
 *   `ER_WRONG_ARGUMENTS (1210) Incorrect arguments to mysqld_stmt_execute`，整条查询 500。
 *
 *   学习资料模块（M10）把 `LIMIT ?` 写进了 3 处，线上 `GET /api/materials/courses`
 *   与 `GET /api/materials/me/uploads` 直接 500 —— 而本地 31 个路由用例全绿，
 *   因为那些用例 mock 掉了 `query()`，**SQL 从未真正执行过**。
 *   这正是需要一个「不依赖 DB、也不依赖刚改过哪些文件」的静态守卫的原因。
 *
 * 这个测试是一个**扫描器**：只要有人再写回 `LIMIT ?`，它就会红，
 * 并告诉你改用 `utils/sqlLimit.js` 的 `inlineLimit()` / `inlineOffset()`。
 */
const fs = require('fs');
const path = require('path');

const { inlineLimit, inlineOffset, toBoundedInt } = require('../../utils/sqlLimit');

const ROOT = path.resolve(__dirname, '..', '..');

/** 会经过 database.js `query()`（即二进制预处理）的后端源码 */
const SCAN_DIRS = ['routes', 'services', 'middleware', 'utils', 'scripts'];
const SCAN_FILES = ['database.js'];

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
const EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

/** 显式逃生口：确实走**文本协议**（自己的 connection.query）的地方可逐行豁免 */
const OPT_OUT = 'sql-limit-placeholder-ok';

/**
 * 去掉注释后再扫。
 * 必要性：`routes/canteen.js` 与本仓库多处**注释里**就写着 `LIMIT ?` 来解释这个坑，
 * 不剥注释会把它自己判成违规。
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // 块注释
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // 行注释（避开 http://）
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const scannedFiles = [
  ...SCAN_DIRS.flatMap((d) => walk(path.resolve(ROOT, d))),
  ...SCAN_FILES.map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f)),
];

/** 找出文件里所有「被内联写过占位符」的 LIMIT/OFFSET */
function findLimitPlaceholders(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = stripComments(raw).split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    if (line.includes(OPT_OUT)) return;
    if (/\b(LIMIT|OFFSET)\s*\?/i.test(line)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  });
  return hits;
}

describe('LIMIT / OFFSET 占位符守卫（二进制预处理下会 500）', () => {
  it('扫描范围非空（守卫本身不能因为路径写错而空转）', () => {
    expect(scannedFiles.length).toBeGreaterThan(50);
  });

  it('后端源码里不存在 `LIMIT ?` / `OFFSET ?`', () => {
    const offenders = [];
    for (const file of scannedFiles) {
      for (const hit of findLimitPlaceholders(file)) {
        offenders.push(`${path.relative(ROOT, file).split(path.sep).join('/')}:${hit.line}  ${hit.text}`);
      }
    }
    expect(
      offenders.length === 0
        ? ''
        : `\n这些地方用了 LIMIT/OFFSET 占位符，在托管 MySQL + mysql2 execute() 下会抛 ` +
            `ER_WRONG_ARGUMENTS(1210) 使整个请求 500。\n` +
            `请改成内联整数：LIMIT \${inlineLimit(n, { max })} / OFFSET \${inlineOffset(n)}` +
            `（见 utils/sqlLimit.js）。\n` +
            `若确实走文本协议，在该行加 ${OPT_OUT} 豁免。\n\n${offenders.join('\n')}\n`
    ).toBe('');
  });

  it('守卫能真的抓到违规（给自己做一次阳性对照）', () => {
    const tmpName = path.join(ROOT, 'utils', '__guard_selfcheck__.js');
    fs.writeFileSync(tmpName, 'const sql = `SELECT 1 FROM t LIMIT ?`;\n', 'utf8');
    try {
      const hits = findLimitPlaceholders(tmpName);
      expect(hits).toHaveLength(1);
    } finally {
      fs.unlinkSync(tmpName);
    }
  });

  it('注释里的 `LIMIT ?` 不算违规（canteen.js 的说明性注释）', () => {
    const tmpName = path.join(ROOT, 'utils', '__guard_selfcheck__.js');
    fs.writeFileSync(tmpName, '// 不能用 LIMIT ?，原因见 utils/sqlLimit.js\nconst a = 1;\n', 'utf8');
    try {
      expect(findLimitPlaceholders(tmpName)).toHaveLength(0);
    } finally {
      fs.unlinkSync(tmpName);
    }
  });
});

describe('inlineLimit', () => {
  it('正常整数原样返回', () => {
    expect(inlineLimit(20)).toBe(20);
    expect(inlineLimit(1)).toBe(1);
    expect(inlineLimit(100)).toBe(100);
  });

  it('数字字符串也能用（query string 常见）', () => {
    expect(inlineLimit('50')).toBe(50);
  });

  it('非法值回退到 fallback', () => {
    expect(inlineLimit(undefined)).toBe(20);
    expect(inlineLimit(null)).toBe(20);
    expect(inlineLimit('')).toBe(20);
    expect(inlineLimit('   ')).toBe(20);
    expect(inlineLimit('abc')).toBe(20);
    expect(inlineLimit(NaN)).toBe(20);
    expect(inlineLimit({})).toBe(20);
  });

  it('空值按「没给」处理，不当成 0（Number(null)/Number("") 都是 0 的坑）', () => {
    expect(inlineLimit('', { fallback: 200, max: 500 })).toBe(200);
    expect(inlineLimit(null, { fallback: 200, max: 500 })).toBe(200);
    // 显式给 0 才按越界夹紧
    expect(inlineLimit(0, { fallback: 200, max: 500 })).toBe(1);
  });

  it('越界被夹紧（不会把巨大 limit 送进 SQL）', () => {
    expect(inlineLimit(0)).toBe(1);
    expect(inlineLimit(-5)).toBe(1);
    expect(inlineLimit(1e9)).toBe(100);
    expect(inlineLimit(1e9, { max: 500 })).toBe(500);
  });

  it('小数被截断为整数', () => {
    expect(inlineLimit(3.9)).toBe(3);
  });

  it('返回值一定只有十进制数字（可安全内联）', () => {
    for (const v of [undefined, 'abc', -1, 3.9, 1e9, '7', Infinity, -Infinity]) {
      expect(String(inlineLimit(v))).toMatch(/^\d+$/);
    }
  });
});

describe('inlineOffset', () => {
  it('0 与正整数原样返回', () => {
    expect(inlineOffset(0)).toBe(0);
    expect(inlineOffset(40)).toBe(40);
  });

  it('负数被夹到 0，非法值回退 0', () => {
    expect(inlineOffset(-10)).toBe(0);
    expect(inlineOffset('abc')).toBe(0);
    expect(inlineOffset(undefined)).toBe(0);
    expect(inlineOffset('')).toBe(0);
    expect(inlineOffset(null)).toBe(0);
  });

  it('返回值一定只有十进制数字', () => {
    for (const v of [undefined, -10, 3.9, 1e9, 'abc']) {
      expect(String(inlineOffset(v))).toMatch(/^\d+$/);
    }
  });
});

describe('toBoundedInt', () => {
  it('按 min/max 夹紧', () => {
    expect(toBoundedInt(5, { fallback: 0, min: 1, max: 10 })).toBe(5);
    expect(toBoundedInt(0, { fallback: 0, min: 1, max: 10 })).toBe(1);
    expect(toBoundedInt(99, { fallback: 0, min: 1, max: 10 })).toBe(10);
  });

  it('Infinity 视为非法，取 fallback', () => {
    expect(toBoundedInt(Infinity, { fallback: 7, min: 1, max: 10 })).toBe(7);
  });
});
