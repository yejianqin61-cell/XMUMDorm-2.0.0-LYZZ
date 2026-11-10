import * as React from 'react';

import { Surface } from '@/components/ui/Surface';
import { WallPosterBody } from './WallPosterBody';
import { wallPosterStyle } from './wallPosterLayout';
import { useTheme } from '@/design-system/theme';
import { wallPaletteTokens, type WallPosterStyle } from './wallPosterTemplates';

export function WallFreePostBody({
  content, posterStyle, full = false,
}: { content: string; posterStyle: WallPosterStyle; full?: boolean }): React.ReactElement {
  return <WallPosterBody content={content} posterStyle={posterStyle} full={full} testID="wall-free-body" />;
}

export function WallFreePostText({ content, id, savedStyle }: { content: string; id: number; savedStyle?: WallPosterStyle }): React.ReactElement {
  const posterStyle = wallPosterStyle(id, savedStyle);
  const theme = useTheme();
  const palette = wallPaletteTokens(posterStyle.colorId);
  return (
    <Surface rounded="radius_large" padding="space_4"
      style={{ backgroundColor: theme.color[palette.background].value }}
    >
      <WallPosterBody content={content} posterStyle={posterStyle} full testID="wall-free-text-block" />
    </Surface>
  );
}
