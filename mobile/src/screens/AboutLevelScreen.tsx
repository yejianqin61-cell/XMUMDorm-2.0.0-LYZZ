import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LEVELS = [
  { level: 1, emoji: '🌱', name: '新生', minExp: 0 },
  { level: 2, emoji: '🧭', name: '探索者', minExp: 100 },
  { level: 3, emoji: '✨', name: '贡献者', minExp: 300 },
  { level: 4, emoji: '⭐', name: '校园达人', minExp: 800 },
  { level: 5, emoji: '🔥', name: '资深成员', minExp: 1800 },
  { level: 6, emoji: '👑', name: '校园传奇', minExp: 4000 },
];

const EXP_RULES = [
  { action: '每日登录', exp: 5, cap: 5, emoji: '📱' },
  { action: '点赞', exp: 1, cap: 15, emoji: '❤️' },
  { action: '评论', exp: 5, cap: 15, emoji: '💬' },
  { action: '发帖', exp: 10, cap: 30, emoji: '📝' },
  { action: '食堂点评', exp: 10, cap: 30, emoji: '🍽️' },
  { action: '优质点评加成', exp: 5, cap: 15, emoji: '✨' },
  { action: '帖子达10赞', exp: 20, cap: '—', emoji: '🔥' },
  { action: '帖子达10评', exp: 20, cap: '—', emoji: '💬' },
];

export default function AboutLevelScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>等级体系</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.sectionTitle}>🎖️ 等级徽章</Text>
        {LEVELS.map((lv) => (
          <View key={lv.level} style={s.levelRow}>
            <Text style={s.levelEmoji}>{lv.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.levelName}>Lv.{lv.level} — {lv.name}</Text>
              <Text style={s.levelExp}>需要 {lv.minExp.toLocaleString()} EXP</Text>
            </View>
          </View>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>📊 EXP 获取规则</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, s.tableCellH, { flex: 2 }]}>行为</Text>
            <Text style={[s.tableCell, s.tableCellH]}>EXP</Text>
            <Text style={[s.tableCell, s.tableCellH]}>日上限</Text>
          </View>
          {EXP_RULES.map((rule, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 2 }]}>{rule.emoji} {rule.action}</Text>
              <Text style={s.tableCell}>+{rule.exp}</Text>
              <Text style={s.tableCell}>{rule.cap}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>📋 规则说明</Text>
        <Text style={s.rule}>
          · 发帖需 ≥ 10 字符才能获得 EXP{'\n'}
          · 评论需 ≥ 5 字符才能获得 EXP{'\n'}
          · 食堂点评 ≥ 20 字或带图片可获优质加成{'\n'}
          · 点赞/评论自己内容不获得 EXP{'\n'}
          · 取消点赞会扣除对应 EXP{'\n'}
          · 热门帖子奖励每个里程碑仅触发一次
        </Text>
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

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },

  levelRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  levelEmoji: { fontSize: 28 },
  levelName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  levelExp: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  tableCell: { flex: 1, fontSize: 13, color: '#334155' },
  tableCellH: { fontWeight: '700', color: '#0f172a', fontSize: 12 },

  rule: { fontSize: 13, color: '#475569', lineHeight: 22, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
});
