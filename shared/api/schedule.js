import { get, post } from './request';

export function previewScheduleImport(text) {
  return post('/api/schedule/import/preview', { text });
}

export function commitScheduleImport(text) {
  return post('/api/schedule/import/commit', { text });
}

/**
 * 查某一周的课表。
 * 必须显式传周次：第 1 周和第 10 周的课表不一样（如 `(Week 9-14)` 的课第 1 周不上），
 * 早先这里默认 1、调用方也写死 1，导致整站永远只显示第 1 周。
 * 当前周次请用 shared/config/semesters.js 的 resolveSemesterContext() 算。
 */
export function getScheduleWeek(week) {
  return get(`/api/schedule/week?week=${encodeURIComponent(String(week))}`);
}

