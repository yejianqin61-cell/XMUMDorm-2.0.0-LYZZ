import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../utils/http';

export default function AdminDashboardScreen({ onNavigate }: { onNavigate: (v: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/admin/dashboard').then((r) => {
      if (r.status === 0) setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  const stats = [
    { label: '总用户', value: data?.totalUsers ?? '-', color: '#3b82f6' },
    { label: '今日新增', value: data?.todayNewUsers ?? '-', color: '#16a34a' },
    { label: '今日活跃', value: data?.todayActiveUsers ?? '-', color: '#7c3aed' },
    { label: '待处理举报', value: data?.pendingReports ?? '-', color: '#ef4444' },
  ];

  return (
    <ScrollView contentContainerStyle={s.body}>
      <View style={s.statRow}>
        {stats.map((st) => (
          <View key={st.label} style={[s.statCard, { borderTopColor: st.color }]}>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>快捷入口</Text>
      <View style={s.quickRow}>
        {[
          { label: '用户管理', screen: 'users' },
          { label: '举报中心', screen: 'reports' },
          { label: '内容管理', screen: 'contents' },
          { label: '操作日志', screen: 'auditLogs' },
        ].map((q) => (
          <Pressable key={q.screen} style={s.quickBtn} onPress={() => onNavigate({ screen: q.screen })}>
            <Text style={s.quickText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {data?.recentReports?.length > 0 && (
        <>
          <Text style={s.sectionTitle}>最近举报</Text>
          {data.recentReports.slice(0, 5).map((r: any) => (
            <Pressable key={r.id} style={s.reportItem} onPress={() => onNavigate({ screen: 'reportDetail', reportId: r.id })}>
              <Text style={s.reportReason}>{r.reason}</Text>
              <Text style={s.reportMeta}>{r.reporter_name} → {r.reported_name}</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderTopWidth: 3 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10, marginTop: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a' },
  quickText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reportItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6 },
  reportReason: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  reportMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
