/**
 * 第四轮 R4-23：商品图点开全屏看，能关掉。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { MediaCarousel } from '@/components/ui/MediaCarousel';

describe('R4-23 · 全屏看图', () => {
  it('点第二张图打开查看器并停在第 2 页；关闭后消失', async () => {
    const view = await renderApp(
      <MediaCarousel zoomable testID="m" uris={['https://x/a.jpg', 'https://x/b.jpg']} pageLabel={(i, n) => `${i}/${n}`} />,
      { inScreen: true }
    );
    expect(view.queryByTestId('image-viewer')).toBeNull();
    await fireEvent.press(view.getByTestId('m-open-1'));
    await waitFor(() => expect(view.getByTestId('image-viewer-position').props.children).toBe('2 / 2'));
    await fireEvent.press(view.getByTestId('image-viewer-close'));
    await waitFor(() => expect(view.queryByTestId('image-viewer')).toBeNull());
  });
});
