import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../utils/http';
import { fmtTime, prefixImg } from '../utils';


const CATEGORIES = [
  { key: 'all', label: '全部', icon: '🏛️' },
  { key: 'music', label: '音乐', icon: '🎵' },
  { key: 'tech', label: '科技', icon: '💻' },
  { key: 'culture', label: '文化', icon: '📚' },
  { key: 'sport', label: '运动', icon: '⚽' },
  { key: 'art', label: '艺术', icon: '🎨' },
];

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'ongoing', label: '进行中' },
  { key: 'ended', label: '已结束' },
];

interface Props {
  onClub: (id: number) => void;
  onList: () => void;
  onMyClubs: () => void;
  onActivity: (id: number) => void;
  onPost: (id: number) => void;
}

export default function ClubsHomeScreen({ onClub, onList, onMyClubs, onActivity, onPost }: Props) {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [lifeFilter, setLifeFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', pageSize: '20' });
    if (catFilter !== 'all') params.set('category', catFilter);
    if (lifeFilter === 'ended') params.set('status', 'ended');
    const qs = params.toString();
    apiGet(`/api/clubs/feed${qs ? `?${qs}` : ''}`).then((r) => {
      if (r.status === 0) setFeed(r.data?.list || r.data || []);
      setLoading(false);
    });
  }, [catFilter, lifeFilter]);



  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🏛️ 社团</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={onMyClubs}><Text style={s.link}>我的</Text></Pressable>
          <Pressable onPress={onList}><Text style={s.link}>大全</Text></Pressable>
        </View>
      </View>

      {/* Category filter */}
      <View style={s.catRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} style={[s.catChip, catFilter === c.key && s.catChipActive]} onPress={() => setCatFilter(c.key)}>
            <Text style={s.catIcon}>{c.icon}</Text>
            <Text style={[s.catText, catFilter === c.key && s.catTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Lifecycle filter */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} style={[s.filterChip, lifeFilter === f.key && s.filterChipActive]} onPress={() => setLifeFilter(f.key)}>
            <Text style={[s.filterText, lifeFilter === f.key && s.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={feed}
          keyExtractor={(item) => `${item.type || 'feed'}_${item.id}`}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isActivity = item.type === 'activity';
            return (
              <Pressable style={s.card} onPress={() => isActivity ? onActivity(item.id) : onPost(item.id)}>
                <Image source={{ uri: item.cover ? prefixImg(item.cover) : 'https://placehold.co/300/F1F5F9/94A3B8?text=Club' }} style={s.cover} />
                <View style={s.cardBody}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={[s.typeTag, isActivity && s.typeTagActivity]}>{isActivity ? '活动' : '帖子'}</Text>
                    <Text style={s.cardClubName}>{item.club_name || ''}</Text>
                  </View>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.summary ? <Text style={s.cardDesc} numberOfLines={1}>{item.summary}</Text> : null}
                  <View style={s.cardMeta}>
                    <Text style={s.meta}>👁 {item.views_count || 0}</Text>
                    <Text style={s.meta}>❤️ {item.like_count || 0}</Text>
                    <Text style={s.meta}>{fmtTime(item.created_at)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>暂无社团动态</Text>}
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

  catRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff' },
  catChip: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#f1f5f9', minWidth: 52 },
  catChipActive: { backgroundColor: '#0f172a' },
  catIcon: { fontSize: 14 },
  catText: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '500' },
  catTextActive: { color: '#fff' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8, backgroundColor: '#fff' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#0f172a' },
  filterText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  cover: { width: '100%', height: 150, backgroundColor: '#f1f5f9' },
  cardBody: { padding: 12 },
  typeTag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: '#ede9fe', color: '#7c3aed', overflow: 'hidden' },
  typeTagActivity: { backgroundColor: '#dbeafe', color: '#2563eb' },
  cardClubName: { fontSize: 12, color: '#64748b' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 6, lineHeight: 20 },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  meta: { fontSize: 11, color: '#cbd5e1' },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
