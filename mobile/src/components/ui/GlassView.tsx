/**
 * 液态玻璃容器
 * iOS：使用 BlurView 实现原生模糊
 * Android：降级为半透明背景 + 白色边框
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps {
  children: React.ReactNode;
  intensity?: number;
  style?: any;
}

export default function GlassView({ children, intensity = 20, style }: GlassViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={[styles.base, style]}>
        {children}
      </BlurView>
    );
  }

  // Android 降级：半透明背景
  return (
    <View style={[styles.base, styles.androidFallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  androidFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});
