from pathlib import Path
content = r"""import { getBadgeForLevel } from '../constants/levelConfig';

export default function LevelProgressBar({ level, levelProgress, isZh = true }) {
  if (!level || !levelProgress) return null;
  const badge = getBadgeForLevel(level, isZh);
  const pct = Math.round((levelProgress.progress || 0) * 100);

  return (
    <div className="mt-2" aria-label={isZh ? '等级进度' : 'Level progress'}>
      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>{badge.label}</span>
        <span>{levelProgress.progressText} XP</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </motion.div>
    </motion.div>
  );
}
"""
# fix motion typos in raw string - use explicit replacements
content = content.replace("</motion.div>", "</div>")
content = content.replace("<motion.div\n", "<div\n")
content = content.replace('<motion.div className="h-1.5', '<div className="h-1.5')
Path("frontend/src/components/LevelProgressBar.jsx").write_text(content, encoding="utf-8")
print("ok")
