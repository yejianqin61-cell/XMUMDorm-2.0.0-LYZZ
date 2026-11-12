/**
 * 课程构建与解锁规则。
 *
 * 课程结构与语言无关：上游用同一个 seeded(unit.id) 生成每课的题目，
 * 因此同一单元的题目顺序在中英文下完全一致（文本在渲染时解析）。
 * 这里保留上游的随机算法与抽样规则，标题改由渲染时按语言拼装。
 */
import { UNITS } from '../data/course.js';

/** FNV 变体 + xorshift：同一 seed 必得同一节课 */
export function seeded(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Fisher-Yates 洗牌（不修改原数组） */
export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** 取 n 个（不足则全取） */
export function pick(arr, n, rnd) {
  return shuffle(arr, rnd).slice(0, n);
}

/**
 * 构建一个单元的两节课：热身（-0）与实战（-1）。
 * steps 类型：intro / grammar / mcq(vocab) / mcq(gq) / match / arrange / listen / speak
 */
export function buildLessons(unit, unitIdx) {
  const rnd = seeded(unit.id);
  const V = unit.vocab.filter((v) => v.ms && v.zh);
  const S = unit.sentences;

  const mcqFromVocab = (items) =>
    items.map((v) => {
      const distract = pick(
        V.filter((x) => x.ms !== v.ms).map((x) => x.ms),
        3,
        rnd
      );
      const opts = shuffle([v.ms, ...distract], rnd);
      return { type: 'mcq', kind: 'vocab', ms: v.ms, emoji: v.emoji, opts, a: opts.indexOf(v.ms) };
    });

  const half = Math.ceil(V.length / 2);
  const vocabA = V.slice(0, half);
  const vocabB = V.slice(half);
  const matchItems = pick(V, Math.min(6, V.length), rnd);

  const arrangeOf = (s) => ({
    type: 'arrange',
    sMs: s.ms,
    tokens: shuffle(s.ms.split(/\s+/), rnd),
    answer: s.ms,
  });

  const listenOf = (s, others) => {
    const opts = shuffle([s.ms, ...pick(others.filter((x) => x.ms !== s.ms), 3, rnd).map((x) => x.ms)], rnd);
    return { type: 'listen', sMs: s.ms, optMs: opts, a: opts.indexOf(s.ms) };
  };

  const lessonA = {
    id: unit.id + '-0',
    unitIdx,
    unit,
    steps: [
      { type: 'intro', unit },
      { type: 'grammar', unit },
      ...mcqFromVocab(vocabA),
      { type: 'match', unit, msList: matchItems.map((v) => v.ms) },
      ...pick(S, 2, rnd).map(arrangeOf),
    ],
  };

  const lessonB = {
    id: unit.id + '-1',
    unitIdx,
    unit,
    steps: [
      { type: 'intro', unit, sub: 'practice' },
      ...mcqFromVocab(vocabB),
      ...unit.gq.map((q, i) => ({ type: 'mcq', kind: 'gq', gqIdx: i })),
      ...pick(S, 3, rnd).map((s) => listenOf(s, S)),
      ...pick(S, 2, rnd).map(arrangeOf),
      { type: 'speak', sMs: pick(S, 1, rnd)[0].ms },
    ],
  };

  return [lessonA, lessonB];
}

let lessonCache = null;

/** 全部课程（28 课）。结构确定，可缓存 */
export function allLessons() {
  if (!lessonCache) {
    const out = [];
    UNITS.forEach((u, i) => buildLessons(u, i).forEach((l) => out.push(l)));
    lessonCache = out;
  }
  return lessonCache;
}

export function lessonById(id) {
  return allLessons().find((l) => l.id === id);
}

/** 全线性解锁：上一课完成才解锁；第一课永远可学 */
export function isUnlocked(lessonId, done) {
  const list = allLessons();
  const i = list.findIndex((l) => l.id === lessonId);
  if (i <= 0) return true;
  return !!(done && done[list[i - 1].id]);
}

export function nextLessonAfter(lessonId) {
  const list = allLessons();
  const i = list.findIndex((l) => l.id === lessonId);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}

/** 当前该学的课：第一节未完成的课 */
export function currentLesson(done) {
  const list = allLessons();
  return list.find((l) => !(done && done[l.id])) || list[list.length - 1];
}
