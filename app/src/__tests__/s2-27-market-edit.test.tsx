/**
 * 阶段B-06 · 二手编辑入口与路由
 *
 * 路由只做"取参数 → 渲染编辑屏"（mock 编辑屏收 props）；入口在详情屏由 canEdit 决定。
 */
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/features/marketplace/MarketEditScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MarketEditScreen: (props: Record<string, unknown>) => {
      mockEditProps(props);
      return <View testID="edit-probe" />;
    },
  };
});

import * as React from 'react';
import { renderApp } from './helpers/renderApp';
import MarketEditRoute from '@/app/market/[id]/edit';

const mockEditProps = jest.fn();
let mockParams: { id?: string } = {};

beforeEach(() => {
  mockParams = { id: '12' };
  mockEditProps.mockClear();
});

describe('二手编辑路由（阶段B-06）', () => {
  it('把 id 传给编辑屏', async () => {
    await renderApp(<MarketEditRoute />);
    expect(mockEditProps).toHaveBeenCalledWith({ itemId: '12' });
  });

  it('数组形式的 id 只取字符串本身（非字符串给空串）', async () => {
    mockParams = { id: ['9'] as unknown as string };
    await renderApp(<MarketEditRoute />);
    expect(mockEditProps).toHaveBeenCalledWith({ itemId: '' });
  });
});
