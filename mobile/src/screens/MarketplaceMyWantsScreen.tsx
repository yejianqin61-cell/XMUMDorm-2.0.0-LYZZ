import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

interface Props { onBack: () => void; onItem: (id: number) => void; }

export default function MarketplaceMyWantsScreen({ onBack, onItem }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/marketplace/me/wants?pageSize=50').then((r) => {
      if (r.status === 0) setItems(r.data?.list || []);
      setLoading(false);
    });
  }, []);

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 二手</Text></Pressable>
        <Text style={s.headerTitle}>我的收藏</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onItem(item.id)}>
              <Image source={{ uri: item.cover ? prefixImg(item.cover) : 'https://placehold.co/160/F1F5F9/94A3B8?text=NoImg' }} style={s.cover} />
              <Text style={s.title} numberOfLines={2}>{item.title}</Text>
              <View style={s.bottomRow}>
                <Text style={s.price}>RM {Number(item.price || 0).toFixed(2)}</Text>
                <Text style={[s.stBadge, item.status === 'sold' && { backgroundColor: '#94a3b8' }]}>{item.status === 'on_sale' ? '在售' : '已售'}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无收藏</Text>}
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

  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  cover: { width: '100%', height: 140, backgroundColor: '#f1f5f9' },
  title: { fontSize: 12, fontWeight: '600', color: '#0f172a', paddingHorizontal: 10, paddingTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  price: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
  stBadge: { fontSize: 10, color: '#fff', backgroundColor: '#16a34a', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden', fontWeight: '600' },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
