/**
 * 「不暴露资料库地址」守卫
 *
 * 用户裁定（2026-09-29）：
 *   「不要提供源仓库的地址！所有地方不允许跳转到源仓库的地址。你这是自报家门！」
 *
 * 背景：学习资料本体放在一个**独立仓库**里，该仓库地址一旦出现在
 * 站点界面 / 接口响应 / 公开脚手架文件里，就等于把「隐藏账号 + 资料库」一起交待出去。
 *
 * 这个测试是**扫描器**：只要有人把真实仓库标识写回运行时代码、脚手架或 `.env.example`，
 * 它就会红。只断言「刚改过的那几个文件」挡不住下一次新增页面。
 *
 * 已知的、**有意接受**的残留（不在本守卫范围）：
 *   1. `docs/**` —— 设计/需求文档需要记录真实拓扑，否则后续维护者看不懂。
 *      注意我们的仓库本身是 public，所以文档里的字样仍是公开的（见设计文档 §17.12）。
 *   2. 浏览器 DevTools 里仍能看到 CDN 地址中的 owner/repo —— 这是方案 C 的已接受代价
 *      （不用反代就不可能隐藏）。本守卫只保证「不主动提供」。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** 运行时会被用户看到 / 会被公开的目录 */
const SCAN_DIRS = [
  'frontend/src',
  'frontend-app/src',
  'mobile/src',
  'shared',
  'routes',
  'services',
  'middleware',
  'utils',
  'materials-repo',
];
/** 单文件也要扫（.env.example 已入库，等于公开） */
const SCAN_FILES = ['.env.example'];

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '__tests__']);
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.md', '.json', '.yml', '.yaml', '.example', '.txt']);

/** 禁止出现的真实仓库标识 */
const BANNED = [
  { re: /james898/i, why: '资料库隐藏账号名' },
  { re: /xmum[-_]?opensource/i, why: '资料库仓库名' },
  { re: /yejianqin61/i, why: '站点仓库账号（反向暴露）' },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (EXTENSIONS.has(ext) || entry.name === '.env.example') {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const scannedFiles = [
  ...SCAN_DIRS.flatMap((d) => walk(path.resolve(ROOT, d))),
  ...SCAN_FILES.map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f)),
];

function findLeaks(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    for (const b of BANNED) {
      if (b.re.test(line)) hits.push({ line: i + 1, why: b.why, text: line.trim().slice(0, 120) });
    }
  });
  return hits;
}

describe('资料库地址守卫（不主动暴露源仓库）', () => {
  it('扫描范围非空（守卫不能因为路径写错而空转）', () => {
    expect(scannedFiles.length).toBeGreaterThan(40);
    // 确认 .env.example 真的在扫描范围内（它是最容易漏的一处）
    expect(scannedFiles.some((f) => f.endsWith('.env.example'))).toBe(true);
  });

  it('运行时代码 / 脚手架 / .env.example 里没有真实仓库标识', () => {
    const offenders = [];
    for (const file of scannedFiles) {
      for (const hit of findLeaks(file)) {
        offenders.push(`${path.relative(ROOT, file).split(path.sep).join('/')}:${hit.line}  [${hit.why}]  ${hit.text}`);
      }
    }
    expect(
      offenders.length === 0
        ? ''
        : `\n这些地方写出了真实的资料库/账号标识，等于对外提供源仓库地址：\n` +
            `${offenders.join('\n')}\n\n` +
            `真实值只应存在于服务器 .env 与部署平台环境变量里；\n` +
            `.env.example 请用空值或占位符；文档请用「资料库仓库」这类描述性说法。\n`
    ).toBe('');
  });

  it('守卫能真的抓到违规（阳性对照）', () => {
    const tmp = path.resolve(ROOT, 'utils', '__guard_selfcheck__.js');
    fs.writeFileSync(tmp, "const repo = 'James898-boom/Xmum-opensource';\n", 'utf8');
    try {
      expect(findLeaks(tmp).length).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('不再导出 materialsRepoLabel（那个函数会把 owner/repo 印到界面上）', async () => {
    const constants = await import('../../shared/constants/materials.js');
    expect(constants.materialsRepoLabel).toBeUndefined();
  });
});
