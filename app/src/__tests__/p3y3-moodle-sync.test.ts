import { createMoodleSync } from '@/features/tools/moodle/sync';
import { beginMoodleCourseSync, clearMoodleCache, moodleCacheGeneration, readMoodleCache } from '@/features/tools/moodle/cache';
import type { MoodleReadRequest } from '@/features/tools/moodle/bridge';

const course = (id: number) => ({ id, name: `Course ${id}`, shortName: null, url: null,
  startDate: null, endDate: null, visible: true });

function harness() {
  const requests: { id: string; request: MoodleReadRequest; generation: number }[] = [];
  const sync = createMoodleSync({ read(request) {
    if (request.method === 'courses' && (request.offset ?? 0) === 0) beginMoodleCourseSync();
    const id = `read:${requests.length + 1}`;
    requests.push({ id, request, generation: moodleCacheGeneration() });
    return id;
  } });
  function reply(data: unknown, status = 'success') {
    const sent = requests[requests.length - 1];
    sync.receive({ requestId: sent.id, method: sent.request.method, status, data }, sent.generation);
  }
  return { sync, requests, reply };
}

beforeEach(() => clearMoodleCache());

describe('p3y3 paginated Moodle synchronization', () => {
  it('retains all candidates, then reads only chosen states and filters event pages', () => {
    const { sync, requests, reply } = harness();
    sync.start();
    reply({ courses: [course(1)], nextOffset: 50 });
    reply({ courses: [course(2)], nextOffset: 0 });
    expect(sync.snapshot().phase).toBe('choosing');
    expect(sync.snapshot().candidates.map((item) => item.id)).toEqual([1, 2]);
    expect(readMoodleCache().courses).toEqual([]);
    sync.choose([2]);
    expect(requests[2].request).toEqual({ method: 'state', courseId: 2 });
    reply({ courseId: 2, sections: [], modules: [] });
    reply({ events: [{ id: 8, courseId: 1, moduleId: null, name: 'Other', time: 100, url: null },
      { id: 9, courseId: 2, moduleId: null, name: 'Chosen', time: 100, url: null }], firstId: 8, lastId: 9 });
    expect(requests[4].request).toEqual({ method: 'events', afterEventId: 9 });
    reply({ events: [], firstId: null, lastId: null });
    expect(sync.snapshot().phase).toBe('ready');
    expect(readMoodleCache().courses.map((item) => item.id)).toEqual([2]);
    expect(readMoodleCache().events.map((item) => item.id)).toEqual([9]);
    expect(sync.snapshot().candidates).toHaveLength(2);
  });

  it('treats an empty trailing page with an unchanged offset as the end of pagination', () => {
    const { sync, requests, reply } = harness();
    sync.start();
    reply({ courses: [course(1)], nextOffset: 21 });
    expect(requests[1].request).toEqual({ method: 'courses', offset: 21 });
    reply({ courses: [], nextOffset: 21 });
    expect(sync.snapshot().phase).toBe('choosing');
    expect(sync.snapshot().failure).toBeNull();
    expect(sync.snapshot().candidates.map((item) => item.id)).toEqual([1]);
  });

  it('rejects repeating course and event cursors', () => {
    const { sync, reply } = harness();
    sync.start();
    reply({ courses: [course(1)], nextOffset: 50 });
    reply({ courses: [course(1)], nextOffset: 50 });
    expect(sync.snapshot().failure).toBe('invalid-data');
    sync.start();
    reply({ courses: [course(1)], nextOffset: 0 });
    sync.choose([1]);
    reply({ courseId: 1, sections: [], modules: [] });
    reply({ events: [], firstId: null, lastId: 12 });
    reply({ events: [], firstId: null, lastId: 12 });
    expect(sync.snapshot().failure).toBe('invalid-data');
  });

  it('ignores cancelled responses, unknown requests and a previous cache generation', () => {
    const { sync, requests, reply } = harness();
    sync.start();
    const first = requests[0];
    sync.cancel();
    sync.receive({ requestId: first.id, method: 'courses', status: 'success',
      data: { courses: [course(1)], nextOffset: 0 } }, first.generation);
    expect(sync.snapshot().phase).toBe('idle');
    sync.start();
    clearMoodleCache();
    reply({ courses: [course(2)], nextOffset: 0 });
    expect(sync.snapshot().candidates).toEqual([]);
    expect(sync.snapshot().phase).toBe('idle');
  });

  it('does not read states for forged selections and finishes an empty selection', () => {
    const { sync, requests, reply } = harness();
    sync.start();
    reply({ courses: [course(1)], nextOffset: 0 });
    sync.choose([999]);
    expect(sync.snapshot().phase).toBe('ready');
    expect(requests).toHaveLength(1);
  });
});

it('p3y3 ends a matched fatal response after host invalidation and bounds missing callbacks', () => {
  jest.useFakeTimers();
  try {
    const { sync, requests } = harness();
    sync.start();
    const sent = requests[0];
    clearMoodleCache();
    sync.receive({ requestId: sent.id, method: 'courses', status: 'expired' }, sent.generation);
    expect(sync.snapshot().failure).toBe('expired');
    sync.start();
    jest.advanceTimersByTime(12500);
    expect(sync.snapshot().failure).toBe('timeout');
  } finally { jest.useRealTimers(); }
});

it.each(['unavailable', 'timeout'])('keeps completed courses on %s and replaces them after retry', (failure) => {
  const { sync, reply } = harness();
  sync.start();
  reply({ courses: [course(1)], nextOffset: 0 });
  sync.choose([1]);
  reply({ courseId: 1, sections: [], modules: [] });
  reply({ events: [], firstId: null, lastId: null });
  sync.start();
  reply(undefined, failure);
  expect(sync.snapshot().failure).toBe(failure);
  expect(sync.snapshot().data.courses.map((item) => item.id)).toEqual([1]);
  sync.start();
  reply({ courses: [course(2)], nextOffset: 0 });
  sync.choose([2]);
  reply({ courseId: 2, sections: [], modules: [] });
  reply({ events: [], firstId: null, lastId: null });
  expect(sync.snapshot().phase).toBe('ready');
  expect(sync.snapshot().data.courses.map((item) => item.id)).toEqual([2]);
  sync.cancel();
  expect(sync.snapshot().data.courses).toEqual([]);
});

it.each(['expired', 'denied', 'wrong-origin'])('does not restore content after %s', (failure) => {
  const { sync, reply } = harness();
  sync.start();
  reply({ courses: [course(1)], nextOffset: 0 });
  sync.choose([1]);
  reply({ courseId: 1, sections: [], modules: [] });
  reply({ events: [], firstId: null, lastId: null });
  sync.start();
  reply(undefined, failure);
  expect(readMoodleCache().courses).toEqual([]);
});

it('does not restore previous content after cache invalidation during refresh', () => {
  const { sync, reply } = harness();
  sync.start();
  reply({ courses: [course(1)], nextOffset: 0 });
  sync.choose([1]);
  reply({ courseId: 1, sections: [], modules: [] });
  reply({ events: [], firstId: null, lastId: null });
  sync.start();
  clearMoodleCache();
  reply(undefined, 'unavailable');
  expect(readMoodleCache().courses).toEqual([]);
});

it('recovers matching selected course content when its refreshed resources fail', () => {
  const { sync, reply } = harness();
  sync.start(); reply({ courses: [course(1)], nextOffset: 0 }); sync.choose([1]);
  reply({ courseId: 1, sections: [], modules: [] });
  reply({ events: [], firstId: null, lastId: null });
  sync.start(); reply({ courses: [course(1), course(2)], nextOffset: 0 }); sync.choose([1]);
  reply(undefined, 'unavailable');
  expect(readMoodleCache().states.map((item) => item.courseId)).toEqual([1]);
  sync.start(); reply({ courses: [course(2)], nextOffset: 0 }); sync.choose([2]);
  reply(undefined, 'unavailable');
  expect(readMoodleCache().courses.map((item) => item.id)).toEqual([2]);
  expect(readMoodleCache().states).toEqual([]);
});
