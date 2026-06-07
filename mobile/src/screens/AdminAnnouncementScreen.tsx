import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPost, apiDelete } from '../utils/http';

export default function AdminAnnouncementScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const fetch = async () => {
    setLoading(true);
    const r = await apiGet('/api/admin/announcements?pageSize=50');
    if (r.status === 0) setItems(r.data?.list || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert('请填写完整');
    const r = await apiPost('/api/admin/announcements', { title: title.trim(), content: content.trim() });
    if (r.status === 0) { Alert.alert('发布成功'); setShowCreate(false); setTitle(''); setContent(''); fetch(); }
    else Alert.alert('失败', r.message);
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const r = await apiDelete(`/api/admin/announcements/${id}`);
        if (r.status === 0) fetch();
      }},
    ]);
  };

  return (
    <View style={st.bg}>
      <Pressable style={st.createBtn} onPress={() => setShowCreate(true)}><Text style={st.createText}>+ 发布公告</Text></Pressable>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={items} keyExtractor={(a) => String(a.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={st.card}>
              <Text style={st.cardTitle}>{item.title}</Text>
              <Text style={st.cardContent} numberOfLines={2}>{item.content}</Text>
              <View style={st.cardMeta}><Text style={st.meta}>{item.author_name || '系统'} · {item.created_at?.substring(0, 10)}</Text><Pressable onPress={() => handleDelete(item.id)}><Text style={st.delText}>删除</Text></Pressable></View>
            </View>
          )}
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={st.modalBg}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>发布公告</Text>
            <TextInput style={st.input} value={title} onChangeText={setTitle} placeholder="标题" placeholderTextColor="#94a3b8" maxLength={200} />
            <TextInput style={[st.input, st.textArea]} value={content} onChangeText={setContent} placeholder="内容" placeholderTextColor="#94a3b8" multiline numberOfLines={6} textAlignVertical="top" />
            <View style={st.modalBtns}>
              <Pressable onPress={() => setShowCreate(false)} style={st.cancelBtn}><Text style={{ color: '#64748b', fontWeight: '600' }}>取消</Text></Pressable>
              <Pressable onPress={handleCreate} style={st.submitBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>发布</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  createBtn: { margin: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center' },
  createText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardContent: { fontSize: 13, color: '#475569', lineHeight: 19 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  meta: { fontSize: 11, color: '#94a3b8' },
  delText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  modalBg: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 10 },
  textArea: { minHeight: 120 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  submitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
});
