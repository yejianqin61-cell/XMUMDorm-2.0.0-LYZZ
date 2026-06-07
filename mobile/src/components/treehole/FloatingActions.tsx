import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Plus, ChevronUp } from 'lucide-react-native';
import { TREEHOLE } from '../../theme/treehole';

interface FloatingActionsProps {
  showTopBtn: boolean;
  onScrollToTop: () => void;
  onNewPost: () => void;
}

export default function FloatingActions({ showTopBtn, onScrollToTop, onNewPost }: FloatingActionsProps) {
  return (
    <>
      {showTopBtn && (
        <Pressable style={styles.topBtn} onPress={onScrollToTop}>
          <ChevronUp size={22} color="rgba(0, 91, 172, 0.98)" strokeWidth={2.4} />
        </Pressable>
      )}
      <Pressable style={styles.fab} onPress={onNewPost}>
        <Plus size={28} color="#fff" strokeWidth={2.2} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute' as const, right: 18, bottom: TREEHOLE.fabBottom,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TREEHOLE.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: TREEHOLE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 6, zIndex: 100,
  },
  topBtn: {
    position: 'absolute' as const, right: 86, bottom: TREEHOLE.fabBottom + 4,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1, borderColor: 'rgba(226, 232, 240, 1)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 4, zIndex: 100,
  },
});
