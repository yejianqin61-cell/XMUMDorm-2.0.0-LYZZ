/**
 * Screen —— **全 App 唯一的安全区容器**（宪法 17.1-S2）
 *
 * 页面**只声明意图**，不碰 insets：
 *   - `topMode`：`topbar`（要顶栏）/ `overlay`（覆盖层自处理）/ `none`
 *   - `bottomMode`：`tabbar`（底部留白归原生 Tab 栏）/ `own`（本屏自己的粘性底栏）/ `none`
 *   - `keyboard`：键盘弹出时是否避让（S6 合并计算）
 *
 * ⛔ 违反 S2 的表现：页面里自己写 `useSafeAreaInsets()` / 自己加 `paddingTop`
 *   —— 本文件的 `useSafeAreaInsets()` 是**除根布局外唯一**的调用点。
 * ⛔ 违反 S3 的表现：使用 RN 内置 `SafeAreaView`（官方已标 Deprecated 且仅 iOS 生效）。
 */

import * as React from 'react';
import {
  Keyboard,
  ScrollView,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MessageKey } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import {
  resolveInsets,
  type BottomMode,
  type ResolvedInsets,
  type TopMode,
} from '@/design-system/safe-area';
import { TopBar } from './TopBar';

/**
 * Screen 把**算好的 insets** 通过上下文交给子树（S2 + S7 的接缝）：
 * 覆盖层（模态 / Sheet / Toast / 全屏 WebView）**需要** insets，但 ⛔ 不得再调用
 * `useSafeAreaInsets()`（那会让"唯一容器"名存实亡）→ 从本上下文取。
 */
const ScreenInsetsContext = React.createContext<ResolvedInsets | null>(null);

export function useScreenInsets(): ResolvedInsets {
  const value = React.useContext(ScreenInsetsContext);
  if (value === null) {
    throw new Error('useScreenInsets 必须在 Screen 内使用：insets 只能由唯一安全区容器提供（宪法 17.1-S2）');
  }
  return value;
}

/** 键盘高度（S6 的输入来源）。⛔ 不使用 `KeyboardAvoidingView` 的隐式行为，避免两端不一致 */
function useKeyboardHeight(): number {
  const [height, setHeight] = React.useState(0);
  React.useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}

export type ScreenProps = {
  /** 顶栏标题（一级 Tab 用格名） */
  titleKey?: MessageKey;
  topMode?: TopMode;
  bottomMode?: BottomMode;
  /** 顶栏是否显示信箱唯一动作（默认显示，宪法 4.7-3 常态可见） */
  showMailbox?: boolean;
  unreadCount?: number;
  onMailboxPress?: () => void;
  /** 原生 Tab 栏高度（不含 insets）—— 只有 `bottomMode='tabbar'` 时生效（S5） */
  tabBarHeight?: number;
  /** 内容是否可滚动（详情/列表骨架用）；默认 false，骨架由具体页面决定 */
  scroll?: boolean;
  /**
   * 覆盖层形态的自有顶栏（S7）：`topMode='overlay'` 时由本容器负责把 insets 注入给它，
   * 覆盖层只提供 UI，⛔ 不自己读 insets。典型用法：发布中心的关闭行。
   */
  headerOverlay?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export function Screen({
  titleKey,
  topMode = titleKey ? 'topbar' : 'none',
  bottomMode = 'none',
  showMailbox = true,
  unreadCount = 0,
  onMailboxPress,
  tabBarHeight,
  scroll = false,
  headerOverlay,
  style,
  children,
  testID,
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const theme = useTheme();

  const resolved = resolveInsets({
    insets,
    topMode,
    bottomMode,
    keyboardHeight,
    tabBarHeight,
    contentWidth: width,
  });

  const content = (
    <View
      testID="screen-content"
      style={{
        flexGrow: 1,
        flex: scroll ? undefined : 1,
        minHeight: 0,
        paddingLeft: resolved.contentPaddingLeft,
        paddingRight: resolved.contentPaddingRight,
        paddingBottom: resolved.contentBottomPadding + resolved.keyboardPadding,
        maxWidth: resolved.maxContentWidth ?? undefined,
        alignSelf: resolved.maxContentWidth ? 'center' : undefined,
        width: '100%',
      }}
    >
      {children}
    </View>
  );

  return (
    <ScreenInsetsContext.Provider value={resolved}>
      <View
        testID={testID}
        style={[{ flex: 1, minHeight: 0, backgroundColor: theme.color['bg-canvas'].value }, style]}
      >
      {topMode === 'topbar' && titleKey ? (
        <TopBar
          titleKey={titleKey}
          headerPaddingTop={resolved.headerPaddingTop}
          showMailbox={showMailbox}
          unreadCount={unreadCount}
          onMailboxPress={onMailboxPress}
        />
      ) : null}
      {topMode === 'overlay' && headerOverlay ? (
        // S7：覆盖层自己处理 insets —— 但**由本容器注入**，覆盖层不自己读（S2）
        <View style={{ paddingTop: resolved.overlayPaddingTop }}>{headerOverlay}</View>
      ) : null}
        {scroll ? (
          <ScrollView
            // S8：两端默认行为不同（iOS 会自动调整内容内边距）→ 显式统一
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </View>
    </ScreenInsetsContext.Provider>
  );
}
