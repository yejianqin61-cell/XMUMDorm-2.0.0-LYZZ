/**
 * 阶段A-04 · 详情路由注入保存能力
 *
 * 断言路由（甲）把「图库可用性 + 词条」译成详情屏（丙）认识的 imageSave；
 * 图库不可用时**不注入**，阅读不受影响。详情屏本身被替换成探针，不重复测丙的界面。
 */
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/shared/mediaLibrary', () => ({
  isAlbumAvailable: jest.fn(),
  createAlbumSaver: jest.fn(),
}));

jest.mock('@/features/campus/CampusScreens', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CampusDetailScreen: (props: Record<string, unknown>) => {
      mockDetailProps(props);
      return <View testID="detail-probe" />;
    },
  };
});

import * as React from 'react';
import { Button, View } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import CampusRoute from '@/app/campus/[id]';
import { createAlbumSaver, isAlbumAvailable } from '@/shared/mediaLibrary';

const mockDetailProps = jest.fn();
const mockSaver = jest.fn(async () => ({ status: 'saved' as const }));
let mockParams: { id?: string | string[]; published?: string; comment?: string } = {};
const mockedAvailable = isAlbumAvailable as jest.MockedFunction<typeof isAlbumAvailable>;
const mockedCreateSaver = createAlbumSaver as jest.MockedFunction<typeof createAlbumSaver>;

beforeEach(() => {
  mockParams = { id: '7' };
  mockDetailProps.mockClear();
  mockedAvailable.mockResolvedValue(true);
  mockedCreateSaver.mockReturnValue(mockSaver);
});

const lastProps = () => mockDetailProps.mock.calls.at(-1)?.[0] as Record<string, any>;

describe('详情路由注入保存能力（阶段A-04）', () => {
  it('图库可用：传入 imageSave，五条文案来自字典', async () => {
    const view = await renderApp(<CampusRoute />);
    await waitFor(() => expect(lastProps()?.imageSave).toBeTruthy());
    const imageSave = lastProps().imageSave;
    expect(imageSave.save).toBe(mockSaver);
    expect(imageSave.messages).toEqual({
      save: '保存图片',
      saving: '保存中',
      saved: '已保存到相册',
      permissionDenied: '请在设置中允许相册权限',
      failed: '保存失败，请重试',
    });
    expect(view.getByTestId('detail-probe')).toBeTruthy();
  });

  it('图库不可用：不传 imageSave，详情照常渲染', async () => {
    mockedAvailable.mockResolvedValue(false);
    await renderApp(<CampusRoute />);
    await waitFor(() => expect(mockDetailProps).toHaveBeenCalled());
    expect(lastProps().imageSave).toBeUndefined();
  });

  it('同一路由重渲染不重建保存事务', async () => {
    function Driver() {
      const [n, setN] = React.useState(0);
      return (
        <>
          <Button testID="rerender" title="rerender" onPress={() => setN(n + 1)} />
          <CampusRoute />
        </>
      );
    }
    const view = await renderApp(<Driver />);
    await waitFor(() => expect(lastProps()?.imageSave).toBeTruthy());
    await fireEvent.press(view.getByTestId('rerender'));
    expect(mockedCreateSaver).toHaveBeenCalledTimes(1);
  });

  it('路由参数解释不变：published=1 与 id 透传', async () => {
    mockParams = { id: '12', published: '1' };
    await renderApp(<CampusRoute />);
    expect(lastProps()).toMatchObject({ postId: '12', published: true });
  });
});
