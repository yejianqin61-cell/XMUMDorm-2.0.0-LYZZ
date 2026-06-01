import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import PostCard from '../components/PostCard';
import PostDetailModal from './PostDetailModal';
import NewPostModal from './NewPostModal';

const PAGE_SIZE = 10;

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
      const data = await apiGet(`/api/posts?page=${pg}&pageSize=${PAGE_SIZE}`);
      if (data.status === 0) {
        const list = data.data?.list || [];
        setPosts((prev) => append ? [...prev, ...list] : list);
        setHasMore(data.data?.hasMore ?? false);
        setPage(pg);
      }
    } catch { Alert.alert('加载失败'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (isLoggedIn) fetchPosts(1); }, [isLoggedIn]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(1); };
  const handleLoadMore = () => { if (hasMore && !loading) { setLoading(true); fetchPosts(page + 1, true); } };

  if (!isLoggedIn) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#eef2ff', '#f0fdf4', '#f8fafc']} style={StyleSheet.absoluteFill} />
        <Text style={styles.hint}>请先登录以查看树洞</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* 渐变背景 — 复刻 Web .treehole-page--light radial-gradient */}
      <LinearGradient
        colors={['rgba(34,211,238,0.24)', 'rgba(255,255,255,0)', 'rgba(16,185,129,0.20)', '#fbfcfe']}
        locations={[0, 0.1, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* 顶栏 */}
        <View style={styles.topbar}>
          <Text style={styles.topTitle}>树洞</Text>
          <Pressable onPress={() => setShowNewPost(true)} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ 发帖</Text>
          </Pressable>
        </View>

        {/* 标签工具栏 — 简化版（复刻 TreeHoleToolbar） */}
        <View style={styles.toolbar}>
          <View style={[styles.toolTag, styles.toolTagActive]}>
            <Text style={[styles.toolTagText, styles.toolTagTextActive]}>全部</Text>
          </View>
          <View style={styles.toolTag}><Text style={styles.toolTagText}>热门</Text></View>
          <View style={styles.toolTag}><Text style={styles.toolTagText}>最新</Text></View>
        </View>

        {/* 帖子列表 */}
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard post={item} onPress={setSelectedPost} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#94a3b8" /> : null}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>暂无帖子</Text> : null}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* 详情模态 */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} visible={!!selectedPost} onClose={() => setSelectedPost(null)}
          onUpdated={() => { setSelectedPost(null); fetchPosts(1); }}
        />
      )}

      {/* 发帖模态 */}
      {showNewPost && (
        <NewPostModal visible={showNewPost} onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); fetchPosts(1); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbfcfe' },
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 15, color: '#94a3b8' },
  // 顶栏 — 复刻 Web 的 header
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(226,232,240,0.8)',
  },
  topTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  newBtn: {
    backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // 标签工具栏 — 复刻 TreeHoleToolbar
  toolbar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  toolTag: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  toolTagActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  toolTagText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  toolTagTextActive: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 60 },
});
