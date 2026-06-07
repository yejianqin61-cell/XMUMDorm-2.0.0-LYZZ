import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, Alert,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/http';
import { fmtDeadline } from '../utils';

interface Props { errandId: number; onBack: () => void; }

const TYPE_LABELS: Record<string, string> = { delivery: '代取', purchase: '代购', urgent: '紧急' };
const STATUS_LABELS: Record<string, string> = { open: '进行中', taken: '已接单', done: '已完成' };
const STATUS_COLORS: Record<string, string> = { open: '#16a34a', taken: '#2563eb', done: '#94a3b8' };


export default function ErrandDetailScreen({ errandId, onBack }: Props) {
  const [errand, setErrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoggedIn } = useAuth();

  const fetchDetail = async () => {
    setLoading(true);
    const res = await apiGet(`/api/errands/${errandId}`);
    if (res.status === 0) setErrand(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [errandId]);

  const isOwner = user && errand && user.id === errand.owner?.id;
  const isAdmin = user?.role === 'admin';
  const canManage = isOwner || isAdmin;
  const canTake = canManage && errand?.status !== 'done';

  const handleTake = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    const res = await apiPost(`/api/errands/${errandId}/take`);
    if (res.status === 0) {
      Alert.alert(res.message || '操作成功');
      fetchDetail();
    } else {
      Alert.alert('操作失败', res.message);
    }
  };

  const handleDone = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    const res = await apiPost(`/api/errands/${errandId}/done`);
    if (res.status === 0) {
      Alert.alert(res.message || '操作成功');
      fetchDetail();
    } else {
      Alert.alert('操作失败', res.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          const res = await apiDelete(`/api/errands/${errandId}`);
          if (res.status === 0) { Alert.alert('已删除', '', [{ text: '好的', onPress: onBack }]); }
          else { Alert.alert('删除失败', res.message); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.bg} edges={['top']}>
        <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View>
        <ActivityIndicator style={{ marginTop: 60 }} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 跑腿</Text></Pressable>
        <Text style={s.headerTitle}>任务详情</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.card}>
          <View style={s.badgeRow}>
            <View style={[s.typeBadge, errand.type === 'urgent' && s.typeBadgeUrgent]}>
              <Text style={[s.typeBadgeText, errand.type === 'urgent' && s.typeBadgeTextUrgent]}>{TYPE_LABELS[errand.type] || errand.type}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[errand.status] || '#94a3b8' }]}>
              <Text style={s.statusBadgeText}>{STATUS_LABELS[errand.status] || errand.status}</Text>
            </View>
          </View>

          <Text style={s.title}>{errand.title}</Text>
          <Text style={s.reward}>RM {Number(errand.reward || 0).toFixed(2)}</Text>

          {errand.deadline && (
            <View style={s.infoRow}><Text style={s.infoLabel}>⏰ 截止时间</Text><Text style={s.infoValue}>{fmtDeadline(errand.deadline)}</Text></View>
          )}
          {errand.location && (
            <View style={s.infoRow}><Text style={s.infoLabel}>📍 地点</Text><Text style={s.infoValue}>{errand.location}</Text></View>
          )}

          {errand.description ? <Text style={s.desc}>{errand.description}</Text> : null}

          {/* Contact info */}
          {errand.contactInfo ? (
            <View style={s.contactBox}>
              <Text style={s.contactLabel}>📞 联系方式</Text>
              <Text style={s.contactValue}>{errand.contactInfo}</Text>
              <Text style={s.contactHint}>无私聊系统，请直接联系</Text>
            </View>
          ) : null}

          {/* Owner + taker info */}
          <View style={s.userInfo}>
            <Text style={s.userLabel}>发布者：{errand.owner?.nickname || errand.owner?.username || '匿名'}</Text>
            {errand.taker && <Text style={s.userLabel}>接单者：{errand.taker.nickname || errand.taker.username || '匿名'}</Text>}
          </View>

          {/* Action buttons */}
          {canManage && (
            <View style={s.actionRow}>
              {canTake && (
                <Pressable style={[s.actionBtn, s.takeBtn]} onPress={handleTake}>
                  <Text style={s.actionBtnText}>{errand.status === 'taken' ? '取消接单' : '接单'}</Text>
                </Pressable>
              )}
              {canTake && (
                <Pressable style={[s.actionBtn, s.doneBtn]} onPress={handleDone}>
                  <Text style={s.actionBtnText}>{errand.status === 'done' ? '撤销完成' : '标记完成'}</Text>
                </Pressable>
              )}
              <Pressable style={[s.actionBtn, s.delBtn]} onPress={handleDelete}>
                <Text style={[s.actionBtnText, { color: '#ef4444' }]}>删除</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: '#f1f5f9' },
  typeBadgeUrgent: { backgroundColor: '#fef2f2' },
  typeBadgeText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  typeBadgeTextUrgent: { color: '#ef4444' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  reward: { fontSize: 24, fontWeight: '900', color: '#ef4444', marginBottom: 16 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },

  desc: { fontSize: 14, color: '#475569', lineHeight: 22, marginTop: 12, marginBottom: 12 },

  contactBox: { backgroundColor: '#fefce8', borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 12 },
  contactLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  contactValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  contactHint: { fontSize: 11, color: '#94a3b8' },

  userInfo: { marginTop: 12, marginBottom: 8 },
  userLabel: { fontSize: 13, color: '#64748b', marginBottom: 2 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  takeBtn: { backgroundColor: '#0f172a' },
  doneBtn: { backgroundColor: '#16a34a' },
  delBtn: { backgroundColor: '#fef2f2' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
