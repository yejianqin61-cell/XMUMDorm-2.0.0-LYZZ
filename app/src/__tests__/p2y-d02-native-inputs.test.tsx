import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { pickReviewImage } from '@/features/square/pickReviewImage';
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));
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
