/**
 * 底栏布局（五格）—— 一级导航的挂载点。
 *
 * 这里只做三件事：取词、把"第 5 格被点"接到发布中心、渲染原生底栏。
 * ⛔ 不在这里画任何 Tab 视觉（宪法 4.3：底栏交原生容器）。
 */

import * as React from 'react';
import { usePathname, useRouter } from 'expo-router';

import { useI18n } from '@/i18n';
import { NativeTabBar } from '@/features/navigation/nativeTabs';
import {
  PUBLISH_CENTER_ROUTE,
  TAB_DEFINITIONS,
  TAB_BAR_HEIGHT,
  type TabKey,
} from '@/features/navigation/tabConfig';
import {
  INITIAL_PUBLISH_CENTER_STATE,
  closePublishCenter,
  requestOpenPublishCenter,
} from '@/features/navigation/publishCenterGate';

/** 底栏高度常量导出给各屏（S5：内容底部留白用它，**不叠加** insets.bottom） */
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT;

export default function TabsLayout(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const gateRef = React.useRef(INITIAL_PUBLISH_CENTER_STATE);

  const labels = React.useMemo(() => {
    const out = {} as Record<TabKey, string>;
    for (const tab of TAB_DEFINITIONS) {
      out[tab.key] = t(tab.a11yLabelKey);
    }
    return out;
  }, [t]);

  // 第 5 格：已被原生 `disabled` 拦下导航 → 打开发布中心（底栏选中态不变）
  // ⛔ 重复点击不叠加（4.4.4）：由 publishCenterGate 去重，不是靠"点了就当没点"
  const openPublishCenter = React.useCallback(() => {
    const { next, shouldOpen } = requestOpenPublishCenter(gateRef.current, { tab: pathname });
    gateRef.current = next;
    if (shouldOpen) {
      router.push(PUBLISH_CENTER_ROUTE);
    }
  }, [pathname, router]);

  // 离开发布中心 → 复位状态：导航栈本身已保留一级/二级 Tab 与滚动位置，
  // 这里只负责把"上次从哪里打开"的簿记清掉（4.9.2-② 的实现前提）
  React.useEffect(() => {
    if (pathname !== PUBLISH_CENTER_ROUTE && gateRef.current.open) {
      gateRef.current = closePublishCenter(gateRef.current).next;
    }
  }, [pathname]);

  return <NativeTabBar labels={labels} onActionPress={openPublishCenter} />;
}
