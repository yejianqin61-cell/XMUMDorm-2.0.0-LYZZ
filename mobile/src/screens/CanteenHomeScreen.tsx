import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, FlatList, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

export default function CanteenHomeScreen({ onNavigate }: { onNavigate: (screen: string, params?: any) => void }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet('/api/canteen/banners/all'),
      apiGet('/api/canteen/regions'),
      apiGet('/api/canteen/ranking?type=product&period=month'),
    ]).then(([b, r, rk]) => {
      if (b?.status === 0) setBanners(b.data || []);
      if (r?.status === 0) setRegions(r.data || []);
      if (rk?.status === 0) setRankings(rk.data?.list || rk.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <SafeAreaView style={s.bg}><ActivityIndicator style={{marginTop:60}} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>🍽️ 食堂</Text>

        {/* 轮播 */}
        {banners.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.bannerRow}>
            {banners.map((b, i) => (
              <View key={i} style={s.banner}>
                {b.image_url ? <Image source={{ uri: b.image_url.startsWith('http') ? b.image_url : `${API}${b.image_url}` }} style={s.bannerImg} /> : null}
                <View style={s.bannerOverlay}><Text style={s.bannerTitle}>{b.title}</Text></View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 区域入口 */}
        <Text style={s.sectionTitle}>区域</Text>
        <View style={s.grid2}>
          {regions.map((r) => (
            <Pressable key={r.id} style={s.regionCard} onPress={() => onNavigate('shops', r)}>
              <Text style={s.regionName}>{r.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* 排行榜 */}
        <Text style={s.sectionTitle}>月度排行榜</Text>
        {rankings.slice(0, 5).map((item, i) => (
          <Pressable key={item.id || i} style={s.rankItem} onPress={() => onNavigate('detail', item)}>
            <Text style={s.rankNum}>#{i + 1}</Text>
            <View style={{flex:1}}>
              <Text style={s.rankName}>{item.name || item.product_name}</Text>
              <Text style={s.rankScore}>评分 {item.avg_rating || item.score || '--'}</Text>
            </View>
          </Pressable>
        ))}

        {/* 快捷入口 */}
        <View style={s.quickRow}>
          <Pressable style={s.quickBtn} onPress={() => onNavigate('search')}>
            <Text style={s.quickText}>🔍 搜索</Text>
          </Pressable>
          <Pressable style={s.quickBtn} onPress={() => onNavigate('rankings')}>
            <Text style={s.quickText}>🏆 完整排行榜</Text>
          </Pressable>
          <Pressable style={s.quickBtn} onPress={() => onNavigate('merchant')}>
            <Text style={s.quickText}>🏪 商家管理</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 16 },
  bannerRow: { height: 160, marginBottom: 16 },
  banner: { width: 320, height: 160, borderRadius: 16, overflow: 'hidden', marginHorizontal: 8, position: 'relative' },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  regionCard: { width: '30%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', flexGrow: 1 },
  regionName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rankItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, gap: 12 },
  rankNum: { fontSize: 18, fontWeight: '800', color: '#6366f1', width: 36 },
  rankName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rankScore: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 16 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: '#e2e8f0' },
  quickText: { fontSize: 13, fontWeight: '600', color: '#334155' },
});
