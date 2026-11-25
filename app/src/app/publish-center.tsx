/**
 * 发布中心（P-01）—— 中央发布格的落点，**推入式全屏目的地**（宪法 4.9.2）。
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

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { formRouteFor, visibleEntries } from '@/features/publish/registry';
import { getPublishIcon } from '@/features/publish/icons';
import { useViewer } from '@/features/publish/useViewer';

export default function PublishCenterScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  /**
   * viewer 真源（P2A-02）：登录态取会话，能力布尔取后端列表字段，**拿不到就 fail-closed**。
   * ⛔ 本文件**不做任何权限推断**（4.9.5-3）—— 判断只允许出现在 `features/publish/viewer.ts`。
   */
  const { viewer } = useViewer();

  const entries = React.useMemo(() => visibleEntries(viewer), [viewer]);

  const openForm = React.useCallback(
    (id: string) => {
      // 关闭发布中心 → 再进表单：返回时仍落回点击中央发布格之前的位置（4.9.2-②）
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
      {/* 原型 Publish：两列入口卡（仍 100% 由注册表驱动） */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_3'), padding: theme.space('space_4') }}>
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
                flexBasis: '45%',
                flexGrow: 1,
                minHeight: theme.touchTarget,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space('space_3'),
                padding: theme.space('space_4'),
                borderRadius: theme.radius('radius_large'),
                backgroundColor: theme.color['bg-surface'].value,
              }}
            >
              {Icon ? (
                <View style={{ padding: theme.space('space_2'), borderRadius: theme.radius('radius_medium'), backgroundColor: theme.color['bg-sunken'].value }}>
                  <Icon size={theme.space('space_6')} color={theme.color['icon-brand'].value} />
                </View>
              ) : null}
              <Text role="body" emphasis="strong" colorToken="text-primary" style={{ flex: 1 }} numberOfLines={2}>
                {t(entry.titleKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
