import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';
const PAGE_SIZE = 10;

interface Props {
  topicId: number;
  topicTitle: string;
  onBack: () => void;
  onNewPost: (topicId: number, topicTitle: string) => void;
  onPostDetail: (postId: number) => void;
}

export default function TrendingDetailScreen({ topicId, topicTitle, onBack, onNewPost, onPostDetail }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [topic, setTopic] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet(`/api/square/trending/${topicId}`),
      apiGet(`/api/square/trending/${topicId}/posts?page=1&pageSize=${PAGE_SIZE}`),
    ]).then(([t, p]) => {
      if (t.status === 0) setTopic(t.data);
      if (p.status === 0) {
        setPosts(p.data?.list || []);
        setHasMore(p.data?.hasMore || false);
      }
      setLoading(false);
    });
  }, [topicId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const p = await apiGet(`/api/square/trending/${topicId}/posts?page=${nextPage}&pageSize=${PAGE_SIZE}`);
    if (p.status === 0) {
      setPosts((prev) => [...prev, ...(p.data?.list || [])]);
      setHasMore(p.data?.hasMore || false);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 广场</Text></Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{topicTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          ListHeaderComponent={
            <View style={s.topicInfo}>
              <Text style={s.topicTitle}>{topic?.title || topicTitle}</Text>
              {topic?.description ? <Text style={s.topicDesc}>{topic.description}</Text> : null}
              <Text style={s.topicCount}>{topic?.post_count || posts.length} 条讨论</Text>
              {isLoggedIn && (
                <Pressable style={s.joinBtn} onPress={() => onNewPost(topicId, topicTitle)}>
                  <Text style={s.joinBtnText}>✏️ 参与讨论</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.postCard} onPress={() => onPostDetail(item.id)}>
              {item.images?.[0] && (
                <Image source={{ uri: prefixImg(item.images[0].url) }} style={s.postThumb} />
              )}
              <View style={{ flex: 1 }}>
                <View style={s.postAuthorRow}>
                  <Text style={s.postAuthor}>{item.author?.nickname || item.author?.username || '匿名'}</Text>
                  <Text style={s.postTime}>{fmtTime(item.created_at)}</Text>
                </View>
                <Text style={s.postContent} numberOfLines={3}>{item.content}</Text>
                <View style={s.postMeta}>
                  <Text style={s.metaText}>❤️ {item.like_count || 0}</Text>
                  <Text style={s.metaText}>💬 {item.comment_count || 0}</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            hasMore ? (
              <Pressable style={s.loadMore} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={s.loadMoreText}>加载更多</Text>
                )}
              </Pressable>
            ) : posts.length > 0 ? (
              <Text style={s.noMore}>— 没有更多了 —</Text>
            ) : null
          }
          ListEmptyComponent={<Text style={s.empty}>暂无讨论，快来参与吧</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function fmtTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return d.toLocaleDateString();
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'center' },

  topicInfo: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8 },
  topicTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  topicDesc: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 19 },
  topicCount: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  joinBtn: { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  postCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  postThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f1f5f9' },
  postAuthorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  postAuthor: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  postTime: { fontSize: 11, color: '#94a3b8' },
  postContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  postMeta: { flexDirection: 'row', gap: 16, marginTop: 6 },
  metaText: { fontSize: 12, color: '#94a3b8' },

  loadMore: { paddingVertical: 16, alignItems: 'center' },
  loadMoreText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  noMore: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, paddingVertical: 16 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
