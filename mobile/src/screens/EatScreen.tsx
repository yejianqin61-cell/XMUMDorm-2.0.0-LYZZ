import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { API_BASE_URL } from '../api/config';

export default function EatScreen() {
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/canteen/regions').then((d) => {
      if (d.status === 0) setRegions(d.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color="#0f172a" /></View>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <Text style={s.title}>🍽️ 食堂</Text>
      <FlatList
        data={regions}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.regionName}>{item.name}</Text>
            <Text style={s.regionDesc}>{item.description || ''}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 16 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 20, margin: 6, minHeight: 100, justifyContent: 'center' },
  regionName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  regionDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
});
