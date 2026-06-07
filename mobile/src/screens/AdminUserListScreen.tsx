import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../utils/http';

export default function AdminUserListScreen({ onBack, onUser }: { onBack: () => void; onUser: (id: number) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');

  const fetch = async () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '30' });
    if (search.trim()) params.set('search', search.trim());
    if (role !== 'all') params.set('role', role);
    const r = await apiGet(`/api/admin/users?${params.toString()}`);
    if (r.status === 0) setUsers(r.data?.list || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [role]);

  return (
    <View style={st.bg}>
      <View style={st.searchRow}>
        <TextInput style={st.input} value={search} onChangeText={setSearch} placeholder="搜索用户名/邮箱/学号" placeholderTextColor="#94a3b8" onSubmitEditing={fetch} />
        <Pressable style={st.searchBtn} onPress={fetch}><Text style={st.searchText}>搜索</Text></Pressable>
      </View>
      <View style={st.filterRow}>
        {['all', 'student', 'merchant', 'admin'].map((r) => (
          <Pressable key={r} style={[st.chip, role === r && st.chipActive]} onPress={() => setRole(r)}>
            <Text style={[st.chipText, role === r && st.chipTextActive]}>{r === 'all' ? '全部' : r === 'student' ? '学生' : r === 'merchant' ? '商家' : '管理员'}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={users} keyExtractor={(u) => String(u.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={st.card} onPress={() => onUser(item.id)}>
              <Text style={st.name}>{item.nickname || item.username}</Text>
              <Text style={st.meta}>{item.email || item.student_id || ''} · {item.role}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc', color: '#0f172a' },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center' },
  searchText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
