import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WallPosterLab } from '@/features/campus/WallPosterLab';
import { WALL_POSTER_LAB_CASES } from '@/features/campus/wallPosterLabCases';
import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

it('多段正文仅推荐自然布局，换一批提供新配色并可保存', async () => {
  const view = await renderApp(<WallPosterLab />);
  for (const item of WALL_POSTER_LAB_CASES) {
    expect(view.getByTestId(`wall-poster-case-${item.key}`)).toBeTruthy();
  }
  await fireEvent.press(view.getByTestId('wall-poster-case-paragraphs'));
  expect(view.queryByTestId('wall-poster-layout-quote')).toBeNull();
  expect(view.queryByTestId('wall-poster-layout-emphasis')).toBeNull();
  const first = view.getAllByTestId(/^wall-poster-candidate-natural:/).map((chip) => chip.props.testID);
  await fireEvent.press(view.getByTestId('wall-poster-reroll'));
  const second = view.getAllByTestId(/^wall-poster-candidate-natural:/).map((chip) => chip.props.testID);
  expect(second).toHaveLength(3);
  for (const id of second) expect(first).not.toContain(id);

  await fireEvent.press(view.getByTestId('wall-poster-color-teal'));
  await fireEvent.press(view.getByTestId('wall-poster-confirm'));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    expect.stringMatching(/^wall-preview-v2:/),
    JSON.stringify({ version: 2, layoutId: 'natural', colorId: 'teal' }),
  ));
});

it('修改同一段预览文字时保留手动选择的底色', async () => {
  const view = await renderApp(<WallPosterLab />);
  const input = view.getByTestId('wall-poster-draft');
  await fireEvent.changeText(input, '晚安。');
  await fireEvent.press(view.getByTestId('wall-poster-color-khaki'));
  await fireEvent.changeText(input, '晚安。明天见。');
  expect(view.getByTestId('wall-surface-990001')).toHaveStyle({ backgroundColor: '#38352C' });
  expect(view.queryByTestId('wall-font-compare')).toBeNull();
});


it('已保存的短句布局在字体或内容需要更多行时继续生效', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({
    version: 2, layoutId: 'emphasis', colorId: 'mist',
  }));
  const view = await renderApp(<WallPosterLab />);
  await waitFor(() => expect(view.getByTestId('wall-free-body-content')).toHaveStyle({
    fontSize: 19, textAlign: 'center',
  }));
  const input = view.getByTestId('wall-poster-draft');
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({
    version: 2, layoutId: 'emphasis', colorId: 'mist',
  }));
  await fireEvent.changeText(input, '保留先前选中的短句布局。'.repeat(15));
  await waitFor(() => expect(view.getByTestId('wall-free-body-content')).toHaveStyle({
    fontSize: 19, textAlign: 'center',
  }));
  expect(view.getByTestId('wall-surface-990001')).toHaveStyle({ backgroundColor: '#263647' });
});
