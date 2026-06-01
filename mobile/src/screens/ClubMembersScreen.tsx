import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

interface Props { clubId: number; clubName: string; onBack: () => void; }

export default function ClubMembersScreen({ clubId, clubName, onBack }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/clubs/${clubId}`).then((r) => {
      if (r.status === 0) setMembers(r.data?.members || []);
      setLoading(false);
    });
  }, [clubId]);

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← {clubName}</Text></Pressable>
        <Text style={s.headerTitle}>成员 ({members.length})</Text>
        <View style={{ width: 50 }} />
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={members}
          keyExtractor={(m) => String(m.user_id || m.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              {item.avatar ? (
                <Image source={{ uri: prefixImg(item.avatar) }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlace]}><Text>👤</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.nickname || item.username || item.user_name || '匿名'}</Text>
                {item.email && <Text style={s.email}>{item.email}</Text>}
              </View>
              <Text style={[s.roleBadge, item.role === 'admin' && s.roleAdmin]}>{item.role === 'admin' ? '管理员' : '成员'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无成员</Text>}
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

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9' },
  avatarPlace: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  email: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  roleBadge: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  roleAdmin: { color: '#2563eb', backgroundColor: '#eff6ff' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
