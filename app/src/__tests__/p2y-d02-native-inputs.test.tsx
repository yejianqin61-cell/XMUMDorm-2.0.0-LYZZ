import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Platform } from 'react-native';
import { pickReviewImage } from '@/features/square/pickReviewImage';
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: (props: unknown) => require('react').createElement(require('react-native').View, props) }));
afterEach(() => jest.restoreAllMocks());
it('treats cancelled system selection as no image', async () => {
  require('expo-image-picker').launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
  expect(await pickReviewImage()).toEqual({ ok: false, reason: 'cancelled' });
});
it('retains MIME and byte size for multipart validation', async () => {
  require('expo-image-picker').launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///rice.png', mimeType: 'image/png', fileSize: 100 }] });
  expect(await pickReviewImage()).toEqual({ ok: true, image: { uri: 'file:///rice.png', mimeType: 'image/png', sizeBytes: 100 } });
});
it('permits clearing a selected date', async () => {
  const change = jest.fn();
  const view = await renderApp(<DateTimeField testID="date" mode="date" value="2026-10-07" onChange={change} />);
  await fireEvent.press(view.getByTestId('date-clear'));
  expect(change).toHaveBeenCalledWith('');
});
it('keeps iOS spinner changes tentative until confirmed and discards cancel', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const change = jest.fn();
  const view = await renderApp(<DateTimeField testID="date" mode="date" value="2026-10-07" onChange={change} />);
  await fireEvent.press(view.getByTestId('date'));
  await fireEvent(view.getByTestId('date-native'), 'valueChange', {}, new Date(2026, 9, 8, 12));
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('取消'));
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('date'));
  await fireEvent(view.getByTestId('date-native'), 'valueChange', {}, new Date(2026, 9, 9, 12));
  await fireEvent.press(view.getByText('确认'));
  expect(change).toHaveBeenCalledWith('2026-10-09');
});
it('accepts Android time as HH:MM without changing its calendar timezone', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const change = jest.fn();
  const view = await renderApp(<DateTimeField testID="time" mode="time" value="" onChange={change} />);
  await fireEvent.press(view.getByTestId('time'));
  await fireEvent(view.getByTestId('time-native'), 'valueChange', {}, new Date(2026, 9, 9, 9, 5));
  expect(change).toHaveBeenCalledWith('09:05');
});
