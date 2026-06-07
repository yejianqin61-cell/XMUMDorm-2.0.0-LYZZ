import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPost, apiDelete } from '../utils/http';

export default function AdminOrgDetailScreen({ orgId, orgName, onBack }: { orgId: number; orgName: string; onBack: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const r = await apiGet(`/api/organizations/${orgId}/members`);
    if (r.status === 0) setMembers(r.data || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, [orgId]);

  const handleAdd = async () => {
    if (!addEmail.trim()) return Alert.alert('请输入邮箱');
    setAdding(true);
    const r = await apiPost(`/api/organizations/${orgId}/members`, { email: addEmail.trim(), title: addTitle.trim() || undefined });
    if (r.status === 0) { setAddEmail(''); setAddTitle(''); fetch(); Alert.alert('添加成功'); }
    else Alert.alert('添加失败', r.message);
    setAdding(false);
  };

  const handleRemove = (mid: number) => {
    Alert.alert('确认移除', '', [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: async () => {
        const r = await apiDelete(`/api/organizations/${orgId}/members/${mid}`);
        if (r.status === 0) fetch();
      }},
    ]);
  };

  return (
    <View style={st.bg}>
      <View style={st.addRow}>
        <TextInput style={st.input} value={addEmail} onChangeText={setAddEmail} placeholder="用户邮箱" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[st.input, { flex: 0.6 }]} value={addTitle} onChangeText={setAddTitle} placeholder="职位（可选）" placeholderTextColor="#94a3b8" />
        <Pressable style={st.addBtn} onPress={handleAdd} disabled={adding}><Text style={st.addBtnText}>{adding ? '...' : '添加'}</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={members} keyExtractor={(m) => String(m.id || m.user_id)} contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={<Text style={st.sectionTitle}>{orgName} — 成员 ({members.length})</Text>}
          renderItem={({ item }) => (
            <View style={st.card}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{item.nickname || item.username || item.user_name || '未知'}</Text>
                <Text style={st.meta}>{item.email || ''}{item.title ? ` · ${item.title}` : ''}</Text>
              </View>
              <Pressable onPress={() => handleRemove(item.id)}><Text style={st.removeText}>移除</Text></Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={st.empty}>暂无成员</Text>}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  addRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#f8fafc', color: '#0f172a' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  removeText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
