import * as React from 'react';
import { Text } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderApp } from './helpers/renderApp';
import { buildDescriptor, useResolvedDescriptor } from '@/features/publish/resolveDescriptor';
import { fieldsOf } from '@/features/publish/descriptor';
import { getMarketplaceCategories } from '../../../shared/api/marketplace';
jest.mock('../../../shared/api/marketplace', () => ({ getMarketplaceCategories: jest.fn() }));
function Probe() {
  const initial = React.useMemo(() => buildDescriptor('marketplace', key => key)!, []);
  const resolved = useResolvedDescriptor(initial, true);
  const field = fieldsOf(resolved.descriptor).find(field => field.name === 'category');
  return <Text testID="options">{JSON.stringify(field)}</Text>;
}
it('registered marketplace loads remote category values and English labels, excluding all', async () => {
  (getMarketplaceCategories as jest.Mock).mockResolvedValue([
    { slug: 'all', name_en: 'All' },
    { slug: 'books', name_zh: '书籍', name_en: 'Books' },
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await renderApp(<QueryClientProvider client={client}><Probe /></QueryClientProvider>, { locale: 'en' });
  await waitFor(() => expect(view.getByTestId('options').props.children).toContain('Books'));
  expect(view.getByTestId('options').props.children).toContain('books');
  expect(view.getByTestId('options').props.children).not.toContain('All');
  await act(async () => { view.unmount(); });
  client.clear();
});
