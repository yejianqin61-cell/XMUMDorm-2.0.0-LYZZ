import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../utils/http';

const STATUS_TABS = [
  { key: '', label: '全部' }, { key: 'pending', label: '待处理' },
  { key: 'processing', label: '处理中' }, { key: 'resolved', label: '已处理' }, { key: 'dismissed', label: '已驳回' },
];

const LABELS: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已处理', dismissed: '已驳回' };
const COLORS: Record<string, string> = { pending: '#f59e0b', processing: '#3b82f6', resolved: '#16a34a', dismissed: '#94a3b8' };

export default function AdminReportListScreen({ statusFilter, onBack, onReport }: { statusFilter?: string; onBack: () => void; onReport: (id: number) => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(statusFilter || '');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '30' });
    if (status) params.set('status', status);
    apiGet(`/api/admin/reports?${params.toString()}`).then((r) => {
      if (r.status === 0) setReports(r.data?.list || []);
      setLoading(false);
    });
  }, [status]);

  return (
    <View style={st.bg}>
      <View style={st.filterRow}>
        {STATUS_TABS.map((t) => (
          <Pressable key={t.key} style={[st.chip, status === t.key && st.chipActive]} onPress={() => setStatus(t.key)}>
            <Text style={[st.chipText, status === t.key && st.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={reports} keyExtractor={(r) => String(r.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={st.card} onPress={() => onReport(item.id)}>
              <View style={st.cardTop}>
                <View style={[st.stBadge, { backgroundColor: COLORS[item.status] || '#94a3b8' }]}><Text style={st.stBadgeText}>{LABELS[item.status] || item.status}</Text></View>
                <Text style={st.reason}>{item.reason}</Text>
              </View>
              <Text style={st.meta}>{item.reporter_name} → {item.reported_name} · {item.target_type}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  reason: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#94a3b8' },
});
