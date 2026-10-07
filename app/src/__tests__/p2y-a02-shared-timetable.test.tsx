import * as React from 'react';
import { Text } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { useTimetableWeek, invalidateTimetable, readCachedWeek, timetableCacheKey } from '@/features/tools/timetable';
import { setItem, clearNamespace } from '@/shared/storage';
import { saveToken, resetTokenMirrorForTests } from '@/features/auth/tokenStore';

const payload = (name: string, week = 3) => ({ week, days: { 1: [{ course_code: 'CS101', course_name: name, start_time: '08:00', end_time: '10:00' }] }, currentWeek: 3, totalWeeks: 20 });
function Probe({ id, load, week = 3 }: { id: string; load: (week: number) => Promise<unknown>; week?: number }) {
  const state = useTimetableWeek(week, load);
  return <Text testID={id}>{`${state.week?.days[1]?.[0]?.courseName ?? 'none'}:${state.loading}:${state.source}`}</Text>;
}
beforeEach(async () => { resetTokenMirrorForTests(); await clearNamespace(); });

it('deduplicates simultaneous readers of the same week', async () => {
  const load = jest.fn(async () => payload('Algorithms'));
  const view = await renderApp(<><Probe id="one" load={load} /><Probe id="two" load={load} /></>);
  await waitFor(() => expect(view.getByTestId('two').props.children).toBe('Algorithms:false:remote'));
  expect(view.getByTestId('one').props.children).toBe('Algorithms:false:remote');
  expect(load).toHaveBeenCalledTimes(1);
});
it('invalidates disk and refreshes mounted readers', async () => {
  const load = jest.fn().mockResolvedValueOnce(payload('Old')).mockResolvedValue(payload('New'));
  const view = await renderApp(<Probe id="one" load={load} />);
  await waitFor(() => expect(view.getByTestId('one').props.children).toBe('Old:false:remote'));
  await act(async () => invalidateTimetable());
  await waitFor(() => expect(view.getByTestId('one').props.children).toBe('New:false:remote'));
  expect((await readCachedWeek(3))?.days[1][0].courseName).toBe('New');
});
it('never lets a pre-import response overwrite the new table', async () => {
  let finish!: (value: unknown) => void;
  const old = new Promise((resolve) => { finish = resolve; });
  const load = jest.fn().mockReturnValueOnce(old).mockResolvedValue(payload('New'));
  const view = await renderApp(<Probe id="one" load={load} />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => invalidateTimetable());
  await waitFor(() => expect(view.getByTestId('one').props.children).toBe('New:false:remote'));
  await act(async () => { finish(payload('Old')); });
  expect(view.getByTestId('one').props.children).toBe('New:false:remote');
  expect((await readCachedWeek(3))?.days[1][0].courseName).toBe('New');
});
it('partitions cache by backend user id without storing credentials', async () => {
  const token = (id: number) => `header.${btoa(JSON.stringify({ id }))}.signature`;
  await saveToken(token(7));
  const key7 = timetableCacheKey(3);
  await setItem(key7, payload('User seven'));
  await saveToken(token(8));
  expect(timetableCacheKey(3)).not.toBe(key7);
  expect(timetableCacheKey(3)).not.toContain('signature');
  expect(await readCachedWeek(3)).toBeNull();
});
it('never persists a response under the wrong requested week', async () => {
  const load = jest.fn(async () => payload('Wrong week', 4));
  const view = await renderApp(<Probe id="one" load={load} week={3} />);
  await waitFor(() => expect(view.getByTestId('one').props.children).toBe('Wrong week:false:remote'));
  expect(await readCachedWeek(3)).toBeNull();
});
