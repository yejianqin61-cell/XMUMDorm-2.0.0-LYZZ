import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { prefixImg } from '../utils';

export default function CanteenSearchScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (p: any) => void }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true); setSearched(true);
    const d = await apiGet(`/api/canteen/search?q=${encodeURIComponent(keyword.trim())}`);
    if (d.status === 0) setResults(d.data?.list || d.data || []);
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <TextInput style={s.input} value={keyword} onChangeText={setKeyword} placeholder="搜索菜品..." placeholderTextColor="#94a3b8" returnKeyType="search" onSubmitEditing={handleSearch} autoFocus />
        <Pressable onPress={handleSearch} style={s.searchBtn}><Text style={s.searchText}>搜索</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
        <FlatList data={results} keyExtractor={(p) => String(p.id)} contentContainerStyle={{padding:12}}
          ListEmptyComponent={searched ? <Text style={s.empty}>未找到结果</Text> : null}
          renderItem={({item}) => (
            <Pressable style={s.item} onPress={() => onSelect(item)}>
              <Image source={{ uri: prefixImg(item.images?.[0]?.url) || undefined }} style={s.thumb} />
              <View style={{flex:1}}><Text style={s.name}>{item.name}</Text><Text style={s.price}>RM {item.price || '--'}</Text></View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc' },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0f172a' },
  searchText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8 },
  thumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#f1f5f9' },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  price: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
