/**
 * 发布中心（P-01）—— 第 5 格的落点，**推入式全屏目的地**（宪法 4.9.2）。
 *
 * **条目 100% 来自注册表**（`features/publish/registry.ts`）：
 *   ⛔ 本文件**不得**出现任何硬编码的发布类型数组/按钮列表（4.9.5）。
 *   新增一类发布 = 注册表加一条 + 图标表加一行（见 `features/publish/icons.ts` 的说明）。
 *
 * S7：这是覆盖层，insets 由 `Screen` 注入（`topMode='overlay'` / `bottomMode='own'`）。
 */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import X from 'lucide-react-native/icons/x';
import ChevronRight from 'lucide-react-native/icons/chevron-right';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { formRouteFor, visibleEntries, type Viewer } from '@/features/publish/registry';
import { getPublishIcon } from '@/features/publish/icons';

/**
 * ⚠️ **Phase 0 占位观看者**：登录态与后端布尔字段尚未接入（A-02/A-05 在 Phase 2）。
 * `canManageClub: false` 是**刻意的**：它让"权限过滤真的在生效"这件事在内测前就可见。
 * Phase 2 起改为从 auth 上下文读，⛔ 不得改成"UI 自行推断权限"（4.9.5-3）。
 */
const PHASE0_VIEWER: Viewer = { signedIn: true, canManageClub: false };

export default function PublishCenterScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const entries = React.useMemo(() => visibleEntries(PHASE0_VIEWER), []);

  const openForm = React.useCallback(
    (id: string) => {
      // 关闭发布中心 → 再进表单：返回时仍落回点击第 5 格之前的位置（4.9.2-②）
      router.push(formRouteFor(id as Parameters<typeof formRouteFor>[0]));
    },
    [router]
  );

  return (
    <Screen
      testID="screen-publish-center"
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
            {t('publish.title')}
          </Text>
          <IconButton
            testID="publish-center-close"
            Icon={X}
            accessibilityLabel={t('action.close')}
            onPress={() => router.back()}
          />
        </View>
      }
    >
      <View style={{ paddingTop: theme.space('space_2') }}>
        {entries.map((entry) => {
          const Icon = getPublishIcon(entry.icon);
          return (
            <Pressable
              key={entry.id}
              testID={`publish-entry-${entry.id}`}
              onPress={() => openForm(entry.id)}
              // 16.2-4：图标不得承担唯一语义 → 必须同时有文字标签
              accessibilityRole="button"
              accessibilityLabel={t(entry.titleKey)}
              style={{
                minHeight: theme.touchTarget,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: theme.space('space_4'),
                paddingRight: theme.space('space_2'),
              }}
            >
              {Icon ? (
                <View style={{ width: theme.space('space_6'), alignItems: 'center' }}>
                  <Icon size={theme.space('space_6')} color={theme.color['icon-primary'].value} />
                </View>
              ) : null}
              <Text role="body" colorToken="text-primary" style={{ flex: 1, marginLeft: theme.space('space_3') }}>
                {t(entry.titleKey)}
              </Text>
              <ChevronRight
                size={theme.space('space_6')}
                color={theme.color['icon-secondary'].value}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
