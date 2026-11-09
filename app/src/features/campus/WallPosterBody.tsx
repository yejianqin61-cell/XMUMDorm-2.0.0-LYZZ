import * as React from 'react';
import { Platform, Text, View, useWindowDimensions, type TextProps } from 'react-native';

import { isLongWallText } from './wallPosterLayout';
import { useTheme } from '@/design-system/theme';
import { wallNaturalMetrics, wallPaletteTokens, WALL_LAYOUTS, type WallPosterStyle } from './wallPosterTemplates';

export function WallPosterBody({
  content,
  posterStyle,
  full = false,
  probe = false,
  onFit,
  testID,
}: {
  content: string;
  posterStyle: WallPosterStyle;
  full?: boolean;
  probe?: boolean;
  onFit?: (fits: boolean) => void;
  testID?: string;
}): React.ReactElement {
  const { width, fontScale } = useWindowDimensions();
  return (
    <WallPosterText
      key={JSON.stringify([content, posterStyle.layoutId, width, fontScale])}
      content={content}
      posterStyle={posterStyle}
      full={full}
      probe={probe}
      onFit={onFit}
      testID={testID}
    />
  );
}

function WallPosterText({
  content, posterStyle, full, probe, onFit, testID,
}: {
  content: string;
  posterStyle: WallPosterStyle;
  full: boolean;
  probe: boolean;
  onFit: ((fits: boolean) => void) | undefined;
  testID: string | undefined;
}): React.ReactElement {
  const [lines, setLines] = React.useState<readonly number[]>([]);
  const [width, setWidth] = React.useState(0);
  const [naturalLines, setNaturalLines] = React.useState(0);
  const theme = useTheme();
  const palette = wallPaletteTokens(posterStyle.colorId);
  const layoutId = posterStyle.layoutId;
  const layout = WALL_LAYOUTS[layoutId];
  const { maxLines } = layout;
  const measured = width > 0 && lines.length > 0;
  const fits = lines.length <= maxLines && lines.every((line) => line <= width + 1);
  const natural = layoutId === 'natural';
  const metrics = natural ? wallNaturalMetrics(naturalLines, isLongWallText(content)) : layout;

  const reportFit = React.useEffectEvent((fits: boolean) => onFit?.(fits));
  React.useEffect(() => {
    // React Native Web does not expose native line metrics.
    if (probe && (measured || Platform.OS === 'web')) reportFit(measured && fits);
  }, [probe, measured, fits]);

  const measure: TextProps['onTextLayout'] = (event) => {
    setLines(event.nativeEvent.lines.map((line) => line.width));
  };

  return (
    <View
      testID={testID}
      onLayout={probe ? (event) => {
        setWidth(event.nativeEvent.layout.width - layout.inset * 2);
      } : undefined}
      style={{ paddingHorizontal: layout.inset, paddingTop: metrics.top, paddingBottom: layout.bottom }}
    >
      {natural && Platform.OS !== 'web' ? (
        <Text
          aria-hidden
          pointerEvents="none"
          testID={testID ? `${testID}-density-probe` : undefined}
          numberOfLines={7}
          onTextLayout={(event) => setNaturalLines(Math.min(7, event.nativeEvent.lines.length))}
          style={{
            position: 'absolute', start: 0, end: 0, top: 0, opacity: 0,
            fontSize: WALL_LAYOUTS.natural.size, lineHeight: WALL_LAYOUTS.natural.lineHeight,
          }}
        >
          {content}
        </Text>
      ) : null}
      {layoutId === 'quote' ? (
        <View
          style={{
            position: 'absolute', top: layout.top + 3, bottom: layout.bottom + 3, start: 0,
            width: 2, borderRadius: 1, backgroundColor: theme.color[palette.accent].value,
          }}
        />
      ) : null}
      <Text
        testID={testID ? `${testID}-content` : undefined}
        onTextLayout={probe ? measure : undefined}
        numberOfLines={full || probe ? undefined : 5}
        style={{
          color: theme.color[palette.ink].value,
          fontSize: metrics.size,
          lineHeight: metrics.lineHeight,
          ...(layoutId === 'emphasis' ? { fontWeight: '600' } : {}),
          textAlign: layoutId === 'emphasis' ? 'center' : 'auto',
        }}
      >
        {content}
      </Text>
    </View>
  );
}
