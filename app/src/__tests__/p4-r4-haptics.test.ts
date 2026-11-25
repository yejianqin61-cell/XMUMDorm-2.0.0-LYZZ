/**
 * 第四轮 R4-11：触感反馈只走一个入口，原生模块缺失或调用失败都不能影响功能。
 */
const mockImpact = jest.fn(async () => undefined);
const mockSelect = jest.fn(async () => { throw new Error('no vibrator'); });
const mockNotify = jest.fn(() => { throw new Error('native module missing'); });

jest.mock('expo-haptics', () => ({
  impactAsync: mockImpact,
  selectionAsync: mockSelect,
  notificationAsync: mockNotify,
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

import { tapFeedback } from '@/shared/haptics';

describe('R4-11 · tapFeedback', () => {
  it('按种类调用对应接口，同步抛错与异步拒绝都被吞掉', async () => {
    expect(() => tapFeedback()).not.toThrow();
    expect(() => tapFeedback('select')).not.toThrow();
    expect(() => tapFeedback('success')).not.toThrow();
    await Promise.resolve();
    expect(mockImpact).toHaveBeenCalledWith('light');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith('success');
  });
});
