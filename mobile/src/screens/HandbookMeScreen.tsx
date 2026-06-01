import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import { prefixImg } from '../utils';


export default function HandbookMeScreen({ onBack, onArticle, onReview }: { onBack: () => void; onArticle: (id: number) => void; onReview: (id: number) => void }) {
  const [tab, setTab] = useState<'saved' | 'reviews'>('saved');
  const [saved, setSaved] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiGet('/api/handbook/me/saved?pageSize=50'),
      apiGet('/api/handbook/me/course-reviews?pageSize=50'),
    ]).then(([s, r]) => {
      if (s.status === 0) setSaved(s.data?.list || []);
      if (r.status === 0) setReviews(r.data?.list || []);
      setLoading(false);
    });
  }, []);


  if (!isLoggedIn) {
    return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><Text style={s.empty}>请先登录</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 一站通</Text></Pressable><Text style={s.headerTitle}>我的</Text><View style={{ width: 50 }} /></View>
      <View style={s.tabRow}>
        <Pressable style={[s.tab, tab === 'saved' && s.tabActive]} onPress={() => setTab('saved')}><Text style={[s.tabText, tab === 'saved' && s.tabTextActive]}>已收藏 ({saved.length})</Text></Pressable>
        <Pressable style={[s.tab, tab === 'reviews' && s.tabActive]} onPress={() => setTab('reviews')}><Text style={[s.tabText, tab === 'reviews' && s.tabTextActive]}>我的评价 ({reviews.length})</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={tab === 'saved' ? saved : reviews}
          keyExtractor={(it: any) => String(it.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => tab === 'saved' ? onArticle(item.id) : onReview(item.id)}>
              {tab === 'saved' && item.cover_path && <Image source={{ uri: prefixImg(item.cover_path) }} style={s.thumb} />}
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title || item.course_name || '无标题'}</Text>
                <Text style={s.cardSub}>
                  {tab === 'saved' ? `❤️ ${item.likes_count || 0}` : `⭐ ${item.rating || '-'} / 难度 ${item.difficulty || '-'}`}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>{tab === 'saved' ? '暂无收藏' : '暂无评价'}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  tabRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f1f5f9' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
