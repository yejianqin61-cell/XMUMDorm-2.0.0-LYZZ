/**
 * 校方系统内嵌容器（R3 的落地）
 *
 * **R3 已核实的四条**（`react-native-webview@13.16.1`，Expo SDK 57 钉版）：
 *   1. **会话默认就是持久的**：iOS `defaultDataStore`（只要不开无痕模式）/ Android 的 cookie 单例是进程级
 *      → 但 ⚠️ 两个开关会**静默摧毁**会话：
 *        · 无痕模式（Android 上还会 `removeAllCookies` + `clearCache`，**不可逆**）→ ⛔ 本文件不启用它
 *        · iOS 上关掉缓存 **且** 开共享 cookie → 会切到 nonPersistent store
 *          → ✅ 保持 `cacheEnabled` 默认 true
 *   2. `injectedJavaScript` **只跑一次**，且**必须给 `onMessage`**（官方原文：否则代码不会执行）
 *      → `onLoadEnd` 再补一枪，覆盖 SPA 二次渲染
 *   3. `X-Frame-Options` **不约束原生 WebView 的顶层导航**（它只管 iframe）→ 宪法记录正确
 *   4. UA 只应**追加**（`applicationNameForUserAgent`），⛔ 不整串覆盖（会连 Mobile 标记一起丢）
 *
 * ⛔ 不做的三件事：读/存/传校方凭据 · 自动签到或代替用户点击 · 让内嵌页自绘状态栏背景（会双层条）
 *
 * **insets 怎么来**：本组件是**覆盖层**（S7），但 ⛔ 不自己去读安全区
 * —— 由 `Screen` 注入（`useScreenInsets()`），保持"全 App 唯一安全区容器"（S2）。
 * 因此本组件**不自带 padding**：把 insets 交给内嵌页的 CSS 变量即可（17.3）。
 */

import * as React from 'react';
import { View } from 'react-native';
import WebView, { type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { useTheme } from '@/design-system/theme';
import { useScreenInsets } from '@/components/ui/Screen';
import { buildInsetBootstrapScript, buildScheduleScrapeScript } from './injectedScripts';
import type { SchoolSystem } from './schoolSystems';

export type SchoolSystemWebViewProps = {
  system: SchoolSystem;
  /** 是否在加载完成后尝试读表（只有 AC 的课表页需要） */
  scrapeSchedule?: boolean;
  onScheduleMessage?: (raw: string) => void;
  onNavigationStateChange?: (event: WebViewNavigation) => void;
  testID?: string;
};

export function SchoolSystemWebView({
  system,
  scrapeSchedule = false,
  onScheduleMessage,
  onNavigationStateChange,
  testID,
}: SchoolSystemWebViewProps): React.ReactElement {
  const theme = useTheme();
  // S7 + S2：覆盖层需要 insets，但只能从唯一容器拿
  const { insets } = useScreenInsets();
  const webRef = React.useRef<WebView>(null);

  // 17.3：把真实 insets 交给内嵌页（它自己的 env(safe-area-inset-*) 恒为 0）
  const insetScript = React.useMemo(() => buildInsetBootstrapScript(insets), [insets]);
  const scrapeScript = React.useMemo(() => buildScheduleScrapeScript(), []);

  const handleMessage = React.useCallback(
    (event: WebViewMessageEvent) => {
      onScheduleMessage?.(event.nativeEvent.data);
    },
    [onScheduleMessage]
  );

  // `injectedJavaScript` 只在文档结束时跑一次；异步渲染的课表要靠这里再补一枪
  const handleLoadEnd = React.useCallback(() => {
    if (scrapeSchedule) {
      webRef.current?.injectJavaScript(scrapeScript);
    }
  }, [scrapeSchedule, scrapeScript]);

  return (
    <View
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value }}
    >
      <WebView
        ref={webRef}
        source={{ uri: system.startUrl }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        // ── 会话（R3：默认持久；这三个是"意图声明"，⛔ 不加无痕模式）──────────
        sharedCookiesEnabled
        cacheEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        // ── UA：只追加，⛔ 不整串覆盖 ────────────────────────────────────────
        applicationNameForUserAgent="XMUMDorm/1.0"
        // ── 注入（Android 上 AtDocumentStart 不可靠 → 只塞 CSS 变量）──────────
        injectedJavaScriptBeforeContentLoaded={insetScript}
        injectedJavaScript={scrapeSchedule ? scrapeScript : undefined}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        onNavigationStateChange={onNavigationStateChange}
        allowsBackForwardNavigationGestures={false}
      />
    </View>
  );
}
