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
