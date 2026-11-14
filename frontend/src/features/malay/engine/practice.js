/**
 * 个性化练习引擎（移植自上游 practice.js，语义逐条保持一致）。
 *
 * 四种模式：
 *   wrong   错题本 —— 错得多、最近答错的在前
 *   confuse 易混淆 —— 用户误选过的词对，a 为正确项、b 为误选项
 *   review  智能复习 —— Leitner 盒子到期（dueAt <= now）的词条
 *   mix     混合 —— wrong : confuse : review = 4 : 2 : 1 轮转
 *
 * 确定性：xorshift32，同 seed 必得同一节课。
 */
import { UNITS } from '../data/course.js';
import { recordAnswer } from './progress.js';

let wordIndex = null;
let sentenceSet = null;

/** 词条索引：逐单元，先 vocab 后 sentences，先出现者优先 */
export function index() {
  if (wordIndex) return wordIndex;
  const idx = {};
  const sent = {};
  UNITS.forEach((u) => {
    (u.vocab || []).forEach((v) => {
      if (v && v.ms && !idx[v.ms]) {
        idx[v.ms] = { ms: v.ms, zh: v.zh || '', emoji: v.emoji || '', unit: u };
      }
    });
    (u.sentences || []).forEach((s) => {
      if (s && s.ms && !idx[s.ms]) {
        idx[s.ms] = { ms: s.ms, zh: s.zh || '', emoji: '', unit: u };
        sent[s.ms] = true;
      }
    });
  });
  wordIndex = idx;
  sentenceSet = sent;
  return idx;
}

/** ms 所属单元对象；找不到返回 null */
export function unitOfMs(ms) {
  const it = index()[ms];
  return it ? it.unit : null;
}

/** 该 ms 是否为例句 */
export function isSentence(ms) {
  index();
  return !!sentenceSet[ms];
}

/** 记录一次作答（与上游 practice.record 同语义） */
export function record(stats, ms, correct, chosenMs, nowMs) {
  recordAnswer(stats, ms, correct, chosenMs, null, nowMs);
}

/** 错题本：错得多、最近答错的在前 */
export function wrongItems(stats) {
  const idx = index();
  const items = stats && stats.items ? stats.items : {};
  return Object.keys(items)
    .filter((k) => (items[k].wrong || 0) > 0 && idx[k])
    .map((k) => ({
      ms: k,
      wrong: items[k].wrong || 0,
      seen: items[k].seen || 0,
      lastAt: items[k].lastAt || 0,
      zh: idx[k].zh,
      emoji: idx[k].emoji,
      unitId: idx[k].unit.id,
    }))
    .sort((a, b) => b.wrong - a.wrong || (b.lastAt || 0) - (a.lastAt || 0));
}

/** 易混淆对：a 为正确项，b 为用户误选项；按 n 降序 */
export function confusablePairs(stats) {
  const idx = index();
  const c = stats && stats.confuse ? stats.confuse : {};
  return Object.keys(c)
    .map((k) => {
      const p = k.indexOf('|');
      if (p < 0) return null;
      return { a: k.slice(0, p), b: k.slice(p + 1), n: c[k].n || 0, lastAt: c[k].lastAt || 0 };
    })
    .filter((x) => x && x.a && x.b && idx[x.a] && idx[x.b])
    .sort((a, b) => b.n - a.n || (b.lastAt || 0) - (a.lastAt || 0));
}

/** 到期复习：dueAt <= now；最久没复习的在前 */
export function dueItems(stats, nowMs) {
  const idx = index();
  const now = typeof nowMs === 'number' && isFinite(nowMs) ? nowMs : Date.now();
  const items = stats && stats.items ? stats.items : {};
  return Object.keys(items)
    .filter((k) => idx[k] && (items[k].seen || 0) > 0 && (items[k].dueAt || 0) <= now)
    .map((k) => ({
      ms: k,
      box: items[k].box || 0,
      right: items[k].right || 0,
      wrong: items[k].wrong || 0,
      dueAt: items[k].dueAt || 0,
      zh: idx[k].zh,
    }))
    .sort((a, b) => a.dueAt - b.dueAt || b.wrong - a.wrong);
}

/**
 * 练习页概览：错题本 / 易混淆 / 到期复习的条目。
 * 需要传入 nowMs（渲染期不要直接取当前时间），由调用方在事件里给出。
 */
export function summary(stats, nowMs) {
  const items = stats && stats.items ? stats.items : {};
  const confuse = stats && stats.confuse ? stats.confuse : {};
  const now = typeof nowMs === 'number' && isFinite(nowMs) ? nowMs : 0;

  const wrong = Object.keys(items)
    .filter((k) => (items[k].wrong || 0) > 0)
    .map((k) => ({ ms: k, wrong: items[k].wrong || 0, seen: items[k].seen || 0, lastAt: items[k].lastAt || 0 }))
    .sort((a, b) => (b.wrong - a.wrong) || ((b.lastAt || 0) - (a.lastAt || 0)));

  const pairs = Object.keys(confuse)
    .map((k) => {
      const p = k.indexOf('|');
      if (p < 0) return null;
      return { a: k.slice(0, p), b: k.slice(p + 1), n: confuse[k].n || 0, lastAt: confuse[k].lastAt || 0 };
    })
    .filter((x) => x && x.a && x.b)
    .sort((a, b) => (b.n - a.n) || ((b.lastAt || 0) - (a.lastAt || 0)));

  const due = Object.keys(items)
    .filter((k) => (items[k].seen || 0) > 0 && (items[k].dueAt || 0) <= now)
    .map((k) => ({ ms: k, box: items[k].box || 0, dueAt: items[k].dueAt || 0 }));

  return { wrong, pairs, due };
}

/** xorshift32：同一 seed 必得同一节课 */
export function rnd(seed) {
  let h = (Math.floor(seed) || 1) >>> 0;
  if (h === 0) h = 2463534242;
  return function next() {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
}

/** 洗牌（不修改原数组） */
export function shuffled(arr, random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function allVocab() {
  const idx = index();
  return Object.keys(idx).filter((k) => !sentenceSet[k]);
}

function allSentences() {
  const idx = index();
  return Object.keys(idx).filter((k) => sentenceSet[k]);
}

/**
 * mcq：干扰项优先同单元（形近 / 同首字母），不足时全书补齐；
 * partner（易混淆搭档）优先入选。opts 为马来语，a 为正确项下标。
 */
function mcqStep(ms, partnerMs, random) {
  const idx = index();
  const it = idx[ms];
  if (!it) return null;
  const cand = (it.unit.vocab || []).filter((v) => v && v.ms && v.ms !== ms).map((v) => v.ms);
  const scored = cand
    .map((x) => ({
      ms: x,
      s:
        (x.charAt(0).toLowerCase() === ms.charAt(0).toLowerCase() ? 0 : 2) +
        Math.min(3, Math.abs(x.length - ms.length) / 3) +
        random() * 1.5,
    }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.ms);

  const opts = [ms];
  if (partnerMs && partnerMs !== ms && cand.indexOf(partnerMs) >= 0) opts.push(partnerMs);
  for (let i = 0; i < scored.length && opts.length < 4; i++) {
    if (opts.indexOf(scored[i]) < 0) opts.push(scored[i]);
  }
  if (opts.length < 4) {
    const all = shuffled(allVocab(), random);
    for (let i = 0; i < all.length && opts.length < 4; i++) {
      if (opts.indexOf(all[i]) < 0) opts.push(all[i]);
    }
  }
  const final = shuffled(opts, random);
  return { type: 'mcq', kind: 'vocab', ms, emoji: it.emoji || '', opts: final, a: final.indexOf(ms) };
}

/** listen：optMs 为其它马来语句子（可跨单元），a 为 sMs 的下标 */
function listenStep(ms, random) {
  const others = allSentences().filter((x) => x !== ms);
  if (others.length < 3) return null;
  const picked = shuffled(others, random).slice(0, 3);
  const optMs = shuffled([ms].concat(picked), random);
  return { type: 'listen', sMs: ms, optMs, a: optMs.indexOf(ms) };
}

/** arrange：tokens 拼回后必须等于 answer；不足 3 词的句子跳过 */
function arrangeStep(ms, random) {
  const words = String(ms).split(/\s+/).filter((w) => w.length);
  if (words.length < 3) return null;
  return { type: 'arrange', sMs: ms, tokens: shuffled(words, random), answer: ms };
}

/**
 * 生成一节练习课。
 * 返回 { id, title, mode, steps }，steps 永不为空（不足时用全书词条补齐）。
 */
export function buildLesson(mode, stats, opts, seed) {
  const o = opts || {};
  const count = Math.max(1, Math.min(30, o.count || 12));
  const now = typeof o.nowMs === 'number' && isFinite(o.nowMs) ? o.nowMs : Date.now();
  const random = rnd(seed);
  const m = mode === 'wrong' || mode === 'confuse' || mode === 'review' || mode === 'mix' ? mode : 'mix';
  index();

  const wrong = wrongItems(stats);
  const pairs = confusablePairs(stats);
  const due = dueItems(stats, now);

  // 易混淆搭档：a -> b，出题时优先作为干扰项
  const partner = {};
  pairs.forEach((p) => {
    if (!partner[p.a]) partner[p.a] = p.b;
  });

  // 目标词条（每个词条只出一次）
  const targets = [];
  const seen = {};
  const add = (ms) => {
    if (!ms || seen[ms] || !wordIndex[ms]) return false;
    seen[ms] = true;
    targets.push(ms);
    return true;
  };

  if (m === 'wrong') {
    wrong.forEach((x) => add(x.ms));
  } else if (m === 'confuse') {
    pairs.forEach((p) => add(p.a));
  } else if (m === 'review') {
    due.forEach((x) => add(x.ms));
  } else {
    // mix：wrong > confuse > review 的优先级混合（4 : 2 : 1 轮转）
    const lists = {
      wrong: wrong.map((x) => x.ms),
      confuse: pairs.map((p) => p.a),
      review: due.map((x) => x.ms),
    };
    const weight = { wrong: 4, confuse: 2, review: 1 };
    const ptr = { wrong: 0, confuse: 0, review: 0 };
    const order = ['wrong', 'confuse', 'review'];
    let guard = 0;
    while (targets.length < count && guard++ < 400) {
      let progressed = false;
      for (let i = 0; i < order.length; i++) {
        const k = order[i];
        const list = lists[k];
        let taken = 0;
        while (ptr[k] < list.length && taken < weight[k]) {
          if (add(list[ptr[k]])) {
            taken++;
            progressed = true;
          }
          ptr[k]++;
        }
      }
      if (!progressed) break;
    }
  }

  const steps = [];
  const usedInMatch = {};
  const vocabTargets = targets.filter((ms) => !isSentence(ms));
  const sentTargets = targets.filter((ms) => isSentence(ms));

  // match：同单元 4 个词合成一题（仅 mix / review，避免与单题重复）
  if (m === 'mix' || m === 'review') {
    const byUnit = {};
    vocabTargets.forEach((ms) => {
      const uid = wordIndex[ms].unit.id;
      if (!byUnit[uid]) byUnit[uid] = [];
      byUnit[uid].push(ms);
    });
    let best = null;
    Object.keys(byUnit).forEach((k) => {
      if (!best || byUnit[k].length > byUnit[best].length) best = k;
    });
    if (best && byUnit[best].length >= 4) {
      const list = byUnit[best].slice(0, 4);
      list.forEach((ms) => {
        usedInMatch[ms] = true;
      });
      steps.push({ type: 'match', unit: wordIndex[list[0]].unit, msList: list });
    }
  }

  // 词汇 -> mcq
  vocabTargets.forEach((ms) => {
    if (steps.length >= count || usedInMatch[ms]) return;
    const st = mcqStep(ms, partner[ms], random);
    if (st) steps.push(st);
  });

  // 例句 -> listen / arrange
  sentTargets.forEach((ms) => {
    if (steps.length >= count) return;
    const words = String(ms).split(/\s+/).filter((w) => w.length);
    let st = null;
    if (words.length >= 3 && random() < 0.6) st = arrangeStep(ms, random);
    if (!st) st = listenStep(ms, random);
    if (!st) st = arrangeStep(ms, random);
    if (st) steps.push(st);
  });

  // 数量不足：用全书词条补齐，绝不返回空 steps
  if (steps.length < count) {
    const filler = shuffled(allVocab(), random);
    for (let i = 0; i < filler.length && steps.length < count; i++) {
      const ms = filler[i];
      if (seen[ms]) continue;
      seen[ms] = true;
      const st = mcqStep(ms, '', random);
      if (st) steps.push(st);
    }
  }

  const titles = {
    wrong: 'Wrong Answers',
    confuse: 'Confusion Drill',
    review: 'Spaced Review',
    mix: 'Mixed Practice',
  };

  return {
    id: 'pr-' + m + '-' + (Math.floor(seed) || 0),
    title: titles[m],
    mode: m,
    steps,
  };
}
