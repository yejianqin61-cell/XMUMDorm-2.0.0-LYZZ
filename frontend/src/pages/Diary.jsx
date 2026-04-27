import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, Feather, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getDiaryDay, getDiaryMonth, getDiaryOverview, saveDiaryDay } from '../api/diary';
import './Diary.css';

function fmtYMD(dateStr) {
  const d = new Date(String(dateStr));
  if (Number.isNaN(d.getTime())) return String(dateStr || '');
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function fmtMD(dateStr) {
  const d = new Date(String(dateStr));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function ymdParts(dateStr) {
  const d = new Date(String(dateStr));
  if (Number.isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function ymdString(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function Diary() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState(null);
  const [realToday, setRealToday] = useState(null); // { date, label } 固定“真实今天”
  const [currentDate, setCurrentDate] = useState(null); // YYYY-MM-DD
  const [currentLabel, setCurrentLabel] = useState('');
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryContent, setDiaryContent] = useState('');
  const [hasDiaryToday, setHasDiaryToday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState('🍃');
  const [bubbles, setBubbles] = useState([]); // [{ year, date, content, hasDiary }]
  const [bubbleOpen, setBubbleOpen] = useState(null); // bubble item
  const vibeRef = useRef(0);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [monthHeat, setMonthHeat] = useState(new Map()); // date -> len
  const calBtnRef = useRef(null);
  const [calOrigin, setCalOrigin] = useState({ x: 0, y: 0, r: 24 });
  const dayCacheRef = useRef(new Map()); // date -> { content, hasDiary, ts }

  const todayLabel = useMemo(() => overview?.today?.label ?? '', [overview]);
  const todayDate = realToday?.date ?? overview?.today?.date ?? null;
  const isViewingToday = !!todayDate && !!currentDate && String(todayDate) === String(currentDate);

  const loadOverview = async (date) => {
    setLoadingOverview(true);
    try {
      const data = await getDiaryOverview(date);
      setOverview(data);
      // 只在首次写入“真实今天”，避免切换日期时把 today 覆盖成“所选日期”
      setRealToday((prev) => (prev && prev.date ? prev : { date: data?.today?.date ?? null, label: data?.today?.label ?? '' }));
      if (!currentDate) {
        setCurrentDate(data.today.date);
        setCurrentLabel(data.today.label);
      }
    } catch (e) {
      Toast.error(e?.message || (isZh ? '获取日记概览失败' : 'Failed to load diary overview'));
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadDay = async (date) => {
    setDiaryLoading(true);
    try {
      const data = await getDiaryDay(date);
      setDiaryContent(data.content || '');
      setHasDiaryToday(!!(data.content && String(data.content).trim()));
    } catch (e) {
      Toast.error(e?.message || (isZh ? '获取日记失败' : 'Failed to load diary'));
    } finally {
      setDiaryLoading(false);
    }
  };

  const DAY_CACHE_TTL_MS = 10 * 60 * 1000; // 10min
  const readDayCache = (date) => {
    if (!date) return null;
    const key = String(date).slice(0, 10);
    const now = Date.now();
    const mem = dayCacheRef.current.get(key);
    if (mem && now - mem.ts < DAY_CACHE_TTL_MS) return mem;
    try {
      const raw = sessionStorage.getItem(`diary_day_cache_v1:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.ts !== 'number' || now - parsed.ts >= DAY_CACHE_TTL_MS) return null;
      if (typeof parsed.content !== 'string') return null;
      const hit = { content: parsed.content, hasDiary: !!parsed.hasDiary, ts: parsed.ts };
      dayCacheRef.current.set(key, hit);
      return hit;
    } catch {
      return null;
    }
  };

  const writeDayCache = (date, content) => {
    if (!date) return;
    const key = String(date).slice(0, 10);
    const c = String(content ?? '');
    const hit = { content: c, hasDiary: !!c.trim(), ts: Date.now() };
    dayCacheRef.current.set(key, hit);
    try {
      sessionStorage.setItem(`diary_day_cache_v1:${key}`, JSON.stringify(hit));
    } catch {
      // ignore quota
    }
  };

  const fetchDiaryDayCached = async (date) => {
    const key = String(date || '').slice(0, 10);
    const cached = readDayCache(key);
    if (cached) return cached;
    const day = await getDiaryDay(key);
    const content = day?.content || '';
    writeDayCache(key, content);
    return readDayCache(key) || { content: String(content || ''), hasDiary: !!String(content || '').trim(), ts: Date.now() };
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentDate) return;
    loadDay(currentDate);
    loadOverview(currentDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handleSave = async () => {
    if (!currentDate) return;
    setSaving(true);
    try {
      await saveDiaryDay({ date: currentDate, content: diaryContent });
      Toast.success(isZh ? '已保存' : 'Saved');
      // 写入缓存，避免保存后又立刻重拉导致闪一下
      writeDayCache(currentDate, diaryContent);
      await loadOverview(currentDate);
      await loadDay(currentDate);
    } catch (e) {
      Toast.error(e?.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const sameDayPastYears = overview?.sameDayPastYears || [];
  const recentDays = overview?.recentDays || [];

  const moodOptions = useMemo(
    () => ['🍃', '☀️', '✨', '🌧️', '🌙', '🫶', '😵‍💫', '😌'],
    []
  );

  // 5 个记忆泡泡：过去 5 年同一天（按当前选中的月日计算）
  useEffect(() => {
    const p = currentDate ? ymdParts(currentDate) : null;
    if (!p) {
      setBubbles([]);
      return;
    }
    const targetYears = [p.y - 1, p.y - 2, p.y - 3, p.y - 4, p.y - 5];
    let cancelled = false;
    const run = async () => {
      const out = await Promise.all(
        targetYears.map(async (yy) => {
          const ds = ymdString(yy, p.m, p.d);
          try {
            const cached = await fetchDiaryDayCached(ds);
            return { year: yy, date: ds, content: String(cached.content || ''), hasDiary: !!cached.hasDiary };
          } catch {
            return { year: yy, date: ds, content: '', hasDiary: false };
          }
        })
      );
      if (!cancelled) setBubbles(out);
    };
    run().catch(() => setBubbles([]));
    return () => {
      cancelled = true;
    };
  }, [currentDate]);

  // Calendar heatmap for current visible month
  useEffect(() => {
    if (!calendarOpen) return;
    let cancelled = false;
    const run = async () => {
      try {
        const list = await getDiaryMonth(calYear, calMonth);
        const m = new Map();
        for (const it of Array.isArray(list) ? list : []) {
          if (it && it.date) m.set(String(it.date).slice(0, 10), Number(it.len) || 0);
        }
        if (!cancelled) setMonthHeat(m);
      } catch {
        if (!cancelled) setMonthHeat(new Map());
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [calendarOpen, calYear, calMonth]);

  const openCalendar = () => {
    const p = currentDate ? ymdParts(currentDate) : ymdParts(new Date().toISOString());
    if (p) {
      setCalYear(p.y);
      setCalMonth(p.m);
    }
    try {
      const el = calBtnRef.current;
      const r = el?.getBoundingClientRect?.();
      if (r) {
        const radius = Math.max(r.width, r.height) / 2;
        setCalOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: radius });
      }
    } catch {
      // ignore
    }
    setCalendarOpen(true);
  };

  const heatLevel = (len) => {
    const n = Number(len) || 0;
    if (n <= 0) return 0;
    if (n < 30) return 1;
    if (n < 120) return 2;
    if (n < 260) return 3;
    return 4;
  };

  const maybeVibe = () => {
    try {
      if (!navigator.vibrate) return;
      const now = Date.now();
      if (now - vibeRef.current < 280) return;
      vibeRef.current = now;
      navigator.vibrate(5);
    } catch {
      // ignore
    }
  };

  return (
    <div className="diary-page">
      <div className="diary-bokeh" aria-hidden />

      <header className="diary-header">
        <div className="diary-date-hero">
          <div className="diary-date-hero-title">
            {currentLabel || todayLabel || (isZh ? '今日' : 'Today')}
          </div>
          <div className="diary-date-hero-sub">
            {isZh ? '多年日记' : 'Years Diary'}
          </div>
        </div>
        <div className="diary-header-actions">
          {!isViewingToday && todayDate ? (
            <button
              type="button"
              className="diary-today-btn"
              onClick={() => {
                setCurrentDate(todayDate);
                setCurrentLabel(realToday?.label || fmtYMD(todayDate));
                maybeVibe();
              }}
              aria-label="Today"
              title="Today"
            >
              Today
            </button>
          ) : null}
          <motion.button
            ref={calBtnRef}
            type="button"
            className="diary-cal-btn"
            onClick={openCalendar}
            whileTap={{ scale: 0.96 }}
            aria-label={isZh ? '打开日历' : 'Open calendar'}
            title={isZh ? '日历' : 'Calendar'}
          >
            <Calendar size={20} aria-hidden />
          </motion.button>
        </div>
      </header>

      <main className="diary-main">
        <section className="diary-editor" aria-label={isZh ? '写作区' : 'Writing'}>
          <div className="diary-bubbles" aria-label={isZh ? '往年今日泡泡' : 'Memory bubbles'}>
            {bubbles.map((b, i) => (
              <motion.button
                key={b.date}
                type="button"
                className={`diary-bubble diary-bubble--${i + 1} ${b.hasDiary ? 'has' : 'empty'}`}
                onClick={() => {
                  setBubbleOpen(b);
                  maybeVibe();
                }}
                whileTap={{ scale: 0.96 }}
                initial={false}
              >
                <div className="diary-bubble-year">{b.year}</div>
                <div className="diary-bubble-hint">
                  {b.hasDiary
                    ? (isZh ? '记忆' : 'Memory')
                    : (isZh ? <>没有留下<br />云彩</> : 'Leaving no cloud behind...')}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="diary-editor-top">
            <button
              type="button"
              className="diary-save"
              onClick={handleSave}
              disabled={saving || !currentDate}
              aria-label={isZh ? '保存' : 'Save'}
              title={isZh ? '保存' : 'Save'}
            >
              {saving ? <Feather size={18} aria-hidden className="is-spinning" /> : <Check size={18} aria-hidden />}
            </button>
          </div>

          <div className="diary-canvas">
            <textarea
              className="diary-textarea"
              value={diaryContent}
              onChange={(e) => setDiaryContent(e.target.value)}
              onInput={maybeVibe}
              placeholder={isZh ? '写下今天的想法、心情与故事…' : 'Write your thoughts and stories for today…'}
              disabled={diaryLoading || !currentDate}
            />

            <div className="diary-canvas-footer">
              <div className="diary-counter">{(diaryContent || '').length}</div>
              <div className="diary-mood" role="group" aria-label={isZh ? '心情' : 'Mood'}>
                {moodOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`diary-mood-btn ${mood === m ? 'active' : ''}`}
                    onClick={() => setMood(m)}
                    aria-pressed={mood === m}
                    title={m}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!diaryLoading && currentDate && !hasDiaryToday && (diaryContent || '').trim().length === 0 ? (
            <div className="diary-soft-hint">
              {isZh ? '这里很安全，慢慢写。' : 'A safe place to write—take your time.'} {mood}
            </div>
          ) : null}
        </section>
      </main>

      <AnimatePresence>
        {bubbleOpen && (
          <motion.div className="diary-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="diary-overlay-card"
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label="Memory"
            >
              <div className="diary-overlay-head">
                <div className="diary-overlay-title">{fmtYMD(bubbleOpen.date)}</div>
                <button type="button" className="diary-overlay-close" onClick={() => setBubbleOpen(null)} aria-label="Close">
                  <X size={18} aria-hidden />
                </button>
              </div>
              <div className="diary-overlay-body">
                {(bubbleOpen.content || '').trim()
                  ? bubbleOpen.content
                  : (isZh ? '那一年今天，没有留下文字。' : 'No entry was written on this day.')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {calendarOpen && (
          <motion.div className="diary-cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="diary-cal-burst"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 18 }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                left: calOrigin.x,
                top: calOrigin.y,
                width: calOrigin.r * 2,
                height: calOrigin.r * 2,
                marginLeft: -calOrigin.r,
                marginTop: -calOrigin.r,
              }}
              aria-hidden
            />
            <motion.div
              className="diary-cal-sheet"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              role="dialog"
              aria-modal="true"
              aria-label="Calendar"
            >
              <div className="diary-cal-top">
                <button
                  type="button"
                  className="diary-cal-nav"
                  onClick={() => {
                    const m = calMonth - 1;
                    if (m < 1) {
                      setCalYear((y) => y - 1);
                      setCalMonth(12);
                    } else setCalMonth(m);
                  }}
                  aria-label="Prev month"
                >
                  ‹
                </button>
                <div className="diary-cal-title">
                  {calYear}.{calMonth}
                </div>
                <button
                  type="button"
                  className="diary-cal-nav"
                  onClick={() => {
                    const m = calMonth + 1;
                    if (m > 12) {
                      setCalYear((y) => y + 1);
                      setCalMonth(1);
                    } else setCalMonth(m);
                  }}
                  aria-label="Next month"
                >
                  ›
                </button>
                <button type="button" className="diary-cal-close" onClick={() => setCalendarOpen(false)} aria-label="Close">
                  <X size={18} aria-hidden />
                </button>
              </div>

              <div className="diary-cal-grid" role="grid" aria-label="Calendar grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                  <div key={w} className="diary-cal-weekday">{w}</div>
                ))}
                {(() => {
                  const first = new Date(calYear, calMonth - 1, 1);
                  const startDow = first.getDay(); // 0 Sun
                  const dim = daysInMonth(calYear, calMonth);
                  const cells = [];
                  for (let i = 0; i < startDow; i += 1) cells.push({ kind: 'pad', key: `p-${i}` });
                  for (let day = 1; day <= dim; day += 1) {
                    const ds = ymdString(calYear, calMonth, day);
                    const len = monthHeat.get(ds) || 0;
                    const lv = heatLevel(len);
                    cells.push({ kind: 'day', day, ds, len, lv, key: ds });
                  }
                  return cells.map((c) => {
                    if (c.kind === 'pad') return <div key={c.key} className="diary-cal-cell diary-cal-cell--pad" />;
                    const active = currentDate === c.ds;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        className={`diary-cal-cell diary-cal-cell--lv${c.lv} ${active ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentDate(c.ds);
                          setCurrentLabel(fmtYMD(c.ds));
                          setCalendarOpen(false);
                          maybeVibe();
                        }}
                        aria-label={c.ds}
                      >
                        <span className="diary-cal-daynum">{c.day}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Diary;

