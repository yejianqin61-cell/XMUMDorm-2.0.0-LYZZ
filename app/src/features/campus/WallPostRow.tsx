/** Anonymous wall reading row. The content opens the existing detail actions. */
import * as React from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import type { Post } from './campusModel';
import { WallTemplateBody, wallTemplateLabel } from './wallTemplates';

export function WallPostRow({ post, onOpen }: { post: Post; onOpen: () => void }): React.ReactElement {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const time = post.created_at ? formatPostTime(post.created_at, { locale }) : '';
  return (
    <Pressable
      testID={`campus-row-${post.id}`}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${wallTemplateLabel(t, post.template_key)}\n${post.content}`}
      contentAlign="stretch"
      // 2026-10-31 所有者：整条卡片不做按压变灰（滑动时误触会一闪一闪）；跳转保留
      feedback="none"
      style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_3'), gap: theme.space('space_2') }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
        <Text role="caption" colorToken="text-secondary">{t('screen.campus.read.anonymous')}</Text>
        {time ? <Text testID={`wall-row-time-${post.id}`} role="caption" colorToken="text-muted">{time}</Text> : null}
      </View>
      <WallTemplateBody templateKey={post.template_key} content={post.content} />
    </Pressable>
  );
}
