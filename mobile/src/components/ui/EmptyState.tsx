import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  title: { fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  desc: { fontSize: 13, color: '#cbd5e1', marginTop: 4 },
});
