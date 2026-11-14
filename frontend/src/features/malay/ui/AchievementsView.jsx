import { achievementDefs } from '../engine/achievements.js';
import { allLessons } from '../engine/questions.js';
import { PageHead } from './parts.jsx';

export default function AchievementsView({ state, t }) {
  const defs = achievementDefs(state);
  const unlocked = defs.filter((d) => d.ok).length;

  return (
    <div>
      <PageHead title={t('ach_title')} sub={t('ach_sub', { a: unlocked, b: defs.length })} />
      <div className="malay-ach-list">
        {defs.map((d) => {
          const value = t(`ach_${d.id}`, { n: allLessons().length });
          const pair = Array.isArray(value) ? value : [d.id, ''];
          return (
            <div key={d.id} className={`malay-ach ${d.ok ? 'is-on' : ''}`}>
              <span className="malay-ach-ico" aria-hidden="true">{d.ico}</span>
              <div className="min-w-0">
                <h4 className="font-semibold">{pair[0]}</h4>
                <p className="text-sm opacity-70">{pair[1]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
