/**
 * 「校园在热议」（原型 Main · R4-17）：今日页底部放一条当前最热的树洞，点开进详情。
 * 取第一页里「评论 ×2 + 赞」最高的一条；拿不到或没有就整块不画（⛔ 首页不为它摆错误态）。
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Pressable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { asPost } from '@/features/campus/campusModel';
import { toTreeholePostViewModel, type TreeholePostViewModel } from '@/features/campus/treeholePostViewModel';
import { getPostList } from '../../../../shared/api/posts';

export function pickHotPost(posts: readonly TreeholePostViewModel[]): TreeholePostViewModel | null {
  const score = (p: TreeholePostViewModel) => (p.commentCount ?? 0) * 2 + (p.likeCount ?? 0);
  return posts.reduce<TreeholePostViewModel | null>((best, p) => (best === null || score(p) > score(best) ? p : best), null);
}

export function HotPostCard(): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [post, setPost] = React.useState<TreeholePostViewModel | null>(null);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getPostList({ page: 1, pageSize: 10 });
        const rows = (Array.isArray(data?.list) ? data.list : []).flatMap((row: unknown) => {
          try { return [toTreeholePostViewModel(asPost(row))]; } catch { return []; }
        });
        if (active) setPost(pickHotPost(rows));
      } catch { /* 热帖是锦上添花：失败就不显示 */ }
    })();
    return () => { active = false; };
  }, []);

  if (post === null) return null;
  return (
    <View testID="today-hot" style={{ gap: theme.space('space_2') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader title={t('square.today.hot')} />
        <Button label={t('square.today.hotMore')} variant="link" size="small" onPress={() => router.setParams({ tab: 'confession' })} />
      </View>
      <Pressable testID="today-hot-post" accessibilityLabel={post.title || post.content} contentAlign="stretch" onPress={() => router.push(`/campus/${post.id}` as never)}>
        <Surface rounded="radius_large" padding="space_4" style={{ gap: theme.space('space_2') }}>
          <Text role="body" colorToken="text-primary" numberOfLines={3}>{post.title && post.title !== post.content ? `${post.title}\n${post.content}` : post.content}</Text>
          <Text role="caption" colorToken="text-secondary">{t('square.today.hotStats', { likes: post.likeCount ?? 0, comments: post.commentCount ?? 0 })}</Text>
        </Surface>
      </Pressable>
    </View>
  );
}
