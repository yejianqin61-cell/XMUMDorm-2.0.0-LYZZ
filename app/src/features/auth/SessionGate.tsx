/**
 * `SessionGate`（`A-01`）—— 启动位 + 会话门，挂在**根布局**
 *
 * ## 为什么在根布局
 * ⛔ 不挂在页面里：那样每个页面都要判一次，而且既有的切片用例是**裸渲染页面**的
 *    （`p1-14/15/16/17`），页面里加门会把它们全弄红。门只挂一次，页面保持纯粹。
 *
 * ## ⛔ 不新增 `useSafeAreaInsets()` 调用点
 * 宪法 17.1-S2 只允许**两处**（`Screen` 与根布局）。启动位是根布局里的覆盖层，
 * 所以它的 insets 由**根布局算好的值当 prop 传进来**（与 `ToastHost` 同一条路），
 * 本文件不 import `react-native-safe-area-context`。
 *
 * ## 启动位长什么样
 * 页面清单 `A-01` 的关键组件是 `Surface` + `T03 LoadingState` → 品牌位用 `Surface` 承载应用名，
 * 下面挂一个 spinner；整块在**安全区内居中**（骨架规范 §6.3：logo 必须在安全区内居中）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { LoadingState } from '@/components/ui/LoadingState';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { resolveGateAction, routeRequiresAuth } from './gate';
import { useSession } from './session';

export type SessionGateProps = {
  /** 顶部 inset（由根布局传入；⛔ 本组件不自己读） */
  topInset: number;
  /** 底部 inset（同上） */
  bottomInset: number;
};

export function SessionGate({ topInset, bottomInset }: SessionGateProps): React.ReactElement | null {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const action = resolveGateAction(status, routeRequiresAuth(pathname));

  React.useEffect(() => {
    // ⛔ 水合期间绝不跳转（那就是"闪一下登录页"）
    if (action !== 'toLogin') return;
    if (pathname === '/login') return;
    router.replace('/login');
  }, [action, pathname, router]);

  if (action !== 'splash') return null;

  return <SessionSplash topInset={topInset} bottomInset={bottomInset} />;
}

/**
 * 启动位本身（`A-01` 的视觉）。
 * ⚠️ 单独拆出来是为了**可测**：水合是异步的，`renderApp` 返回时状态往往已经是 `signedOut`，
 *   所以"启动位长什么样"没法通过门来断言 —— 直接把这一块渲染出来测。
 */
export function SessionSplash({ topInset, bottomInset }: SessionGateProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View
      testID="session-splash"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.color['bg-canvas'].value,
        paddingTop: topInset,
        paddingBottom: bottomInset,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space('space_6'),
      }}
    >
      <Surface testID="splash-brand" variant="brandSoft" rounded="radius_large" padding="space_6">
        <Text role="display" emphasis="strong" colorToken="text-brand">
          {t('auth.splash')}
        </Text>
      </Surface>
      <LoadingState testID="splash-loading" variant="spinner" />
    </View>
  );
}
