import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { prefixImg } from '../utils';


const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'music', label: '音乐' },
  { key: 'sport', label: '运动' },
  { key: 'tech', label: '科技' },
  { key: 'art', label: '艺术' },
  { key: 'volunteer', label: '志愿' },
];

interface Props { onBack: () => void; onClub: (id: number) => void; }

export default function ClubListScreen({ onBack, onClub }: Props) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [allClubs, setAllClubs] = useState<any[]>([]);

  useEffect(() => {
    apiGet('/api/clubs/list?pageSize=100').then((r) => {
      if (r.status === 0) {
        const list = r.data?.list || r.data || [];
        setAllClubs(list);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let filtered = allClubs;
    if (cat !== 'all') {
      filtered = filtered.filter((c: any) => c.category === cat);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((c: any) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    setClubs(filtered);
  }, [cat, search, allClubs]);


  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 社团</Text></Pressable>
        <Text style={s.headerTitle}>社团大全</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.searchBar}>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="搜索社团..." placeholderTextColor="#94a3b8" />
      </View>

      <View style={s.catRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} style={[s.catChip, cat === c.key && s.catChipActive]} onPress={() => setCat(c.key)}>
            <Text style={[s.catText, cat === c.key && s.catTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={clubs}
          keyExtractor={(c) => String(c.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onClub(item.id)}>
              {item.avatar ? (
                <Image source={{ uri: prefixImg(item.avatar) }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlace]}><Text style={{ fontSize: 28 }}>🏛️</Text></View>
              )}
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.followers}>🔥 {item.followers_count || 0} 关注</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无社团</Text>}
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

  searchBar: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  searchInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },

  catRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  catChipActive: { backgroundColor: '#0f172a' },
  catText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  catTextActive: { color: '#fff' },

  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9' },
  avatarPlace: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 10 },
  followers: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
