import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';

// Level thresholds: cumulative EXP needed for each level
const LEVEL_THRESHOLDS = [0, 100, 300, 800, 1800, 4000, 8000];

const BADGES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🌱', label: '新生' },
  2: { emoji: '🧭', label: '探索者' },
  3: { emoji: '✨', label: '贡献者' },
  4: { emoji: '⭐', label: '校园达人' },
  5: { emoji: '🔥', label: '资深成员' },
  6: { emoji: '👑', label: '校园传奇' },
};

export function getLevelByExp(exp: number) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return Math.min(level, 6);
}

export function getExpProgress(exp: number) {
  const level = getLevelByExp(exp);
  const currentMin = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextMin = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] * 2;
  const progress = nextMin > currentMin ? (exp - currentMin) / (nextMin - currentMin) : 1;
  return { level, exp, currentMin, nextMin, progress: Math.min(1, Math.max(0, progress)) };
}

export function getBadgeForLevel(level: number) {
  return BADGES[level] || BADGES[1];
}

interface ExpFeedbackCtx {
  handleExpResponse: (result: any) => void;
  showLevelUp: (level: number, prevLevel: number) => void;
}

const ExpFeedbackContext = createContext<ExpFeedbackCtx | null>(null);

export function ExpFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [levelUp, setLevelUp] = useState<{ level: number; prevLevel: number } | null>(null);
  const { refreshUser } = useAuth();

  const handleExpResponse = useCallback((result: any) => {
    const exp = result?.__exp || result?.exp;
    if (!exp) return;

    if (exp.delta && exp.delta !== 0) {
      const sign = exp.delta > 0 ? '+' : '';
      Alert.alert(
        '',
        `${sign}${exp.delta} 经验`,
        [{ text: '好的' }],
        { cancelable: true }
      );
    }

    if (exp.levelUp && exp.level) {
      setLevelUp({ level: exp.level, prevLevel: exp.previousLevel || exp.level - 1 });
    }

    refreshUser();
  }, [refreshUser]);

  const showLevelUp = useCallback((level: number, prevLevel: number) => {
    setLevelUp({ level, prevLevel });
  }, []);

  return (
    <ExpFeedbackContext.Provider value={{ handleExpResponse, showLevelUp }}>
      {children}
      {levelUp && (
        <LevelUpModal
          level={levelUp.level}
          prevLevel={levelUp.prevLevel}
          onClose={() => setLevelUp(null)}
        />
      )}
    </ExpFeedbackContext.Provider>
  );
}

export function useExpFeedback() {
  const ctx = useContext(ExpFeedbackContext);
  if (!ctx) throw new Error('useExpFeedback must be used within ExpFeedbackProvider');
  return ctx;
}

// Inline LevelUpModal (avoids circular dependency)
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';

function LevelUpModal({ level, prevLevel, onClose }: { level: number; prevLevel: number; onClose: () => void }) {
  const badge = getBadgeForLevel(level);
  return (
    <Modal visible transparent animationType="fade">
      <View style={ls.overlay}>
        <View style={ls.card}>
          <Text style={ls.emoji}>{badge.emoji}</Text>
          <Text style={ls.title}>🎉 恭喜升级！</Text>
          <Text style={ls.levelText}>Lv.{prevLevel} → Lv.{level}</Text>
          <Text style={ls.badgeLabel}>获得「{badge.label}」徽章</Text>
          <Pressable onPress={onClose} style={ls.btn}>
            <Text style={ls.btnText}>太棒了</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const ls = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 32, alignItems: 'center', width: 280 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  levelText: { fontSize: 24, fontWeight: '900', color: '#fbbf24', marginBottom: 8 },
  badgeLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  btn: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
