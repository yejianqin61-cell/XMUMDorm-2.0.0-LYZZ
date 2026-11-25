/**
 * 内嵌页加载失败 → 四类用户能区分的错误（宪法 10.4：网络类必须分开说，因为用户能做的事不同）
 *
 * 替代 `react-native-webview` 的默认错误页（实测 Android 13 上显示
 * `Error loading page / Domain: undefined / Error Code: 3 / SSL error…` —— 技术细节外泄）。
 *
 * 错误码来源（`react-native-webview@13.16.1`）：
 *   - **Android 证书错**：`onReceivedSslError` 上报 `SslError.getPrimaryError()`（0–5），
 *     描述以 `SSL error:` 开头；握手失败走 `onReceivedError`，码 `-11`（ERROR_FAILED_SSL_HANDSHAKE）
 *   - **Android 其它**：`WebViewClient.ERROR_*`：`-8` 超时，其余（-2 域名解析 / -6 连接…）按"不可达"
 *   - **iOS**：`NSURLErrorDomain`：`-1001` 超时、`-1009` 无网络、`-1200…-1206` / `-2000` 证书
 *
 * ⚠️ 不可达在校方系统上**多半是没连校园网**（三个系统只在校内可达，R3 D-08），
 *    `unreachable` 的文案本身就会提示「连上校园网后重试」。
 */
import type { AppErrorKind } from '@/i18n/errors';

export type WebViewErrorKind = Extract<AppErrorKind, 'certificate' | 'timeout' | 'offline' | 'unreachable'>;

export function classifyWebViewError(input: {
  domain?: string;
  code: number;
  description?: string;
}): WebViewErrorKind {
  const description = (input.description ?? '').toLowerCase();
  const ios = input.domain === 'NSURLErrorDomain';
  if (description.startsWith('ssl error') || description.includes('certificate')
    || description.includes('err_cert_')) return 'certificate';
  // Android 的 -2 同时代表"没网"和"域名解析失败"，只能看 Chromium 的 net 错误名区分（实测断网 = ERR_INTERNET_DISCONNECTED）
  if (description.includes('err_internet_disconnected')) return 'offline';
  if (description.includes('err_timed_out') || description.includes('err_connection_timed_out')) return 'timeout';
  if (ios) {
    if ((input.code <= -1200 && input.code >= -1206) || input.code === -2000) return 'certificate';
    if (input.code === -1001) return 'timeout';
    if (input.code === -1009) return 'offline';
    return 'unreachable';
  }
  if (input.code === -11) return 'certificate';
  if (input.code === -8) return 'timeout';
  return 'unreachable';
}
