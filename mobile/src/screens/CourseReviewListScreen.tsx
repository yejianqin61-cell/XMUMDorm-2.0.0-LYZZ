import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../utils/http';

const TAG_OPTIONS = ['MPU', 'GE', 'ME', 'required', 'final', 'no final'];
const TAG_LABELS: Record<string, string> = { MPU: 'MPU', GE: 'GE', ME: 'ME', required: '必修', final: '有期末', 'no final': '无期末' };

export default function CourseReviewListScreen({ onBack, onReview }: { onBack: () => void; onReview: (id: number) => void }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', pageSize: '20' });
    if (searchQ) params.set('q', searchQ);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    const r = await apiGet(`/api/handbook/course-reviews?${params.toString()}`);
    if (r.status === 0) setReviews(r.data?.list || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [searchQ, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 一站通</Text></Pressable><Text style={s.headerTitle}>课程评价</Text><View style={{ width: 50 }} /></View>

      <View style={s.searchRow}>
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="搜索课程/教师..." placeholderTextColor="#94a3b8" onSubmitEditing={() => setSearchQ(q.trim())} />
        <Pressable style={s.searchBtn} onPress={() => setSearchQ(q.trim())}><Text style={s.searchBtnText}>搜索</Text></Pressable>
      </View>

      <View style={s.tagRow}>
        {TAG_OPTIONS.map(tag => (
          <Pressable key={tag} style={[s.tag, selectedTags.includes(tag) && s.tagActive]} onPress={() => toggleTag(tag)}>
            <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>{TAG_LABELS[tag]}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onReview(item.id)}>
              <View style={s.cardTop}>
                <Text style={s.star}>{'⭐'.repeat(item.rating || 0)}</Text>
                <Text style={s.difficulty}>难度 {item.difficulty || '-'}/5</Text>
              </View>
              <Text style={s.courseName}>{item.course_name}</Text>
              <Text style={s.teacher}>👨‍🏫 {item.teacher || '未知'}</Text>
              {item.term_year && <Text style={s.term}>{item.term_year}/{item.term_month}</Text>}
              <Text style={s.comment} numberOfLines={2}>{item.comment}</Text>
              <View style={s.cardMeta}>
                <Text style={s.meta}>⭐ {item.avg_rating ? Number(item.avg_rating).toFixed(1) : '-'}</Text>
                <Text style={s.meta}>💬 {item.comment_count || 0}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无课程评价</Text>}
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
  searchRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc', color: '#0f172a' },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tagRow: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 8, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  tagActive: { backgroundColor: '#0f172a' },
  tagText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tagTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  star: { fontSize: 14 },
  difficulty: { fontSize: 12, color: '#94a3b8' },
  courseName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  teacher: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  term: { fontSize: 11, color: '#94a3b8', marginBottom: 6 },
  comment: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 14 },
  meta: { fontSize: 11, color: '#cbd5e1' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
