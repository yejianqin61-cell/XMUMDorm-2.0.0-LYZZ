/**
 * 全站联系方式唯一性守卫（2026-09-27 用户裁定）
 *
 * 裁定原文：「加入我们，邮箱联系方式也要删掉。全站只能有 xmumdorm666 这个联系方式的出现」。
 * 范围（同一轮问答确认）：站点页面 + 仓库 README / 公众号模板 / 演示文稿。
 * （App 客户端旧代码 frontend-app / mobile 已全盘废弃并移出工作区，
 *  归档 tag app-legacy-v1，不再作为扫描范围。）
 *
 * 这个测试是一个**扫描器**，不是逐条断言已知文件 —— 只要有人在任何面向用户的源码里
 * 重新写进一个外部邮箱、电话或历史微信号，它就会红。这才是「全站只能有一个联系方式」
 * 能被长期锁住的写法；只断言「刚才改过的那几个文件」挡不住下一次新增页面。
 *
 * 允许保留的邮箱：学校域名（注册/登录本来就用 @xmu.edu.my）与测试占位域名。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** 面向用户的源码根目录（相对仓库根） */
const SCAN_DIRS = ['frontend/src', 'public', 'marketing/wechat'];
/** 单文件也要扫 */
const SCAN_FILES = ['README.md', 'README_CN.md', 'README_EN.md'];

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', 'temp_retroui', '__tests__']);
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.md', '.json', '.webmanifest']);

const OFFICIAL_WECHAT = 'xmumdorm666';

/** 明确禁止出现的历史联系方式 */
const BANNED_LITERALS = [
  { value: 'yejianqin61@gmail.com', why: '个人邮箱' },
  { value: '01115078663', why: '个人电话' },
  { value: 'YEJIANQIN_git', why: '历史微信号' },
  { value: 'mailto:', why: '邮箱链接' },
];

/** 邮箱扫描：学校域名与占位域名不算外部联系方式 */
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ALLOWED_EMAIL = /(@xmu\.edu\.my$|@example\.com$|@test\.com$|@company\.com$|@localhost$|noreply@)/i;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const scanned = [
  ...SCAN_DIRS.flatMap((dir) => walk(path.resolve(ROOT, dir))),
  ...SCAN_FILES.map((file) => path.resolve(ROOT, file)).filter((file) => fs.existsSync(file)),
];

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

describe('全站只能出现 xmumdorm666 这一个联系方式', () => {
  it('扫描范围非空（防止路径写错导致测试空转）', () => {
    expect(scanned.length).toBeGreaterThan(100);
  });

  it('没有任何文件写死禁用邮箱 / 电话 / 历史微信号 / mailto 链接', () => {
    const hits = [];
    for (const file of scanned) {
      const content = fs.readFileSync(file, 'utf8');
      for (const { value, why } of BANNED_LITERALS) {
        if (content.includes(value)) hits.push(`${rel(file)} → ${why}（${value}）`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('除了学校邮箱与占位邮箱，没有别的邮箱地址', () => {
    const hits = [];
    for (const file of scanned) {
      const content = fs.readFileSync(file, 'utf8');
      const found = content.match(EMAIL_PATTERN) || [];
      for (const email of found) {
        if (!ALLOWED_EMAIL.test(email)) hits.push(`${rel(file)} → ${email}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('官方微信号出现在所有对外的联系落点', () => {
    const mustContain = [
      'frontend/src/pages/JoinUs.jsx',
      'frontend/src/pages/PrivacyPolicy.jsx',
      'frontend/src/pages/TermsOfService.jsx',
      'public/privacy-policy.html',
    ];
    for (const file of mustContain) {
      const content = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
      expect(content).toContain(OFFICIAL_WECHAT);
    }
  });
});
