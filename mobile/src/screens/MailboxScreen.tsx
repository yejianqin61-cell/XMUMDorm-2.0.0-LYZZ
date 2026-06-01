import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

const MODULE_TABS = [
  { key: 'all', label: '全部', labelEn: 'All' },
  { key: 'treehole', label: '树洞', labelEn: 'Treehole' },
  { key: 'trending', label: '热搜', labelEn: 'Trending' },
  { key: 'canteen', label: '食堂', labelEn: 'Canteen' },
  { key: 'marketplace', label: '二手', labelEn: 'Market' },
  { key: 'club', label: '社团', labelEn: 'Club' },
  { key: 'system', label: '系统', labelEn: 'System' },
];

function formatTime(createdAt: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

function getActionText(type: string, isZh: boolean) {
  if (type.includes('like')) return isZh ? '赞了' : 'liked';
  if (type.includes('comment') || type.includes('review') || type.includes('reply')) return isZh ? '评论了' : 'commented';
  if (type.includes('follow')) return isZh ? '关注了' : 'followed';
  if (type.includes('want')) return isZh ? '收藏了' : 'wanted';
  if (type.includes('chat')) return isZh ? '发来消息' : 'messaged';
  if (type.includes('announcement') || type.includes('ban')) return isZh ? '系统通知' : 'System';
  return isZh ? '互动了' : 'interacted';
}

export default function MailboxScreen() {
  const { isLoggedIn, token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const modParam = tab !== 'all' ? `&module=${tab}` : '';
      const [notifData, summaryData] = await Promise.all([
        apiGet(`/api/notifications?page=1&pageSize=50${modParam}`),
        apiGet('/api/notifications/unread-summary'),
      ]);
      if (notifData.status === 0) setNotifications(notifData.data?.list || []);
      if (summaryData?.byModule) setUnreadCounts(summaryData.byModule);
    } catch {}
    setLoading(false);
  }, [isLoggedIn, tab]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleClear = async () => {
    const tabLabel = MODULE_TABS.find((t) => t.key === tab)?.label || tab;
    if (!window.confirm?.(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel}?`)) {
      // RN doesn't have window.confirm; use Alert
      Alert.alert(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel}?`, '', [
        { text: isZh ? '取消' : 'Cancel', style: 'cancel' },
        { text: isZh ? '清空' : 'Clear', style: 'destructive', onPress: async () => {
          setClearing(true);
          const modParam = tab !== 'all' ? `?module=${tab}` : '?scope=social';
          await fetch(`${API}/api/notifications/clear${modParam}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          });
          setClearing(false);
          fetchNotifications();
        }},
      ]);
      return;
    }
  };

  const allUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (!isLoggedIn) {
    return <SafeAreaView style={s.bg}><Text style={s.empty}>请先登录</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      {/* 标题栏 */}
      <View style={s.header}>
        <Text style={s.title}>{isZh ? '📬 信箱' : '📬 Mailbox'}</Text>
        <Pressable onPress={handleClear} style={s.clearBtn}>
          <Text style={s.clearText}>{isZh ? '清空' : 'Clear'}</Text>
        </Pressable>
      </View>

      {/* 模块 Tab */}
      <View style={s.tabRow}>
        {MODULE_TABS.map((mt) => {
          const count = mt.key === 'all' ? allUnread : (unreadCounts[mt.key] || 0);
          const active = tab === mt.key;
          return (
            <Pressable key={mt.key} onPress={() => setTab(mt.key)} style={[s.tab, active && s.tabActive]}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{isZh ? mt.label : mt.labelEn}</Text>
              {count > 0 && <Text style={[s.tabBadge, active && s.tabBadgeActive]}>{count}</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* 通知列表 */}
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const isUnread = !item.is_read;
            const fromName = item.from_user?.nickname || item.from_user?.username || '匿名';
            const action = getActionText(item.type, isZh);
            const targetTitle = item.target?.title || item.extra?.targetTitle || '';
            return (
              <Pressable onPress={() => markRead(item.id)} style={[s.card, isUnread && s.cardUnread]}>
                <View style={s.cardHeader}>
                  <Text style={s.fromName}>{fromName}</Text>
                  <Text style={s.actionText}>{action}</Text>
                  <Text style={s.timeText}>{formatTime(item.created_at)}</Text>
                </View>
                {targetTitle ? <Text style={s.cardTitle} numberOfLines={1}>{targetTitle}</Text> : null}
                {item.extra?.content ? <Text style={s.cardContent} numberOfLines={1}>{item.extra.content}</Text> : null}
                {isUnread && <View style={s.unreadDot} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>{isZh ? '暂无通知' : 'No notifications'}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#fee2e2' },
  clearText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 4, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e2e8f0' },
  tabActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  tabBadge: { marginLeft: 4, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, textAlign: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tabBadgeActive: { backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, position: 'relative', borderWidth: 0.5, borderColor: '#f1f5f9' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#6366f1', backgroundColor: '#f8fafc' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fromName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  actionText: { fontSize: 13, color: '#64748b' },
  timeText: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' },
  cardTitle: { fontSize: 13, color: '#475569', marginBottom: 2 },
  cardContent: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 60 },
});
