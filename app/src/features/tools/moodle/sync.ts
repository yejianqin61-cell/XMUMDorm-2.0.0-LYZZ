import { MOODLE_MESSAGE_KIND, parseMoodleBridgeMessage, type MoodleFailure, type MoodleReadRequest } from './bridge';
import { clearMoodleCache, moodleCacheGeneration, readMoodleCache, selectMoodleCourses, writeMoodleCache } from './cache';
import type { MoodleCourse, MoodleCoursesResponse, MoodleStateResponse, MoodleEventsResponse } from './contract';

export type MoodleSyncPhase = 'idle' | 'loading-courses' | 'choosing' | 'loading-objects' | 'ready' | 'error';
export type MoodleSyncSnapshot = {
  phase: MoodleSyncPhase;
  failure: MoodleFailure | null;
  candidates: MoodleCourse[];
  selectedIds: number[];
  data: ReturnType<typeof readMoodleCache>;
};
export type MoodleSyncPort = {
  read: (request: MoodleReadRequest) => string | null;
  changed?: () => void;
  timeoutMilliseconds?: number;
};

/** One outstanding read makes ordering explicit. All accepted data is reprojected. */
export function createMoodleSync(port: MoodleSyncPort) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  function stopTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
  let read = port.read;
  function connectRead(next: MoodleSyncPort['read']) { read = next; }
  let phase: MoodleSyncPhase = 'idle';
  let failure: MoodleFailure | null = null;
  let candidates = new Map<number, MoodleCourse>();
  let selectedIds: number[] = [];
  let generation = moodleCacheGeneration();
  let pending: { id: string; request: MoodleReadRequest } | null = null;
  let courseOffsets = new Set<number>();
  let eventCursors = new Set<number>();
  let remaining: number[] = [];
  let previousData: ReturnType<typeof readMoodleCache> | null = null;

  const listeners = new Set<() => void>();
  function changed() { port.changed?.(); for (const listener of listeners) listener(); }
  function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
  function fail(reason: MoodleFailure) {
    stopTimer();
    if ((reason === 'unavailable' || reason === 'timeout') && previousData
      && generation === moodleCacheGeneration()) {
      writeMoodleCache('courses', { courses: previousData.courses, nextOffset: 0 }, generation);
      for (const state of previousData.states) writeMoodleCache('state', state, generation);
      writeMoodleCache('events', { events: previousData.events, firstId: null, lastId: null }, generation);
    } else previousData = null;
    pending = null;
    phase = 'error';
    failure = reason;
    changed();
  }
  function cancel(clear = true) {
    stopTimer();
    previousData = null;
    if (clear) clearMoodleCache();
    pending = null;
    phase = 'idle';
    failure = null;
    candidates.clear();
    selectedIds = [];
    remaining = [];
    changed();
  }
  function send(request: MoodleReadRequest) {
    const id = read(request);
    generation = moodleCacheGeneration();
    if (id === null) { fail('unavailable'); return; }
    pending = { id, request };
    timer = setTimeout(() => fail('timeout'), port.timeoutMilliseconds ?? 12500);
    changed();
  }
  function nextState() {
    const courseId = remaining.shift();
    if (courseId !== undefined) send({ method: 'state', courseId });
    else send({ method: 'events', afterEventId: 0 });
  }
  function start() {
    stopTimer();
    if (phase === 'ready') previousData = readMoodleCache();
    pending = null;
    phase = 'loading-courses';
    failure = null;
    candidates = new Map();
    courseOffsets = new Set([0]);
    eventCursors = new Set([0]);
    send({ method: 'courses', offset: 0 });
  }
  function choose(ids: readonly number[]) {
    if (phase !== 'choosing' && phase !== 'ready') return;
    previousData = null;
    selectedIds = [...new Set(ids)].filter((id) => candidates.has(id));
    selectMoodleCourses(selectedIds);
    generation = moodleCacheGeneration();
    writeMoodleCache('courses', { courses: [...candidates.values()], nextOffset: 0 }, generation);
    remaining = [...selectedIds];
    eventCursors = new Set([0]);
    failure = null;
    if (remaining.length === 0) { phase = 'ready'; changed(); return; }
    phase = 'loading-objects';
    nextState();
  }
  function receive(raw: unknown, responseGeneration: number): boolean {
    if (!pending) return false;

    let result;
    try {
      result = parseMoodleBridgeMessage(JSON.stringify({ ...(raw as object), kind: MOODLE_MESSAGE_KIND }));
    } catch { return false; }
    if (!result || result.requestId !== pending.id || result.method !== pending.request.method) return false;
    if (result.status === 'expired' || result.status === 'wrong-origin') { fail(result.status); return true; }
    if (generation !== moodleCacheGeneration() || generation !== responseGeneration) { cancel(false); return false; }
    stopTimer();
    const request = pending.request;
    pending = null;
    if (result.status !== 'success') { fail(result.status); return true; }
    if (request.method === 'courses') {
      const data = result.data as MoodleCoursesResponse;
      for (const course of data.courses) candidates.set(course.id, course);
      // Campus 4.5 returns an empty trailing page whose nextoffset equals the requested
      // offset (21 courses, limit 50 → offset 0: nextoffset 21 → offset 21: [], nextoffset 21).
      // That is the end of pagination, not a repeated cursor.
      if (data.courses.length === 0) { phase = 'choosing'; changed(); return true; }
      if (data.nextOffset === 0) { phase = 'choosing'; changed(); return true; }
      if (data.nextOffset <= (request.offset ?? 0) || courseOffsets.has(data.nextOffset)) {
        fail('invalid-data'); return true;
      }
      courseOffsets.add(data.nextOffset);
      send({ method: 'courses', offset: data.nextOffset });
    } else if (request.method === 'state') {
      const data = result.data as MoodleStateResponse;
      if (data.courseId !== request.courseId) { fail('invalid-data'); return true; }
      if (!writeMoodleCache('state', data, generation)) { fail('invalid-data'); return true; }
      nextState();
    } else {
      const data = result.data as MoodleEventsResponse;
      writeMoodleCache('events', data, generation);
      if (data.lastId === null) { phase = 'ready'; changed(); return true; }
      if (eventCursors.has(data.lastId)) { fail('invalid-data'); return true; }
      eventCursors.add(data.lastId);
      send({ method: 'events', afterEventId: data.lastId });
    }
    return true;
  }
  function snapshot(): MoodleSyncSnapshot {
    const data = readMoodleCache();
    return { phase, failure, candidates: [...candidates.values()].map((course) => ({ ...course })),
      selectedIds: [...selectedIds], data };
  }
  function adoptCache() {
    stopTimer(); pending = null; failure = null;
    previousData = null;
    const data = readMoodleCache(); generation = data.generation;
    candidates = new Map(data.courses.map((course) => [course.id, course]));
    selectedIds = data.courses.map((course) => course.id); phase = 'ready'; changed();
  }
  return { start, choose, receive, cancel, snapshot, subscribe, adoptCache, connectRead };
}
