import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';

import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { WallPostCard } from './WallPostCard';
import { WallPosterBody } from './WallPosterBody';
import {
  canTryWallLayout, generateWallPosterCandidates, isWallPosterStyle, wallPosterKey, wallPosterSeed,
} from './wallPosterLayout';
import {
  wallPalette, WALL_COLORS, WALL_COLOR_IDS, WALL_LAYOUTS, WALL_LAYOUT_IDS, type WallLayoutId, type WallPosterStyle,
} from './wallPosterTemplates';
import { WALL_POSTER_LAB_CASES, wallPosterLabCase, type WallPosterLabCaseKey } from './wallPosterLabCases';

export function WallPosterLab(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const [sample, setSample] = React.useState<WallPosterLabCaseKey>('shortZh');
  const [draft, setDraft] = React.useState('');
  const hasDraft = draft.trim().length > 0;
  const content = hasDraft ? draft : wallPosterLabCase(sample).content;
  const identity = hasDraft ? 'draft' : sample;

  return (
    <Screen testID="wall-poster-lab" scroll header={
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space('space_2') }}>
        <IconButton testID="wall-poster-lab-back" Icon={ArrowLeft} accessibilityLabel={t('action.back')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/?tab=wall' as never)} />
        <Text role="headline" emphasis="strong">{t('wall.poster.lab.title')}</Text>
      </View>
    }>
      <View style={{ paddingVertical: theme.space('space_3'), gap: theme.space('space_3') }}>
        <View style={{ paddingHorizontal: theme.space('space_4'), gap: theme.space('space_2') }}>
          <Text role="caption" colorToken="text-muted">{t('wall.poster.lab.sample')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.space('space_2') }}>
            {WALL_POSTER_LAB_CASES.map((item) => (
              <Chip key={item.key} testID={`wall-poster-case-${item.key}`} variant="selectable"
                selected={!hasDraft && sample === item.key} label={t(item.labelKey)}
                onPress={() => { setSample(item.key); setDraft(''); }} />
            ))}
          </ScrollView>
          <TextArea value={draft} onChangeText={setDraft} testID="wall-poster-draft"
            label={t('wall.poster.lab.input')} />
        </View>
        <PosterChoices key={identity} identity={identity} content={content} />
      </View>
    </Screen>
  );
}

type LayoutFit = {
  measurementKey: string;
  results: Partial<Record<WallLayoutId, boolean>>;
};

export function PosterChoices({ identity, content, production }: {
  identity: string;
  content: string;
  production?: {
    selection?: WallPosterStyle;
    onSelection: (style: WallPosterStyle) => void;
    originalContent?: string;
    locked: boolean;
    action: (style: WallPosterStyle, measuring: boolean) => React.ReactNode;
  };
}): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const measurementKey = JSON.stringify([content, width, fontScale]);
  const seed = wallPosterSeed(identity);
  const storageKey = `wall-preview-v2:${identity}`;
  const [confirmed, setConfirmed] = React.useState<WallPosterStyle>();
  const [selection, setSelection] = React.useState<WallPosterStyle>();
  const [manualOpen, setManualOpen] = React.useState(false);
  const [seen, setSeen] = React.useState<string[]>([]);
  const [fit, setFit] = React.useState<LayoutFit>();
  const results = fit?.measurementKey === measurementKey ? fit.results : {};
  const [saveFailed, setSaveFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const edited = React.useRef(false);
  const previewOnly = !production;
  React.useEffect(() => {
    if (!previewOnly) return;
    let active = true;
    void AsyncStorage.getItem(storageKey).then((value) => {
      if (!active || !value) return;
      const stored: unknown = JSON.parse(value);
      if (isWallPosterStyle(stored)) {
        setConfirmed(stored);
        if (!edited.current) setSelection(stored);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [previewOnly, storageKey]);

  const probes = WALL_LAYOUT_IDS.filter((id) => id !== 'natural' && canTryWallLayout(content, id));
  const preferred = results.emphasis && seed % 5 === 0 ? 'emphasis'
    : results.emphasis && results.quote && seed % 5 === 1 ? 'quote' : 'natural';
  const layouts = [preferred, ...WALL_LAYOUT_IDS.filter((id) =>
    id !== preferred && (id === 'natural' || results[id])
  )] satisfies WallLayoutId[];
  const measuring = probes.some((id) => results[id] === undefined);
  const batch = generateWallPosterCandidates(layouts, seed, seen);
  // Measurements filter new candidates. A user's saved layout can wrap further.
  const preferredSelection = production?.selection ?? selection;
  const needsFallback = Boolean(production && preferredSelection && !production.locked && !measuring &&
    content !== production.originalContent && !layouts.includes(preferredSelection.layoutId));
  const selected = preferredSelection
    ? (needsFallback ? { ...preferredSelection, layoutId: 'natural' as const } : preferredSelection)
    : batch[0];
  const availableLayouts = layouts.includes(selected.layoutId) ? layouts : [...layouts, selected.layoutId];
  const confirmedCurrent = confirmed && wallPosterKey(confirmed) === wallPosterKey(selected);
  const select = (style: WallPosterStyle) => {
    edited.current = true;
    if (production) production.onSelection(style);
    else setSelection(style);
    setSaveFailed(false);
  };

  const shuffle = () => {
    const history = [...seen, ...batch.map(wallPosterKey), wallPosterKey(selected)];
    const exhausted = new Set(history).size >= layouts.length * WALL_COLOR_IDS.length;
    const nextSeen = exhausted ? [...batch.map(wallPosterKey), wallPosterKey(selected)] : history;
    setSeen(nextSeen);
    select(generateWallPosterCandidates(layouts, seed, nextSeen)[0]);
  };

  return (
    <>
      <View pointerEvents="none" aria-hidden
        style={{ position: 'absolute', opacity: 0, start: theme.space('space_8'), end: theme.space('space_8') }}>
        {probes.map((layoutId) => (
          <WallPosterBody key={`${measurementKey}:${layoutId}`} content={content} probe
            posterStyle={{ ...selected, layoutId }}
            onFit={(fits) => setFit((current) => {
              const previous = current?.measurementKey === measurementKey ? current.results : {};
              if (previous[layoutId] === fits) return current;
              return { measurementKey, results: { ...previous, [layoutId]: fits } };
            })} />
        ))}
      </View>

      <WallPostCard post={{ id: 990001, kind: 'free', content, posterStyle: selected, likeCount: 0, commentCount: 0 }} />

      <View style={{ paddingHorizontal: theme.space('space_4'), gap: theme.space('space_2') }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text role="label" emphasis="strong">{t('wall.poster.lab.candidates')}</Text>
          <Button testID="wall-poster-reroll" variant="secondary" size="small"
            disabled={measuring || production?.locked} label={t('wall.poster.lab.reroll')} onPress={shuffle} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
          {batch.map((candidate) => (
            <Chip key={wallPosterKey(candidate)} testID={`wall-poster-candidate-${wallPosterKey(candidate)}`}
              variant="selectable" disabled={production?.locked} selected={wallPosterKey(candidate) === wallPosterKey(selected)}
              label={`${t(WALL_LAYOUTS[candidate.layoutId].name)} · ${t(WALL_COLORS[candidate.colorId].name)}`}
              onPress={() => select(candidate)} />
          ))}
        </View>
        {production ? (
          <Pressable testID="wall-poster-adjust" accessibilityRole="button"
            accessibilityLabel={t(manualOpen ? 'wall.write.collapseStyle' : 'wall.write.adjustStyle')}
            accessibilityState={{ expanded: manualOpen }}
            onPress={() => setManualOpen((open) => !open)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text role="label">{t(manualOpen ? 'wall.write.collapseStyle' : 'wall.write.adjustStyle')}</Text>
            <Icon source={manualOpen ? ChevronUp : ChevronDown} size="body" tint="secondary" />
          </Pressable>
        ) : null}
        {!production || manualOpen ? (
          <View testID="wall-poster-manual-options" style={{ gap: theme.space('space_2') }}>
            <Text role="label">{t('wall.poster.lab.layout')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
              {availableLayouts.map((layoutId) => (
                <Chip key={layoutId} testID={`wall-poster-layout-${layoutId}`} variant="selectable"
                  disabled={production?.locked} selected={selected.layoutId === layoutId} label={t(WALL_LAYOUTS[layoutId].name)}
                  onPress={() => select({ ...selected, layoutId })} />
              ))}
            </View>
            <Text role="label">{t('wall.poster.lab.color')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
              {WALL_COLOR_IDS.map((colorId) => {
                const palette = wallPalette(colorId, theme.scheme);
                return (
                  <Chip key={colorId} testID={`wall-poster-color-${colorId}`} variant="selectable"
                    disabled={production?.locked} selected={selected.colorId === colorId} label={t(WALL_COLORS[colorId].name)}
                    swatch={{ fill: palette.background, border: palette.accent }}
                    onPress={() => select({ ...selected, colorId })} />
                );
              })}
            </View>
          </View>
        ) : null}
        {needsFallback ? <Text role="caption">{t('wall.write.layoutFallback')}</Text> : null}
        {production ? production.action(selected, measuring) : <>
        <Button testID="wall-poster-confirm" size="small" disabled={measuring || saving || Boolean(confirmedCurrent)}
          label={t(confirmedCurrent ? 'wall.poster.lab.saved' : 'wall.poster.lab.confirm')}
          onPress={async () => {
            edited.current = true;
            setSaving(true);
            setSaveFailed(false);
            try {
              await AsyncStorage.setItem(storageKey, JSON.stringify(selected));
              setConfirmed(selected);
            } catch {
              setSaveFailed(true);
            } finally {
              setSaving(false);
            }
          }} />
        {saveFailed ? <Text role="caption">{t('wall.poster.lab.saveFailed')}</Text> : null}
        </>}
      </View>
    </>
  );
}
