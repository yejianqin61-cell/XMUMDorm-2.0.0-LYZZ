import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPatch } from '../api/client';

const ACTIONS = [
  { key: 'dismiss', label: '忽略举报', color: '#f1f5f9', textColor: '#64748b' },
  { key: 'hide_content', label: '隐藏内容', color: '#fef3c7', textColor: '#d97706' },
  { key: 'delete_content', label: '删除内容', color: '#fef2f2', textColor: '#ef4444' },
  { key: 'mute_user', label: '禁言用户', color: '#fff7ed', textColor: '#f97316' },
  { key: 'ban_user', label: '封禁用户', color: '#fef2f2', textColor: '#dc2626' },
];

export default function AdminReportDetailScreen({ reportId, onBack }: { reportId: number; onBack: () => void }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const fetch = async () => {
    const r = await apiGet(`/api/admin/reports/${reportId}`);
    if (r.status === 0) setReport(r.data);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, [reportId]);

  const handleProcess = async (action: string) => {
    if (['ban_user', 'mute_user'].includes(action)) {
      Alert.alert('确认操作', `确定要${action === 'ban_user' ? '封禁' : '禁言'}该用户吗？`, [
        { text: '取消', style: 'cancel' },
        { text: '确认', onPress: () => doProcess(action) },
      ]);
    } else {
      doProcess(action);
    }
  };

  const doProcess = async (action: string) => {
    const r = await apiPatch(`/api/admin/reports/${reportId}/process`, { action, note: note.trim() || undefined });
    if (r.status === 0) { Alert.alert('操作成功'); onBack(); }
    else Alert.alert('操作失败', r.message);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={st.body}>
      <View style={st.card}>
        <Text style={st.title}>举报详情 #{report?.id}</Text>
        <Text style={st.row}><Text style={st.bold}>状态：</Text>{report?.status}</Text>
        <Text style={st.row}><Text style={st.bold}>举报人：</Text>{report?.reporter_name}</Text>
        <Text style={st.row}><Text style={st.bold}>被举报人：</Text>{report?.reported_name}</Text>
        <Text style={st.row}><Text style={st.bold}>原因：</Text>{report?.reason}</Text>
        <Text style={st.row}><Text style={st.bold}>类型：</Text>{report?.target_type} #{report?.target_id}</Text>
        {report?.detail ? <Text style={st.detail}>补充说明：{report.detail}</Text> : null}
        {report?.content_url ? <Text style={st.link}>🔗 查看被举报内容</Text> : null}
      </View>

      {(report?.status !== 'resolved' && report?.status !== 'dismissed') && (
        <View style={st.card}>
          <Text style={st.sectionTitle}>处理举报</Text>
          <TextInput style={st.input} value={note} onChangeText={setNote} placeholder="处理备注（可选）" placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" />
          <View style={st.actions}>
            {ACTIONS.map((a) => (
              <Pressable key={a.key} style={[st.actionBtn, { backgroundColor: a.color }]} onPress={() => handleProcess(a.key)}>
                <Text style={[st.actionText, { color: a.textColor }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  row: { fontSize: 14, color: '#334155', marginBottom: 4 },
  bold: { fontWeight: '700' },
  detail: { fontSize: 13, color: '#64748b', marginTop: 8, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  link: { fontSize: 14, color: '#2563eb', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', minHeight: 80, marginBottom: 12 },
  actions: { gap: 8 },
  actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
});
