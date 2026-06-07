import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../utils/http';

export default function RankingsScreen({ onBack }: { onBack: () => void }) {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/canteen/rankings/hot-products`).then((d) => {
      if (d.status === 0) setRankings(d.data?.list || d.data || []);
      setLoading(false);
    });
  }, [period]);

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <Text style={s.title}>🏆 排行榜</Text>
        <View style={s.periodRow}>
          {['week','month'].map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={[s.periodBtn, period===p&&s.periodActive]}>
              <Text style={[s.periodText, period===p&&s.periodTextActive]}>{p==='week'?'本周':'本月'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
        <FlatList data={rankings} keyExtractor={(item,i) => String(item.id||i)} contentContainerStyle={{padding:12}}
          renderItem={({item, index}) => (
            <View style={s.item}>
              <Text style={[s.rank, index<3&&s.rankTop]}>#{index+1}</Text>
              <View style={{flex:1}}>
                <Text style={s.name}>{item.name || item.product_name}</Text>
                <Text style={s.info}>评分 {item.avg_rating||item.score||'--'} · {item.shop_name||''}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  periodRow: { flexDirection: 'row', marginLeft: 'auto', gap: 4 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9' },
  periodActive: { backgroundColor: '#0f172a' },
  periodText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  periodTextActive: { color: '#fff', fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8 },
  rank: { fontSize: 18, fontWeight: '800', color: '#94a3b8', width: 40 },
  rankTop: { color: '#f59e0b' },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  info: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
