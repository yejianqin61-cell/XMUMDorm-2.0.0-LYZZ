import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import FoodListScreen from './FoodListScreen';

export default function EatScreen() {
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);

  useEffect(() => {
    apiGet('/api/canteen/regions').then((d) => {
      if (d.status === 0) setRegions(d.data || []);
      setLoading(false);
    });
  }, []);

  if (selectedRegion) return <FoodListScreen region={selectedRegion} onBack={() => setSelectedRegion(null)} />;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <Text style={s.title}>🍽️ 食堂</Text>
      {loading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
        <FlatList
          data={regions}
          keyExtractor={(r) => String(r.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => setSelectedRegion(item)}>
              <Text style={s.cardName}>{item.name}</Text>
              {item.description ? <Text style={s.cardDesc}>{item.description}</Text> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 16 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20, minHeight: 100, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
