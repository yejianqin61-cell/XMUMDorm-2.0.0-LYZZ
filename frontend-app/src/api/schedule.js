import { get, post } from './request';

export function previewScheduleImport(text) {
  return post('/api/schedule/import/preview', { text });
}

export function commitScheduleImport(text) {
  return post('/api/schedule/import/commit', { text });
}

export function getScheduleWeek(week = 1) {
  return get(`/api/schedule/week?week=${encodeURIComponent(String(week))}`);
}

