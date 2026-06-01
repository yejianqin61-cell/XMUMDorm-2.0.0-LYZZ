import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'team', label: '团队介绍' },
  { key: 'editor', label: '编者的话' },
];

const TEAM_SECTIONS = [
  {
    title: '创始人 & 开发者',
    enTitle: 'Founder & Developer',
    members: [
      { name: '叶健钦', enName: 'Ye Jianqin', role: '厦大马来分校 CST', enRole: 'XMUM CST' },
    ],
  },
  {
    title: '技术顾问',
    enTitle: 'Tech Advisor',
    members: [
      { name: '叶以翔', enName: 'Ye Yixiang', role: '四川大学', enRole: 'Sichuan University' },
    ],
  },
  {
    title: '美术顾问',
    enTitle: 'Art Advisor',
    members: [
      { name: '涂宜晖 女士', enName: 'Ms. Tu Yihui', role: '厦门', enRole: 'Xiamen' },
    ],
  },
  {
    title: '宣发团队',
    enTitle: 'Promotion Team',
    members: [
      'Xu Zhiyao', 'Tian Wenqi', 'Zheng Huangze', 'Wang Linxi',
      'Ling Bangyao', 'Lin Haoyun', 'Xia Youran', 'Yin Peisen',
    ].map((n) => ({ name: n, enName: n, role: '厦大马来', enRole: 'XMUM' })),
  },
  {
    title: 'Dorm 3.0 探索团队',
    enTitle: 'Dorm 3.0 Explorer Team',
    members: [
      { name: '叶健钦', enName: 'Ye Jianqin', role: '', enRole: '' },
      { name: 'Zheng Huangze', enName: 'Zheng Huangze', role: '', enRole: '' },
    ],
  },
];

export default function AboutProfileScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState('team');

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>关于我们</Text>
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
        {tab === 'team' ? (
          <>
            <Text style={s.subtitle}>XMUM Dorm 是由厦大马来分校学生独立开发的校园社区平台。</Text>
            {TEAM_SECTIONS.map((sec, i) => (
              <View key={i} style={s.section}>
                <Text style={s.sectionTitle}>{sec.title} / {sec.enTitle}</Text>
                {sec.members.map((m: any, j: number) => (
                  <View key={j} style={s.memberCard}>
                    <Text style={s.memberName}>{m.name}</Text>
                    {m.role ? <Text style={s.memberRole}>{m.role}</Text> : null}
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <View style={s.editorCard}>
            <Text style={s.editorTitle}>编者的话</Text>
            <Text style={s.editorDate}>2026 / 3 / 10</Text>
            <Text style={s.editorBody}>
              Dorm 始于一个简单的想法：让厦大马来分校的同学们有一个属于自己的线上家园。{'\n\n'}
              从最初的一张粗糙的网页，到如今承载着树洞、食堂、社团、二手市场、课程表等十几个模块的完整平台，
              Dorm 的每一步成长都离不开大家的支持和反馈。{'\n\n'}
              在开发过程中，我们广泛使用了 AI 工具来提升效率——包括 Cursor、ChatGPT、DeepSeek、豆包、即梦 AI 等。
              但真正赋予 Dorm 灵魂的，是每一位使用它的同学。{'\n\n'}
              「绿我涓滴，会它千顷澄碧」——愿这一点一滴的努力，终能汇聚成一片澄澈的湖海。{'\n\n'}
              —— 叶健钦
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
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 16 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  memberCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  memberRole: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  editorCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  editorTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  editorDate: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  editorBody: { fontSize: 15, color: '#475569', lineHeight: 26 },
});
