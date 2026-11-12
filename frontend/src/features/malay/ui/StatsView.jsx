import { UNITS } from '../data/course.js';
import { uLabel } from '../engine/merge.js';
import { allLessons, buildLessons } from '../engine/questions.js';
import { PageHead, SectionTitle } from './parts.jsx';

/** 学习统计：总览指标 + 各单元进度 */
export default function StatsView({ state, isEn, t, onReset }) {
  const total = allLessons().length;
  const pct = total ? Math.round((state.lessonsDone / total) * 100) : 0;

  const metrics = [
    { ico: '⚡', value: state.xp, label: t('m_xp') },
    { ico: '🔥', value: state.streak, label: t('m_streak') },
    { ico: '📘', value: state.lessonsDone, label: t('m_lessons') },
    { ico: '🏆', value: `${pct}%`, label: t('m_pct') },
  ];

  return (
    <div>
      <PageHead title={t('stats_title')} sub={t('stats_sub')} />

      <div className="malay-metric-grid mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="malay-metric">
            <b>{m.ico} {m.value}</b>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <SectionTitle>{t('unit_progress_title')}</SectionTitle>
      <div className="malay-unit-progress">
        {UNITS.map((unit, unitIdx) => {
          const lessons = buildLessons(unit, unitIdx);
          const done = lessons.filter((l) => (state.done || {})[l.id]).length;
          const ratio = lessons.length ? done / lessons.length : 0;
          return (
            <div key={unit.id} className="malay-up-row">
              <span aria-hidden="true">{unit.icon}</span>
              <span className="malay-up-name">{unit.title} · {uLabel(unit, isEn)}</span>
              <span className="malay-up-count">{done}/{lessons.length}</span>
              <span className="malay-up-bar"><i style={{ width: `${ratio * 100}%` }} /></span>
            </div>
          );
        })}
      </div>

      <button type="button" className="malay-btn-secondary mt-6" onClick={onReset}>
        {t('reset_progress')}
      </button>
    </div>
  );
}
