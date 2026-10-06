/**
 * 根布局 —— 全 App 的 Provider 与导航栈根。
 *
 * ⛔ **这里挂 `SafeAreaProvider`，且全仓只此一处**（宪法 17.1-S4）。
 *
 * Provider 顺序（外 → 内）：
 *   SafeAreaProvider → ThemeProvider → I18nProvider → LucideProvider → Stack
 * 理由：
 *   - insets 是几何基础，最外层；
 *   - 主题要先于词条（词条层不依赖主题，但顶栏/状态栏要）；
 *   - `LucideProvider` 是**图标唯一设 `strokeWidth` 的地方**（宪法 16.5-2：⛔ 调用点不得传）。
 */

import * as React from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LucideProvider } from 'lucide-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Localization from 'expo-localization';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design-system/theme';
import { I18nProvider, normalizeLocale } from '@/i18n';
import { configureAppApi } from '@/shared/api';
import { configureConnectivity, configureFocusTracking, getQueryClient } from '@/shared/queryClient';
import { ToastHost, ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { SessionGate } from '@/features/auth/SessionGate';

/**
 * P1-01：把后端地址与 token 来源交给 `shared/` 的请求层。
 * ⛔ **必须在任何数据请求之前**执行，且只执行一次（`configureAppApi` 幂等）。
 * 放在模块顶层（而不是某个 effect 里）：路由模块可能在任何组件挂载前就发出请求。
 */
configureAppApi();

/**
 * P1-02：数据层与连通性。
 * - `getQueryClient()` 是惰性单例 → 全 App 一个缓存；
 * - ⛔ 连通性必须**接到 TanStack 的 onlineManager**，否则 RN 里永远"在线"，
 *   "离线用缓存 + 标 stale"（宪法 10.6 / T04）永远不会触发。
 */
const appQueryClient = getQueryClient();
configureConnectivity();
configureFocusTracking();

/** 全局唯一描边宽度（宪法 16.5-2：1857 个图标全部按 24×24 网格 / stroke 2 设计，无例外） */
export const ICON_STROKE_WIDTH = 2;

/**
 * 全局覆盖层宿主（P1-07）。
 *
 * ⚠️ **本组件是宪法 17.1-S2 允许的第二个 `useSafeAreaInsets()` 调用点**（另一个是 `Screen`），
 *    依据是 `p0-04` 的用例标题本身："S2：**Screen 与根布局各一处**"。
 *    为什么必须是它：Toast 要在**任何 Screen 之外**也能显示（全局回执），所以拿不到
 *    `ScreenInsetsContext`；而它又**在 `SafeAreaProvider` 内部**，正好该由根布局取一次算好的值，
 *    再**当普通 prop 传给展示层**（⛔ 展示层自己不许再调 hook，否则就成了第三个调用点）。
 */
function GlobalOverlays(): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <>
      <ToastHost bottomInset={insets.bottom} testID="toast-host" />
      {/*
        `A-01` 的启动位与会话门（P2C2-01）：**挂在这里且只挂一次**。
        insets 由本层（宪法 17.1-S2 允许的第二处调用点）算好后当 prop 传入 ——
        ⛔ 门自己不许再调 `useSafeAreaInsets()`（否则就是第三个调用点）。
      */}
      <SessionGate topInset={insets.top} bottomInset={insets.bottom} />
    </>
  );
}

/** 需要主题才能决定的东西：状态栏图标颜色（17.3）与图标默认色 */
function ThemedShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = useTheme();
  return (
    <LucideProvider
      strokeWidth={ICON_STROKE_WIDTH}
      color={theme.color['icon-primary'].value}
    >
      {/* 17.3：⛔ 不得出现"暗色主题 + 黑色状态栏字" */}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </LucideProvider>
  );
}

export default function RootLayout(): React.ReactElement {
  const scheme = useColorScheme();
  // 系统语言在根布局读一次，传给词条层（单一真源；⛔ 词条层不自己去调原生模块）
  const systemLocale = React.useMemo(
    () => normalizeLocale(Localization.getLocales()[0]?.languageCode),
    []
  );

  return (
    <QueryClientProvider client={appQueryClient}>
      <SafeAreaProvider>
        <ThemeProvider source="system" systemScheme={scheme === 'dark' ? 'dark' : 'light'}>
          <I18nProvider systemLocale={systemLocale}>
            {/* ToastProvider 只提供 context，**不渲染展示层** —— 展示在 ThemedShell 里，
                因为 insets 只能在 SafeAreaProvider 内部取到（见 GlobalOverlays 的注释） */}
            <ToastProvider>
              {/* 会话（P1-13）：注入同步 token 读取器 + 冷启动水合；页面用 useSession() */}
              <SessionProvider>
                <ThemedShell>
                  {/*
                    顶栏由我们自己的 TopBar 提供（标题 + 唯一动作），故 Stack 默认不显示原生 header。
                    ⚠️ 详情页的顶栏仍应交给原生导航栏（宪法 4.3）—— 那属于 Phase 2 的逐页口径。
                  */}
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    {/* 推入式全屏目的地：进入后隐藏 Tab 栏（宪法 4.7-2 / 4.9.2） */}
                    <Stack.Screen name="publish-center" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="mailbox" />
                    {/* 登录最小链路（P1-13）；完整 `P15` 鉴权原型属后续任务 */}
                    <Stack.Screen name="login" />
                  </Stack>
                  <GlobalOverlays />
                </ThemedShell>
              </SessionProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
