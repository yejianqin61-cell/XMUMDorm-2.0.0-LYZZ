import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export default function StyledButton({ title, onPress, variant = 'primary', disabled, loading, style }: StyledButtonProps) {
  const bg = variant === 'primary' ? '#0f172a' : variant === 'danger' ? '#dc2626' : '#f1f5f9';
  const fg = variant === 'secondary' ? '#0f172a' : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
