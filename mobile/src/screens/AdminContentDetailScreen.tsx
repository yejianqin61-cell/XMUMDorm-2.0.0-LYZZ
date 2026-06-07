import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPatch, apiDelete } from '../utils/http';

export default function AdminContentDetailScreen({ module: mod, id, onBack }: { module: string; id: number; onBack: () => void }) {
  const [item, setItem] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/admin/contents/${mod}/${id}`).then((r) => {
      if (r.status === 0) { setItem(r.data); setComments(r.data?.comments || []); }
      setLoading(false);
    });
  }, [mod, id]);

  const handleToggle = async () => {
    const r = await apiPatch(`/api/admin/contents/${mod}/${id}/toggle-visibility`);
    if (r.status === 0) { Alert.alert('操作成功'); onBack(); }
    else Alert.alert('失败', r.message);
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '此操作不可恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const r = await apiDelete(`/api/admin/contents/${mod}/${id}`);
        if (r.status === 0) { Alert.alert('已删除'); onBack(); }
        else Alert.alert('失败', r.message);
      }},
    ]);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={st.body}>
      <View style={st.card}>
        <Text style={st.title}>{item?.title || item?.course_name || item?.name || '(无标题)'}</Text>
        <Text style={st.meta}>作者: {item?.username || item?.nickname || '-'} · 模块: {mod} · ID: {id}</Text>
        {item?.content || item?.description || item?.comment ? <Text style={st.content}>{item?.content || item?.description || item?.comment}</Text> : null}
      </View>

      <View style={st.actionRow}>
        <Pressable style={st.toggleBtn} onPress={handleToggle}><Text style={st.toggleText}>切换可见性</Text></Pressable>
        <Pressable style={st.delBtn} onPress={handleDelete}><Text style={st.delText}>删除</Text></Pressable>
      </View>

      {comments.length > 0 && (
        <>
          <Text style={st.sectionTitle}>评论 ({comments.length})</Text>
          {comments.map((c: any, i: number) => (
            <View key={c.id || i} style={st.commentCard}>
              <Text style={st.commentAuthor}>{c.username || c.nickname || '匿名'} · {c.created_at?.substring(0, 10)}</Text>
              <Text style={st.commentContent}>{c.content || c.comment}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  content: { fontSize: 14, color: '#475569', lineHeight: 22 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  toggleText: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  delBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center' },
  delText: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  commentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6 },
  commentAuthor: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  commentContent: { fontSize: 14, color: '#334155' },
});
