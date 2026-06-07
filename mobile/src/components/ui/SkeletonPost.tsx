import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCard from './SkeletonCard';

interface SkeletonPostProps {
  width?: number;
}

export default function SkeletonPost({ width = 160 }: SkeletonPostProps) {
  return (
    <View style={[styles.card, { width }]}>
      <SkeletonCard width={32} height={32} borderRadius={16} />
      <View style={styles.lines}>
        <SkeletonCard width="80%" height={14} borderRadius={7} />
        <SkeletonCard width="100%" height={10} borderRadius={5} />
        <SkeletonCard width="60%" height={10} borderRadius={5} />
      </View>
      <SkeletonCard width="100%" height={width * 0.75} borderRadius={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(226, 232, 240, 1)',
  },
  lines: { gap: 6 },
});
