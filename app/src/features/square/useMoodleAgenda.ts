/**
 * Moodle「今日待交」的读缓存 hook —— 只读本地快照，**不发网络请求**。
 *
 * 为什么要订阅：Moodle 的数据由 `system/moodle` 的 WebView 同步写进缓存
 * （`features/tools/moodle/cache.ts`）。学生从系统页返回广场时，今日页必须自己变新，
 * ⛔ 不能靠"重新进页面"才刷新。
 *
 * 实现口径：**缓存代数 + 当前时间**是重新投影的两个输入 ——
 *   缓存变化（订阅触发 `generation++`）或每分钟走表都会重算，渲染期不写 state
 *   （避免 react-hooks/set-state-in-effect 的级联渲染）。
 *
 * ⚠️ 冷启动缓存为空是**设计**（Y0 隐私口径：磁盘恢复要求当前页面已确认校方账号），
 *    所以 `synced:false` 是合法状态，UI 显示"打开 Moodle 同步"入口即可。
 */

import * as React from 'react';

import { agendaDeadlines, type AgendaDeadline } from './todayAgenda';
import { readMoodleCache, subscribeMoodleDataChanged } from '@/features/tools/moodle/cache';

export type MoodleAgenda = {
  /** 是否已同步过（缓存里有课程）；false = 需要学生打开 Moodle 页同步 */
  synced: boolean;
  deadlines: readonly AgendaDeadline[];
};

function snapshot(nowMs: number): MoodleAgenda {
  const cache = readMoodleCache();
  return {
    synced: cache.courses.length > 0,
    deadlines: agendaDeadlines(cache.states, cache.events, cache.courses, nowMs),
  };
}

export function useMoodleAgenda(nowMs: number): MoodleAgenda {
  const [generation, setGeneration] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    // 缓存的写入方可能在**渲染期**同步通知（MoodleWorkspaceHost）→ 推到微任务里再 setState，
    // 否则 React 报「渲染 A 时更新了 B」。
    const unsubscribe = subscribeMoodleDataChanged(() => {
      queueMicrotask(() => { if (active) setGeneration((current) => current + 1); });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `generation` 是缓存变化的版本号，必须进依赖
  return React.useMemo(() => snapshot(nowMs), [nowMs, generation]);
}
