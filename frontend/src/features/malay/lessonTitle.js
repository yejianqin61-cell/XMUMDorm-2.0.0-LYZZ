import { uLabel } from './engine/merge.js';

/**
 * 课节标题：上游是「单元名 · 热身 / 个性化练习」，标题随语言变化。
 */
export function lessonTitle(lesson, isEn, t) {
  if (!lesson || !lesson.unit) return '';
  const suffix = lesson.id.endsWith('-0') ? t('warmup') : t('nav_practice');
  return `${uLabel(lesson.unit, isEn)} · ${suffix}`;
}
