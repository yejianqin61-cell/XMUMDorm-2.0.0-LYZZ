/**
 * 第四轮 R4-05：游客的「我的」是一张可用的页，而不是先白屏再被踢去登录。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { MeScreen } from '@/features/me/MeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ isSignedIn: false, status: 'signedOut' }) }));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn() }));

describe('R4-05 · 游客的「我的」', () => {
  it('显示登录入口 + 设置 + 关于，不请求个人资料', async () => {
    const view = await renderApp(<MeScreen />);
    expect(view.getByTestId('me-guest')).toBeTruthy();
    expect(view.queryByTestId('me-profile')).toBeNull();
    fireEvent.press(view.getByTestId('me-guest-login'));
    expect(mockPush).toHaveBeenCalledWith('/login');
    fireEvent.press(view.getByTestId('me-guest-settings'));
    expect(mockPush).toHaveBeenCalledWith('/me/settings');
    fireEvent.press(view.getByTestId('me-guest-about'));
    expect(mockPush).toHaveBeenCalledWith('/me/legal');
  });
});
