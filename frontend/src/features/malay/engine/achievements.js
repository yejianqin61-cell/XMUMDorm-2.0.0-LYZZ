/**
 * 成就定义（与上游 app.js 的 achDefs 一致，共 9 项）。
 * 单独成模块，避免组件文件同时导出组件与非组件（react-refresh 规则）。
 */
import { allLessons } from './questions.js';

export const ACHIEVEMENT_KEYS = [
  'first', 'five', 'ten', 'streak3', 'streak7', 'xp100', 'xp500', 'half', 'all',
];

/**
 * 计算每个成就当前是否已达成。
 * @param {{lessonsDone:number, streak:number, xp:number}} state
 */
export function achievementDefs(state) {
  const total = allLessons().length;
  return [
    { id: 'first', ico: '🌱', ok: state.lessonsDone >= 1 },
    { id: 'five', ico: '🔥', ok: state.lessonsDone >= 5 },
    { id: 'ten', ico: '💪', ok: state.lessonsDone >= 10 },
    { id: 'streak3', ico: '📅', ok: state.streak >= 3 },
    { id: 'streak7', ico: '🏅', ok: state.streak >= 7 },
    { id: 'xp100', ico: '⚡', ok: state.xp >= 100 },
    { id: 'xp500', ico: '🚀', ok: state.xp >= 500 },
    { id: 'half', ico: '🏝️', ok: state.lessonsDone >= Math.ceil(total / 2) },
    { id: 'all', ico: '👑', ok: state.lessonsDone >= total },
  ];
}
