/**
 * WallSampleBand —— 阶段 1 的**示例信息流**（只读样板）
 *
 * 放在万能墙真实列表的头部，用于实机验收"两种帖子混排、信息密度、匿名外壳"。
 * 三条纪律：
 *   1. 顶部有说明条、每张卡有「示例」标签 —— ⛔ 不把样板伪装成真实投稿；
 *   2. 示例帖没有 `onPress`，点了不会进入详情；
 *   3. 阶段 2 接入真实自由帖发布后删除本文件与 `wallSamplePosts.ts`。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { WallPostCard } from './WallPostCard';
import { WALL_SAMPLE_POSTS } from './wallSamplePosts';

export function WallSampleBand(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  return (
    <View testID="wall-sample-band" style={{ paddingTop: theme.space('space_2') }}>
      {/*
        * 说明条 + 「模板预览」入口：
        * 预览页是节点 A 的视觉实验页（五种模板 / 换一批），随示例流一起在节点 B 删除。
        */}
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
        <Button
          testID="wall-poster-lab-entry"
          variant="link"
          size="small"
          label={t('wall.poster.entry')}
          onPress={() => router.push('/dev/wall-poster' as never)}
        />
      </View>
      {WALL_SAMPLE_POSTS.map((post) => (
        <WallPostCard key={post.id} post={post} />
      ))}
    </View>
  );
}
