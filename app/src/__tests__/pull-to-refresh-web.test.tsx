import * as React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ThemeProvider } from '@/design-system/theme';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
// Web ScrollView clones refreshControl with its scroll view as children.
// Native RefreshControl hides children, so model the web wrapper explicitly.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const web = Object.create(actual);
  Object.defineProperty(web, 'RefreshControl', { value: (props: any) => <actual.View {...props} /> });
  return web;
});
it('web refresh wrapper preserves injected scroll content and layout', async () => {
  const view = await render(<ThemeProvider source="light">
    <PullToRefresh refreshing={false} onRefresh={() => undefined} style={{ flex: 1 }} testID="refresh">
      <View><Text>商品列表</Text></View>
    </PullToRefresh>
  </ThemeProvider>);
  expect(view.getByText('商品列表')).toBeTruthy();
  expect(view.getByTestId('refresh')).toHaveStyle({ flex: 1 });
});
