import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import PostCard from '../PostCardWaterfall';
import TreeholeSkeletonCard from '../TreeholeSkeletonCard';
import { TREEHOLE } from '../../theme/treehole';
import type { PostItem } from '../../hooks/usePosts';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = TREEHOLE.colGap;
const PAD = TREEHOLE.pad;
const CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;

interface PostWaterfallGridProps {
  posts: PostItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  scrollRef: React.RefObject<ScrollView>;
  onScroll: (e: any) => void;
  onPostPress: (post: PostItem) => void;
  onLoadMore: () => void;
  isZh: boolean;
}

function buildColumns(posts: PostItem[]): [PostItem[], PostItem[]] {
  const left: PostItem[] = [];
  const right: PostItem[] = [];
  posts.forEach((p, i) => {
    if (i % 2 === 0) left.push(p);
    else right.push(p);
  });
  return [left, right];
}

export default function PostWaterfallGrid({
  posts, loading, loadingMore, hasMore,
  scrollRef, onScroll, onPostPress, onLoadMore, isZh,
}: PostWaterfallGridProps) {
  if (loading) {
    return (
      <View style={styles.grid}>
        <View style={styles.column}>
          {[1, 2, 3].map((i) => <TreeholeSkeletonCard key={`l${i}`} width={CARD_W} />)}
        </View>
        <View style={[styles.column, styles.columnRight]}>
          {[1, 2, 3].map((i) => <TreeholeSkeletonCard key={`r${i}`} width={CARD_W} />)}
        </View>
      </View>
    );
  }

  const [leftCol, rightCol] = buildColumns(posts);

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        <View style={styles.column}>
          {leftCol.map((p, i) => (
            <PostCard key={`L-${p.id}-${i}`} post={p} cardWidth={CARD_W} onPress={onPostPress} />
          ))}
          {loadingMore ? (
            <>
              <TreeholeSkeletonCard key="skel-l-1" width={CARD_W} />
              <TreeholeSkeletonCard key="skel-l-2" width={CARD_W} />
            </>
          ) : null}
        </View>
        <View style={[styles.column, styles.columnRight]}>
          {rightCol.map((p, i) => (
            <PostCard key={`R-${p.id}-${i}`} post={p} cardWidth={CARD_W} onPress={onPostPress} />
          ))}
          {loadingMore ? (
            <>
              <TreeholeSkeletonCard key="skel-r-1" width={CARD_W} />
              <TreeholeSkeletonCard key="skel-r-2" width={CARD_W} />
            </>
          ) : null}
        </View>
      </View>

      {posts.length === 0 && (
        <Text style={styles.empty}>{isZh ? '暂无帖子' : 'No posts yet'}</Text>
      )}
      {hasMore && !loadingMore && posts.length > 0 && (
        <Pressable style={styles.loadMore} onPress={onLoadMore}>
          <Text style={styles.loadMoreText}>{isZh ? '加载更多' : 'Load more'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: TREEHOLE.fabBottom + 24 },
  grid: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start', paddingHorizontal: PAD },
  column: { flex: 1, gap: GAP },
  columnRight: { paddingTop: TREEHOLE.rightColOffset },
  empty: {
    textAlign: 'center', color: '#94a3b8', fontSize: 14,
    marginTop: 60, width: SCREEN_W - PAD * 2,
  },
  loadMore: {
    marginTop: 14, marginHorizontal: PAD,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1, borderColor: 'rgba(226, 232, 240, 1)',
    alignItems: 'center' as const,
  },
  loadMoreText: { fontSize: 15, color: 'rgba(15, 23, 42, 0.85)', letterSpacing: -0.3 },
});
