/**
 * 日记本 API，与后端 /api/diary 对应
 */
import { get, post } from '../utils/http';

// 获取某天日记（默认今天），date 格式：YYYY-MM-DD
export function getDiaryDay(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return get(`/api/diary/day${q}`);
}

// 保存/更新某天日记
export function saveDiaryDay({ date, content }) {
  const body = {};
  if (date) body.date = date;
  body.content = content ?? '';
  return post('/api/diary/day', body);
}

// 获取概览：今日、往年今日、最近 N 天
export function getDiaryOverview(date, options = {}) {
  const { recentDays = 30 } = options;
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (recentDays) params.set('recentDays', String(recentDays));
  const qs = params.toString();
  return get(`/api/diary/overview${qs ? `?${qs}` : ''}`);
}

// 月视图热力数据：用于日历高亮
export function getDiaryMonth(year, month) {
  const params = new URLSearchParams();
  params.set('year', String(year));
  params.set('month', String(month));
  return get(`/api/diary/month?${params.toString()}`);
}

