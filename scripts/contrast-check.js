#!/usr/bin/env node
/**
 * contrast-check — WCAG 对比度校验器
 *
 * 为什么存在：
 *   《App 设计宪法》将要求「每个用于文字的令牌都必须通过对比度校验」，且
 *   「品牌色块 + 白字」这类组合必须被拒绝。实测证据（见
 *   docs/06-Analyze/ui-research/App设计调研-06-无障碍与对比度实测.md）：
 *   品牌蓝 #4da7ff 载白字仅 2.53:1、警告杏 #ffb547 载白字仅 1.76:1，全部不合规。
 *   本脚本把这件事实变成可执行的门。
 *
 * 用法：
 *   # 逐个配对（可重复）
 *   node scripts/contrast-check.js --pair "白字 on 品牌蓝=#ffffff,#4da7ff"
 *
 *   # 内置 Dorm 品牌预设（当前 Web 调色板的实测复核）
 *   node scripts/contrast-check.js --brand-preset
 *
 *   # 从 JSON 批量读取：[{ "label": "...", "fg": "#fff", "bg": "#000", "level": "AA" }]
 *   node scripts/contrast-check.js --file pairs.json
 *
 *   # 作为 CI 门：有失败即退出码 1
 *   node scripts/contrast-check.js --brand-preset --fail
 *
 * 目标等级：--level AA（默认，正文 4.5 / 大字 3.0）| AAA（7.0）| AA-large（3.0）
 * 退出码：0 全部通过；1 存在失败（仅当传 --fail）；2 参数或文件错误。
 */

'use strict';

const fs = require('fs');

// ── WCAG 2.x 对比度 ─────────────────────────────────────────────────────────
function parseHex(input) {
  let h = String(input).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return null;
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const LEVELS = {
  AA: { body: 4.5, large: 3.0 },
  'AA-large': { body: 3.0, large: 3.0 },
  AAA: { body: 7.0, large: 4.5 },
};

// ── 内置：当前 Web 品牌调色板的实测配对 ──────────────────────────────────────
const BRAND_PRESET = [
  { label: 'text-primary #20304a on 白',        fg: '#20304a', bg: '#ffffff', level: 'AA' },
  { label: 'text-secondary #42526b on 白',      fg: '#42526b', bg: '#ffffff', level: 'AA' },
  { label: 'slate-500 #6f8097 on 白',           fg: '#6f8097', bg: '#ffffff', level: 'AA' },
  { label: 'slate-400 #9aa8bc on 白',           fg: '#9aa8bc', bg: '#ffffff', level: 'AA' },
  { label: '品牌蓝 #4da7ff 作为文字 on 白',      fg: '#4da7ff', bg: '#ffffff', level: 'AA' },
  { label: '白字 on 品牌蓝 #4da7ff',            fg: '#ffffff', bg: '#4da7ff', level: 'AA' },
  { label: '白字 on 成功绿 #39c58d',            fg: '#ffffff', bg: '#39c58d', level: 'AA' },
  { label: '白字 on 警告杏 #ffb547',            fg: '#ffffff', bg: '#ffb547', level: 'AA' },
  { label: '白字 on 危险红 #f36d6d',            fg: '#ffffff', bg: '#f36d6d', level: 'AA' },
  { label: 'slate-900 on blue-100 #e8f4ff',     fg: '#20304a', bg: '#e8f4ff', level: 'AA' },
  { label: '品牌蓝 on blue-100 #e8f4ff',        fg: '#4da7ff', bg: '#e8f4ff', level: 'AA' },
];

// ── 参数 ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { pairs: [], file: null, preset: false, level: 'AA', json: false, fail: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pair') { const v = argv[++i]; if (v) opts.pairs.push(v); }
    else if (a === '--file') opts.file = argv[++i];
    else if (a === '--brand-preset') opts.preset = true;
    else if (a === '--level') opts.level = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--fail') opts.fail = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function printHelp() {
  const header = fs.readFileSync(__filename, 'utf8').split('*/')[0];
  console.log(header.replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
}

function pad(s, n) {
  const w = [...String(s)].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  return String(s) + ' '.repeat(Math.max(0, n - w));
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { printHelp(); process.exit(0); }

  if (!LEVELS[opts.level]) {
    console.error(`未知等级：${opts.level}（可选 ${Object.keys(LEVELS).join(' / ')}）`);
    process.exit(2);
  }

  let items = [];
  if (opts.preset) items = items.concat(BRAND_PRESET);
  if (opts.file) {
    try {
      const parsed = JSON.parse(fs.readFileSync(opts.file, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('JSON 顶层必须是数组');
      items = items.concat(parsed);
    } catch (e) {
      console.error(`读取 --file 失败：${e.message}`);
      process.exit(2);
    }
  }
  for (const p of opts.pairs) {
    const m = /^(.*?)=(.*)$/.exec(p);
    if (!m) { console.error(`--pair 格式应为 "标签=前景,背景"：${p}`); process.exit(2); }
    const [fg, bg] = m[2].split(',').map((s) => (s || '').trim());
    items.push({ label: m[1].trim(), fg, bg, level: opts.level });
  }

  if (!items.length) { printHelp(); process.exit(2); }

  const rows = [];
  for (const it of items) {
    const level = LEVELS[it.level || opts.level] || LEVELS[opts.level];
    const ratio = contrastRatio(it.fg, it.bg);
    if (ratio === null) {
      rows.push({ ...it, ratio: null, passBody: false, passLarge: false, error: '色值无法解析' });
      continue;
    }
    rows.push({
      label: it.label || `${it.fg} on ${it.bg}`,
      fg: it.fg, bg: it.bg,
      ratio: Number(ratio.toFixed(2)),
      passBody: ratio >= level.body,
      passLarge: ratio >= level.large,
      needBody: level.body,
      needLarge: level.large,
    });
  }

  const failures = rows.filter((r) => !r.passBody);

  if (opts.json) {
    console.log(JSON.stringify({ level: opts.level, total: rows.length, failures: failures.length, rows }, null, 2));
  } else {
    console.log('');
    console.log(`WCAG 对比度校验    目标等级：${opts.level}`);
    console.log('─'.repeat(78));
    console.log(pad('配对', 36) + pad('对比度', 9) + pad('正文', 7) + '大字');
    console.log('─'.repeat(78));
    for (const r of rows) {
      const ratio = r.ratio === null ? '解析失败' : r.ratio.toFixed(2);
      console.log(pad(r.label, 36) + pad(ratio, 9) + pad(r.passBody ? '✅' : '❌', 7) + (r.passLarge ? '✅' : '❌'));
    }
    console.log('─'.repeat(78));
    console.log(`合计 ${rows.length} 组，正文不达标 ${failures.length} 组`);
    if (failures.length) {
      console.log('');
      console.log('不达标明细：');
      for (const f of failures) {
        console.log(`  ❌ ${f.label}  ${f.ratio} < ${f.needBody}`);
      }
    }
    console.log('');
  }

  process.exit(opts.fail && failures.length ? 1 : 0);
}

main();
