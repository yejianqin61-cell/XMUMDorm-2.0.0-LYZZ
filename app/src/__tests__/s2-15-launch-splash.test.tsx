/**
 * 阶段5-03 · 首屏衔接（启动画面收起时机）
 *
 * 依据：A2-01b「启动时不能出现白屏、闪屏或图标跳变」；减少动态效果时直达首屏。
 * 官方口径（SDK 57）：`preventAutoHideAsync()` 必须在模块顶层调用；`hide()` 越快越好；
 * `setOptions({ duration, fade })` 的 `fade` 仅在 iOS 生效。
 *
 * 本文件 mock 掉原生模块，只验"时机与参数"；真实画面必须真机验证（本机无设备）。
 */
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  setOptions: jest.fn(),
  hide: jest.fn(),
}));

import * as React from 'react';
import { AccessibilityInfo } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { renderApp } from './helpers/renderApp';
import {
  SPLASH_FADE_MS,
  SplashRelease,
  configureSplashAnimation,
  holdSplashScreen,
} from '@/features/launch/splash';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('启动画面收起时机', () => {
  it('模块顶层 hold：只调用一次 preventAutoHideAsync', () => {
    holdSplashScreen();
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalledTimes(1);
  });

  it('首帧提交后就收起（不让原生启动画面多留），且带短淡出', async () => {
    await renderApp(<SplashRelease />);
    expect(SplashScreen.setOptions).toHaveBeenCalledWith({
      duration: SPLASH_FADE_MS,
      fade: true,
    });
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });

  it('减少动态效果：时长归零、不淡出', () => {
    configureSplashAnimation(true);
    expect(SplashScreen.setOptions).toHaveBeenCalledWith({ duration: 0, fade: false });
  });

  it('系统「减少动态效果」打开时，最终参数落到 duration 0 / fade false，且不重复收起', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderApp(<SplashRelease />);
    await waitFor(() =>
      expect(SplashScreen.setOptions).toHaveBeenLastCalledWith({ duration: 0, fade: false })
    );
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});
