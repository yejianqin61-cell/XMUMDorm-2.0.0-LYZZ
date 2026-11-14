import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContextState.js';
import { getMalayStrings, formatMalay } from '../../i18n/malayStrings.js';
import { UNITS } from './data/course.js';
import {
  cloneStats, defaultState, exportableState, loadProgress, migrate,
  recordAnswer, resetProgress, saveProgress, storageOK, today, yesterday,
} from './engine/progress.js';
import { lessonById, nextLessonAfter } from './engine/questions.js';
import { buildLesson, summary } from './engine/practice.js';
import { achievementDefs } from './engine/achievements.js';
import { gqOf } from './engine/merge.js';
import { speak, stopSpeaking, warmUpVoices } from './audio.js';
import PathView from './ui/PathView.jsx';
import VocabView from './ui/VocabView.jsx';
import PracticeView from './ui/PracticeView.jsx';
import AchievementsView from './ui/AchievementsView.jsx';
import StatsView from './ui/StatsView.jsx';
import SettingsView from './ui/SettingsView.jsx';
import LessonOverlay from './ui/LessonOverlay.jsx';
import './ui/malay.css';

const TABS = [
  { key: 'path', ico: '🏠', labelKey: 'nav_path' },
  { key: 'vocab', ico: '📔', labelKey: 'nav_vocab' },
  { key: 'practice', ico: '🎯', labelKey: 'nav_practice' },
  { key: 'achievements', ico: '🏆', labelKey: 'nav_ach' },
  { key: 'stats', ico: '📊', labelKey: 'nav_stats' },
  { key: 'settings', ico: '⚙️', labelKey: 'nav_settings' },
];

/**
 * 马来语学习模块。
 *
 * 与上游 MelayuDuolingo 的语义保持一致：
 *   - 逐题得分只记在 lesson.xp，结算时才写进 state.xp（零错误再 +5）；
 *   - 心心上限 5，答错扣 1，归零本节失败；
 *   - 语法题（gq）不写答题统计，arrange 答错也不产生易混淆记录；
 *   - 进度只存本机 localStorage，导出时剔除同步配置。
 */
export default function MalayPage() {
  const { isZh } = useLanguage();
  const isEn = !isZh;
  const strings = useMemo(() => getMalayStrings(isZh), [isZh]);

  const t = useCallback((key, vars) => {
    const raw = strings[key];
    if (raw === undefined) return key;
    if (Array.isArray(raw)) return raw.map((item) => formatMalay(item, vars));
    return formatMalay(raw, vars);
  }, [strings]);

  const [state, setState] = useState(() => loadProgress().state);
  const [tab, setTab] = useState('path');
  const [lesson, setLesson] = useState(null);
  const [footer, setFooter] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [storageOk, setStorageOk] = useState(() => storageOK());
  const [lastSaveAt, setLastSaveAt] = useState(0);
  const [failOpen, setFailOpen] = useState(false);
  const [practiceSummary, setPracticeSummary] = useState(() => ({ wrong: [], pairs: [], due: [] }));
  const toastTimer = useRef(null);
  // 始终指向最新进度，避免同一次作答里连续更新时读到旧值
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const showToast = useCallback((message, ms = 2200) => {
    setToastMsg(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), ms);
  }, []);

  /** 唯一的进度写入口：更新 stateRef + localStorage + React state */
  const updateProgress = useCallback((mutator) => {
    const prev = stateRef.current;
    const next = mutator(prev);
    stateRef.current = next;
    saveProgress(next);
    setLastSaveAt(Date.now());
    setState(next);
    setStorageOk(storageOK());
    return next;
  }, []);

  useEffect(() => {
    warmUpVoices();
    return () => stopSpeaking();
  }, []);

  /** 练习概览在事件里算好再存（渲染期不取当前时间） */
  const refreshPracticeSummary = useCallback(() => {
    setPracticeSummary(summary(stateRef.current.stats, Date.now()));
  }, []);

  const handleTab = useCallback((key) => {
    setTab(key);
    if (key === 'practice') refreshPracticeSummary();
  }, [refreshPracticeSummary]);

  /* ---------------- 课程运行时 ---------------- */

  const footerForStep = useCallback((step) => {
    if (!step) return null;
    if (step.type === 'intro' || step.type === 'prIntro') {
      return { kind: 'go', title: t('ready_go'), label: t('start') };
    }
    if (step.type === 'grammar') {
      return { kind: 'cont', title: t('ready_grammar'), label: t('cont') };
    }
    if (step.type === 'arrange') {
      return { kind: 'check', title: '', label: t('check') };
    }
    return null;
  }, [t]);

  const startLesson = useCallback((id) => {
    const def = lessonById(id);
    if (!def) return;
    setLesson({ def, idx: 0, wrong: 0, xp: 0, locked: false, finished: false, result: null });
    setFooter(footerForStep(def.steps[0]));
  }, [footerForStep]);

  const quitLesson = useCallback(() => {
    setLesson(null);
    setFooter(null);
    setFailOpen(false);
    setTab('path');
  }, []);

  const startPractice = useCallback((mode) => {
    const seed = (Date.now() % 100000) + (mode === 'wrong' ? 11 : mode === 'confuse' ? 22 : mode === 'review' ? 33 : 44);
    let def = null;
    try {
      def = buildLesson(mode, stateRef.current.stats, { count: 12, nowMs: Date.now() }, seed);
    } catch {
      def = null;
    }
    const steps = (def && def.steps ? def.steps : []).filter((x) => x && x.type);
    if (!steps.length) {
      showToast(t('practice_empty'), 3000);
      return;
    }
    const lessonDef = {
      id: (def && def.id) || `pr-${mode}-${seed}`,
      unitIdx: 0,
      unit: null,
      title: (def && def.title) || '',
      steps: [{ type: 'prIntro', mode, count: steps.length }, ...steps],
      practice: true,
    };
    setLesson({ def: lessonDef, idx: 0, wrong: 0, xp: 0, locked: false, finished: false, result: null });
    setFooter(footerForStep(lessonDef.steps[0]));
  }, [showToast, t, footerForStep]);

  /** 记录一次作答（错题本 / 易混淆 / 间隔复习），可选同时扣心 */
  const applyAnswer = useCallback((ms, correct, chosenMs, kind, withHeartLoss) => {
    updateProgress((prev) => {
      const stats = cloneStats(prev.stats);
      recordAnswer(stats, ms, correct, chosenMs, kind, Date.now());
      const next = { ...prev, stats };
      if (withHeartLoss) next.hearts = Math.max(0, prev.hearts - 1);
      return next;
    });
    refreshPracticeSummary();
  }, [updateProgress, refreshPracticeSummary]);

  const onMcqAnswer = useCallback((step, index, def) => {
    const options = step.opts || [];
    let answer = step.a;
    if (step.kind === 'gq') {
      const gq = def && def.unit ? gqOf(def.unit, isEn)[step.gqIdx] : null;
      answer = gq ? gq.a : -1;
    }
    const right = index === answer;
    setLesson((prev) => (prev ? { ...prev, wrong: prev.wrong + (right ? 0 : 1), locked: right } : prev));
    if (right) {
      if (step.kind === 'vocab') applyAnswer(step.ms, true, null, 'vocab', false);
      setFooter({ kind: 'right', title: t('right'), label: t('cont') });
    } else {
      if (step.kind === 'vocab') applyAnswer(step.ms, false, options[index], 'vocab', true);
      else updateProgress((prev) => ({ ...prev, hearts: Math.max(0, prev.hearts - 1) }));
      setFooter({ kind: 'wrong', title: t('wrong_again', { a: options[answer] }), label: t('cont') });
    }
    if (step.kind === 'vocab' && step.ms) speak(step.ms);
  }, [applyAnswer, updateProgress, isEn, t]);

  const onListenAnswer = useCallback((step, index) => {
    const right = index === step.a;
    setLesson((prev) => (prev ? { ...prev, wrong: prev.wrong + (right ? 0 : 1), locked: right } : prev));
    if (right) {
      applyAnswer(step.sMs, true, null, 'listen', false);
      setFooter({ kind: 'right', title: t('listen_right'), label: t('cont'), note: t('orig_text', { a: step.sMs }) });
    } else {
      applyAnswer(step.sMs, false, (step.optMs || [])[index], 'listen', true);
      setFooter({ kind: 'wrong', title: t('wrong_heard', { a: step.sMs }), label: t('cont') });
    }
  }, [applyAnswer, t]);

  const onMatchResult = useCallback((step, ms, chosenMs, correct) => {
    if (correct) {
      applyAnswer(ms, true, null, 'match', false);
      setFooter({ kind: 'right', title: t('match_all'), label: t('cont') });
      return;
    }
    setLesson((prev) => (prev ? { ...prev, wrong: prev.wrong + 1 } : prev));
    applyAnswer(ms, false, chosenMs, 'match', true);
    showToast(t('match_fail'));
  }, [applyAnswer, showToast, t]);

  const onArrangeCheck = useCallback((step, built) => {
    const ok = built === step.answer;
    speak(step.answer);
    setLesson((prev) => (prev ? { ...prev, wrong: prev.wrong + (ok ? 0 : 1), locked: ok } : prev));
    if (ok) {
      applyAnswer(step.sMs, true, null, 'arrange', false);
      setFooter({ kind: 'right', title: t('right'), label: t('cont'), note: t('full_sentence', { a: step.answer }) });
    } else {
      applyAnswer(step.sMs, false, null, 'arrange', true);
      setFooter({ kind: 'wrong', title: t('wrong_order', { a: step.answer }), label: t('cont') });
    }
  }, [applyAnswer, t]);

  const onSpeakDone = useCallback(() => {
    setLesson((prev) => (prev ? { ...prev, locked: true } : prev));
    setFooter({ kind: 'right', title: t('read_done'), label: t('cont'), note: t('keep_going') });
  }, [t]);

  /** 结算：写经验值、连胜、完成标记、成就 */
  const settle = useCallback((def, wrongCount) => {
    const xp = 10 + (wrongCount === 0 ? 5 : 0);
    const newly = [];
    updateProgress((prev) => {
      const next = { ...prev };
      next.xp = prev.xp + xp;
      next.todayXp = prev.todayXp + xp;
      if (!def.practice) {
        next.done = { ...prev.done, [def.id]: { xp, at: Date.now() } };
        next.lessonsDone = Object.keys(next.done).length;
      }
      const day = today();
      if (next.lastDay !== day) {
        next.streak = next.lastDay === yesterday() ? prev.streak + 1 : 1;
        next.lastDay = day;
      }
      next.hearts = 5;
      const ach = { ...prev.ach };
      achievementDefs(next).forEach((d) => {
        if (d.ok && !ach[d.id]) {
          ach[d.id] = true;
          newly.push(d);
        }
      });
      next.ach = ach;
      return next;
    });

    const nextId = def.practice ? null : nextLessonAfter(def.id);
    setLesson((prev) => (prev ? { ...prev, finished: true, result: { xp, wrong: wrongCount, nextId } } : prev));
    setFooter(null);
    if (newly.length) {
      const value = t(`ach_${newly[0].id}`, { n: UNITS.length });
      showToast(t('ach_unlocked', { n: Array.isArray(value) ? value[0] : value }), 3200);
    }
  }, [updateProgress, showToast, t]);

  const onNext = useCallback(() => {
    if (!lesson) return;
    if (stateRef.current.hearts <= 0) {
      setFailOpen(true);
      updateProgress((prev) => ({ ...prev, hearts: 5 }));
      return;
    }
    const steps = lesson.def.steps;
    const nextIdx = lesson.idx + 1;
    if (nextIdx >= steps.length) {
      settle(lesson.def, lesson.wrong);
      return;
    }
    const step = steps[nextIdx];
    setLesson({ ...lesson, idx: nextIdx, locked: false });
    setFooter(footerForStep(step));
  }, [lesson, footerForStep, settle, updateProgress]);

  /** 检查拼句：built 由浮层按当前拼好的词序给出 */
  const onCheck = useCallback((built) => {
    if (!lesson) return;
    const step = lesson.def.steps[lesson.idx];
    if (!step || step.type !== 'arrange') return;
    onArrangeCheck(step, built);
  }, [lesson, onArrangeCheck]);

  /* ---------------- 数据管理 ---------------- */

  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(exportableState(stateRef.current), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `melayu-progress-${today()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast(t('backup_exported'), 2500);
    } catch {
      showToast(t('backup_failed'), 3000);
    }
  }, [showToast, t]);

  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        updateProgress(() => migrate(parsed));
        showToast(t('backup_imported'), 2500);
      } catch {
        showToast(t('backup_bad'), 3000);
      }
    };
    reader.onerror = () => showToast(t('backup_bad'), 3000);
    reader.readAsText(file);
  }, [updateProgress, showToast, t]);

  const handleReset = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.confirm(t('reset_confirm'))) return;
    resetProgress();
    const fresh = defaultState();
    saveProgress(fresh);
    stateRef.current = fresh;
    setState(fresh);
    setTab('path');
    showToast(t('save_recovered'), 2500);
  }, [showToast, t]);

  const handleMarkKnown = useCallback((ms) => {
    updateProgress((prev) => {
      if (prev.vocabKnown && prev.vocabKnown[ms]) return prev;
      return { ...prev, vocabKnown: { ...prev.vocabKnown, [ms]: true } };
    });
  }, [updateProgress]);

  const handleGoal = useCallback((value) => {
    const goal = Number(value) || 20;
    updateProgress((prev) => ({ ...prev, goal }));
  }, [updateProgress]);

  /* ---------------- 渲染 ---------------- */

  const goalPct = Math.min(100, Math.round((state.todayXp / (state.goal || 20)) * 100));

  const renderView = () => {
    if (tab === 'vocab') {
      return <VocabView state={state} isEn={isEn} t={t} onMarkKnown={handleMarkKnown} />;
    }
    if (tab === 'practice') {
      return <PracticeView summary={practiceSummary} isEn={isEn} t={t} onStartPractice={startPractice} />;
    }
    if (tab === 'achievements') {
      return <AchievementsView state={state} t={t} />;
    }
    if (tab === 'stats') {
      return <StatsView state={state} isEn={isEn} t={t} onReset={handleReset} />;
    }
    if (tab === 'settings') {
      return (
        <SettingsView
          state={state}
          t={t}
          storageOk={storageOk}
          lastSaveAt={lastSaveAt}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
        />
      );
    }
    return (
      <PathView
        state={state}
        isEn={isEn}
        t={t}
        onStartLesson={startLesson}
        onLocked={() => showToast(t('locked_toast'))}
      />
    );
  };

  return (
    <div className="malay-page">
      <div className="malay-topbar">
        <div className="malay-brand">
          <span className="malay-brand-mark" aria-hidden="true">MD</span>
          <span className="malay-brand-text">Melayu<span>Duolingo</span></span>
        </div>
        <div className="malay-stats">
          <span className="malay-stat" title={t('stat_streak')}><span aria-hidden="true">🔥</span>{state.streak}</span>
          <span className="malay-stat" title={t('stat_xp')}><span aria-hidden="true">⚡</span>{state.xp}</span>
          <span className="malay-stat" title={t('stat_hearts')}><span aria-hidden="true">❤️</span>{state.hearts}</span>
          <span className="malay-stat" title={t('stat_gems')}><span aria-hidden="true">💎</span>{state.gems}</span>
        </div>
      </div>

      <div className="malay-shell">
        <aside className="malay-sidebar">
          <nav className="malay-side-nav">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`malay-side-item ${tab === item.key ? 'is-active' : ''}`}
                onClick={() => handleTab(item.key)}
              >
                <span aria-hidden="true">{item.ico}</span>
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <section className="malay-daily-goal">
            <h3>{t('daily_goal')}</h3>
            <div className="malay-goal-ring" style={{ '--malay-goal': `${goalPct}%` }}>
              <div className="malay-goal-inner">
                <div className="malay-goal-num">{state.todayXp}</div>
                <div className="malay-goal-lbl">/ {state.goal} XP</div>
              </div>
            </div>
            <p className="malay-goal-note">{state.todayXp >= state.goal ? t('goal_done') : t('goal_note')}</p>
            <label className="malay-goal-set">
              {t('goal_set')}
              <select value={String(state.goal)} onChange={(event) => handleGoal(event.target.value)}>
                {[10, 20, 50, 100].map((v) => (
                  <option key={v} value={v}>{v} XP</option>
                ))}
              </select>
            </label>
          </section>
        </aside>

        <main className="malay-main">{renderView()}</main>
      </div>

      {lesson ? (
        <LessonOverlay
          key={`${lesson.def.id}-${lesson.idx}`}
          lesson={lesson}
          state={state}
          isEn={isEn}
          t={t}
          footer={footer}
          onQuit={quitLesson}
          onNext={onNext}
          onCheck={onCheck}
          onStartLesson={startLesson}
          onMcqAnswer={onMcqAnswer}
          onMatchResult={onMatchResult}
          onListenAnswer={onListenAnswer}
          onSpeakDone={onSpeakDone}
        />
      ) : null}

      {failOpen ? (
        <div className="malay-modal" role="dialog" aria-modal="true">
          <div className="malay-modal-card">
            <h2>{t('fail_title')}</h2>
            <p>{t('fail_text')}</p>
            <div className="malay-modal-actions">
              <button
                type="button"
                className="malay-btn-primary"
                onClick={() => {
                  setFailOpen(false);
                  if (lesson) {
                    setLesson({ ...lesson, idx: 0, wrong: 0, locked: false });
                    setFooter(footerForStep(lesson.def.steps[0]));
                  }
                }}
              >
                {t('retry')}
              </button>
              <button type="button" className="malay-btn-secondary" onClick={quitLesson}>{t('back_path')}</button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMsg ? <div className="malay-toast" role="status">{toastMsg}</div> : null}
    </div>
  );
}
