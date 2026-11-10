/** 排版和自由帖／招募帖混排的开发预览。 */
import * as React from 'react';

import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { WallSampleBand } from '@/features/campus/WallSampleBand';
import { WallPosterLab } from '@/features/campus/WallPosterLab';

export default function WallPosterLabRoute(): React.ReactElement {
  const { mixed } = useLocalSearchParams<{ mixed?: string }>();
  return mixed === '1' ? (
    <Screen scroll><WallSampleBand /></Screen>
  ) : <WallPosterLab />;
}
