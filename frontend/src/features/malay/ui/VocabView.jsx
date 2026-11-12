import { useMemo, useState } from 'react';
import { UNITS } from '../data/course.js';
import { uLabel, vTextOf } from '../engine/merge.js';
import { PageHead, SpeakButton } from './parts.jsx';

/**
 * 词汇本：搜索 + 卡片翻转。
 * 点击卡片翻到释义 / 原文，翻回时把该词条标记为「已认识」。
 */
export default function VocabView({ isEn, t, onMarkKnown }) {
  const [query, setQuery] = useState('');
  const [flipped, setFlipped] = useState({});

  const entries = useMemo(() => {
    const list = [];
    UNITS.forEach((unit) => {
      (unit.vocab || []).filter((v) => v.ms && v.zh).forEach((v) => {
        list.push({ unit, item: v, meaning: vTextOf(unit, v.ms, isEn) });
      });
    });
    return list;
  }, [isEn]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(({ unit, item, meaning }) =>
      item.ms.toLowerCase().includes(q)
      || String(meaning).toLowerCase().includes(q)
      || (!isEn && String(item.zh).toLowerCase().includes(q))
      || unit.title.toLowerCase().includes(q)
    );
  }, [entries, query, isEn]);

  const total = entries.length;

  return (
    <div>
      <PageHead title={t('vocab_title')} sub={t('vocab_sub', { n: total })} />

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('vocab_search')}
        autoComplete="off"
        className="malay-search mb-5 w-full"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-current/20 px-4 py-8 text-center text-sm opacity-60">
          {t('pr_wrong_empty')}
        </p>
      ) : (
        <div className="malay-vocab-grid">
          {filtered.map(({ unit, item, meaning }) => {
            const isFlipped = !!flipped[item.ms];
            return (
              <div
                key={`${unit.id}-${item.ms}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const next = !isFlipped;
                  setFlipped((prev) => ({ ...prev, [item.ms]: next }));
                  if (next) onMarkKnown(item.ms);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const next = !isFlipped;
                    setFlipped((prev) => ({ ...prev, [item.ms]: next }));
                    if (next) onMarkKnown(item.ms);
                  }
                }}
                className="malay-vocab-card"
              >
                <span className="malay-vc-emo" aria-hidden="true">{item.emoji || '📘'}</span>
                <span className="malay-vc-ms">{isFlipped ? meaning : item.ms}</span>
                <span className="malay-vc-zh">{isFlipped ? item.ms : meaning}</span>
                <span className="malay-vc-unit">{uLabel(unit, isEn)}</span>
                <SpeakButton text={item.ms} className="malay-speak-vocab" />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs opacity-60">{t('vocab_flip_hint', { n: total })}</p>
    </div>
  );
}
