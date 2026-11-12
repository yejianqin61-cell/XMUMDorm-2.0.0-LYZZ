import { UNITS } from '../data/course.js';
import { uLabel, uDesc } from '../engine/merge.js';
import { allLessons, buildLessons, currentLesson, isUnlocked } from '../engine/questions.js';
import { lessonTitle } from '../lessonTitle.js';
import { PageHead } from './parts.jsx';

/**
 * 学习路径页：单元区块 + 线性解锁的课节节点。
 * 解锁规则与上游一致：上一课完成才解锁，第一课永远可学。
 */
export default function PathView({ state, isEn, t, onStartLesson, onLocked }) {
  const done = state.done || {};
  const lessons = allLessons();
  const cur = currentLesson(done);
  const curUnit = UNITS[cur.unitIdx];

  return (
    <div>
      <PageHead title={t('path_title')} sub={t('path_sub', { n: UNITS.length, m: lessons.length })} />

      <button
        type="button"
        onClick={() => onStartLesson(cur.id)}
        className="malay-continue-card mb-8 flex w-full items-center gap-4 text-left"
      >
        <span className="malay-continue-ico" aria-hidden="true">{curUnit.icon}</span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate">
            {done[cur.id] ? t('continue_learn') : t('start_learn')}：{curUnit.title}
          </strong>
          <span className="mt-0.5 block truncate text-sm opacity-70">{lessonTitle(cur, isEn, t)}</span>
        </span>
        <span className="malay-continue-cta">{t('start')}</span>
      </button>

      {UNITS.map((unit, unitIdx) => {
        const unitLessons = buildLessons(unit, unitIdx);
        const doneCount = unitLessons.filter((l) => done[l.id]).length;
        return (
          <section key={unit.id} className="malay-unit-block">
            <div className="mb-3 flex items-center gap-3">
              <span className="malay-unit-badge" aria-hidden="true">{unit.icon}</span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">
                  {unit.title} · {uLabel(unit, isEn)}
                </h2>
                <p className="truncate text-sm opacity-70">
                  {uDesc(unit, isEn)} · {t('unit_progress', { a: doneCount, b: unitLessons.length })}
                </p>
              </div>
            </div>
            <div className="malay-path">
              {unitLessons.map((lesson, li) => {
                if (li > 0) return <span key={`sp-${lesson.id}`} className="malay-path-spacer" aria-hidden="true" />;
                const unlocked = isUnlocked(lesson.id, done);
                const isDone = !!done[lesson.id];
                const isCurrent = lesson.id === cur.id;
                const mark = isDone ? '✓' : (unlocked ? '★' : '🔒');
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    title={lessonTitle(lesson, isEn, t)}
                    onClick={() => (unlocked ? onStartLesson(lesson.id) : onLocked())}
                    className={`malay-node ${isDone ? 'is-done' : ''} ${unlocked ? '' : 'is-locked'} ${isCurrent ? 'is-current' : ''}`}
                  >
                    <span aria-hidden="true">{mark}</span>
                    <small>{lesson.title}</small>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
