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
import * as Localization from 'expo-localization';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design-system/theme';
import { I18nProvider, normalizeLocale } from '@/i18n';

/** 全局唯一描边宽度（宪法 16.5-2：1857 个图标全部按 24×24 网格 / stroke 2 设计，无例外） */
export const ICON_STROKE_WIDTH = 2;

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
    <SafeAreaProvider>
      <ThemeProvider source="system" systemScheme={scheme === 'dark' ? 'dark' : 'light'}>
        <I18nProvider systemLocale={systemLocale}>
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
            </Stack>
          </ThemedShell>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
