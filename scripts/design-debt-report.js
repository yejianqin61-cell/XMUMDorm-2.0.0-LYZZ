#!/usr/bin/env node
/**
 * design-debt-report — App 设计债测量器
 *
 * 为什么存在：
 *   旧 App v1 的失败不是技术选型问题，而是**约束缺失**——实测 1437 处硬编码色值、
 *   645 处 fontSize 字面量、自有 UI 组件 0 次引用、暗色 API 0 次引用。
 *   新《App 设计宪法》的每一条硬约束都应当**可被脚本验证**，本脚本就是那把尺子。
 *
 * 用法：
 *   node scripts/design-debt-report.js --path <目录> [--path <目录> ...]
 *   node scripts/design-debt-report.js --path <目录> --json      # 机器可读
 *   node scripts/design-debt-report.js --path <目录> --top 10    # 色值最集中的文件
 *   node scripts/design-debt-report.js --path <目录> --fail-on-zero   # 有违规则退出码 1
 *
 * 基线复核（应精确复现 files=139 / hex=1437 / fontSize=645 / uiRefs=0）：
 *   git archive --format=tar -o "$env:TEMP\v1.tar" app-legacy-v1 mobile
 *   tar -xf "$env:TEMP\v1.tar" -C "$env:TEMP"
 *   node scripts/design-debt-report.js --path "$env:TEMP\mobile\src" --path "$env:TEMP\mobile\app"
 *
 * 口径说明：只统计生产代码目录，**不统计 __tests__**。v1 的规范口径是
 *   `mobile/src`（120 个代码文件）+ `mobile/app`（19 个）= 139 个。
 *
 * 退出码：0 = 报告完成；1 = 传了 --fail-on-zero 且存在未达标约束；2 = 参数或路径错误。
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── 指标定义 ────────────────────────────────────────────────────────────────
// zeroTarget: true 表示“新 App 里这个指标必须为 0”，属宪法级硬约束。
// minTarget:  表示“至少要被引用到这个次数”，用于防止组件库写成死代码。
const METRICS = [
  { key: 'hexLiterals',        label: '硬编码色值 (#hex)',            src: '#[0-9a-fA-F]{3,8}\\b',                       zeroTarget: true  },
  { key: 'fontSizeLiterals',   label: 'fontSize 字面量',              src: 'fontSize\\s*:',                              zeroTarget: true  },
  { key: 'styleSheetCreate',   label: 'StyleSheet.create 调用',       src: 'StyleSheet\\.create',                        zeroTarget: false },
  { key: 'ownUiComponentRefs', label: '引用自有 UI 组件',             src: 'components/ui/',                             zeroTarget: false, minTarget: 1 },
  { key: 'darkModeApi',        label: '暗色/外观 API 引用',           src: 'useColorScheme|Appearance\\.',               zeroTarget: false },
  { key: 'reanimated',         label: '引用 react-native-reanimated', src: 'react-native-reanimated',                    zeroTarget: false },
  { key: 'gestureHandler',     label: '引用 gesture-handler',         src: 'react-native-gesture-handler',               zeroTarget: false },
  { key: 'blur',               label: 'expo-blur / BlurView',         src: 'expo-blur|BlurView',                         zeroTarget: false },
  { key: 'gradient',           label: 'LinearGradient',               src: 'expo-linear-gradient|LinearGradient',        zeroTarget: false },
  { key: 'iconLib',            label: '图标库引用',                   src: 'lucide-react-native|@expo/vector-icons',     zeroTarget: false },
  { key: 'flatList',           label: 'FlatList / SectionList',       src: 'FlatList|SectionList',                       zeroTarget: false },
  { key: 'flashList',          label: 'FlashList',                    src: 'FlashList',                                  zeroTarget: false },
  { key: 'i18nInlineTernary',  label: '内联双语三元 (isZh ?)',         src: 'isZh\\s*\\?',                                zeroTarget: true  },
  { key: 'i18nKeyCalls',       label: "词条调用 t('key')",             src: "(?<![\\w.])t\\(\\s*['\"]",                    zeroTarget: false, minTarget: 1 },
];

// 旧 App v1 实测基线
// 来源：docs/06-Analyze/ui-research/App设计调研-00-旧App设计债实测基线.md
// 口径：mobile/src (120 文件) + mobile/app (19 文件) = 139 个生产代码文件，不含 __tests__
const V1_BASELINE = {
  files: 139,
  hexLiterals: 1437,
  fontSizeLiterals: 645,
  styleSheetCreate: 79,
  ownUiComponentRefs: 0,
  darkModeApi: 0,
  reanimated: 0,
  gestureHandler: 0,
  blur: 9,
  gradient: 7,
  iconLib: 4,
  flatList: 56,
  flashList: 0,
  i18nInlineTernary: 39,
  i18nKeyCalls: 0,
};

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.expo', '.gradle', 'Pods', '__tests__', '__mocks__']);

// ── 参数 ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { paths: [], json: false, top: 5, failOnZero: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--path') { const v = argv[++i]; if (v) opts.paths.push(v); }
    else if (a === '--json') opts.json = true;
    else if (a === '--top') opts.top = Number(argv[++i]) || 5;
    else if (a === '--fail-on-zero') opts.failOnZero = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function printHelp() {
  const header = fs.readFileSync(__filename, 'utf8').split('*/')[0];
  console.log(header.replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
}

// ── 采集 ────────────────────────────────────────────────────────────────────
function collectFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full);
      } else if (e.isFile() && CODE_EXT.has(path.extname(e.name))) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

function measure(fileList) {
  const totals = {};
  for (const m of METRICS) totals[m.key] = 0;
  const perFile = [];

  for (const file of fileList) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const counts = {};
    let any = false;
    for (const m of METRICS) {
      // 每次都新建 RegExp，避免 /g 的 lastIndex 状态串扰
      const c = (text.match(new RegExp(m.src, 'g')) || []).length;
      counts[m.key] = c;
      totals[m.key] += c;
      if (c > 0) any = true;
    }
    if (any) perFile.push({ file, counts });
  }
  return { totals, perFile };
}

// ── 展示辅助 ─────────────────────────────────────────────────────────────────
function displayWidth(s) {
  return [...String(s)].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
}
function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - displayWidth(s)));
}
function commonAncestor(dirs) {
  const split = dirs.map((d) => path.resolve(d).split(path.sep));
  const first = split[0];
  let i = 0;
  outer: for (; i < first.length; i++) {
    for (const parts of split) if (parts[i] !== first[i]) break outer;
  }
  return first.slice(0, i).join(path.sep) || path.sep;
}

// ── 报告 ────────────────────────────────────────────────────────────────────
function render(roots, label, fileCount, totals, perFile, opts) {
  const lines = [];
  const base = commonAncestor(roots);
  const rule = '─'.repeat(66);

  lines.push('');
  lines.push('App 设计债报告');
  lines.push(rule);
  lines.push(`测量范围   : ${label}`);
  lines.push(`代码文件数 : ${fileCount}   （口径：仅生产代码，不含 __tests__）`);
  lines.push(rule);
  lines.push(pad('指标', 30) + pad('实测', 9) + pad('v1 基线', 10) + '判定');
  lines.push(rule);

  const violations = [];
  for (const m of METRICS) {
    const v = totals[m.key];
    const b = V1_BASELINE[m.key];
    let verdict;
    if (m.zeroTarget) {
      verdict = v === 0 ? '✅ 达标' : '❌ 必须为 0';
      if (v !== 0) violations.push(`${m.label} = ${v}（宪法要求 0）`);
    } else if (m.minTarget) {
      verdict = v >= m.minTarget ? '✅ 达标' : `❌ 至少 ${m.minTarget}`;
      if (v < m.minTarget) violations.push(`${m.label} = ${v}（宪法要求 ≥ ${m.minTarget}）`);
    } else if (b === undefined) {
      verdict = '—';
    } else if (v === 0 && b > 0) {
      verdict = '↓ 已归零';
    } else if (v < b) {
      verdict = `↓ 改善 ${b - v}`;
    } else if (v > b) {
      verdict = `↑ 增加 ${v - b}`;
    } else {
      verdict = '=';
    }
    lines.push(pad(m.label, 30) + pad(String(v), 9) + pad(String(b ?? '-'), 10) + verdict);
  }

  lines.push(rule);
  const hex = perFile
    .map((f) => ({ file: f.file, n: f.counts.hexLiterals }))
    .filter((f) => f.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, opts.top);
  if (hex.length) {
    lines.push(`色值最集中的 ${hex.length} 个文件：`);
    for (const h of hex) lines.push(`  ${pad(String(h.n), 5)}  ${path.relative(base, h.file)}`);
  } else {
    lines.push('色值最集中的文件：无（无硬编码色值）✅');
  }
  lines.push('');

  if (violations.length) {
    lines.push('宪法级违规：');
    for (const v of violations) lines.push(`  ❌ ${v}`);
  } else {
    lines.push('宪法级违规：无 ✅');
  }
  lines.push('');
  return { text: lines.join('\n'), violations };
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts.paths.length === 0) { printHelp(); process.exit(opts.help ? 0 : 2); }

  const roots = [];
  for (const p of opts.paths) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) { console.error(`路径不存在：${abs}`); process.exit(2); }
    roots.push(abs);
  }

  const files = roots.flatMap(collectFiles);
  const { totals, perFile } = measure(files);
  const label = roots.join('  +  ');
  const { text, violations } = render(roots, label, files.length, totals, perFile, opts);

  if (opts.json) {
    console.log(JSON.stringify({ paths: roots, files: files.length, totals, baseline: V1_BASELINE, violations }, null, 2));
  } else if (!opts.quiet) {
    console.log(text);
  }

  process.exit(opts.failOnZero && violations.length ? 1 : 0);
}

main();
