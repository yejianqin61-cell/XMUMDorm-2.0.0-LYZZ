import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../api/client';
import PostCard from '../components/PostCard';
import PostDetailModal from './PostDetailModal';
import NewPostModal from './NewPostModal';

export default function TreeholeScreen() {
  const { token, isLoggedIn } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showNewPost, setShowNewPost] = useState(false);

  const fetchPosts = useCallback(async (pg = 1, append = false) => {
    try {
      const data = await apiGet(`/api/posts?page=${pg}&pageSize=20`);
      if (data.status === 0) {
        const list = data.data?.list || [];
        setPosts((prev) => append ? [...prev, ...list] : list);
        setHasMore(data.data?.hasMore ?? false);
        setPage(pg);
      }
    } catch { Alert.alert('加载失败', '无法获取帖子列表'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (isLoggedIn) fetchPosts(1); }, [isLoggedIn]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(1); };
  const handleLoadMore = () => { if (hasMore && !loading) { setLoading(true); fetchPosts(page + 1, true); } };

  if (!isLoggedIn) return <View style={s.centered}><Text style={s.hint}>请先登录</Text></View>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>🌳 树洞</Text>
        <Text style={s.newBtn} onPress={() => setShowNewPost(true)}>+ 发帖</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PostCard post={item} onPress={setSelectedPost} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} /> : null}
        ListEmptyComponent={!loading ? <Text style={s.empty}>暂无帖子</Text> : null}
      />
      {selectedPost && (
        <PostDetailModal post={selectedPost} visible={!!selectedPost} onClose={() => setSelectedPost(null)}
          onUpdated={() => { setSelectedPost(null); fetchPosts(1); }}
        />
      )}
      {showNewPost && (
        <NewPostModal visible={showNewPost} onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); fetchPosts(1); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 15, color: '#94a3b8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  newBtn: { fontSize: 15, color: '#2563eb', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 60 },
});
