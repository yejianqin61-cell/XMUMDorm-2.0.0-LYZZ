import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'disclaimer', label: '免责声明' },
  { key: 'contact', label: '联系我们' },
];

export default function AboutInfoScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState('disclaimer');

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>{tab === 'disclaimer' ? '免责声明' : '联系我们'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {tab === 'disclaimer' ? (
          <View style={s.card}>
            <Text style={s.title}>免责声明</Text>
            <Text style={s.content}>
              XMUM Dorm（以下简称"本平台"）是由厦门大学马来西亚分校学生独立开发的校园社区平台。{'\n\n'}
              本平台上的所有内容均由用户自行发布，或来源于公开渠道的信息整理。{'\n\n'}
              本平台上的任何信息均不代表厦门大学马来西亚分校校方、任何院系部门、或任何商家的官方立场。{'\n\n'}
              如您认为本平台上的任何内容侵犯了您的合法权益，或存在不准确的信息，请通过"联系我们"页面提供的方式与我们取得联系。我们将在收到通知后及时核实并处理。{'\n\n'}
              本平台对用户发布的内容不承担任何法律责任。用户应自行判断信息的真实性和可靠性。{'\n\n'}
              感谢您的理解与支持。
            </Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.title}>联系我们</Text>
            <Text style={s.content}>
              如果您有任何问题、建议或反馈，欢迎通过以下方式联系我们：{'\n\n'}
            </Text>
            <View style={s.contactItem}>
              <Text style={s.contactLabel}>微信</Text>
              <Text style={s.contactValue}>YEJIANQIN_git</Text>
            </View>
            <View style={s.contactItem}>
              <Text style={s.contactLabel}>电话</Text>
              <Text style={s.contactValue}>01115078663</Text>
            </View>
            <View style={s.contactItem}>
              <Text style={s.contactLabel}>邮箱</Text>
              <Text style={s.contactValue}>yejianqin61@gmail.com</Text>
            </View>
            <Text style={[s.content, { marginTop: 16 }]}>
              欢迎同学们提供反馈建议，也欢迎有兴趣的同学加入开发团队！{'\n\n'}
              商家如需认领或修改店铺信息，也可通过以上方式联系。
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  tabRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  body: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  content: { fontSize: 14, color: '#475569', lineHeight: 24 },
  contactItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  contactValue: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
});
