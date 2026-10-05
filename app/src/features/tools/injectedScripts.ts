/**
 * 注入脚本（读课表 + 把 insets 交给内嵌页）
 *
 * ⛔ **纪律（宪法 4.1.2-4）**：只做"打开 + 保持会话"。
 *    注入脚本里**不得**出现任何代替用户完成的校方动作（自动签到 / 模拟点击 / 批量提交）。
 *
 * 时机（R3 已核实，`react-native-webview@13.16.1`）：
 *   - `injectedJavaScript` 只在**文档加载完成时跑一次**（重新加载/导航不会重跑）
 *     → 必须在 `onLoadEnd` 里用 `ref.injectJavaScript()` 再补一枪
 *   - `injectedJavaScriptBeforeContentLoaded` 在 Android 上官方标注 **"may work, but it is not 100% reliable"**
 *     → 只用来塞 CSS 变量这种"没有也不致命"的东西，**不承担读表**
 *   - 课表页可能是**异步渲染** → 脚本内部轮询，拿到 >=2 行才回传
 *   - ⚠️ 官方原文：**"Be sure to set an onMessage handler, even if it's a no-op, or the code will not be run."**
 */

import { buildEmbeddedInsetCss, type Insets } from '@/design-system/safe-area';

/** 回传消息的 kind（App 侧据此分派） */
export const SCRAPE_KIND = 'dorm:schedule';
/** 会话探测回传的 kind（P1-14） */
export const SESSION_KIND = 'dorm:session';

export type ScrapeOptions = {
  /** 轮询次数上限（默认 12 次 × 800ms ≈ 10s） */
  maxTries?: number;
  intervalMs?: number;
};

/**
 * 读课表 `<table>` 并回传 `{ kind, rows }`。
 * - 选择器：`table tr`（课表在 AC 里是表格；**列语义待真机实测**，见 R3 结论）
 * - 单元格：`td, th`，取 `innerText.trim()`
 * - 轮询：`rows.length > 1` 或超过上限即回传（避免永久等待）
 */
export function buildScheduleScrapeScript(options: ScrapeOptions = {}): string {
  const maxTries = options.maxTries ?? 12;
  const intervalMs = options.intervalMs ?? 800;
  return [
    '(function () {',
    '  var tries = 0;',
    '  var timer = setInterval(function () {',
    "    var rows = document.querySelectorAll('table tr');",
    '    if (rows.length > 1 || ++tries > ' + String(maxTries) + ') {',
    '      clearInterval(timer);',
    '      var out = [];',
    '      for (var i = 0; i < rows.length; i++) {',
    "        var cells = rows[i].querySelectorAll('td, th');",
    '        var line = [];',
    '        for (var j = 0; j < cells.length; j++) {',
    '          line.push((cells[j].innerText || "").trim());',
    '        }',
    '        out.push(line);',
    '      }',
    '      window.ReactNativeWebView.postMessage(JSON.stringify({ kind: ' +
      JSON.stringify(SCRAPE_KIND) +
      ', rows: out }));',
    '    }',
    '  }, ' + String(intervalMs) + ');',
    '})();',
    'true;',
  ].join('\n');
}

/**
 * 把真实 insets 交给内嵌页（宪法 17.3）。
 * 为什么必须这样：内嵌的第三方页拿不到 `viewport-fit=cover`，
 * 它页面里 `env(safe-area-inset-*)` **恒为 0**（R3 实测结论）。
 */
export function buildInsetBootstrapScript(insets: Insets): string {
  return buildEmbeddedInsetCss({ insets });
}

/**
 * 会话探测（P1-14）：**从页面本身判断"这是不是登录页"**。
 *
 * ⚠️ 为什么不去猜登录 URL：三个校方系统的登录路径**我们没有实测过**，
 * 按"路径里含 `/login`"这类猜测去判会**凭记忆写规则**（宪法 15.2-1 明令禁止），
 * 而且各系统随时可能改。真正可靠且可观测的信号是：
 * **页面上有没有密码输入框** —— 有就是登录页，没有就是已进入系统内部。
 *
 * ⛔ 仍然只"看"不"动"：不填表、不点按钮、不读任何凭据（宪法 4.1.2-4）。
 */
export function buildSessionProbeScript(): string {
  return [
    '(function () {',
    '  try {',
    "    var hasPwd = document.querySelector('input[type=password]') !== null;",
    '    window.ReactNativeWebView.postMessage(JSON.stringify({ kind: ' +
      JSON.stringify(SESSION_KIND) +
      ', hasPasswordField: hasPwd }));',
    '  } catch (e) { /* 探测失败就不回传，App 侧保持上一次状态 */ }',
    '})();',
    'true;',
  ].join('\n');
}

/**
 * 注入脚本回传消息的**信封分流**（P1-14）。
 *
 * ⚠️ 为什么这里**只分流、不解析课表**：课表的严格解析（逐格过滤、清洗空行）
 * 已经在 `extractSchedule.parseInjectedMessage` 里，且有用例守着。
 * 这里若是再写一遍，就出现"同语义两层"（9.14-①），两边迟早会不一致。
 * 所以课表那一支**原样交回**给调用方去走既有解析器。
 */
export type WebViewMessage =
  | { kind: 'session'; hasPasswordField: boolean }
  | { kind: 'schedule'; raw: string }
  | { kind: 'unknown' };

export function parseWebViewMessage(raw: string): WebViewMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'unknown' };
  }
  if (parsed === null || typeof parsed !== 'object') return { kind: 'unknown' };
  const envelope = parsed as { kind?: unknown; hasPasswordField?: unknown };

  if (envelope.kind === SESSION_KIND && typeof envelope.hasPasswordField === 'boolean') {
    return { kind: 'session', hasPasswordField: envelope.hasPasswordField };
  }
  if (envelope.kind === SCRAPE_KIND) {
    return { kind: 'schedule', raw };
  }
  return { kind: 'unknown' };
}
