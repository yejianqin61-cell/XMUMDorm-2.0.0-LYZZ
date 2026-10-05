/**
 * 发布中心（P-01）—— 第 5 格的落点，**推入式全屏目的地**（宪法 4.9.2）。
 *
 * Phase 0 只立骨架：覆盖层自有顶栏（标题 + 关闭）+ 空的内容区。
 * **条目由 P0-07 以"注册表驱动"的方式填入**（⛔ 不得硬编码按钮列表，4.9.5）。
 *
 * S7：这是覆盖层，insets 由 `Screen` 注入（`topMode='overlay'` / `bottomMode='own'`），
 *     本文件**不**调用 `useSafeAreaInsets()`。
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import X from 'lucide-react-native/icons/x';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

export default function PublishCenterScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const close = React.useCallback(() => {
    // 关闭 → 回到点击前的**一级 Tab + 二级 Tab + 滚动位置**（4.9.2-②）；
    // 导航栈本身保留了这些状态，所以这里只需要正常出栈。
    router.back();
  }, [router]);

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
            onPress={close}
          />
        </View>
      }
    />
  );
}
