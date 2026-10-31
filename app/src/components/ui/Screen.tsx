/**
 * Screen —— **全 App 唯一的安全区容器**（宪法 17.1-S2）
 *
 * 页面**只声明意图**，不碰 insets：
 *   - `topMode`：`topbar`（要顶栏）/ `overlay`（覆盖层自处理）/ `none`
 *   - `bottomMode`：`tabbar`（底部留白归原生 Tab 栏）/ `own`（本屏自己的粘性底栏）/ `none`
 *   - `keyboard`：键盘弹出时是否避让（S6 合并计算）
 *   - `footer`：**粘性底栏**（评论输入条等）。给了它以后底部留白全归本容器算：
 *     内容区不再吃键盘 padding，底栏自己吃「键盘高度（弹出时）/ insets.bottom（收起时）」
 *     —— S6 的"键盘与 insets 合并"仍然只有**这一处**实现，页面不重复算键盘。
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

/**
 * 覆盖层的**可选**取用入口（S7）：在 `Screen` 内返回容器算好的 insets，
 * 不在 `Screen` 内返回 `null` —— 覆盖层可据此退回纯主题间距，而不是整屏崩掉。
 * ⚠️ 与 `useScreenInsets` 一样，**不得**用它绕开唯一容器去自己读原生 insets。
 */
export function useOptionalScreenInsets(): ResolvedInsets | null {
  return React.useContext(ScreenInsetsContext);
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
  /** 顶栏是否显示旧信箱动作（默认不显示；消息格是唯一一级入口） */
  showMailbox?: boolean;
  unreadCount?: number;
  onMailboxPress?: () => void;
  /** 已登记的顶栏动作；页面不得用它堆放导航入口。 */
  topBarActions?: React.ReactNode;
  /** 原生 Tab 栏高度（不含 insets）—— 只有 `bottomMode='tabbar'` 时生效（S5） */
  tabBarHeight?: number;
  /** 内容是否可滚动（详情/列表骨架用）；默认 false，骨架由具体页面决定 */
  scroll?: boolean;
  /**
   * 粘性底栏（评论输入条 / 常驻动作条）。
   * ⚠️ 给了它以后 `bottomMode` 被忽略（底部留白归底栏）：内容区不再叠加键盘 padding，
   *    底栏自己按「键盘高度（弹出时）/ insets.bottom（收起时）」留白（S6 合并计算）。
   */
  footer?: React.ReactNode;
  /**
   * 覆盖层形态的自有顶栏（S7）：`topMode='overlay'` 时由本容器负责把 insets 注入给它，
   * 覆盖层只提供 UI，⛔ 不自己读 insets。典型用法：发布中心的关闭行。
   */
  headerOverlay?: React.ReactNode;
  /**
   * **自定义顶栏**（2026-10-18 所有者裁决：广场首页去掉 `广场` 面包屑，换成品牌头）。
   *
   * 给了它以后：
   *   - 仍由本容器施加 `headerPaddingTop`（S1/S2：insets 只有本文件算），背景铺到屏幕顶边；
   *   - 不再渲染默认 `TopBar`；`titleKey` 被忽略（⛔ 不要同时给两个头）。
   * 这不是"顶栏第二套实现"：视觉由传入的页面级组件提供，安全区仍只有这一处。
   */
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

/** footer 的底部留白（S6）：键盘弹出 → 键盘高度（已覆盖手势条区域，⛔ 不再加 inset）；收起 → insets.bottom */
export function resolveFooterBottomPadding(keyboardHeight: number, bottomInset: number): number {
  const keyboard = Number.isFinite(keyboardHeight) && keyboardHeight > 0 ? keyboardHeight : 0;
  if (keyboard > 0) return keyboard;
  return Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0;
}

export function Screen({
  titleKey,
  topMode,
  bottomMode = 'none',
  showMailbox = false,
  unreadCount = 0,
  onMailboxPress,
  topBarActions,
  header,
  tabBarHeight,
  scroll = false,
  footer,
  headerOverlay,
  style,
  children,
  testID,
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const theme = useTheme();
  const hasFooter = footer !== undefined && footer !== null;
  const hasHeader = header !== undefined && header !== null;
  // 「要顶栏」的两种来源：有标题（默认 TopBar）或有自定义头；显式 topMode 仍然优先
  const resolvedTopMode: TopMode = topMode ?? (titleKey || hasHeader ? 'topbar' : 'none');

  const resolved = resolveInsets({
    insets,
    topMode: resolvedTopMode,
    // footer 自己承担底部留白 → 内容区不再按 bottomMode/键盘留白（避免双倍底部空白）
    bottomMode: hasFooter ? 'none' : bottomMode,
    keyboardHeight: hasFooter ? 0 : keyboardHeight,
    tabBarHeight,
    contentWidth: width,
  });
  const footerBottomPadding = hasFooter
    ? resolveFooterBottomPadding(keyboardHeight, resolved.insets.bottom)
    : 0;

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
        style={[{ flex: 1, minHeight: 0, backgroundColor: theme.color['bg-canvas']['value'] }, style]}
      >
      {resolvedTopMode === 'topbar' && hasHeader ? (
        // 自定义头：背景同样铺到屏幕顶边，内容从真实 inset 之下开始（S1 / 17.2-1）
        <View
          testID="screen-header"
          style={{
            paddingTop: resolved.headerPaddingTop,
            backgroundColor: theme.color['bg-canvas']['value'],
          }}
        >
          {header}
        </View>
      ) : resolvedTopMode === 'topbar' && titleKey ? (
        <TopBar
          titleKey={titleKey}
          headerPaddingTop={resolved.headerPaddingTop}
          showMailbox={showMailbox}
          unreadCount={unreadCount}
          onMailboxPress={onMailboxPress}
          rightActions={topBarActions}
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
        {hasFooter ? (
          <View
            testID="screen-footer"
            style={{
              // 底栏背景一路铺到底（含安全区/键盘让位区），避免"输入条下面露出画布色"
              backgroundColor: theme.color['bg-surface'].value,
              paddingLeft: resolved.contentPaddingLeft,
              paddingRight: resolved.contentPaddingRight,
              paddingBottom: footerBottomPadding,
            }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </ScreenInsetsContext.Provider>
  );
}
