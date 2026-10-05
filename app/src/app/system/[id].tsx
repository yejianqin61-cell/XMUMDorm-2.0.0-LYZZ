/**
 * 校方系统宿主页（`T-05` 内嵌浏览器 · 原型 `P18`）
 *
 * **这也是 R3 在真机上要观察的那个页面**（所有者 2026-10-02 裁决：形态已定，不做验证前置）：
 *   打开 → 学号登录 → 杀进程重启看会话是否保持 → 在 AC 的课表页触发读表 → 看回传的行。
 *
 * P1-14 在这一页补了三件：
 *   1. **会话探测**：每次加载 / 每次导航结束都问一次"这页是不是登录页"（有没有密码框），
 *      结果写进 `T-04` 的三态（⛔ 不猜登录 URL，见 `schoolSession.ts` 的说明）；
 *   2. **工具栏的「读取本页课表」**（仅 AC）：命令式调 WebView 再注入一次读表脚本
 *      —— 用户多半是"先进到课表页、再点读表"，而注入只在文档结束时跑一次，靠不住；
 *   3. **读表结果如实回显**：读到几行 / 这一页没有表（`InlineNotice`），⛔ 不弹对话框。
 *
 * 两种打开方式（宪法 4.1.2-1）：
 *   `webview`  内嵌 —— **当前三个系统全部走这条**（所有者确认：学校所有系统都是学号登录）
 *   `external` 系统浏览器（**仅当该系统走 Google SSO**；当前无系统命中，为防御性分支）
 * 未知 id → 重定向回工具 Tab（⛔ 不留死路由、⛔ 不显示技术性文案）
 */
import * as React from 'react';
import { Linking, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import X from 'lucide-react-native/icons/x';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { useI18n } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import { extractScheduleFromMessage, toTabSeparated } from '@/features/tools/extractSchedule';
import {
  SchoolSystemWebView,
  type SchoolSystemWebViewHandle,
} from '@/features/tools/SchoolSystemWebView';
import {
  getSchoolSystem,
  resolveEmbedMode,
  type SchoolSystemId,
} from '@/features/tools/schoolSystems';
import { useSchoolSessions } from '@/features/tools/schoolSession';

export default function SchoolSystemScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const system = getSchoolSystem(params.id as SchoolSystemId);
  const mode = system ? resolveEmbedMode(system) : 'webview';
  const sessions = useSchoolSessions();
  const webRef = React.useRef<SchoolSystemWebViewHandle>(null);

  /** `null` = 还没读过；`rows` 为空 = 这一页没有表 */
  const [schedule, setSchedule] = React.useState<{ rowCount: number; text: string } | null>(null);

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
  const isScheduleSystem = system.id === 'ac';

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
            gap: theme.space('space_2'),
          }}
        >
          <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
            {t(system.titleKey)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
            {/* 只在课表系统上给这个动作（其余系统没有表可读） */}
            {isScheduleSystem && mode === 'webview' ? (
              <Button
                testID="school-read-schedule"
                label={t('tools.readSchedule')}
                variant="link"
                size="small"
                onPress={() => webRef.current?.readSchedule()}
              />
            ) : null}
            <IconButton
              testID="school-system-close"
              Icon={X}
              accessibilityLabel={t('action.close')}
              onPress={close}
            />
          </View>
        </View>
      }
    >
      {/* 读表结果如实回显（⛔ 不弹对话框；成功不弹、失败也说清是哪一种） */}
      {schedule !== null ? (
        <View style={{ paddingHorizontal: theme.space('space_4') }}>
          <InlineNotice
            testID="school-schedule-notice"
            tone={schedule.rowCount > 1 ? 'success' : 'warning'}
            message={
              schedule.rowCount > 1
                ? t('tools.schedule.scraped', { rows: schedule.rowCount })
                : t('tools.schedule.none')
            }
            /* 读到了就顺手给"去确认"——T-03 的父页正是本页（页面清单 `T-03` 父 = `T-02`/`T-05`） */
            actionLabel={schedule.rowCount > 1 ? t('import.title') : undefined}
            onAction={
              schedule.rowCount > 1
                ? () =>
                    router.push({
                      pathname: '/tools/schedule-import',
                      params: { text: schedule.text },
                    })
                : undefined
            }
          />
        </View>
      ) : null}

      {mode === 'webview' ? (
        <SchoolSystemWebView
          ref={webRef}
          testID={`webview-${system.id}`}
          system={system}
          scrapeSchedule={isScheduleSystem}
          onSessionProbe={(probe) => {
            // 写进 T-04 的三态；⛔ 这里不判"要不要清令牌"——校方会话与我们无关
            void sessions.markProbe(system.id, probe);
          }}
          onScheduleMessage={(raw) => {
            const extracted = extractScheduleFromMessage(raw);
            // 行 → 制表符文本（给 `T-03` 的预览接口用；⛔ 不在本页解析课程）
            setSchedule(
              extracted && extracted.rows.length > 1
                ? { rowCount: extracted.rows.length, text: toTabSeparated(extracted.rows) }
                : { rowCount: extracted ? extracted.rows.length : 0, text: '' }
            );
          }}
        />
      ) : null}
    </Screen>
  );
}
