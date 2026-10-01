#!/usr/bin/env node
/**
 * brand-ramp — 品牌主色色阶生成与准入校验
 *
 * 为什么存在：
 *   《App 设计宪法》第 2 条要求「每个用于文字的令牌都必须通过对比度校验」，并且
 *   品牌色必须给出**完整色阶**（100 / 400 / 600 / 700）而不是一个色值。
 *   实测证据（见 docs/06-Analyze/ui-research/App设计调研-06-无障碍与对比度实测.md）：
 *   Web 品牌蓝 #4da7ff 作文字 on 白 2.53:1、承载白字 2.53:1 —— 两端都不达标。
 *   因此"主色"不能靠挑一个好看的十六进制色，必须在生成时就满足一组可计算的门。
 *
 * 本脚本做三件事：
 *   1. 由**色相**生成完整色阶（OKLCH 感知均匀空间，按目标亮度取档，彩度取该亮度下的可用上限的 86%）；
 *   2. 逐条跑 WCAG 对比度门（暗色优先：400 当文字、600 承载白字、600/700 作亮色主题文字）；
 *   3. 跑**色相间距门** —— 主色不得与成功/警告/危险三个状态色撞色（同一色相家族会让状态语义失效）。
 *
 * 用法：
 *   # 单个候选：生成色阶并逐条判定
 *   node scripts/brand-ramp.js --hue 272 --name "靛蓝 Indigo"
 *
 *   # 汇总对比全部内置候选
 *   node scripts/brand-ramp.js --compare
 *
 *   # 机器可读
 *   node scripts/brand-ramp.js --compare --json
 *
 *   # 作为 CI 门（**这是唯一正确的接入方式**）：
 *   node scripts/brand-ramp.js --hue <选定色相> --fail
 *
 * ⚠️ `--compare` 与 `--fail` **不能同时使用**（脚本会直接拒绝、退出码 2）：
 *   `--compare` 的内置候选清单**故意包含一个未过门的候选**（青绿 Teal，白字 on 500 = 2.99:1），
 *   用于展示"哪一类色相会被门拦下"，因此它恒为退出码 1。
 *   **CI 门必须是项目已选定的那一个色相**：`--hue <选定值> --fail`。
 *
 * 参数：
 *   --hue <度>            OKLCH 色相 0–360
 *   --name <文本>         候选名（仅显示用）
 *   --chroma-cap <数>     彩度上限，默认 0.145（越低越克制）
 *   --dark-canvas <hex>   暗色最底色，默认 #12141a
 *   --dark-surface <hex>  暗色卡面色，默认 #1b1e26
 *   --min-hue-gap <度>    与状态色的最小色相间距，默认 25
 *   --compare             跑内置候选清单
 *   --json / --fail / --help
 *
 * 退出码：0 全部通过；1 存在未过门的项（仅当传 --fail）；2 参数错误。
 */

'use strict';

// ── OKLab / OKLCH（Björn Ottosson 的公开定义，逐系数照搬） ───────────────────
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToRgb(hex) {
  const h = String(hex).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex(rgb) {
  return (
    '#' +
    rgb
      .map((c) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToOklab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const [l_, m_, s_] = [Math.cbrt(l), Math.cbrt(m), Math.cbrt(s)];
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToRgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(linearToSrgb);
}

const oklchToRgb = (L, C, H) => {
  const r = (H * Math.PI) / 180;
  return oklabToRgb([L, C * Math.cos(r), C * Math.sin(r)]);
};

const inGamut = (rgb, eps = 1e-4) => rgb.every((c) => c >= -eps && c <= 1 + eps);

function maxChroma(L, H) {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return lo;
}

function hexToOklch(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

// ── WCAG 2.x 对比度 ─────────────────────────────────────────────────────────
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [l1, l2] = [relLum(fg), relLum(bg)];
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ── 默认值 ──────────────────────────────────────────────────────────────────
// 亮度档位：暗色优先 —— 400 要在深底上能当文字，600 要既能承载白字、又能在白底当文字
//
// ⚠️ **档位编号不是契约**（登记于 tokens/design-tokens.css「已知冲突 C6」）：
//   本脚本按固定 OKLCH 亮度目标生成 100–700，其 700 = L 0.455；
//   而 tokens/design-tokens.css 把**官方锚点 #173874（L=0.353）**定义为 brand-700，
//   于是两者编号整体差一档（**本脚本生成的 700 ≈ tokens 的 brand-600**）。
//   → **令牌名一律以 tokens/design-tokens.css 为准**；本脚本的输出只是
//     "候选色阶生成器 + 准入门"，其档位数字**不得直接当作令牌名**。
const RAMP_L = {
  100: 0.955,
  200: 0.895,
  300: 0.8,
  400: 0.735,
  500: 0.66,
  600: 0.545,
  700: 0.455,
};

// 状态色相基准 —— **必须与 tokens/design-tokens.css 保持一致**
// 2026-10-01 修订：警告色相由 73.3°（Web 现值 #ffb547）移到 **55°**。
//   原因：美团黄 H=86.1° 与原警告色相只差 12.7°，违反 25° 门。
//   移到 55° 后：对美团黄 31.1°、对危险 32.7°、对厦大蓝 153.8° —— 两两 ≥25°，无需例外。
//   （登记于 tokens/design-tokens.css「已知冲突 C7」）
const STATUS_HUES = {
  成功: hexToOklch('#39c58d').H,
  警告: hexToOklch('#bb6a29').H, // = tokens 的 state-warning（暗色档），H≈55°
  危险: hexToOklch('#f36d6d').H,
};

// 参照：Web 品牌蓝（用于量化"是否照搬"）
const WEB_BRAND_BLUE = '#4da7ff';

const DEFAULTS = {
  chromaCap: 0.145,
  darkCanvas: '#12141a',
  darkSurface: '#1b1e26',
  minHueGap: 25,
  chromaScale: 0.86,
};

// 内置候选（色相来自 2026-10-01 对 resources/icon.png 的主色提取结果与色相间距要求）
const PRESETS = [
  { name: '靛蓝 Indigo', hue: 272, note: '与品牌标识自身的 257–278° 色带同族；与三状态色均远离' },
  { name: '蓝紫 Blurple', hue: 264, note: 'Discord 社区感的直系邻域（模仿风险最高）' },
  { name: '青蓝 Cyan-Azure', hue: 228, note: '比 Web 蓝更冷更深；仍在"蓝"家族内' },
  { name: '青绿 Teal', hue: 196, note: '与 Web 蓝区分明显；需与成功绿拉开' },
  { name: '紫罗兰 Violet', hue: 300, note: '个性最强；Neo-Brutalism 色块友好' },
  { name: '品红 Rose-Magenta', hue: 345, note: '社区感/活力；需与危险红拉开' },
];

// ── 参数 ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { hue: null, name: null, compare: false, json: false, fail: false, help: false, ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hue') o.hue = Number(argv[++i]);
    else if (a === '--name') o.name = argv[++i];
    else if (a === '--chroma-cap') o.chromaCap = Number(argv[++i]);
    else if (a === '--dark-canvas') o.darkCanvas = argv[++i];
    else if (a === '--dark-surface') o.darkSurface = argv[++i];
    else if (a === '--min-hue-gap') o.minHueGap = Number(argv[++i]);
    else if (a === '--compare') o.compare = true;
    else if (a === '--json') o.json = true;
    else if (a === '--fail') o.fail = true;
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

function printHelp() {
  const fs = require('fs');
  const header = fs.readFileSync(__filename, 'utf8').split('*/')[0];
  console.log(header.replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
}

// ── 生成与判定 ──────────────────────────────────────────────────────────────
function buildRamp(hue, o) {
  const ramp = {};
  for (const [step, L] of Object.entries(RAMP_L)) {
    const C = Math.min(maxChroma(L, hue) * o.chromaScale, o.chromaCap);
    ramp[step] = rgbToHex(oklchToRgb(L, C, hue));
  }
  return ramp;
}

const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

function evaluate(hue, o) {
  const ramp = buildRamp(hue, o);
  const gates = [
    { label: `400 作文字 on 暗色 canvas ${o.darkCanvas}`, value: contrast(ramp[400], o.darkCanvas), need: 4.5, kind: 'ratio' },
    { label: `400 作文字 on 暗色 surface ${o.darkSurface}`, value: contrast(ramp[400], o.darkSurface), need: 4.5, kind: 'ratio' },
    { label: '白字 on 600（CTA 填充）', value: contrast('#ffffff', ramp[600]), need: 4.5, kind: 'ratio' },
    { label: '600 作文字 on 白', value: contrast(ramp[600], '#ffffff'), need: 4.5, kind: 'ratio' },
    { label: '700 作文字 on 白', value: contrast(ramp[700], '#ffffff'), need: 4.5, kind: 'ratio' },
    { label: '白字 on 500（大字/非文本）', value: contrast('#ffffff', ramp[500]), need: 3.0, kind: 'ratio' },
  ];
  for (const [nm, sh] of Object.entries(STATUS_HUES)) {
    gates.push({ label: `与${nm}色相间距`, value: hueGap(hue, sh), need: o.minHueGap, kind: 'deg' });
  }
  gates.push({
    label: '与 Web 品牌蓝色相间距（参考值，非门）',
    value: hueGap(hue, hexToOklch(WEB_BRAND_BLUE).H),
    need: 0,
    kind: 'deg',
    info: true,
  });
  const failed = gates.filter((g) => !g.info && g.value < g.need);
  return { ramp, gates, failed };
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    printHelp();
    process.exit(0);
  }

  // 结构性地堵住这个误用：--compare 的候选清单故意含未过门项，恒为退出码 1，
  // 因此它不能当 CI 门。与其只写进文档，不如让工具直接拒绝。
  if (o.compare && o.fail) {
    console.error(
      '--compare 不能与 --fail 同时使用：--compare 的内置候选清单故意包含未过门项（青绿 Teal），恒返回退出码 1。\n' +
        'CI 门请用项目已选定的色相：node scripts/brand-ramp.js --hue <选定值> --fail',
    );
    process.exit(2);
  }

  const targets = o.compare
    ? PRESETS.map((p) => ({ name: p.name, hue: p.hue, note: p.note }))
    : o.hue === null || Number.isNaN(o.hue)
      ? null
      : [{ name: o.name || `H=${o.hue}`, hue: o.hue, note: '' }];

  if (!targets) {
    printHelp();
    process.exit(2);
  }
  if (targets.some((t) => !(t.hue >= 0 && t.hue <= 360))) {
    console.error('--hue 必须是 0–360 的数值');
    process.exit(2);
  }

  const results = targets.map((t) => ({ ...t, ...evaluate(t.hue, o) }));
  const anyFailed = results.some((r) => r.failed.length > 0);

  if (o.json) {
    console.log(
      JSON.stringify(
        {
          icon_note: '色相候选来自 2026-10-01 对 resources/icon.png 的主色提取（品牌标识色带 257–278°）',
          params: { chromaCap: o.chromaCap, darkCanvas: o.darkCanvas, darkSurface: o.darkSurface, minHueGap: o.minHueGap },
          results: results.map((r) => ({
            name: r.name, hue: r.hue, note: r.note, ramp: r.ramp,
            failed: r.failed.map((f) => f.label),
            gates: r.gates.map((g) => ({ label: g.label, value: Number(g.value.toFixed(2)), need: g.need, info: !!g.info, pass: g.info || g.value >= g.need })),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - [...String(s)].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)));
    console.log('');
    console.log('品牌主色色阶生成与准入校验');
    console.log(`亮度档位：${Object.keys(RAMP_L).join(' / ')}　彩度上限：${o.chromaCap}　暗色底：${o.darkCanvas} / ${o.darkSurface}`);
    console.log('─'.repeat(96));
    console.log(pad('候选', 20) + pad('H', 6) + pad('400', 10) + pad('500', 10) + pad('600', 10) + pad('700', 10) + '未过门');
    console.log('─'.repeat(96));
    for (const r of results) {
      console.log(
        pad(r.name, 20) + pad(r.hue, 6) +
        pad(r.ramp[400], 10) + pad(r.ramp[500], 10) + pad(r.ramp[600], 10) + pad(r.ramp[700], 10) +
        (r.failed.length ? `❌ ${r.failed.length}` : '✅ 0'),
      );
    }
    console.log('─'.repeat(96));
    for (const r of results) {
      console.log('');
      console.log(`── ${r.name}（H=${r.hue}）${r.note ? '  ' + r.note : ''}`);
      console.log('   色阶：' + Object.entries(r.ramp).map(([k, v]) => `${k}=${v}`).join('  '));
      for (const g of r.gates) {
        const unit = g.kind === 'deg' ? '度' : ':1';
        const mark = g.info ? '·' : g.value >= g.need ? '✅' : '❌';
        console.log(`   ${mark} ${pad(g.label, 46)} ${g.value.toFixed(2)}${unit}${g.info ? '' : `  (需 ≥${g.need})`}`);
      }
    }
    console.log('');
    console.log('─'.repeat(96));
    console.log(`参照：Web 品牌蓝 ${WEB_BRAND_BLUE} 作文字 on 白 ${contrast(WEB_BRAND_BLUE, '#ffffff').toFixed(2)}:1、承载白字 ${contrast('#ffffff', WEB_BRAND_BLUE).toFixed(2)}:1 —— 两端均不达标，故不可照搬为主色。`);
    console.log(anyFailed ? `合计 ${results.length} 个候选，其中 ${results.filter((r) => r.failed.length).length} 个存在未过门项。` : `合计 ${results.length} 个候选，全部通过全部门。`);
    console.log('');
  }

  process.exit(o.fail && anyFailed ? 1 : 0);
}

main();
