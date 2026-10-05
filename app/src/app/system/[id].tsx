/**
 * 校方系统宿主页（T-04 → T-05 的接线）
 *
 * **这也是 R3 spike 在真机上要跑的那个页面**：
 *   打开 → 学号登录 → 杀进程重启看会话是否保持 → 在 AC 的课表页触发读表 → 看回传的行。
 *
 * 三种打开方式（宪法 4.1.2-1）：
 *   `webview`  内嵌（AC = 学号登录，主链路）
 *   `external` 系统浏览器（**仅当该系统走 Google SSO** —— Google 禁止嵌入 webview 做 OAuth）
 * 未知 id → 重定向回工具 Tab（⛔ 不留死路由、⛔ 不显示技术性文案）
 */
import * as React from 'react';
import { Linking, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import X from 'lucide-react-native/icons/x';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { useI18n } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import { extractScheduleFromMessage } from '@/features/tools/extractSchedule';
import { SchoolSystemWebView } from '@/features/tools/SchoolSystemWebView';
import {
  getSchoolSystem,
  resolveEmbedMode,
  type SchoolSystemId,
} from '@/features/tools/schoolSystems';

export default function SchoolSystemScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const system = getSchoolSystem(params.id as SchoolSystemId);
  const mode = system ? resolveEmbedMode(system) : 'webview';

  // 降级为系统浏览器：副作用放 effect 里，⛔ 不在渲染期调 Linking
  React.useEffect(() => {
    if (system && mode === 'external') {
      void Linking.openURL(system.startUrl);
    }
  }, [system, mode]);

  if (!system) {
    return <Redirect href="/tools" />;
  }

  const close = () => router.back();

  return (
    <Screen
      testID={`screen-school-system-${system.id}`}
      topMode="overlay"
      bottomMode="own"
      headerOverlay={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: theme.space('space_4'),
          }}
        >
          <Text role="headline" emphasis="strong" colorToken="text-primary">
            {t(system.titleKey)}
          </Text>
          <IconButton
            testID="school-system-close"
            Icon={X}
            accessibilityLabel={t('action.close')}
            onPress={close}
          />
        </View>
      }
    >
      {mode === 'webview' ? (
        <SchoolSystemWebView
          testID={`webview-${system.id}`}
          system={system}
          scrapeSchedule={system.id === 'ac'}
          onScheduleMessage={(raw) => {
            // Phase 0：只验证管道通不通（把行数打到控制台）
            // Phase 1：交给 POST /schedule/import/preview
            const extracted = extractScheduleFromMessage(raw);
            if (extracted && __DEV__) {
              console.warn(`[R3] 读到课表 ${extracted.rows.length} 行`);
            }
          }}
        />
      ) : null}
    </Screen>
  );
}
