/**
 * ImageViewer —— 全屏看图（覆盖层）。点轮播里的图打开，左右翻页，右上角关闭。
 * 覆盖层的安全区由唯一容器 `Screen` 的上下文提供（宪法 17.1-S2/S7），本组件不自己读 insets。
 * ⚠️ 暂不支持双指缩放（需要手势方案，另行评估）。
 */
import * as React from 'react';
import { Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import X from 'lucide-react-native/icons/x';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { IconButton } from './IconButton';
import { useScreenInsets } from './Screen';
import { Text } from './Text';

export type ImageViewerProps = {
  uris: readonly string[];
  startIndex: number;
  alt?: readonly string[];
  onClose: () => void;
  testID?: string;
};

export function ImageViewer({ uris, startIndex, alt, onClose, testID = 'image-viewer' }: ImageViewerProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = React.useState(startIndex);

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View testID={testID} style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value, paddingTop: insets.overlayPaddingTop, paddingBottom: insets.overlayPaddingBottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: theme.space('space_4') }}>
          <Text testID={`${testID}-position`} role="label" colorToken="text-secondary">{`${page + 1} / ${uris.length}`}</Text>
          <IconButton testID={`${testID}-close`} Icon={X} accessibilityLabel={t('action.close')} onPress={onClose} />
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          contentOffset={{ x: startIndex * width, y: 0 }}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const w = event.nativeEvent.layoutMeasurement.width;
            if (w > 0) setPage(Math.max(0, Math.min(uris.length - 1, Math.round(event.nativeEvent.contentOffset.x / w))));
          }}
        >
          {uris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={{ width, height: '100%' }}>
              <Image source={{ uri }} contentFit="contain" accessibilityLabel={alt?.[index]} style={{ width: '100%', height: '100%' }} />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
