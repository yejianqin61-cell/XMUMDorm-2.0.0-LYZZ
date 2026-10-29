/**
 * P3G14 · 四态归位（Phase G / R-7 四态归位）
 *
 * 期望：加载给骨架不给空态；两类空态测试标识分开；错误与无网用常驻提示条，错误带一个动作。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'You are offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const course = { id: 1, name: 'Course one', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const module = { id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
  url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
  accessVisible: true, restrictions: false, completion: null };
const base: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1,
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101], url: null, visible: true, current: false }],
    modules: [module] }] } };
const props = { labels, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };
afterEach(() => { onlineManager.setOnline(true); });

it('p3g14 shows a skeleton instead of an empty state while syncing', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    snapshot={{ ...base, phase: 'loading-objects' }} />);
  expect(view.getByTestId('moodle-content-loading')).toBeTruthy();
  expect(view.queryByTestId('moodle-empty-modules')).toBeNull();
});

it('p3g14 gives the first run its own empty state with the sync action', async () => {
  const onSync = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} onSync={onSync}
    snapshot={{ ...base, selectedIds: [], data: { generation: 1, courses: [], states: [], events: [] } }} />);
  expect(view.getByTestId('moodle-empty-courses')).toBeTruthy();
  await fireEvent.press(within(view.getByTestId('moodle-empty-courses')).getByText('Sync'));
  expect(onSync).toHaveBeenCalledTimes(1);
});

it('p3g14 gives a course without modules its own empty state', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    snapshot={{ ...base, data: { ...base.data, states: [{ courseId: 1, sections: [], modules: [] }] } }} />);
  expect(view.getByTestId('moodle-empty-modules')).toBeTruthy();
  expect(view.queryByTestId('moodle-empty-courses')).toBeNull();
});

it('p3g14 reports a sync failure as a notice with one retry action', async () => {
  const onSync = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} onSync={onSync}
    snapshot={{ ...base, failure: 'denied' }} />);
  const notice = within(view.getByTestId('moodle-failure'));
  expect(notice.getByText('failure denied')).toBeTruthy();
  await fireEvent.press(notice.getByText('Sync'));
  expect(onSync).toHaveBeenCalledTimes(1);
});

it('p3g14 reports the offline state without taking the content away', async () => {
  onlineManager.setOnline(false);
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={base} />);
  expect(within(view.getByTestId('moodle-offline')).getByText('You are offline')).toBeTruthy();
  expect(view.getByTestId('moodle-section-content')).toBeTruthy();
});

it('shows loading rather than empty courses during the first course scan', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={{ ...base,
    phase: 'loading-courses', data: { generation: 1, courses: [], states: [], events: [] } }} />);
  expect(view.getByTestId('moodle-courses-loading')).toBeTruthy();
  expect(view.queryByTestId('moodle-empty-courses')).toBeNull();
});

it('offers login recovery instead of another sync for an expired session', async () => {
  const onLogin = jest.fn(), onSync = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} onLogin={onLogin} onSync={onSync}
    maintenance snapshot={{ ...base, phase: 'error', failure: 'expired' }} />);
  const notice = within(view.getByTestId('moodle-failure'));
  expect(notice.getByText('failure expired')).toBeTruthy();
  await fireEvent.press(notice.getByText('Login'));
  expect(onLogin).toHaveBeenCalledTimes(1);
  expect(onSync).not.toHaveBeenCalled();
});
