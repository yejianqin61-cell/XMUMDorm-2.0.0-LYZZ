import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { apiGet, apiPost, apiDelete } from '../api/client';

const DURATIONS = [
  { label: '1天', value: 1 }, { label: '3天', value: 3 }, { label: '7天', value: 7 },
  { label: '30天', value: 30 }, { label: '永久', value: -1 },
];

export default function AdminUserDetailScreen({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ type: string } | null>(null);
  const [actionDuration, setActionDuration] = useState(7);
  const [actionReason, setActionReason] = useState('');

  const fetch = async () => {
    setLoading(true);
    const r = await apiGet(`/api/admin/users/${userId}`);
    if (r.status === 0) setUser(r.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [userId]);

  const doAction = async () => {
    if (!actionModal) return;
    const { type } = actionModal;
    const body = type === 'ban' || type === 'mute' ? { duration: actionDuration, reason: actionReason || undefined } : {};
    try {
      let r;
      switch (type) {
        case 'ban': r = await apiPost(`/api/admin/users/${userId}/ban`, body); break;
        case 'unban': r = await apiPost(`/api/admin/users/${userId}/unban`); break;
        case 'mute': r = await apiPost(`/api/admin/users/${userId}/mute`, body); break;
        case 'unmute': r = await apiPost(`/api/admin/users/${userId}/unmute`); break;
        case 'delete': r = await apiDelete(`/api/admin/users/${userId}`); break;
        default: return;
      }
      if (r.status === 0) { Alert.alert('操作成功'); fetch(); }
      else Alert.alert('操作失败', r.message);
    } catch { Alert.alert('网络错误'); }
    setActionModal(null); setActionReason('');
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView contentContainerStyle={st.body}>
      <View style={st.card}>
        <Text style={st.name}>{user?.nickname || user?.username}</Text>
        <Text style={st.role}>{user?.role} · Lv.{user?.level || 1} · {user?.exp || 0} EXP</Text>
        <View style={st.infoGrid}>
          <Text style={st.info}>UID: {user?.id}</Text>
          <Text style={st.info}>邮箱: {user?.email || '-'}</Text>
          <Text style={st.info}>学号: {user?.student_id || '-'}</Text>
          <Text style={st.info}>学院: {user?.college || '-'}</Text>
        </View>
        <View style={st.statsRow}>
          <View style={st.statBox}><Text style={st.statNum}>{user?.post_count || 0}</Text><Text style={st.statLbl}>帖子</Text></View>
          <View style={st.statBox}><Text style={st.statNum}>{user?.comment_count || 0}</Text><Text style={st.statLbl}>评论</Text></View>
          <View style={[st.statBox, (user?.report_count || 0) > 0 && st.statWarn]}><Text style={st.statNum}>{user?.report_count || 0}</Text><Text style={st.statLbl}>被举报</Text></View>
        </View>
      </View>

      {!isAdmin && (
        <View style={st.actionRow}>
          <Pressable style={[st.actBtn, st.actDanger]} onPress={() => setActionModal({ type: 'ban' })}><Text style={st.actText}>封禁</Text></Pressable>
          <Pressable style={[st.actBtn, st.actWarn]} onPress={() => setActionModal({ type: 'mute' })}><Text style={st.actText}>禁言</Text></Pressable>
          <Pressable style={[st.actBtn, st.actOk]} onPress={() => setActionModal({ type: 'unban' })}><Text style={st.actText}>解封</Text></Pressable>
          <Pressable style={[st.actBtn, st.actOk]} onPress={() => setActionModal({ type: 'unmute' })}><Text style={st.actText}>解禁</Text></Pressable>
          <Pressable style={[st.actBtn, st.actGray]} onPress={() => setActionModal({ type: 'delete' })}><Text style={st.actText}>注销</Text></Pressable>
        </View>
      )}

      <Modal visible={!!actionModal} animationType="fade" transparent>
        <View style={st.modalBg}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>{actionModal?.type === 'ban' ? '封禁用户' : actionModal?.type === 'mute' ? '禁言用户' : actionModal?.type === 'delete' ? '注销用户' : '解除限制'}</Text>
            {(actionModal?.type === 'ban' || actionModal?.type === 'mute') && (
              <>
                <Text style={st.modalLabel}>时长</Text>
                <View style={st.durRow}>{DURATIONS.map((d) => <Pressable key={d.value} style={[st.durBtn, actionDuration === d.value && st.durActive]} onPress={() => setActionDuration(d.value)}><Text style={[st.durText, actionDuration === d.value && st.durTextActive]}>{d.label}</Text></Pressable>)}</View>
                <Text style={st.modalLabel}>原因（可选）</Text>
                <TextInput style={st.modalInput} value={actionReason} onChangeText={setActionReason} placeholder="操作原因..." placeholderTextColor="#94a3b8" />
              </>
            )}
            {actionModal?.type === 'delete' && <Text style={{ color: '#ef4444', marginBottom: 12 }}>确认注销此用户？此操作不可逆。</Text>}
            <View style={st.modalBtns}>
              <Pressable onPress={() => setActionModal(null)} style={st.cancelBtn}><Text style={{ color: '#64748b', fontWeight: '600' }}>取消</Text></Pressable>
              <Pressable onPress={doAction} style={st.confirmBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>确认</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  role: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  infoGrid: { gap: 4, marginBottom: 12 },
  info: { fontSize: 13, color: '#334155' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
  statWarn: { backgroundColor: '#fef2f2' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLbl: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  actDanger: { backgroundColor: '#fef2f2' }, actWarn: { backgroundColor: '#fff7ed' },
  actOk: { backgroundColor: '#f0fdf4' }, actGray: { backgroundColor: '#f1f5f9' },
  actText: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  modalBg: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 8 },
  durRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  durBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  durActive: { backgroundColor: '#0f172a' },
  durText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  durTextActive: { color: '#fff' },
  modalInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
});
