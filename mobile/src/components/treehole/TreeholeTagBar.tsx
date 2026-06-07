import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { TagItem } from '../../hooks/usePostTags';

interface TreeholeTagBarProps {
  tags: TagItem[];
  selectedTagSlug: string | null;
  onPickTag: (slug: string | null) => void;
  isLoggedIn: boolean;
  tagDisplay: (t: TagItem) => string;
  onTagPlusPress?: () => void;
}

export default function TreeholeTagBar({
  tags, selectedTagSlug, onPickTag, isLoggedIn, tagDisplay, onTagPlusPress,
}: TreeholeTagBarProps) {
  return (
    <View style={styles.tagBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagScroll}
      >
        <Pressable onPress={() => onPickTag(null)} style={styles.tagItem}>
          <Text style={[styles.tagLabel, selectedTagSlug == null && styles.tagLabelActive]}>
            Popular
          </Text>
          {selectedTagSlug == null ? <View style={styles.tagUnderline} /> : null}
        </Pressable>
        {tags.map((t) => {
          const active = selectedTagSlug === t.slug;
          return (
            <Pressable key={t.id} onPress={() => onPickTag(t.slug)} style={styles.tagItem}>
              <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>
                {tagDisplay(t)}
              </Text>
              {active ? <View style={styles.tagUnderline} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {isLoggedIn ? (
        <Pressable style={styles.tagPlus} onPress={onTagPlusPress}>
          <Plus size={18} color="#64748b" strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tagBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 12, paddingRight: 8,
    marginTop: 20, marginBottom: 6, gap: 8,
  },
  tagScroll: {
    flexDirection: 'row', alignItems: 'center',
    gap: 24, paddingHorizontal: 8, paddingRight: 16,
  },
  tagItem: { paddingVertical: 8, position: 'relative' as const },
  tagLabel: { fontSize: 14, fontWeight: '400' as const, color: '#94a3b8' },
  tagLabelActive: {
    fontWeight: '700' as const, color: '#0891b2',
    transform: [{ scale: 1.05 }],
  },
  tagUnderline: {
    position: 'absolute' as const, left: 0, right: 0, bottom: 2,
    height: 2, borderRadius: 999, backgroundColor: '#06b6d4',
  },
  tagPlus: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 0.5, borderColor: 'rgba(226, 232, 240, 1)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    justifyContent: 'center', alignItems: 'center',
  },
});
