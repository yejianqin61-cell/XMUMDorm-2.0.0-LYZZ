import { getBadgeForLevel } from '@shared/constants/levelConfig';

export default function LevelProgressBar({ level, levelProgress, isZh = true }) {
  if (!level || !levelProgress) return null;
  const badge = getBadgeForLevel(level, isZh);
  const pct = Math.round((levelProgress.progress || 0) * 100);

  return (
    <div className="mt-2" aria-label={isZh ? '\u7b49\u7ea7\u8fdb\u5ea6' : 'Level progress'}>
      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>{badge.label}</span>
        <span>{levelProgress.progressText} XP</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
