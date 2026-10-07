import * as React from 'react';
import { Text, Pressable } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { useCanteenResource } from '@/features/square/useCanteenResource';
import { canteenRevision, invalidateCanteen, writeCanteenCache, readCanteenCache } from '@/features/square/canteenCache';
const key = 'canteen:regions:all';
const normalize = (raw: unknown) => typeof raw === 'string' ? raw : null;
function Probe({ load, ttl = 600000 }: { load: () => Promise<unknown>; ttl?: number }) {
  const state = useCanteenResource(load, normalize, [], { key, ttlMs: ttl });
  return <><Text testID="value">{`${state.data ?? 'none'}:${state.loading}:${state.stale}:${state.error?.kind ?? 'none'}`}</Text><Pressable testID="reload" onPress={state.reload}><Text>Reload</Text></Pressable></>;
}
beforeEach(async () => { await clearNamespace(); });
it('serves a fresh ten-minute cache without a duplicate read', async () => {
  await writeCanteenCache(key, 'Regions', canteenRevision());
  const load = jest.fn();
  const view = await renderApp(<Probe load={load} />);
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('Regions:false:false:none'));
  expect(load).not.toHaveBeenCalled();
});
it('retains expired cache and marks it stale when offline', async () => {
  await writeCanteenCache(key, 'Ranking', canteenRevision(), Date.now() - 31000);
  const load = jest.fn().mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<Probe load={load} ttl={30000} />);
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('Ranking:false:true:offline'));
});
it('forces a remote read for explicit refresh even when fresh', async () => {
  await writeCanteenCache(key, 'Old', canteenRevision());
  const load = jest.fn().mockResolvedValue('New');
  const view = await renderApp(<Probe load={load} />);
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('Old:false:false:none'));
  await fireEvent.press(view.getByTestId('reload'));
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('New:false:false:none'));
  expect(load).toHaveBeenCalledTimes(1);
});
it('refreshes mounted readers on mutation and rejects a pre-mutation late response', async () => {
  let finish!: (value: unknown) => void;
  const load = jest.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce('New');
  const view = await renderApp(<Probe load={load} />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => invalidateCanteen());
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('New:false:false:none'));
  await act(async () => { finish('Old'); });
  expect((await readCanteenCache(key, 600000))?.raw).toBe('New');
});
it('discards malformed responses and renders a retriable error without cache', async () => {
  const view = await renderApp(<Probe load={async () => ({ unexpected: true })} />);
  await waitFor(() => expect(view.getByTestId('value').props.children).toBe('none:false:false:unknown'));
  expect(await readCanteenCache(key, 600000)).toBeNull();
});
