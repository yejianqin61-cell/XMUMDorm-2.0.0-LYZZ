import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

const TYPE_TABS = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'delivery', label: '代取', icon: '📦' },
  { key: 'purchase', label: '代购', icon: '🛍️' },
  { key: 'urgent', label: '紧急', icon: '⚡' },
];

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '进行中' },
  { key: 'taken', label: '已接单' },
];

const TYPE_LABELS: Record<string, string> = { delivery: '代取', purchase: '代购', urgent: '紧急' };
const STATUS_LABELS: Record<string, string> = { open: '进行中', taken: '已接单', done: '已完成' };
const STATUS_COLORS: Record<string, string> = { open: '#16a34a', taken: '#2563eb', done: '#94a3b8' };

function fmtTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString();
}

function fmtDeadline(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Props { onDetail: (id: number) => void; onPublish: () => void; }

export default function ErrandsHomeScreen({ onDetail, onPublish }: Props) {
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isLoggedIn } = useAuth();

  const fetchData = useCallback(async (type: string, status: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== 'all') params.set('type', type);
    if (status !== 'all') params.set('status', status);
    params.set('pageSize', '30');
    const qs = params.toString();
    const res = await apiGet(`/api/errands${qs ? `?${qs}` : ''}`);
    if (res.status === 0) setErrands(res.data?.list || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(typeFilter, statusFilter); }, [typeFilter, statusFilter]);

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🏃 跑腿</Text>
        {isLoggedIn && (
          <Pressable onPress={onPublish} style={s.pubBtn}>
            <Text style={s.pubBtnText}>+ 发布</Text>
          </Pressable>
        )}
      </View>

      {/* Type tabs */}
      <View style={s.typeRow}>
        {TYPE_TABS.map((t) => (
          <Pressable key={t.key} style={[s.typeTab, typeFilter === t.key && s.typeTabActive]} onPress={() => setTypeFilter(t.key)}>
            <Text style={s.typeIcon}>{t.icon}</Text>
            <Text style={[s.typeLabel, typeFilter === t.key && s.typeLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Status filter */}
      <View style={s.statusRow}>
        {STATUS_TABS.map((st) => (
          <Pressable key={st.key} style={[s.statusTab, statusFilter === st.key && s.statusTabActive]} onPress={() => setStatusFilter(st.key)}>
            <Text style={[s.statusText, statusFilter === st.key && s.statusTextActive]}>{st.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={errands}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onDetail(item.id)}>
              <View style={s.cardTop}>
                <View style={[s.typeBadge, item.type === 'urgent' && s.typeBadgeUrgent]}>
                  <Text style={[s.typeBadgeText, item.type === 'urgent' && s.typeBadgeTextUrgent]}>{TYPE_LABELS[item.type] || item.type}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }]}>
                  <Text style={s.statusBadgeText}>{STATUS_LABELS[item.status] || item.status}</Text>
                </View>
              </View>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              {(item.deadline || item.location) && (
                <View style={s.metaRow}>
                  {item.deadline && <Text style={s.meta}>⏰ {fmtDeadline(item.deadline)}</Text>}
                  {item.location && <Text style={s.meta}>📍 {item.location}</Text>}
                </View>
              )}
              <View style={s.bottomRow}>
                <Text style={s.reward}>RM {Number(item.reward || 0).toFixed(2)}</Text>
                <Text style={s.owner}>👤 {item.owner?.nickname || item.owner?.username || '匿名'}</Text>
              </View>
              <Text style={s.time}>{fmtTime(item.createdAt)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无跑腿任务</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  pubBtn: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  pubBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  typeRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  typeTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  typeTabActive: { backgroundColor: '#0f172a' },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },
  typeLabelActive: { color: '#fff' },

  statusRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8, backgroundColor: '#fff' },
  statusTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  statusTabActive: { backgroundColor: '#0f172a' },
  statusText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statusTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f1f5f9' },
  typeBadgeUrgent: { backgroundColor: '#fef2f2' },
  typeBadgeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  typeBadgeTextUrgent: { color: '#ef4444' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  meta: { fontSize: 12, color: '#64748b' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reward: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
  owner: { fontSize: 12, color: '#94a3b8' },
  time: { fontSize: 11, color: '#cbd5e1', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
