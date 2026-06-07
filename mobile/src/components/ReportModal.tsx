import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../utils/http';

const REASONS = [
  { key: 'spam', label: '垃圾广告' },
  { key: 'fraud', label: '诈骗信息' },
  { key: 'abuse', label: '辱骂攻击' },
  { key: 'nsfw', label: '色情内容' },
  { key: 'trolling', label: '恶意引战' },
  { key: 'privacy', label: '侵犯隐私' },
  { key: 'illegal_trade', label: '违规交易' },
  { key: 'other', label: '其他' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  target_type: string;
  target_id: number;
}

export default function ReportModal({ visible, onClose, target_type, target_id }: Props) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { isLoggedIn } = useAuth();

  const handleClose = () => {
    setReason(''); setDetail(''); setDone(false); onClose();
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!reason) { Alert.alert('请选择举报原因'); return; }

    setSubmitting(true);
    try {
      const r = await apiPost('/api/reports', {
        target_type, target_id, reason,
        detail: detail.trim() || undefined,
      });
      if (r.status === 0) {
        setDone(true);
        Alert.alert('举报提交成功', '感谢您的反馈，我们会尽快处理。', [{ text: '好的', onPress: handleClose }]);
      } else {
        Alert.alert('举报失败', r.message || '请稍后再试');
      }
    } catch {
      Alert.alert('网络错误');
    }
    setSubmitting(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>举报内容</Text>
            <Pressable onPress={handleClose}><Text style={s.closeBtn}>✕</Text></Pressable>
          </View>

          {done ? (
            <View style={s.doneBox}>
              <Text style={s.doneIcon}>✅</Text>
              <Text style={s.doneText}>举报已提交</Text>
            </View>
          ) : (
            <>
              {/* Reasons grid */}
              <Text style={s.label}>选择原因</Text>
              <View style={s.reasonGrid}>
                {REASONS.map((r) => (
                  <Pressable
                    key={r.key}
                    style={[s.reasonBtn, reason === r.key && s.reasonActive]}
                    onPress={() => setReason(r.key)}
                  >
                    <Text style={[s.reasonText, reason === r.key && s.reasonActiveText]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Detail */}
              <Text style={s.label}>补充描述（可选）</Text>
              <TextInput
                style={s.input}
                value={detail}
                onChangeText={setDetail}
                placeholder="补充描述..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
              />

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || !reason}
                style={[s.submitBtn, (!reason || submitting) && s.submitDisabled]}
              >
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>提交举报</Text>}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 360 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  closeBtn: { fontSize: 20, color: '#94a3b8', padding: 4 },

  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 8 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  reasonActive: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  reasonText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  reasonActiveText: { color: '#ef4444', fontWeight: '700' },

  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', minHeight: 70 },

  submitBtn: { marginTop: 16, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  submitDisabled: { backgroundColor: '#fca5a5' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  doneBox: { alignItems: 'center', paddingVertical: 30 },
  doneIcon: { fontSize: 40, marginBottom: 8 },
  doneText: { fontSize: 15, color: '#16a34a', fontWeight: '600' },
});
