import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../utils/http';

const ACTION_MAP: Record<string, string> = {
  ADMIN_BAN_USER: '封禁用户', ADMIN_UNBAN_USER: '解封用户', ADMIN_MUTE_USER: '禁言用户',
  ADMIN_UNMUTE_USER: '解禁用户', ADMIN_DELETE_USER: '注销用户', ADMIN_HIDE_CONTENT: '隐藏内容',
  ADMIN_RESTORE_CONTENT: '恢复内容', ADMIN_DELETE_CONTENT: '删除内容', ADMIN_PROCESS_REPORT: '处理举报',
  ADMIN_CREATE_ANNOUNCEMENT: '发布公告', ADMIN_UPDATE_ANNOUNCEMENT: '更新公告', ADMIN_DELETE_ANNOUNCEMENT: '删除公告',
  ADMIN_VIEW_DASHBOARD: '查看仪表盘', ADMIN_CONFIG_UPDATE: '更新配置',
};

export default function AdminAuditLogScreen({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/admin/audit-logs?pageSize=50').then((r) => {
      if (r.status === 0) setLogs(r.data?.list || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  return (
    <FlatList data={logs} keyExtractor={(l) => String(l.id)} contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <View style={st.card}>
          <Text style={st.action}>{ACTION_MAP[item.action] || item.action}</Text>
          <Text style={st.meta}>管理员: {item.admin_name || item.user_name || '-'} · {item.created_at?.substring(0, 16)}</Text>
          {item.target && <Text style={st.target}>{item.target}</Text>}
        </View>
      )}
      ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>暂无日志</Text>}
    />
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6 },
  action: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  meta: { fontSize: 12, color: '#94a3b8' },
  target: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
});
