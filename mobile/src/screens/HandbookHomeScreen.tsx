import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/http';
import { fmtTime, prefixImg } from '../utils';


interface Props {
  onArticle: (id: number) => void;
  onNewArticle: () => void;
  onMe: () => void;
  onCourseList: () => void;
  onNewCourseReview: () => void;
}

export default function HandbookHomeScreen({ onArticle, onNewArticle, onMe, onCourseList, onNewCourseReview }: Props) {
  const [articles, setArticles] = useState<any[]>([]);
  const [tabs, setTabs] = useState<any[]>([]);
  const [tabSlug, setTabSlug] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    apiGet('/api/handbook/tabs').then(r => { if (r.status === 0) setTabs(r.data || []); });
  }, []);

  const fetchArticles = async (slug: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), pageSize: '20' });
    if (slug !== 'all') params.set('tab', slug);
    const r = await apiGet(`/api/handbook/articles?${params.toString()}`);
    if (r.status === 0) {
      setArticles(pg === 1 ? (r.data?.list || []) : prev => [...prev, ...(r.data?.list || [])]);
      setHasMore(r.data?.hasMore || false);
    }
    setLoading(false);
  };

  useEffect(() => { setPage(1); fetchArticles(tabSlug, 1); }, [tabSlug]);



  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📘 一站通</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={onMe}><Text style={s.link}>我的</Text></Pressable>
          {isLoggedIn && <Pressable onPress={onNewArticle}><Text style={s.link}>+ 写文章</Text></Pressable>}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {tabs.filter((t: any) => t.slug !== 'course-review').map((t: any) => (
          <Pressable key={t.slug} style={[s.tab, tabSlug === t.slug && s.tabActive]} onPress={() => setTabSlug(t.slug)}>
            <Text style={[s.tabText, tabSlug === t.slug && s.tabTextActive]}>{t.name_zh || t.slug}</Text>
          </Pressable>
        ))}
        <Pressable style={[s.tab, false && s.tabActive]} onPress={onCourseList}>
          <Text style={s.tabText}>课程评价</Text>
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={s.quickRow}>
        <Pressable style={s.quickBtn} onPress={onNewCourseReview}><Text style={s.quickText}>✏️ 写评价</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={articles}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onArticle(item.id)}>
              {item.cover_path ? <Image source={{ uri: prefixImg(item.cover_path) }} style={s.cover} /> : null}
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.summary ? <Text style={s.cardDesc} numberOfLines={1}>{item.summary}</Text> : null}
                <View style={s.cardMeta}>
                  <Text style={s.meta}>❤️ {item.likes_count || 0}</Text>
                  <Text style={s.meta}>💬 {item.comments_count || 0}</Text>
                  <Text style={s.meta}>{fmtTime(item.created_at)}</Text>
                </View>
              </View>
            </Pressable>
          )}
          onEndReached={() => { if (hasMore) { const np = page + 1; setPage(np); fetchArticles(tabSlug, np); } }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={s.empty}>暂无文章</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  link: { fontSize: 14, color: '#2563eb', fontWeight: '600' },

  tabRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  quickRow: { paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#fff' },
  quickBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
  quickText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  cover: { width: '100%', height: 150, backgroundColor: '#f1f5f9' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  meta: { fontSize: 11, color: '#cbd5e1' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
