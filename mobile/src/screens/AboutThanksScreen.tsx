import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const THANKS_LIST = [
  { name: '张隆扬', desc: '法拉电子' },
  { name: '李靖教授', desc: '' },
  { name: 'Pink 刘晓强', desc: '黑马程序员' },
  { name: '叶以翔', desc: '' },
  { name: '郑贤教授', desc: '' },
  { name: '陈淑琦老师', desc: '' },
  { name: '赖瑾乐', desc: '' },
  { name: 'yyj女士', desc: '' },
  { name: '程新招医生', desc: '' },
  { name: '朱晓帆教授', desc: '' },
  { name: '涂宜晖女士', desc: '' },
];

export default function AboutThanksScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>特别鸣谢</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={THANKS_LIST}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.body}
        ListHeaderComponent={
          <Text style={s.intro}>
            在 Dorm 的开发过程中，以下人士和机构给予了无私的帮助和支持。排名不分先后，谨此致谢。
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View style={s.index}><Text style={s.indexText}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              {item.desc ? <Text style={s.desc}>{item.desc}</Text> : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, gap: 12 },
  index: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  desc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
