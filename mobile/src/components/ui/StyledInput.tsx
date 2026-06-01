import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface StyledInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: any;
}

export default function StyledInput({ label, value, onChangeText, placeholder, secureTextEntry, multiline, numberOfLines, style }: StyledInputProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, multiline && { height: 120, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
});
