/**
 * 发布表单承载页（**一条动态路由承载全部发布表单**）
 *
 * 为什么不是"每类发布一个路由文件"：宪法 9.2 要求表单做成**参数化框架**
 * （表单与列表是最大的两个桶，合计 37.9%）→ 一条动态路由 + 描述符注册表。
 *
 * 三个分支（实现都在 `features/publish/PublishFormHost.tsx`）：
 *   1. **未知 type** → 重定向回发布中心，⛔ 不显示"未知类型"这类技术性文案（10.4）；
 *   2. 描述符已交付 → 宿主（`K01 Form` + `usePublishForm`）；
 *   3. 已注册但描述符未交 → "暂未开放"业务空态（缺口账本盯着它逐条变短）。
 *
 * ⛔ 提交链路必须过 A-05 门禁（宪法 4.9.8 / 12.2）—— 见 `features/publish/complianceGate.ts`。
 */
import * as React from 'react';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';

import { Icon } from '@/components/ui/Icon';
import { ListItem } from '@/components/ui/ListItem';
import MessageSquare from 'lucide-react-native/icons/message-square';
import UsersRound from 'lucide-react-native/icons/users-round';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { WallWriteScreen } from '@/features/campus/WallWriteScreen';
import { PUBLISH_CENTER_ROUTE } from '@/features/navigation/tabConfig';
import { getPublishEntry, type PublishId } from '@/features/publish/registry';
import { getPublishDescriptor } from '@/features/publish/descriptors';
import {
  PublishFormHost,
  PublishUnavailable,
} from '@/features/publish/PublishFormHost';

export default function PublishFormRoute(): React.ReactElement {
  const params = useLocalSearchParams<{ type?: string; edit?: string; postKind?: string }>();
  const entry = getPublishEntry(params.type as PublishId);

  if (!entry) {
    return <Redirect href={PUBLISH_CENTER_ROUTE} />;
  }

  if (entry.id === 'wall') {
    if (params.edit !== undefined || params.postKind === 'free') {
      return <WallWriteScreen edit={params.edit} />;
    }
    return <WallPostKindPicker />;
  }

  const descriptor = getPublishDescriptor(entry.id);
  if (!descriptor) {
    return <PublishUnavailable titleKey={entry.titleKey} />;
  }

  return <PublishFormHost descriptor={descriptor} />;
}


function WallPostKindPicker(): React.ReactElement {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Screen testID="wall-post-kind-picker" bottomMode="none" header={(
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space('space_2') }}>
        <IconButton Icon={ArrowLeft} accessibilityLabel={t('action.back')} onPress={() => router.back()} />
        <Text role="headline" emphasis="strong">{t('publish.entry.wall')}</Text>
      </View>
    )}>
      <View style={{ paddingTop: theme.space('space_2') }}>
        <ListItem
          testID="publish-wall-free"
          title={t('publish.wall.free')}
          subtitle={t('publish.wall.freeDescription')}
          leading={<Icon source={MessageSquare} size="body" tint="primary" />}
          onPress={() => router.push({
            pathname: '/publish/[type]',
            params: { type: 'wall', postKind: 'free' },
          })}
        />
        <ListItem testID="publish-wall-recruit" title={t('publish.wall.recruit')}
          subtitle={t('publish.wall.recruitDescription')}
          leading={<Icon source={UsersRound} size="body" tint="secondary" />}
          meta={t('publish.wall.comingSoon')} variant="action" disabled />
      </View>
    </Screen>
  );
}
