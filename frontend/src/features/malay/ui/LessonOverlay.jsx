import { useEffect, useMemo, useState } from 'react';
import { gqOf, grammarOf, sText, uLabel, uDesc, unitOfMs, vTextOf } from '../engine/merge.js';
import { seeded, shuffle } from '../engine/questions.js';
import { speak } from '../audio.js';
import { SpeakButton } from './parts.jsx';

/**
 * 闯关浮层：intro / prIntro / grammar / mcq / match / arrange / listen / speak / done
 *
 * 交互状态（选中项、配对、拼句）留在本组件；学习记录（答题对错、心心、经验值）
 * 由上层 MalayPage 统一处理，保证只有一处写进度。
 */
export default function LessonOverlay({
  lesson, state, isEn, t, footer, onQuit, onNext, onCheck, onStartLesson,
  onMcqAnswer, onMatchResult, onListenAnswer, onSpeakDone,
}) {
  const { def, idx } = lesson;
  const step = def.steps[idx];
  const total = def.steps.length;

  const [chosen, setChosen] = useState(null);
  const [matchSel, setMatchSel] = useState(null);
  const [matchDone, setMatchDone] = useState([]);
  const [matchBad, setMatchBad] = useState([]);
  const [arranged, setArranged] = useState([]);
  const [usedTokens, setUsedTokens] = useState([]);

  // 每进入新的一步，整块浮层会按 key 重新挂载，这里的交互状态自然是空的。
  // 听力题进入时自动播放一次。
  useEffect(() => {
    if (step && step.type === 'listen' && step.sMs) {
      const timer = setTimeout(() => speak(step.sMs), 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step]);

  const matchColumns = useMemo(() => {
    if (!step || step.type !== 'match') return null;
    const rnd = seeded(step.msList.length + idx);
    return {
      left: shuffle(step.msList, rnd),
      right: shuffle(step.msList, rnd),
    };
  }, [step, idx]);

  if (!step) return null;

  const hearts = state.hearts;
  const progress = def.practice && step.type === 'done' ? 100 : Math.round((idx / total) * 100);

  const handleMcq = (i) => {
    if (lesson.locked || chosen !== null) return;
    setChosen(i);
    onMcqAnswer(step, i, def);
  };

  const handleListen = (i) => {
    if (lesson.locked || chosen !== null) return;
    setChosen(i);
    onListenAnswer(step, i);
  };

  const handleMatchClick = (ms, side) => {
    if (lesson.locked || matchDone.includes(ms)) return;
    if (!matchSel) {
      setMatchSel({ ms, side });
      return;
    }
    if (matchSel.side === side) {
      setMatchSel({ ms, side });
      return;
    }
    const first = matchSel;
    setMatchSel(null);
    if (first.ms === ms) {
      setMatchDone((prev) => [...prev, ms]);
      onMatchResult(step, ms, null, true);
      return;
    }
    setMatchBad((prev) => [...prev, first.ms, ms]);
    onMatchResult(step, first.ms, ms, false);
    setTimeout(() => setMatchBad((prev) => prev.filter((x) => x !== first.ms && x !== ms)), 500);
  };

  const addToken = (token, i) => {
    if (lesson.locked || usedTokens.includes(i)) return;
    setUsedTokens((prev) => [...prev, i]);
    setArranged((prev) => [...prev, { token, i }]);
  };

  const removeToken = (entry) => {
    if (lesson.locked) return;
    setArranged((prev) => prev.filter((x) => x.i !== entry.i));
    setUsedTokens((prev) => prev.filter((x) => x !== entry.i));
  };

  return (
    <div className="malay-lesson-overlay" role="dialog" aria-modal="true" aria-label={t('practice_title')}>
      <div className="malay-lesson-top">
        <button type="button" className="malay-icon-btn" aria-label={t('exit')} onClick={onQuit}>✕</button>
        <div className="malay-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="malay-hearts" aria-label={t('stat_hearts')}>
          {'❤️'.repeat(Math.max(0, hearts))}{'🖤'.repeat(Math.max(0, 5 - hearts))}
        </div>
      </div>

      <div className="malay-lesson-body">
        {step.type === 'intro' ? (
          <IntroStep step={step} def={def} isEn={isEn} t={t} />
        ) : null}

        {step.type === 'prIntro' ? (
          <div className="malay-slide">
            <span className="malay-slide-badge">{t('practice_title')}</span>
            <h1>{t(`pr_${step.mode}_title`)}</h1>
            <p className="malay-lead">{t('pr_intro_sub', { n: step.count })}</p>
            <div className="malay-gram-box">
              <ul>
                <li>{t('pr_intro_tip1')}</li>
                <li>{t('pr_intro_tip2')}</li>
              </ul>
            </div>
          </div>
        ) : null}

        {step.type === 'grammar' ? (
          <GrammarStep step={step} isEn={isEn} t={t} />
        ) : null}

        {step.type === 'mcq' ? (
          <McqStep step={step} def={def} isEn={isEn} t={t} chosen={chosen} onPick={handleMcq} />
        ) : null}

        {step.type === 'match' ? (
          <MatchStep
            step={step}
            isEn={isEn}
            t={t}
            columns={matchColumns}
            selected={matchSel}
            done={matchDone}
            bad={matchBad}
            onPick={handleMatchClick}
          />
        ) : null}

        {step.type === 'arrange' ? (
          <ArrangeStep
            step={step}
            isEn={isEn}
            t={t}
            arranged={arranged}
            usedTokens={usedTokens}
            onAdd={addToken}
            onRemove={removeToken}
          />
        ) : null}

        {step.type === 'listen' ? (
          <ListenStep step={step} def={def} isEn={isEn} t={t} chosen={chosen} onPick={handleListen} />
        ) : null}

        {step.type === 'speak' ? (
          <SpeakStep step={step} isEn={isEn} t={t} onDone={onSpeakDone} />
        ) : null}

        {step.type === 'done' ? (
          <DoneStep lesson={lesson} state={state} t={t} onQuit={onQuit} onStartLesson={onStartLesson} />
        ) : null}
      </div>

      {footer && !footer.hidden ? (
        <div className={`malay-lesson-footer ${footer.kind === 'right' ? 'is-ok' : ''} ${footer.kind === 'wrong' ? 'is-no' : ''}`}>
          <div className="malay-lf-status">
            <span>{footer.title}</span>
            {footer.note ? <small>{footer.note}</small> : null}
          </div>
          <button
            type="button"
            className={`malay-btn-primary ${footer.kind === 'wrong' ? 'malay-btn-red' : ''}`}
            onClick={footer.kind === 'check'
              ? () => onCheck(arranged.map((entry) => entry.token).join(' '))
              : onNext}
          >
            {footer.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IntroStep({ step, def, isEn, t }) {
  const unit = step.unit;
  const no = def.id.endsWith('-0') ? 1 : 2;
  const grammar = grammarOf(unit, isEn);
  return (
    <div className="malay-slide">
      <span className="malay-slide-badge">
        {step.sub === 'practice' ? t('nav_practice') : t('new_unit')} · {t('lesson_no', { n: no })}
      </span>
      <h1>{unit.icon} {unit.title}</h1>
      <p className="malay-lead">{uLabel(unit, isEn)} — {uDesc(unit, isEn)}</p>
      <div className="malay-gram-box">
        <h3>{t('will_learn')}</h3>
        <ul>
          <li>{t('new_words', { n: unit.vocab.filter((v) => v.ms && v.zh).length })}</li>
          <li>{t('new_sentences', { n: unit.sentences.length })}</li>
          <li>{t('grammar_point', { n: grammar.title })}</li>
        </ul>
      </div>
      <p className="malay-slide-tip">{t('tip_intro')}</p>
    </div>
  );
}

function GrammarStep({ step, isEn, t }) {
  const g = grammarOf(step.unit, isEn);
  return (
    <div className="malay-slide">
      <span className="malay-slide-badge">{t('grammar_slide')}</span>
      <h1>{g.title}</h1>
      <p className="malay-lead">{g.lead}</p>
      <div className="malay-gram-box">
        <ul>{(g.points || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
        {(g.examples || []).map((ex, i) => (
          <div key={i} className="malay-example">
            <b>{ex.ms}</b>
            <span>{ex.text}</span>
            <SpeakButton text={ex.ms} className="malay-speak-inline" />
          </div>
        ))}
      </div>
    </div>
  );
}

function McqStep({ step, def, isEn, t, chosen, onPick }) {
  const unit = def.unit;
  let question = '';
  let sub = '';
  let options = [];
  let answer = step.a;
  let note = '';
  let say = null;
  let emoji = '';

  if (step.kind === 'vocab') {
    const vu = unitOfMs(step.ms) || unit;
    question = t('how_to_say', { a: vTextOf(vu, step.ms, isEn) });
    sub = t('q_pick');
    options = step.opts;
    say = step.ms;
    emoji = step.emoji;
  } else {
    const gq = gqOf(unit, isEn)[step.gqIdx];
    if (!gq) return null;
    question = gq.q;
    sub = t('q_grammar');
    options = gq.opts;
    answer = gq.a;
    note = gq.why;
  }

  return (
    <div>
      <div className="malay-q-title">{question}</div>
      {sub ? <div className="malay-q-sub">{sub}</div> : null}
      {emoji ? <div className="malay-q-emoji" aria-hidden="true">{emoji}</div> : null}
      <div className="malay-options">
        {options.map((o, i) => {
          const state = chosen === null ? '' : (i === answer ? 'is-right' : (i === chosen ? 'is-wrong' : ''));
          return (
            <div key={i} className="malay-opt-row">
              <button type="button" className={`malay-opt ${state}`} onClick={() => onPick(i)}>
                <span className="malay-o-key">{i + 1}</span>
                <span className="malay-o-txt">{o}</span>
              </button>
              {step.kind === 'vocab' ? <SpeakButton text={o} className="malay-speak-opt" /> : null}
            </div>
          );
        })}
      </div>
      {say ? (
        <div className="malay-q-hint">
          <SpeakButton text={say} className="malay-speak-lg" />
          <span>{t('listen_hint')}</span>
        </div>
      ) : null}
      {chosen !== null && note ? <p className="malay-q-note">{note}</p> : null}
    </div>
  );
}

function MatchStep({ step, isEn, t, columns, selected, done, bad, onPick }) {
  if (!columns) return null;
  const renderCell = (ms, side) => {
    const isDone = done.includes(ms);
    const isBad = bad.includes(ms);
    const isSel = selected && selected.ms === ms && selected.side === side;
    const text = side === 'L' ? ms : vTextOf(unitOfMs(ms) || step.unit, ms, isEn);
    return (
      <div key={`${side}-${ms}`} className="malay-match-cell">
        <button
          type="button"
          className={`malay-match-item ${isDone ? 'is-done' : ''} ${isBad ? 'is-bad' : ''} ${isSel ? 'is-sel' : ''}`}
          onClick={() => onPick(ms, side)}
        >
          {text}
        </button>
        {side === 'L' ? <SpeakButton text={ms} className="malay-speak-opt" /> : null}
      </div>
    );
  };

  return (
    <div>
      <div className="malay-q-title">{t('q_match')}</div>
      <div className="malay-q-sub">{t('q_match_sub')}</div>
      <div className="malay-match-wrap">
        <div className="malay-match-col">{columns.left.map((ms) => renderCell(ms, 'L'))}</div>
        <div className="malay-match-col">{columns.right.map((ms) => renderCell(ms, 'R'))}</div>
      </div>
    </div>
  );
}

function ArrangeStep({ step, isEn, t, arranged, usedTokens, onAdd, onRemove }) {
  const unit = unitOfMs(step.sMs) || null;
  return (
    <div>
      <div className="malay-q-title">{t('q_arrange')}</div>
      <div className="malay-q-sub">{unit ? sText(unit, step.sMs, isEn) : step.sMs}</div>
      <div className="malay-answer-box">
        {arranged.map((entry) => (
          <button
            key={entry.i}
            type="button"
            className="malay-token"
            onClick={() => onRemove(entry)}
          >
            {entry.token}
          </button>
        ))}
      </div>
      <div className="malay-bank">
        {step.tokens.map((token, i) => (
          <button
            key={`${token}-${i}`}
            type="button"
            className={`malay-token ${usedTokens.includes(i) ? 'is-used' : ''}`}
            onClick={() => onAdd(token, i)}
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListenStep({ step, def, isEn, t, chosen, onPick }) {
  return (
    <div>
      <div className="malay-q-title">{t('q_listen')}</div>
      <div className="malay-q-sub">{t('q_listen_sub')}</div>
      <button type="button" className="malay-audio-big" aria-label={t('q_listen')} onClick={() => speak(step.sMs)}>
        <span aria-hidden="true">🔊</span>
      </button>
      <div className="malay-options">
        {step.optMs.map((ms, i) => {
          const unit = unitOfMs(ms) || def.unit;
          const state = chosen === null ? '' : (i === step.a ? 'is-right' : (i === chosen ? 'is-wrong' : ''));
          return (
            <div key={i} className="malay-opt-row">
              <button type="button" className={`malay-opt ${state}`} onClick={() => onPick(i)}>
                <span className="malay-o-key">{i + 1}</span>
                <span className="malay-o-txt">{unit ? sText(unit, ms, isEn) : ms}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpeakStep({ step, isEn, t, onDone }) {
  const unit = unitOfMs(step.sMs) || null;
  return (
    <div>
      <div className="malay-q-title">{t('q_speak')}</div>
      <div className="malay-q-sub">{t('q_speak_sub')}</div>
      <div className="malay-speak-box">
        <div className="malay-speak-sentence">{step.sMs}</div>
        <div className="malay-speak-zh">{unit ? sText(unit, step.sMs, isEn) : ''}</div>
        <div className="malay-speak-actions">
          <button type="button" className="malay-btn-secondary" onClick={() => speak(step.sMs)}>
            {t('play_model')}
          </button>
          <button type="button" className="malay-btn-primary" onClick={onDone}>
            {t('done_reading')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({ lesson, state, t, onQuit, onStartLesson }) {
  const result = lesson.result || { xp: 0, wrong: 0, nextId: null };
  return (
    <div className="malay-done-card">
      <div className="malay-done-emo" aria-hidden="true">🎉</div>
      <h1>{t('done_title')}</h1>
      <p className="opacity-70">{lesson.def.title}</p>
      <div className="malay-done-stats">
        <div className="malay-done-stat"><b>+{result.xp}</b><span>XP</span></div>
        <div className="malay-done-stat"><b>{result.wrong}</b><span>{t('wrong_label')}</span></div>
        <div className="malay-done-stat"><b>🔥{state.streak}</b><span>{t('streak_label')}</span></div>
      </div>
      <div className="malay-done-actions">
        {result.nextId ? (
          <button type="button" className="malay-btn-primary" onClick={() => onStartLesson(result.nextId)}>
            {t('next_lesson')}
          </button>
        ) : null}
        <button type="button" className="malay-btn-secondary" onClick={onQuit}>{t('back_path')}</button>
      </div>
    </div>
  );
}
