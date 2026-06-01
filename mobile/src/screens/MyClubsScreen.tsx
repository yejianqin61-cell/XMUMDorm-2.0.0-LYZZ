import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

interface Props { onBack: () => void; onClub: (id: number) => void; }

export default function MyClubsScreen({ onBack, onClub }: Props) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    apiGet('/api/clubs/me/clubs').then((r) => {
      if (r.status === 0) setClubs(r.data || []);
      setLoading(false);
    });
  }, []);

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={s.bg} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={onBack}><Text style={s.back}>← 社团</Text></Pressable>
        </View>
        <Text style={s.loginHint}>请先登录查看我的社团</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 社团</Text></Pressable>
        <Text style={s.headerTitle}>我的社团</Text>
        <View style={{ width: 50 }} />
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={clubs}
          keyExtractor={(c) => String(c.id || c.club_id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onClub(item.id || item.club_id)}>
              {item.avatar ? (
                <Image source={{ uri: prefixImg(item.avatar) }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlace]}><Text style={{ fontSize: 20 }}>🏛️</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name || item.club_name}</Text>
                <Text style={s.role}>{item.role === 'admin' ? '管理员' : '成员'}</Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无加入社团</Text>}
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
  loginHint: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9' },
  avatarPlace: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  role: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  arrow: { fontSize: 20, color: '#cbd5e1' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
