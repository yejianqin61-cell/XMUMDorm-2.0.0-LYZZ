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
import { buildInsetBootstrapScript, buildScheduleScrapeScript, buildSessionProbeScript,
  parseWebViewMessage } from './injectedScripts';
import type { SchoolSystem } from './schoolSystems';
import { buildMoodleReadScript, isMoodleOrigin, parseMoodleBridgeMessage,
  type MoodleReadRequest, type MoodleBridgeResult } from './moodle/bridge';
import type { MoodleStateResponse } from './moodle/contract';
import { beginMoodleCourseSync, clearMoodleCache, moodleCacheGeneration, writeMoodleCache,
  confirmMoodleSchoolIdentity, confirmedMoodleSchoolIdentity, prepareMoodlePage,
  closeMoodleCache, subscribeMoodleInvalidation } from './moodle/cache';
import { buildMoodleIdentityProbeScript, parseMoodleIdentityMessage, type MoodleIdentityResult } from './moodle/identity';
import { authorizeMoodleDetail, buildMoodleDetailReadScript, parseMoodleDetailMessage,
  type MoodleDetailRequest, type MoodleDetailResult } from './moodle/detail';

export type SchoolSystemWebViewHandle = {
  reload?: () => void;
  readSchedule: () => void;
  probeSession: () => void;
  readMoodle: (request: MoodleReadRequest) => string | null;
  /** Optional additions preserve existing AC callers and mocks. */
  probeMoodleIdentity?: () => string | null;
  readMoodleDetail?: (request: MoodleDetailRequest) => string | null;
  cancelMoodleReads?: () => void;
};
export type SchoolSystemWebViewProps = {
  system: SchoolSystem;
  scrapeSchedule?: boolean;
  onScheduleMessage?: (raw: string) => void;
  onMoodleResponse?: (response: MoodleBridgeResult, generation: number) => void;
  onMoodleIdentity?: (identity: MoodleIdentityResult) => void;
  onMoodleDetail?: (detail: MoodleDetailResult, generation: number) => void;
  onMoodleLoadFailureChange?: (failed: boolean) => void;
  /** Opt-in workspace mode; only a fresh confirmed identity can preserve on close. */
  preserveSnapshotOnClose?: boolean;
  onSessionProbe?: (probe: { hasPasswordField: boolean }) => void;
  onNavigationStateChange?: (event: WebViewNavigation) => void;
  testID?: string;
};

type PendingRead = { request: MoodleReadRequest; generation: number; userId: number | null;
  timer: ReturnType<typeof setTimeout> };
type PendingDetail = { request: MoodleDetailRequest; generation: number; userId: number;
  timer: ReturnType<typeof setTimeout> };

export const SchoolSystemWebView = React.forwardRef<SchoolSystemWebViewHandle, SchoolSystemWebViewProps>(
  function SchoolSystemWebView(props, ref): React.ReactElement {
    const { system, scrapeSchedule = false, preserveSnapshotOnClose = false, testID } = props;
    const callbacks = React.useRef(props); callbacks.current = props;
    const theme = useTheme();
    const { insets } = useScreenInsets();
    const webRef = React.useRef<WebView>(null);
    const currentUrl = React.useRef<string | null>(null);
    const sequence = React.useRef(0);
    const initialPage = React.useRef(true);
    const identity = React.useRef<{ userId: number; url: string } | null>(null);
    const pending = React.useRef(new Map<string, PendingRead>());
    const details = React.useRef(new Map<string, PendingDetail>());
    const discovered = React.useRef(new Map<string, string[]>());
    const identityRead = React.useRef<{ id: string; url: string; generation: number;
      timer: ReturnType<typeof setTimeout> } | null>(null);
    const cancelMoodleReads = React.useCallback(() => {
      for (const item of pending.current.values()) clearTimeout(item.timer);
      for (const item of details.current.values()) clearTimeout(item.timer);
      if (identityRead.current) clearTimeout(identityRead.current.timer);
      pending.current.clear(); details.current.clear(); identityRead.current = null;
    }, []);
    const invalidateMoodleData = React.useCallback(() => {
      cancelMoodleReads(); identity.current = null; discovered.current.clear(); initialPage.current = false;
      if (system.id === 'moodle') clearMoodleCache();
    }, [cancelMoodleReads, system.id]);
    React.useEffect(() => {
      currentUrl.current = null; initialPage.current = true;
      if (system.id === 'moodle') {
        if (preserveSnapshotOnClose) prepareMoodlePage(); else clearMoodleCache();
      }
      const unsubscribe = subscribeMoodleInvalidation(() => {
        if (system.id === 'moodle') { cancelMoodleReads(); identity.current = null; discovered.current.clear(); }
      });
      return () => {
        unsubscribe(); cancelMoodleReads();
        if (system.id === 'moodle') closeMoodleCache(preserveSnapshotOnClose
          && identity.current?.userId === confirmedMoodleSchoolIdentity());
        identity.current = null;
      };
    }, [system.id, preserveSnapshotOnClose, cancelMoodleReads]);

    const insetScript = React.useMemo(() => buildInsetBootstrapScript(insets), [insets]);
    const scrapeScript = React.useMemo(() => buildScheduleScrapeScript(), []);
    const probeScript = React.useMemo(() => buildSessionProbeScript(), []);
    const probeIdentity = React.useCallback((): string | null => {
      const url = currentUrl.current;
      if (system.id !== 'moodle' || !url || !isMoodleOrigin(url) || !webRef.current) return null;
      if (identityRead.current) clearTimeout(identityRead.current.timer);
      const id = `identity:${++sequence.current}`;
      const generation = moodleCacheGeneration();
      const timer = setTimeout(() => {
        if (identityRead.current?.id !== id) return;
        invalidateMoodleData();
        callbacks.current.onMoodleIdentity?.({ requestId: id, status: 'unknown' });
      }, 12000);
      identityRead.current = { id, url, generation, timer };
      webRef.current.injectJavaScript(buildMoodleIdentityProbeScript(id)!);
      return id;
    }, [system.id, invalidateMoodleData]);

    React.useImperativeHandle(ref, () => ({
      reload: () => webRef.current?.reload(),
      readSchedule: () => { webRef.current?.injectJavaScript(scrapeScript); },
      probeSession: () => { webRef.current?.injectJavaScript(probeScript); },
      probeMoodleIdentity: probeIdentity,
      cancelMoodleReads,
      readMoodle: (request) => {
        const url = currentUrl.current;
        if (system.id !== 'moodle' || !url || !isMoodleOrigin(url) || !webRef.current) return null;
        const userId = identity.current?.url === url ? identity.current.userId : null;
        if (preserveSnapshotOnClose && (userId === null || userId !== confirmedMoodleSchoolIdentity())) return null;
        const requestId = `moodle:${++sequence.current}`;
        const script = buildMoodleReadScript(requestId, request, userId ?? undefined);
        if (!script) return null;
        const generation = request.method === 'courses' && (request.offset ?? 0) === 0
          ? beginMoodleCourseSync() : moodleCacheGeneration();
        const timer = setTimeout(() => {
          if (!pending.current.delete(requestId) || generation !== moodleCacheGeneration()) return;
          callbacks.current.onMoodleResponse?.({ requestId, method: request.method, status: 'timeout' }, generation);
        }, 12000);
        pending.current.set(requestId, { request: { ...request }, generation, userId, timer });
        webRef.current.injectJavaScript(script);
        return requestId;
      },
      readMoodleDetail: (request) => {
        const url = currentUrl.current;
        const userId = identity.current?.url === url ? identity.current.userId : null;
        const key = `${request.courseId}:${request.moduleId}`;
        if (system.id !== 'moodle' || !url || !isMoodleOrigin(url) || !webRef.current
          || userId === null || userId !== confirmedMoodleSchoolIdentity()
          || !authorizeMoodleDetail(request, discovered.current.get(key))) return null;
        const requestId = `detail:${++sequence.current}`;
        const script = buildMoodleDetailReadScript(requestId, request, userId);
        if (!script) return null;
        const generation = moodleCacheGeneration();
        const timer = setTimeout(() => {
          if (!details.current.delete(requestId) || generation !== moodleCacheGeneration()) return;
          callbacks.current.onMoodleDetail?.({ requestId, status: 'timeout' }, generation);
        }, 12000);
        details.current.set(requestId, { request: { ...request }, generation, userId, timer });
        webRef.current.injectJavaScript(script);
        return requestId;
      },
    }), [scrapeScript, probeScript, probeIdentity, cancelMoodleReads, system.id, preserveSnapshotOnClose]);

    const handleMessage = React.useCallback((event: WebViewMessageEvent) => {
      const url = currentUrl.current;
      const nativeUrl = event.nativeEvent.url;
      // Android WebView 在部分导航/注入时机把消息 URL 报成裸 origin（实测 /my/ 页面报
      // `https://l.xmu.edu.my`），严格相等会把真机消息全部丢掉；同源 + 裸 origin 容忍。
      const sameOrigin = system.id === 'moodle' && !!url && isMoodleOrigin(url) && isMoodleOrigin(nativeUrl)
        && new URL(nativeUrl).origin === new URL(url).origin;
      const bareOrigin = (value: string) => new URL(value).pathname === '/';
      const samePage = sameOrigin && (nativeUrl === url || bareOrigin(nativeUrl) || bareOrigin(url));
      const identityResult = parseMoodleIdentityMessage(event.nativeEvent.data);
      if (identityResult) {
        const item = identityRead.current;
        if (!samePage || !item || item.id !== identityResult.requestId || item.url !== url
          || item.generation !== moodleCacheGeneration()) return;
        clearTimeout(item.timer); identityRead.current = null; initialPage.current = false;
        if (identityResult.status === 'confirmed') {
          confirmMoodleSchoolIdentity(identityResult.userId);
          identity.current = { userId: identityResult.userId, url: url! };
        } else invalidateMoodleData();
        callbacks.current.onMoodleIdentity?.(identityResult);
        return;
      }
      const detail = parseMoodleDetailMessage(event.nativeEvent.data);
      if (detail) {
        const item = details.current.get(detail.requestId);
        if (!samePage || !item || item.generation !== moodleCacheGeneration()
          || item.userId !== identity.current?.userId || item.userId !== confirmedMoodleSchoolIdentity()) return;
        if (detail.status === 'success' && (detail.data.courseId !== item.request.courseId
          || detail.data.moduleId !== item.request.moduleId || detail.data.kind !== item.request.kind
          || detail.data.url !== item.request.url || !authorizeMoodleDetail(item.request,
            discovered.current.get(`${item.request.courseId}:${item.request.moduleId}`)))) return;
        clearTimeout(item.timer); details.current.delete(detail.requestId);
        if (detail.status === 'expired' || detail.status === 'wrong-origin') invalidateMoodleData();
        if (detail.status === 'success' && detail.data.kind === 'forum') {
          discovered.current.set(`${detail.data.courseId}:${detail.data.moduleId}`, detail.data.announcements.map((row) => row.url));
        }
        callbacks.current.onMoodleDetail?.(detail, item.generation);
        return;
      }
      const moodle = parseMoodleBridgeMessage(event.nativeEvent.data);
      if (moodle) {
        const item = pending.current.get(moodle.requestId);
        if (!samePage || !item || item.request.method !== moodle.method) return;
        if (item.generation !== moodleCacheGeneration()
          || (item.userId !== null && item.userId !== confirmedMoodleSchoolIdentity())) {
          clearTimeout(item.timer); pending.current.delete(moodle.requestId); return;
        }
        if (moodle.status === 'success' && item.request.method === 'state'
          && (moodle.data as MoodleStateResponse).courseId !== item.request.courseId) return;
        clearTimeout(item.timer); pending.current.delete(moodle.requestId);
        if (moodle.status === 'expired' || moodle.status === 'wrong-origin') invalidateMoodleData();
        if (moodle.status === 'success') writeMoodleCache(moodle.method, moodle.data, item.generation);
        callbacks.current.onMoodleResponse?.(moodle, item.generation);
        return;
      }
      const message = parseWebViewMessage(event.nativeEvent.data);
      if (message.kind === 'session') {
        if (system.id === 'moodle' && (!isMoodleOrigin(nativeUrl) || (url !== null && nativeUrl !== url))) return;
        if (system.id === 'moodle' && message.hasPasswordField) invalidateMoodleData();
        callbacks.current.onSessionProbe?.({ hasPasswordField: message.hasPasswordField });
      } else if (message.kind === 'schedule') callbacks.current.onScheduleMessage?.(message.raw);
    }, [system.id, invalidateMoodleData]);

    const handleLoadEnd = React.useCallback(() => {
      webRef.current?.injectJavaScript(probeScript);
      if (scrapeSchedule) webRef.current?.injectJavaScript(scrapeScript);
      if (callbacks.current.onMoodleIdentity) probeIdentity();
    }, [scrapeSchedule, scrapeScript, probeScript, probeIdentity]);
    const handleNavigation = React.useCallback((event: WebViewNavigation) => {
      if (event.loading || event.url !== currentUrl.current) {
        if (system.id === 'moodle' && preserveSnapshotOnClose && initialPage.current && isMoodleOrigin(event.url)) {
          cancelMoodleReads(); identity.current = null; prepareMoodlePage();
        } else invalidateMoodleData();
      }
      currentUrl.current = event.loading ? null : event.url;
      callbacks.current.onNavigationStateChange?.(event);
      if (!event.loading) {
        webRef.current?.injectJavaScript(probeScript);
        if (callbacks.current.onMoodleIdentity) probeIdentity();
      }
    }, [system.id, preserveSnapshotOnClose, cancelMoodleReads, invalidateMoodleData, probeScript, probeIdentity]);

    return <View testID={testID} style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value }}>
      <WebView ref={webRef} source={{ uri: system.startUrl }} style={{ flex: 1, backgroundColor: 'transparent' }}
        sharedCookiesEnabled cacheEnabled thirdPartyCookiesEnabled domStorageEnabled javaScriptEnabled
        applicationNameForUserAgent="XMUMDorm/1.0" injectedJavaScriptBeforeContentLoaded={insetScript}
        injectedJavaScript={probeScript} onMessage={handleMessage} onLoadStart={() => {
          if (system.id === 'moodle') callbacks.current.onMoodleLoadFailureChange?.(false);
          currentUrl.current = null;
          if (system.id === 'moodle' && preserveSnapshotOnClose && initialPage.current) {
            cancelMoodleReads(); identity.current = null; prepareMoodlePage();
          } else invalidateMoodleData();
        }} onError={() => {
          if (system.id === 'moodle') callbacks.current.onMoodleLoadFailureChange?.(true);
        }} onLoadEnd={handleLoadEnd} onNavigationStateChange={handleNavigation}
        allowsBackForwardNavigationGestures={false} />
    </View>;
  });
