import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TREEHOLE } from '../theme/treehole';

interface Props {
  width: number;
}

export default function TreeholeSkeletonCard({ width }: Props) {
  return (
    <View style={[st.card, { width }]}>
      <View style={st.media}>
        <View style={st.shimmer} />
        <View style={st.pill}>
          <View style={st.avatar} />
          <View style={st.name} />
        </View>
        <View style={st.bottom}>
          <View style={st.line} />
          <View style={st.chips}>
            <View style={st.chip} />
            <View style={st.chip} />
          </View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: TREEHOLE.cardRadius,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: TREEHOLE.border,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  media: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    position: 'relative',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(226, 232, 240, 0.45)',
    opacity: 0.9,
  },
  pill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingRight: 8,
    paddingLeft: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: TREEHOLE.border,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  name: {
    width: 64,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  bottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  line: {
    width: '78%',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
  chips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  chip: {
    width: 44,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
});
