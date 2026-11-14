import { unitOfMs } from '../engine/practice.js';
import { vTextOf } from '../engine/merge.js';
import { PageHead, SectionTitle, SpeakButton } from './parts.jsx';

/** 某个 ms 的释义（跨单元时按所属单元查表） */
function meaningOf(ms, isEn) {
  const unit = unitOfMs(ms);
  return unit ? vTextOf(unit, ms, isEn) : ms;
}

/**
 * 个性化练习页：四种模式入口 + 错题本 / 易混淆清单。
 * 概览数据由上层在事件里算好后传入（渲染期不取当前时间）。
 */
export default function PracticeView({ summary, isEn, t, onStartPractice }) {
  const { wrong, pairs, due } = summary;

  const modes = [
    { mode: 'wrong', icon: '🎯', n: wrong.length, title: t('pr_wrong_title'), desc: t('pr_wrong_desc') },
    { mode: 'confuse', icon: '🔀', n: pairs.length, title: t('pr_confuse_title'), desc: t('pr_confuse_desc') },
    { mode: 'review', icon: '⏰', n: due.length, title: t('pr_review_title'), desc: t('pr_review_desc') },
    { mode: 'mix', icon: '🧩', n: wrong.length + due.length, title: t('pr_mix_title'), desc: t('pr_mix_desc') },
  ];

  return (
    <div>
      <PageHead title={t('practice_title')} sub={t('practice_sub')} />

      <div className="malay-practice-grid mb-8">
        {modes.map((m) => (
          <div key={m.mode} className="malay-practice-card">
            <span className="malay-pr-ico" aria-hidden="true">{m.icon}</span>
            <span className="malay-pr-n">{m.n}</span>
            <h4 className="mt-1 font-semibold">{m.title}</h4>
            <p className="mb-3 text-sm opacity-70">{m.desc}</p>
            <button type="button" className="malay-btn-primary" onClick={() => onStartPractice(m.mode)}>
              {t('pr_start')}
            </button>
          </div>
        ))}
      </div>

      <SectionTitle>{`${t('pr_wrong_title')}（${wrong.length}）`}</SectionTitle>
      {wrong.length === 0 ? (
        <p className="rounded-xl border border-dashed border-current/20 px-4 py-6 text-center text-sm opacity-60">
          {t('pr_wrong_empty')}
        </p>
      ) : (
        <div className="malay-practice-list">
          {wrong.slice(0, 60).map((item) => (
            <div key={item.ms} className="malay-practice-row">
              <span className="malay-pr-ms">{item.ms}</span>
              <span className="malay-pr-mean">{meaningOf(item.ms, isEn)}</span>
              <span className="malay-pr-badge">{t('pr_wrong_n', { n: item.wrong || 0 })}</span>
              <SpeakButton text={item.ms} className="malay-speak-opt" />
            </div>
          ))}
        </div>
      )}

      <SectionTitle>{`${t('pr_confuse_title')}（${pairs.length}）`}</SectionTitle>
      {pairs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-current/20 px-4 py-6 text-center text-sm opacity-60">
          {t('pr_confuse_empty')}
        </p>
      ) : (
        <div className="malay-practice-list">
          {pairs.slice(0, 40).map((p) => (
            <div key={`${p.a}|${p.b}`} className="malay-practice-row">
              <span className="malay-pr-ms">{p.a}</span>
              <span className="malay-pr-arrow" aria-hidden="true">↔</span>
              <span className="malay-pr-ms">{p.b}</span>
              <span className="malay-pr-mean">{meaningOf(p.b, isEn)}</span>
              <span className="malay-pr-badge">×{Number(p.n) || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
