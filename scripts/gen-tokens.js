#!/usr/bin/env node
/**
 * gen-tokens — 设计令牌 codegen + 自我门禁
 *
 * 为什么存在：
 *   **React Native 没有运行期 CSS 自定义属性**。App 读不到 `var(--x)`。
 *   因此 `tokens/design-tokens.css`（人手唯一撰写的 CSStoken 源）不能被"加载"，
 *   只能被"编译"。本脚本就是那个编译器。
 *
 *       tokens/design-tokens.css            ← 只改这一个文件
 *                │  node scripts/gen-tokens.js
 *                ▼
 *       tokens/generated/native-tokens.ts   ← App/RN 消费（类型化）
 *       tokens/generated/tokens.json        ← Web/尺子消费（机器可读）
 *       tokens/generated/tokens.check.json  ← 喂给 scripts/contrast-check.js 的配对清单
 *
 *   同时本脚本**自己就是门禁**：它算得出每个 textSafe 令牌的实测对比度，
 *   所以它也有资格拒绝不合规的令牌。低于阈值 → 打印全部违规 → **退出码 1**。
 *   ⚠️ 这是**额外新增**的一道门，不是对 `scripts/contrast-check.js` 的替代或削弱；
 *      那个脚本一个字未改。它的配对清单由本脚本生成（tokens.check.json）。
 *
 * 用法：
 *   node scripts/gen-tokens.js             # 生成 + 门禁 + 打印对比度表
 *   node scripts/gen-tokens.js --check     # 只校验、不写文件（CI 只读模式）
 *   node scripts/gen-tokens.js --json      # 摘要以 JSON 输出（仍写文件）
 *   node scripts/gen-tokens.js --quiet     # 只输出违规（供 CI 日志）
 *   node scripts/gen-tokens.js --help
 *
 * 退出码：0 全部达标并已生成；1 存在 textSafe 违规或源文件结构问题；2 参数错误。
 *
 * 幂等性：
 *   输出中**不含时间戳、不含主机名、不含绝对路径、不含随机数**；
 *   令牌按源文件出现顺序输出 → 连续跑两次必须字节相同。
 *
 * 依赖：仅 Node 内置模块（fs / path / process）。不引第三方包，不跑 npm install。
 *
 * 令牌元数据协议（读取自 CSS 注解）
 *   块头注释：      [layer=foundation|semantic][theme=dark|light]
 *   令牌行前注释：  [usage=surface|fill|text|icon|border]   必填
 *                   [textSafe]                               声明可承载正文
 *                   [contrastOn=--color-…]                   校验基准背景（令牌名）
 *                   [contrastAgainst=--color-…]              比值以该背景为分母（border/icon）
 *                   [minRatio=n] [minReason=…]               阈值加权（**必须**写理由）
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── 路径 ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const SRC_CSS = path.join(ROOT, 'tokens', 'design-tokens.css');
const OUT_DIR = path.join(ROOT, 'tokens', 'generated');
const OUT_TS = path.join(OUT_DIR, 'native-tokens.ts');
const OUT_JSON = path.join(OUT_DIR, 'tokens.json');
const OUT_CHECK = path.join(OUT_DIR, 'tokens.check.json');

// ── 阈值（WCAG 2.2）─────────────────────────────────────────────────────────
/** SC 1.4.3 正文（<18pt 且 <14pt 粗体） */
const THRESHOLD_BODY = 4.5;
/** SC 1.4.11 非文本构件 / 1.4.3 大字（≥18pt 或 ≥14pt 粗体） */
const THRESHOLD_NON_TEXT = 3.0;
/** 适用 ≥3:1 非文本门的 usage */
const NON_TEXT_USAGE = new Set(['icon', 'border']);
const VALID_USAGE = new Set(['surface', 'fill', 'text', 'icon', 'border']);

// ── 颜色数学（系数与 scripts/contrast-check.js 完全一致）──────────────────
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

const isHex = (v) => /^#[0-9a-fA-F]{3,8}$/.test(v);
const varTarget = (v) => {
  const m = /^var\(\s*(--[a-zA-Z0-9-]+)\s*\)$/.exec(v);
  return m ? m[1] : null;
};

// ── CSS 解析 ────────────────────────────────────────────────────────────────
/**
 * 注解白名单。**必须有**：块头注释里会写正常中文/英文说明，其中方括号或
 * `xxx: yyy` 形态的句子会被朴素正则误当成注解（实测踩过：文档原文
 * "Not all fonts have a variant for each" 曾被解析成 key=value，把 group 覆盖掉）。
 * 因此只认下面这些键；其余一律忽略，既不污染元数据也不误报。
 */
const KNOWN_ANNOTATIONS = new Set([
  'layer', 'theme', 'group', 'usage', 'textSafe', 'contrastOn', 'contrastAgainst', 'minRatio', 'minReason',
]);
/** 只可能出现"写错键名"的注解（value 型），用于把拼写错误报出来而不是静默忽略 */
const TYPO_WATCH = new Set([
  'usesage', 'usgae', 'usasge', 'usagee', 'textsafe', 'tsxtSafe', 'contraston', 'contrastagainest',
  'minratio', 'minreason', 'gropu', 'them', 'layr', 'texteSafe',
]);

/** 解析一行注解文本（形如 `usage=text][textSafe`）为对象 */
function parseAnnotations(text, problems, where) {
  const out = {};
  if (!text) return out;
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const part = m[1].trim();
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq === -1) {
      // 裸键 = 布尔旗标（如 `[textSafe]`）
      const key = part;
      if (TYPO_WATCH.has(key) && problems) {
        problems.push(`${where}：注解旗标 [${key}] 疑似拼写错误（白名单键：${[...KNOWN_ANNOTATIONS].join(' / ')}）。`);
        continue;
      }
      if (KNOWN_ANNOTATIONS.has(key)) out[key] = true;
      continue;
    }
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (TYPO_WATCH.has(key) && problems) {
      problems.push(`${where}：注解键 [${key}] 疑似拼写错误（白名单键：${[...KNOWN_ANNOTATIONS].join(' / ')}）。`);
      continue;
    }
    if (!KNOWN_ANNOTATIONS.has(key)) continue;       // 说明性文字，忽略
    out[key] = val;
  }
  return out;
}

/**
 * 把 CSS 切成块。块身份由块头注释里的显式标记声明：
 *   [layer=foundation|semantic]  [theme=dark|light]
 * 不靠选择器语法猜测 —— 本文件里 `:root` 出现两次，且 Foundation 里也混着色值。
 */
function parseCss(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  const parseProblems = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    // 块头：行首无缩进的选择器行，以 { 结尾
    if (lines[i] !== trimmed || !/\{\s*$/.test(trimmed) || !/^[:[]/.test(trimmed)) { i++; continue; }
    const selector = trimmed.replace(/\s*\{\s*$/, '');

    // 往回找块头标记：从上一行开始向上，剥掉注释前缀后收集 [k=v]，直到遇见上一个块头
    const meta = {};
    for (let k = i - 1; k >= 0 && k >= i - 40; k--) {
      const up = lines[k].trim();
      if (up === '' || up === '*/' || up === '/*') continue;
      const bare = up.replace(/^[*/]+\s*/, '');            // 剥掉注释前缀
      const got = parseAnnotations(bare, parseProblems, `第 ${k + 1} 行（块头注释）`);
      if (Object.keys(got).length) { Object.assign(meta, got); break; }
      if (/^\}?\s*$/.test(bare)) continue;                  // 代码块结束
      if (/\{\s*$/.test(up)) break;                         // 上一个块头，停止
    }

    const decls = [];
    let pendingDoc = {};
    let groupVar = null;          // [group=…] 是**小节标记**，在块内持续生效
    i++;
    for (; i < lines.length; i++) {
      const raw = lines[i];
      if (/^\s*\}\s*$/.test(raw)) { i++; break; }

      // 独立注释行：`/* [usage=text][textSafe] 说明 */`
      const docOnly = /^\s*\/\*(.*?)\*\/\s*$/.exec(raw);
      const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/, '');
      const comment = (raw.match(/\/\*[\s\S]*?\*\//g) || []).join(' ');

      if (docOnly && !/^\s*--/.test(code)) {
        const got = parseAnnotations(docOnly[1], parseProblems, `第 ${i + 1} 行（令牌注释）`);
        if (got.group) groupVar = got.group;
        pendingDoc = { ...pendingDoc, ...got };
        continue;
      }

      const dm = /^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/.exec(code);
      if (!dm) continue;

      // 注解可以写在**前面的独立注释行**里，也可以写在**同一行的尾部注释**里。
      const own = parseAnnotations(comment, parseProblems, `第 ${i + 1} 行（${dm[1]}）`);
      if (own.group) groupVar = own.group;
      const merged = { ...(groupVar && !own.group ? { group: groupVar } : {}), ...pendingDoc, ...own };
      decls.push({ name: dm[1], value: dm[2].trim(), doc: merged, line: i + 1 });
      pendingDoc = {};
    }
    blocks.push({ selector, layer: meta.layer || null, theme: meta.theme || null, decls });
  }
  blocks.parseProblems = parseProblems;
  return blocks;
}

// ── 参数 ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { check: false, json: false, quiet: false, help: false };
  for (const a of argv) {
    if (a === '--check') o.check = true;
    else if (a === '--json') o.json = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else { console.error(`未知参数：${a}（--help 查看用法）`); process.exit(2); }
  }
  return o;
}

function printHelp() {
  const header = fs.readFileSync(__filename, 'utf8').split('*/')[0];
  console.log(header.replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
}

function pad(s, n) {
  const w = [...String(s)].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  return String(s) + ' '.repeat(Math.max(0, n - w));
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { printHelp(); process.exit(0); }

  if (!fs.existsSync(SRC_CSS)) { console.error(`找不到令牌源：${SRC_CSS}`); process.exit(2); }
  const css = fs.readFileSync(SRC_CSS, 'utf8');

  // ── 源文件红线自检 ────────────────────────────────────────────────────────
  // 只检查**声明部分**（剥掉注释），否则"禁止渐变"这句话本身就会把自己判违规。
  const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const fatal = [];
  if (/gradient\s*\(/i.test(cssCode)) fatal.push('令牌源中出现 gradient() —— 渐变已被所有者明令禁止（《App 设计宪法》1.3）。');
  if (/font-family\s*:/i.test(cssCode)) fatal.push('令牌源中声明了 font-family —— 字体由系统解析；Android 上写字体名是静默回退的不可见 bug（RN #58750）。');
  if (/\d+pt\b/.test(cssCode)) fatal.push('令牌源声明中出现 pt 常量 —— 字阶不得写绝对 pt（iOS 用系统文字样式、Android 用 M3 角色）。');
  if (/box-shadow\s*:/i.test(cssCode)) fatal.push('令牌源中出现 box-shadow —— 暗色层级一律用表面色表达，不用阴影（宪法 2.4.3）。');
  if (fatal.length) {
    console.error('');
    for (const f of fatal) console.error('❌ ' + f);
    console.error('');
    process.exit(2);
  }

  const blocks = parseCss(css);
  const parseProblems = blocks.parseProblems || [];
  const semanticBlocks = blocks.filter((b) => b.layer === 'semantic');
  const foundationBlocks = blocks.filter((b) => b.layer === 'foundation');

  if (!semanticBlocks.some((b) => b.theme === 'dark') || !semanticBlocks.some((b) => b.theme === 'light')) {
    console.error('❌ 令牌源必须同时提供 [layer=semantic][theme=dark] 与 [layer=semantic][theme=light] 两个块（两套主题各自完整成套）。');
    process.exit(2);
  }

  // ── 调色板（字面量）与 var() 解析 ─────────────────────────────────────────
  const literal = new Map();
  for (const b of blocks) for (const d of b.decls) if (isHex(d.value)) literal.set(d.name, d.value.toLowerCase());

  const resolveLiteral = (name, seen = new Set()) => {
    if (literal.has(name)) return literal.get(name);
    if (seen.has(name)) return null;
    seen.add(name);
    for (const b of blocks) {
      const d = b.decls.find((x) => x.name === name);
      if (d) {
        const t = varTarget(d.value);
        if (t) return resolveLiteral(t, seen);
      }
    }
    return null;
  };

  // ── 语义令牌解析 + 校验 ───────────────────────────────────────────────────
  const problems = [...parseProblems];
  const tokens = { dark: [], light: [] };
  const scales = [];
  /** theme → (令牌名 → 本主题内的字面量色值) */
  const themeLiteral = new Map();

  // 预扫描：先把每个语义块里所有颜色令牌解析成本主题内的字面量。
  // 必须先行，因为 [contrastOn=--color-bg-canvas] 这类引用在同一块里可能出现在引用点之后，
  // 且亮/暗两套主题里同名令牌取值不同 —— 必须取**本主题**的那一个。
  const resolved = new Map(); // `${theme}:${name}` → hex
  for (const block of semanticBlocks) {
    const m = new Map();
    themeLiteral.set(block.theme, m);
    for (const d of block.decls) {
      const v = isHex(d.value) ? d.value.toLowerCase() : resolveLiteral(varTarget(d.value) || '');
      if (v) { m.set(d.name, v); resolved.set(`${block.theme}:${d.name}`, v); }
    }
  }
  for (const block of semanticBlocks) {
    const theme = block.theme;
    for (const d of block.decls) {
      const value = resolved.get(`${theme}:${d.name}`);
      if (!value) {
        problems.push(`${d.name}（第 ${d.line} 行，theme=${theme}）：取值 ${d.value} 无法解析为字面量色值。生成物必须自洽。`);
        continue;
      }
      const doc = d.doc;
      const usage = doc.usage;
      if (!usage || !VALID_USAGE.has(usage)) {
        problems.push(`${d.name}（第 ${d.line} 行，theme=${theme}）：[usage=…] 缺失或非法（须为 surface|fill|text|icon|border）。`);
        continue;
      }

      // 阈值加权必须留痕
      let minRatio = null;
      if (doc.minRatio !== undefined) {
        const n = Number(doc.minRatio);
        if (!Number.isFinite(n)) { problems.push(`${d.name}（第 ${d.line} 行）：[minRatio=${doc.minRatio}] 不是数字。`); continue; }
        if (!doc.minReason) { problems.push(`${d.name}（第 ${d.line} 行）：用了 [minRatio=${n}] 却没写 [minReason=…] —— 阈值加权必须留痕，不许静默放松。`); continue; }
        minRatio = n;
      }

      const textSafe = doc.textSafe === true;
      const threshold = minRatio !== null ? minRatio : (NON_TEXT_USAGE.has(usage) ? THRESHOLD_NON_TEXT : THRESHOLD_BODY);
      const thresholdKind = minRatio !== null ? `override(${minRatio})` : (NON_TEXT_USAGE.has(usage) ? 'non-text-3.0' : 'body-4.5');

      // 基准背景：显式声明 > 按 usage 取默认底（text/icon/border → canvas）
      let onName = doc.contrastOn || null;
      let onAuto = false;
      if (!onName && usage !== 'fill' && usage !== 'surface') {
        onName = NON_TEXT_USAGE.has(usage) || usage === 'text' ? '--color-bg-canvas' : '--color-bg-surface';
        onAuto = true;
      }
      const againstName = doc.contrastAgainst || null;

      const hexOfRef = (nm, tag) => {
        if (!nm) return null;
        if (isHex(nm)) return nm.toLowerCase();
        const local = themeLiteral.get(theme);
        if (local && local.has(nm)) return local.get(nm);   // 优先本主题内的语义令牌
        const v = resolveLiteral(nm);                        // 否则回落调色板（Foundation）
        if (!v) { problems.push(`${d.name}（第 ${d.line} 行，theme=${theme}）：[${tag}=${nm}] 指向不存在的令牌。`); return null; }
        return v;
      };

      const onValue = hexOfRef(onName, 'contrastOn');
      const againstValue = hexOfRef(againstName, 'contrastAgainst');

      // 实测：默认「本令牌值 : 背景」；[contrastAgainst] 时「背景 : 本令牌值」
      let ratio = null;
      if (onValue) ratio = contrastRatio(value, onValue);
      else if (againstValue) ratio = contrastRatio(againstValue, value);

      if (textSafe && ratio === null) {
        problems.push(`${d.name}（第 ${d.line} 行，theme=${theme}）：textSafe=true 但算不出对比度（缺少可解析的基准背景）。`);
      } else if (textSafe && ratio < threshold) {
        problems.push(
          `❌ ${d.name}（theme=${theme}，第 ${d.line} 行）：textSafe=true 但实测 ${ratio.toFixed(2)}:1 < ${threshold}:1` +
          `（基准 ${onName} = ${onValue}，阈值类型 ${thresholdKind}）。`,
        );
      }

      const rec = {
        token: d.name,
        name: d.name.replace(/^--color-/, ''),
        value,
        usage,
        textSafe,
        contrastOn: onName || null,
        contrastOnValue: onValue || null,
        ...(againstName ? { contrastAgainst: againstName, contrastAgainstValue: againstValue } : {}),
        contrastRatio: ratio === null ? null : Number(ratio.toFixed(2)),
        minRatio: threshold,
        thresholdKind,
        ...(doc.minReason ? { minReason: doc.minReason } : {}),
        ...(onAuto ? { contrastOnAuto: true } : {}),
        theme,
        line: d.line,
      };
      tokens[theme].push(rec);
    }
  }

  // Foundation 层只用于导出调色板（供 Web/尺子参考），不做 usage 校验
  const palette = [];
  for (const b of foundationBlocks) {
    for (const d of b.decls) {
      const isColor = isHex(d.value) || varTarget(d.value);
      if (!isColor) continue;
      const v = isHex(d.value) ? d.value.toLowerCase() : resolveLiteral(varTarget(d.value));
      if (v) palette.push({ token: d.name, name: d.name.replace(/^--color-/, ''), value: v, line: d.line });
    }
  }

  // 非颜色令牌（语义块之外的标量）
  const scalarBlocks = blocks.filter((b) => !b.layer);
  for (const b of scalarBlocks) {
    for (const d of b.decls) {
      if (isHex(d.value) || varTarget(d.value)) {
        problems.push(`${d.name}（第 ${d.line} 行）：色值出现在未标记 [layer=…] 的块里 —— 无法判定它属于调色板还是语义层。`);
        continue;
      }
      scales.push({ token: d.name, name: d.name.replace(/^--/, ''), value: d.value, group: d.doc.group || null, line: d.line });
    }
  }

  // P1-03：字阶自校验（角色↔数值 1:1 / 值必须是 M3 官方档位名 / 单调性）
  problems.push(...validateFontMetrics(scales));

  if (problems.length) {
    console.error('');
    console.error('令牌门禁失败 —— 下列问题必须修复（本脚本不允许静默降级）：');
    console.error('─'.repeat(100));
    for (const p of problems) console.error('  ' + p);
    console.error('─'.repeat(100));
    console.error(`合计 ${problems.length} 处。`);
    console.error('');
    process.exit(1);
  }

  // ── 摘要表数据（每一个 textSafe 令牌 + 其实测比例）────────────────────────
  const rows = [...tokens.dark, ...tokens.light].filter((t) => t.textSafe);

  // ── 生成物 ────────────────────────────────────────────────────────────────
  const slim = (t) => ({
    name: t.name,
    value: t.value,
    usage: t.usage,
    textSafe: t.textSafe,
    contrastOn: t.contrastOn,
    contrastOnValue: t.contrastOnValue,
    ...(t.contrastAgainst ? { contrastAgainst: t.contrastAgainst, contrastAgainstValue: t.contrastAgainstValue } : {}),
    contrastRatio: t.contrastRatio,
    minRatio: t.minRatio,
    thresholdKind: t.thresholdKind,
    ...(t.minReason ? { minReason: t.minReason } : {}),
    theme: t.theme,
  });

  const jsonDoc = {
    generator: 'scripts/gen-tokens.js',
    source: 'tokens/design-tokens.css',
    model: 'single authored CSS custom-property source → build-time codegen（RN 无运行期 CSS 自定义属性）',
    note: 'contrastRatio 一律由生成器按 WCAG 2.x relative luminance 实测算得；CSS 里的手写比例只是人读注解，生成器不采信。',
    thresholds: { body: THRESHOLD_BODY, nonText: THRESHOLD_NON_TEXT },
    themes: {
      dark: { colors: tokens.dark.map(slim) },
      light: { colors: tokens.light.map(slim) },
    },
    palette,
    scales: scales.map((s) => ({ name: s.name, value: s.value, group: s.group, source: { file: 'tokens/design-tokens.css', line: s.line } })),
    allTokens: [...tokens.dark, ...tokens.light].map((t) => ({ ...slim(t), token: t.token, source: { file: 'tokens/design-tokens.css', line: t.line } })),
  };

  // ⚠️ `scripts/contrast-check.js --file` 要求 JSON 顶层**就是数组**，因此本文件
  //    必须是裸数组 —— 说明性字段只能挂在每个配对对象上（该脚本忽略未知字段）。
  const checkDoc = rows.map((t) => ({
    label: `${t.name} ${t.value} on ${t.contrastOnValue} (${t.theme}·${t.usage})`,
    fg: t.value,
    bg: t.contrastOnValue,
    level: t.minRatio >= THRESHOLD_BODY ? 'AA' : 'AA-large',
    measuredRatio: t.contrastRatio,
    requiredRatio: t.minRatio,
    generatedBy: 'scripts/gen-tokens.js',
    generatedFrom: 'tokens/design-tokens.css',
  }));

  const ts = renderTs(tokens, scales, palette);

  if (opts.check) {
    if (!opts.quiet) {
      printTable(rows);
      console.log(`--check 模式：仅校验，未写入任何文件。${rows.length} 个 textSafe 令牌全部达标。`);
      console.log('');
    }
    process.exit(0);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_TS, ts, 'utf8');
  fs.writeFileSync(OUT_JSON, JSON.stringify(jsonDoc, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_CHECK, JSON.stringify(checkDoc, null, 2) + '\n', 'utf8');

  if (opts.quiet) process.exit(0);

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, colors: jsonDoc.allTokens.length, textSafe: rows.length, scales: scales.length, palette: palette.length, rows }, null, 2));
    process.exit(0);
  }

  printTable(rows);
  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
  const sz = (p) => `${fs.statSync(p).size} bytes`;
  console.log('');
  console.log('生成物：');
  console.log(`  ${pad(rel(OUT_TS), 42)} ${sz(OUT_TS)}`);
  console.log(`  ${pad(rel(OUT_JSON), 42)} ${sz(OUT_JSON)}`);
  console.log(`  ${pad(rel(OUT_CHECK), 42)} ${sz(OUT_CHECK)}`);
  console.log('');
  console.log(`语义颜色令牌 ${jsonDoc.allTokens.length} 个（dark ${tokens.dark.length} / light ${tokens.light.length}）· 调色板 ${palette.length} 个 · 非颜色令牌 ${scales.length} 个 · textSafe ${rows.length} 个全部达标。`);
  console.log('');
  console.log('下一步：');
  console.log('  node scripts/contrast-check.js --file tokens/generated/tokens.check.json');
  console.log('  node scripts/brand-ramp.js --hue 261.2 --fail');
  console.log('');
  process.exit(0);
}

// ── 摘要表 ──────────────────────────────────────────────────────────────────
function printTable(rows) {
  const widths = [40, 9, 8, 9, 12, 9, 7, 6];
  const head = ['令牌 (theme)', '值', 'usage', 'textSafe', '基准背景', '实测', '阈值', '判定'];
  const rule = '─'.repeat(widths.reduce((a, b) => a + b, 0) + widths.length - 1);
  console.log('');
  console.log('textSafe 令牌对比度实测表（由 scripts/gen-tokens.js 计算，非手写）');
  console.log(rule);
  console.log(head.map((h, i) => pad(h, widths[i])).join(' '));
  console.log(rule);
  let pass = 0;
  for (const r of rows) {
    const ok = r.contrastRatio >= r.minRatio;
    if (ok) pass++;
    console.log([
      pad(`${r.name} (${r.theme})`, widths[0]),
      pad(r.value, widths[1]),
      pad(r.usage, widths[2]),
      pad('true', widths[3]),
      pad(r.contrastOnValue || '—', widths[4]),
      pad(`${r.contrastRatio.toFixed(2)}:1`, widths[5]),
      pad(`≥${r.minRatio}`, widths[6]),
      ok ? '✅' : '❌',
    ].join(' '));
  }
  console.log(rule);
  console.log(`合计 ${rows.length} 个 textSafe 令牌，达标 ${pass} 个，不达标 ${rows.length - pass} 个。`);
}

// ── TS 渲染 ─────────────────────────────────────────────────────────────────
// ── M3 官方字阶校验表（Android 侧字阶数值的**唯一来源**）────────────────────
/**
 * 依据：宪法 **2.5-4**（Android 用 M3 字阶角色）· **15.2-1**（**不得凭记忆写官方数值**）。
 *
 * **来源（一手）**：AndroidX `TypeScaleTokens.kt`，文件头标 `GENERATED CODE // VERSION: v0_103`
 *   https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt
 * **交叉验证**：Flutter `material_design` 包 `M3TypeScale`（自述 Reference = m3.material.io）逐档一致
 * **访问日期**：2026-10-02
 *
 * ⚠️ `m3.material.io` 是客户端渲染的 SPA，抓取只返回 `<title>`（宪法 15.2-1 已记录该现象），
 *    因此改从上面两个**可机读**的官方实现对取 —— 这满足"不得凭记忆"，牺牲的是
 *    "必须从该 URL 读"这种形式要求（已在 P1-03 文档里如实标注）。
 *
 * ⚠️ **两处与流传的二手表格不同，必须用本表**：
 *   · `titleLarge` = 22 / **400**（不是 500）
 *   · `bodyMedium` tracking = **0.2**（0.25 属 `BodyMediumEmphasized` 变体）
 * 另有 15 个 `Emphasized` 变体（size/line-height 同、weight 提到 Medium/Bold）→ **本表不启用**
 *   （宪法 2.5-5 只保证 normal/bold 两端可区分）。
 */
const M3_TYPE_SCALE = {
  displayLarge: { size: 57, lineHeight: 64, weight: 400, tracking: -0.2 },
  displayMedium: { size: 45, lineHeight: 52, weight: 400, tracking: 0 },
  displaySmall: { size: 36, lineHeight: 44, weight: 400, tracking: 0 },
  headlineLarge: { size: 32, lineHeight: 40, weight: 400, tracking: 0 },
  headlineMedium: { size: 28, lineHeight: 36, weight: 400, tracking: 0 },
  headlineSmall: { size: 24, lineHeight: 32, weight: 400, tracking: 0 },
  titleLarge: { size: 22, lineHeight: 28, weight: 400, tracking: 0 },
  titleMedium: { size: 16, lineHeight: 24, weight: 500, tracking: 0.2 },
  titleSmall: { size: 14, lineHeight: 20, weight: 500, tracking: 0.1 },
  bodyLarge: { size: 16, lineHeight: 24, weight: 400, tracking: 0.5 },
  bodyMedium: { size: 14, lineHeight: 20, weight: 400, tracking: 0.2 },
  bodySmall: { size: 12, lineHeight: 16, weight: 400, tracking: 0.4 },
  labelLarge: { size: 14, lineHeight: 20, weight: 500, tracking: 0.1 },
  labelMedium: { size: 12, lineHeight: 16, weight: 500, tracking: 0.5 },
  labelSmall: { size: 11, lineHeight: 16, weight: 500, tracking: 0.5 },
};

/** 角色间的**单调性**要求（宪法 2.5 的层级可读性；`label ≥ body` 允许相等） */
const FONT_ROLE_ORDER = [
  ['display', 'title', 'strict'],
  ['title', 'headline', 'strict'],
  ['headline', 'label', 'strict'],
  ['label', 'body', 'allowEqual'],
  ['body', 'caption', 'strict'],
];

/**
 * 字阶自校验 —— 把宪法 2.5-②/④ 与 15.2-1 变成**生成期的机器判据**。
 * @returns {string[]} 问题列表（空数组 = 通过）
 */
function validateFontMetrics(scales) {
  const out = [];
  const roleEntries = scales.filter((s) => s.group === 'font-role');
  const metricEntries = scales.filter((s) => s.group === 'font-metrics');

  if (metricEntries.length === 0) {
    out.push('令牌源缺少 [group=font-metrics] —— 字阶数值必须分端生成（宪法 2.5-4）。');
    return out;
  }

  // ① 角色 ↔ 数值必须 1:1
  const roleValues = roleEntries.map((s) => s.value).sort();
  // ⚠️ `s.name` 在 scales 里已经剥掉前导 `--`（见 main 里 scales.push 的 name 字段）
  const metricRoles = metricEntries.map((s) => s.name.replace(/^font-metric-/, '')).sort();
  if (JSON.stringify(roleValues) !== JSON.stringify(metricRoles)) {
    out.push(
      `字阶角色与字阶数值不是 1:1 —— 角色 [${roleValues.join(', ')}] vs 数值 [${metricRoles.join(', ')}]。`
    );
  }

  const byRole = {};
  for (const s of metricEntries) {
    const role = s.name.replace(/^font-metric-/, '');
    // ② 值必须是 M3 官方档位名，且**不能是数字**（宪法 2.5-②）
    if (/^[0-9]/.test(String(s.value))) {
      out.push(`${s.name}（第 ${s.line} 行）：值看起来是字号数字 —— 令牌源禁止写绝对字号（2.5-②）。`);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(M3_TYPE_SCALE, s.value)) {
      out.push(
        `${s.name}（第 ${s.line} 行）：值 "${s.value}" 不在 M3 官方 15 档里。可选：${Object.keys(M3_TYPE_SCALE).join(' / ')}。`
      );
      continue;
    }
    byRole[role] = M3_TYPE_SCALE[s.value];
  }

  // ③ 单调性
  for (const [a, b, mode] of FONT_ROLE_ORDER) {
    const x = byRole[a];
    const y = byRole[b];
    if (!x || !y) continue;
    const ok = mode === 'allowEqual' ? x.size >= y.size : x.size > y.size;
    if (!ok) {
      out.push(
        `字阶单调性被破坏：${a}(${x.size}) 必须 ${mode === 'allowEqual' ? '≥' : '>'} ${b}(${y.size})。`
      );
    }
  }

  return out;
}

function renderTs(tokens, scales, palette) {
  const prop = (n) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n) ? n : JSON.stringify(n));
  const q = (v) => JSON.stringify(v);
  const constName = (n) => n.replace(/^--/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

  const groups = {};
  for (const s of scales) (groups[s.group || 'ungrouped'] = groups[s.group || 'ungrouped'] || []).push(s);

  const groupOrder = ['font-role', 'font-metrics', 'font-weight', 'font-variant', 'space', 'radius', 'border-width', 'touch-target', 'motion-duration'];
  const groupConst = {
    'font-role': 'fontRole',
    'font-metrics': 'fontMetrics',
    'font-weight': 'fontWeight',
    'font-variant': 'fontVariant',
    space: 'space',
    radius: 'radius',
    'border-width': 'borderWidth',
    'touch-target': 'touchTarget',
    'motion-duration': 'motionDuration',
  };
  const orderedGroups = [...groupOrder.filter((g) => groups[g]), ...Object.keys(groups).filter((g) => !groupOrder.includes(g))];

  const colorEntry = (t) => {
    const L = [];
    L.push(`  ${prop(t.name)}: {`);
    L.push(`    value: ${q(t.value)},`);
    L.push(`    usage: ${q(t.usage)},`);
    L.push(`    textSafe: ${t.textSafe},`);
    L.push(`    contrastOn: ${q(t.contrastOn)},`);
    L.push(`    contrastOnValue: ${q(t.contrastOnValue)},`);
    if (t.contrastAgainst) {
      L.push(`    contrastAgainst: ${q(t.contrastAgainst)},`);
      L.push(`    contrastAgainstValue: ${q(t.contrastAgainstValue)},`);
    }
    L.push(`    contrastRatio: ${t.contrastRatio === null ? 'null' : t.contrastRatio},`);
    L.push(`    minRatio: ${t.minRatio},`);
    L.push(`    thresholdKind: ${q(t.thresholdKind)},`);
    if (t.minReason) L.push(`    minReason: ${q(t.minReason)},`);
    L.push(`    theme: ${q(t.theme)},`);
    L.push(`  },`);
    return L.join('\n');
  };

  const o = [];
  o.push('/* ============================================================================');
  o.push(' * 自动生成 —— 请勿手工编辑。');
  o.push(' *');
  o.push(' * 生成器    ：scripts/gen-tokens.js');
  o.push(' * 唯一事实源：tokens/design-tokens.css（人手只改那一个文件）');
  o.push(' *');
  o.push(' * 为什么是"生成"而不是"运行时读取"：');
  o.push(' *   React Native 没有运行期 CSS 自定义属性，App 读不到 var(--x)。');
  o.push(' *   因此令牌源在**构建期**被编译成本模块。');
  o.push(' *   改品牌色 = 改一个 CSS 文件 + 重跑 codegen = 一改全部改。');
  o.push(' *');
  o.push(' * 分层纪律（《App 设计宪法》2.1）：');
  o.push(' *   业务代码**只允许**消费 `colors[theme]`（语义层）与 `scale`（非颜色令牌）。');
  o.push(' *   调色板（Foundation）只以 `palette` 的色值表形式导出，用于对照与审计；');
  o.push(' *   业务代码不得按调色板档位取色 —— 那正是宪法 2.3 禁止的"按档位推断"。');
  o.push(' *');
  o.push(' * 本文件不含任何手写色值：每个 value 都来自令牌源；');
  o.push(' * 每个 contrastRatio 都是生成器按 WCAG 2.x relative luminance 实测算得。');
  o.push(' * ========================================================================== */');
  o.push('');
  o.push("export type TokenUsage = 'surface' | 'fill' | 'text' | 'icon' | 'border';");
  o.push("export type TokenTheme = 'dark' | 'light';");
  o.push('');
  o.push('/** 校验基准背景的解析结果：无法定位基准底时为 null（仅 fill / surface 可能出现） */');
  o.push('export type ContrastBasis = {');
  o.push('  /** 校验基准背景（令牌名） */');
  o.push('  readonly token: string;');
  o.push('  /** 校验基准背景的字面量色值 */');
  o.push('  readonly value: string;');
  o.push('} | null;');
  o.push('');
  o.push('/** 每个颜色令牌携带的完整元数据（宪法 2.3：六项缺一即不合格） */');
  o.push('export interface ColorToken {');
  o.push('  /** 色值（#rrggbb 小写） */');
  o.push('  readonly value: string;');
  o.push('  /** 用途：surface | fill | text | icon | border */');
  o.push('  readonly usage: TokenUsage;');
  o.push('  /** 可否承载正文文字。**由实测决定，不得按档位推断**（宪法 2.3） */');
  o.push('  readonly textSafe: boolean;');
  o.push('  /** 校验基准背景（令牌名）；无基准底时为 null */');
  o.push('  readonly contrastOn: string | null;');
  o.push('  /** 校验基准背景的字面量色值；无基准底时为 null */');
  o.push('  readonly contrastOnValue: string | null;');
  o.push('  /** 仅 border/icon：比值以该背景为分母（"本令牌在底上能否被看见"） */');
  o.push('  readonly contrastAgainst?: string;');
  o.push('  readonly contrastAgainstValue?: string;');
  o.push('  /** 实测算得的对比度；无可算基准时为 null */');
  o.push('  readonly contrastRatio: number | null;');
  o.push('  /** 该令牌适用的阈值下限 */');
  o.push('  readonly minRatio: number;');
  o.push('  /** 阈值来源：body-4.5 | non-text-3.0 | override(n) */');
  o.push('  readonly thresholdKind: string;');
  o.push('  /** 阈值加权的理由（仅 override 时存在；无理由生成器即报错） */');
  o.push('  readonly minReason?: string;');
  o.push('  /** 所属主题 */');
  o.push('  readonly theme: TokenTheme;');
  o.push('}');
  o.push('');
  o.push('/** 主题 → 语义令牌表（宽化后的取值类型，供接受"任意语义令牌"的函数使用） */');
  o.push('export type ThemeColorTokens = Readonly<Record<string, ColorToken>>;');
  o.push('');
  for (const theme of ['dark', 'light']) {
    o.push(`/** 语义层 · ${theme === 'dark' ? '暗色（一等公民，先定义）' : '亮色（由暗色派生，完整成套）'} */`);
    // 用 `satisfies` 而不是显式注解：既在编译期强制每个令牌符合 ColorToken 契约，
    // 又保留字面量键（从而保留键名自动补全与拼写检查）。
    o.push(`export const ${theme}Colors = {`);
    for (const t of tokens[theme]) o.push(colorEntry(t));
    o.push('} satisfies Readonly<Record<string, ColorToken>>;');
    o.push('');
    o.push(`export type ${theme === 'dark' ? 'Dark' : 'Light'}ColorTokenName = keyof typeof ${theme}Colors;`);
    o.push('');
  }
  o.push('/** 两套主题的语义层。业务代码通过主题参数取用。 */');
  // 显式注解为"字面量键的对象"，这样 colorsFor('light') 返回的仍是带**字面量键**的类型：
  // 既保留键名自动补全，又让拼错的键名在编译期报错（宽化成 Record<string,…> 会两者皆失）。
  o.push('export const colors: { readonly dark: typeof darkColors; readonly light: typeof lightColors } = { dark: darkColors, light: lightColors };');
  o.push('');
  o.push('/** 取某主题下的语义层（返回类型保留字面量键，拼错键名会在编译期报错） */');
  o.push('export const colorsFor = <T extends TokenTheme>(theme: T): (typeof colors)[T] => colors[theme];');
  o.push('');
  o.push('/** 供 @expo/ui Host 锚定系统控件：用我们的品牌色，不用壁纸动态取色（宪法 9.12） */');
  o.push('export const platformSeed = {');
  o.push('  dark: darkColors["action-primary"].value,');
  o.push('  light: lightColors["action-primary"].value,');
  o.push('} as const;');
  o.push('');
  o.push('/* ---------------------------------------------------------------------------');
  o.push(' * Foundation 调色板（**只读对照用**）');
  o.push(' * 业务代码禁止按这里的档位取色 —— 请取语义层。');
  o.push(' * ------------------------------------------------------------------------- */');
  o.push('export const palette = {');
  for (const p of palette) o.push(`  ${prop(p.name)}: ${q(p.value)},`);
  o.push('} as const;');
  o.push('');
  o.push('/* ---------------------------------------------------------------------------');
  o.push(' * 非颜色令牌');
  o.push(' *');
  o.push(' * ⚠️ 字体（宪法 2.5）：');
  o.push(' *   ① 本模块**不导出任何 fontFamily** —— 字族由平台解析；Android 上把字体名');
  o.push(' *      拼错是静默回退的不可见 bug（RN #58750）。');
  o.push(' *   ② 字阶：**角色名**两边一致，**数值分端生成**（宪法 2.5-4）。');
  o.push(' *      Android 侧走 M3 官方档位（`fontMetrics`，数值来自生成器内置校验表）；');
  o.push(' *      ⚠️ iOS 的"系统文字样式 / Dynamic Type"RN 未暴露 `UIFontTextStyle`，');
  o.push(' *      当前两端共用 M3 数值 + `allowFontScaling`（已登记为新债，见 P1-03 §7）。');
  o.push(' *   ③ 数字对齐用 tabular-nums，不为此换字体。');
  o.push(' * ------------------------------------------------------------------------- */');
  o.push('');
  for (const g of orderedGroups) {
    if (g === 'font-metrics') {
      // 特殊形态：每个角色展开成对象。数值**只能**取自 M3_TYPE_SCALE
      //（validateFontMetrics 已保证值合法；这里不再做二次判断，避免两处口径）。
      o.push('/**');
      o.push(' * font-metrics：角色 → M3 官方档位 + 该档位的官方数值。');
      o.push(' * ⛔ 数值不是手写的：它逐字来自生成器内置的 M3 校验表（P1-03）。');
      o.push(' * ⚠️ `m3Weight` 只作**说明**用 —— RN 的字重仍只走 scale.fontWeight');
      o.push(' *    （宪法 2.5-5：不得假设 500/600 必然可区分）。');
      o.push(' */');
      o.push('export const fontMetrics = {');
      for (const s of groups[g]) {
        const m = M3_TYPE_SCALE[s.value];
        o.push(`  ${prop(s.name.replace(/-/g, '_'))}: {`);
        o.push(`    m3: ${q(s.value)},`);
        o.push(`    size: ${m.size},`);
        o.push(`    lineHeight: ${m.lineHeight},`);
        o.push(`    tracking: ${m.tracking},`);
        o.push(`    m3Weight: ${m.weight},`);
        o.push('  },');
      }
      o.push('} as const;');
      o.push('');
      continue;
    }
    o.push(`/** ${g}${g.startsWith('font') ? '（角色，非数值）' : ''} */`);
    o.push(`export const ${groupConst[g] || constName(g)} = {`);
    for (const s of groups[g]) o.push(`  ${prop(s.name.replace(/-/g, '_'))}: ${q(s.value)},`);
    o.push('} as const;');
    o.push('');
  }
  o.push('/** 非颜色令牌总表 */');
  o.push('export const scale = {');
  for (const g of orderedGroups) o.push(`  ${groupConst[g] || constName(g)},`);
  o.push('} as const;');
  o.push('');
  o.push('/** 默认导出：一份完整的令牌层 */');
  o.push('export const tokens = { colors, palette, scale, platformSeed } as const;');
  o.push('');
  o.push('export default tokens;');
  o.push('');
  return o.join('\n');
}

main();
