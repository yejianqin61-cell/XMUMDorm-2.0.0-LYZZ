import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../api/client';

const MODULES = [
  { key: 'treehole', label: '树洞' }, { key: 'canteen', label: '食堂' }, { key: 'trending', label: '热搜' },
  { key: 'campus', label: '校园' }, { key: 'club', label: '社团' }, { key: 'marketplace', label: '二手' },
  { key: 'errand', label: '跑腿' }, { key: 'handbook', label: '一站通' }, { key: 'course-review', label: '课程评价' },
];

export default function AdminContentListScreen({ moduleInit, onBack, onDetail }: { moduleInit?: string; onBack: () => void; onDetail: (m: string, id: number) => void }) {
  const [mod, setMod] = useState(moduleInit || 'treehole');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '30' });
    if (search.trim()) params.set('search', search.trim());
    const r = await apiGet(`/api/admin/contents/${mod}?${params.toString()}`);
    if (r.status === 0) setItems(r.data?.list || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [mod]);

  return (
    <View style={st.bg}>
      <View style={st.modRow}>
        {MODULES.map((m) => (
          <Pressable key={m.key} style={[st.modChip, mod === m.key && st.modActive]} onPress={() => setMod(m.key)}>
            <Text style={[st.modText, mod === m.key && st.modTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={st.searchRow}>
        <TextInput style={st.input} value={search} onChangeText={setSearch} placeholder="搜索..." placeholderTextColor="#94a3b8" onSubmitEditing={fetch} />
        <Pressable style={st.searchBtn} onPress={fetch}><Text style={st.searchText}>搜索</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={items} keyExtractor={(it) => String(it.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={st.card} onPress={() => onDetail(mod, item.id)}>
              <Text style={st.title} numberOfLines={1}>{item.title || item.course_name || item.name || '(无标题)'}</Text>
              <Text style={st.meta}>{item.username || item.nickname || '-'} · {item.status || '-'}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  modRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6, backgroundColor: '#fff' },
  modChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  modActive: { backgroundColor: '#0f172a' },
  modText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  modTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc', color: '#0f172a' },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center' },
  searchText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
