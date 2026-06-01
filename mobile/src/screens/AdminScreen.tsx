import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminUserListScreen from './AdminUserListScreen';
import AdminUserDetailScreen from './AdminUserDetailScreen';
import AdminReportListScreen from './AdminReportListScreen';
import AdminReportDetailScreen from './AdminReportDetailScreen';
import AdminContentListScreen from './AdminContentListScreen';
import AdminContentDetailScreen from './AdminContentDetailScreen';
import AdminAnnouncementScreen from './AdminAnnouncementScreen';
import AdminAuditLogScreen from './AdminAuditLogScreen';
import AdminConfigScreen from './AdminConfigScreen';
import AdminSensitiveWordsScreen from './AdminSensitiveWordsScreen';
import AdminOrgListScreen from './AdminOrgListScreen';
import AdminOrgDetailScreen from './AdminOrgDetailScreen';

const MENU = [
  { key: 'dashboard', icon: '📊', label: '数据面板' },
  { key: 'users', icon: '👥', label: '用户管理' },
  { key: 'reports', icon: '🚩', label: '举报中心' },
  { key: 'contents', icon: '📦', label: '内容管理' },
  { key: 'organizations', icon: '🏢', label: '组织管理' },
  { key: 'announcements', icon: '📢', label: '公告管理' },
  { key: 'sensitiveWords', icon: '🛡️', label: '敏感词' },
  { key: 'config', icon: '⚙️', label: '系统配置' },
  { key: 'auditLogs', icon: '📋', label: '操作日志' },
];

type ViewState =
  | { screen: 'dashboard' }
  | { screen: 'users' }
  | { screen: 'userDetail'; userId: number }
  | { screen: 'reports'; status?: string }
  | { screen: 'reportDetail'; reportId: number }
  | { screen: 'contents'; module?: string }
  | { screen: 'contentDetail'; module: string; id: number }
  | { screen: 'organizations' }
  | { screen: 'orgMembers'; orgId: number; orgName: string }
  | { screen: 'announcements' }
  | { screen: 'auditLogs' }
  | { screen: 'config' }
  | { screen: 'sensitiveWords' };

export default function AdminScreen({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<ViewState>({ screen: 'dashboard' });
  const [menuOpen, setMenuOpen] = useState(false);
  const currentLabel = MENU.find((m) => m.key === view.screen)?.label || '管理后台';

  const renderView = () => {
    switch (view.screen) {
      case 'dashboard': return <AdminDashboardScreen onNavigate={setView} />;
      case 'users': return <AdminUserListScreen onBack={() => setView({ screen: 'dashboard' })} onUser={(id) => setView({ screen: 'userDetail', userId: id })} />;
      case 'userDetail': return <AdminUserDetailScreen userId={view.userId} onBack={() => setView({ screen: 'users' })} />;
      case 'reports': return <AdminReportListScreen statusFilter={view.status} onBack={() => setView({ screen: 'dashboard' })} onReport={(id) => setView({ screen: 'reportDetail', reportId: id })} />;
      case 'reportDetail': return <AdminReportDetailScreen reportId={view.reportId} onBack={() => setView({ screen: 'reports' })} />;
      case 'contents': return <AdminContentListScreen moduleInit={view.module} onBack={() => setView({ screen: 'dashboard' })} onDetail={(module, id) => setView({ screen: 'contentDetail', module, id })} />;
      case 'contentDetail': return <AdminContentDetailScreen module={view.module} id={view.id} onBack={() => setView({ screen: 'contents', module: view.module })} />;
      case 'announcements': return <AdminAnnouncementScreen onBack={() => setView({ screen: 'dashboard' })} />;
      case 'auditLogs': return <AdminAuditLogScreen onBack={() => setView({ screen: 'dashboard' })} />;
      case 'config': return <AdminConfigScreen onBack={() => setView({ screen: 'dashboard' })} />;
      case 'sensitiveWords': return <AdminSensitiveWordsScreen onBack={() => setView({ screen: 'dashboard' })} />;
      case 'organizations': return <AdminOrgListScreen onBack={() => setView({ screen: 'dashboard' })} onMembers={(id, name) => setView({ screen: 'orgMembers', orgId: id, orgName: name })} />;
      case 'orgMembers': return <AdminOrgDetailScreen orgId={view.orgId} orgName={view.orgName} onBack={() => setView({ screen: 'organizations' })} />;
      default: return <AdminDashboardScreen onNavigate={setView} />;
    }
  };

  return (
    <SafeAreaView style={st.bg} edges={['top']}>
      <View style={st.topbar}>
        <Pressable onPress={onBack}><Text style={st.back}>← 返回</Text></Pressable>
        <Text style={st.title}>{currentLabel}</Text>
        <Pressable onPress={() => setMenuOpen(true)}><Text style={st.menuBtn}>☰</Text></Pressable>
      </View>

      {renderView()}

      {/* Menu Modal */}
      <Modal visible={menuOpen} animationType="slide" transparent>
        <View style={st.menuOverlay}>
          <View style={st.menuCard}>
            <View style={st.menuHeader}>
              <Text style={st.menuTitle}>管理后台</Text>
              <Pressable onPress={() => setMenuOpen(false)}><Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text></Pressable>
            </View>
            <ScrollView>
              {MENU.map((m) => (
                <Pressable key={m.key} style={[st.menuItem, view.screen === m.key && st.menuActive]}
                  onPress={() => { setMenuOpen(false); setView({ screen: m.key } as any); }}>
                  <Text style={st.menuIcon}>{m.icon}</Text>
                  <Text style={[st.menuLabel, view.screen === m.key && st.menuLabelActive]}>{m.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#1e293b' },
  back: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  menuBtn: { fontSize: 22, color: '#fff' },

  menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  menuCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 30 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  menuTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  menuActive: { backgroundColor: '#eff6ff' },
  menuIcon: { fontSize: 18 },
  menuLabel: { fontSize: 15, color: '#334155', fontWeight: '500' },
  menuLabelActive: { color: '#2563eb', fontWeight: '700' },
});
