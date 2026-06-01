import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import TreeholeScreen from '../screens/TreeholeScreen';
import EatScreen from '../screens/EatScreen';
import SquareScreen from '../screens/SquareScreen';
import MyZoneScreen from '../screens/MyZoneScreen';
import MailboxScreen from '../screens/MailboxScreen';

const TABS = [
  { key: 'treehole', label: '树洞', icon: '🌳', Screen: TreeholeScreen },
  { key: 'eat', label: '食堂', icon: '🍽️', Screen: EatScreen },
  { key: 'mailbox', label: '信箱', icon: '📬', Screen: MailboxScreen },
  { key: 'square', label: '广场', icon: '🏛️', Screen: SquareScreen },
  { key: 'myzone', label: '我的', icon: '👤', Screen: MyZoneScreen },
];

export default function TabNavigator() {
  const [tab, setTab] = useState('treehole');
  const ActiveScreen = TABS.find((t) => t.key === tab)?.Screen || TreeholeScreen;

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <ActiveScreen />
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabIcon, tab === t.key && styles.tabActiveIcon]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabActiveLabel]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingBottom: 4, paddingTop: 2, height: 50 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 18 },
  tabActiveIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  tabActiveLabel: { color: '#0f172a', fontWeight: '700' },
});
