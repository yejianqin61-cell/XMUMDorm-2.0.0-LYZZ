/**
 * WallSampleBand —— 阶段 1 的**示例信息流**（只读样板）
 *
 * 放在开发预览页，用于实机验收"两种帖子混排、信息密度、匿名外壳"。
 * 顶部说明整段为示例，样板卡片没有详情入口。
 */

import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { WallPostCard } from './WallPostCard';
import { WALL_SAMPLE_POSTS } from './wallSamplePosts';

export function WallSampleBand(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  return (
    <View testID="wall-sample-band" style={{ paddingTop: theme.space('space_2') }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space('space_4'),
          paddingBottom: theme.space('space_2'),
        }}
      >
        <Text testID="wall-sample-notice" role="caption" colorToken="text-muted" style={{ flex: 1 }}>
          {t('wall.feed.sampleNotice')}
        </Text>
      </View>
      {WALL_SAMPLE_POSTS.map((post) => (
        <WallPostCard key={post.id} post={post} />
      ))}
    </View>
  );
}
