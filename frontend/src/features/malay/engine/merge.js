/**
 * 中英内容合并层。
 *
 * 上游 MelayuDuolingo 的课程数据是「同结构双文件」：
 *   - data.js（中文）：UNITS 数组，vocab/sentences 都是数组，grammar.zh 是讲解导语
 *   - data-en.js（英文）：UNIT_EN 按单元 id 索引，vocab/sentences 是映射，
 *     grammar.lead 对应 grammar.zh，examples[].en 对应 examples[].zh
 *
 * 两份文件**字段名不同、结构也不同**，不能假设同构。渲染时按当前语言查表，
 * 查不到就回落到中文侧（英文侧的 vocab/sentences 缺失时上游回落到原文 ms）。
 */
import { UNITS } from '../data/course.js';
import { UNIT_EN } from '../data/courseEn.js';

/** 英文侧单元数据；非英文模式一律返回 null（与上游 unitEn 行为一致） */
export function unitEn(id, isEn) {
  if (!isEn) return null;
  return UNIT_EN[id] || null;
}

/** 单元显示名 */
export function uLabel(unit, isEn) {
  const e = unitEn(unit.id, isEn);
  return isEn ? (e && e.label) || unit.title : unit.zh;
}

/** 单元描述 */
export function uDesc(unit, isEn) {
  const e = unitEn(unit.id, isEn);
  return isEn ? (e && e.desc) || '' : unit.desc;
}

/** 词条释义 */
export function vTextOf(unit, ms, isEn) {
  const v = unit && unit.vocab ? unit.vocab.find((x) => x.ms === ms) : null;
  if (!v) return ms;
  const e = unitEn(unit.id, isEn);
  if (e && e.vocab && e.vocab[ms]) return e.vocab[ms];
  return isEn ? ms : v.zh;
}

/** 例句释义 */
export function sText(unit, ms, isEn) {
  const s = unit && unit.sentences ? unit.sentences.find((x) => x.ms === ms) : null;
  const e = unit ? unitEn(unit.id, isEn) : null;
  if (e && e.sentences && e.sentences[ms]) return e.sentences[ms];
  return s && !isEn ? s.zh : ms;
}

/** 语法讲解，统一为 { title, lead, points, examples: [{ ms, text }] } */
export function grammarOf(unit, isEn) {
  const g = unit.grammar;
  if (isEn) {
    const e = unitEn(unit.id, isEn);
    if (e && e.grammar) {
      return {
        title: e.grammar.title || g.title,
        lead: e.grammar.lead || e.grammar.title || g.title,
        points: e.grammar.points || g.points,
        examples: (e.grammar.examples || []).map((x) => ({ ms: x.ms, text: x.en })),
      };
    }
  }
  return {
    title: g.title,
    lead: g.zh,
    points: g.points,
    examples: (g.examples || []).map((x) => ({ ms: x.ms, text: x.zh })),
  };
}

/** 语法选择题 */
export function gqOf(unit, isEn) {
  const e = unitEn(unit.id, isEn);
  if (isEn && e && e.gq && e.gq.length === unit.gq.length) return e.gq;
  return unit.gq;
}

/**
 * ms -> 所属单元。顺序与上游一致：逐单元，先 vocab 后 sentences，先出现者优先。
 * 跨单元重复词条因此归到第一个出现的单元。
 */
let msIndex = null;

export function unitOfMs(ms) {
  if (!msIndex) {
    msIndex = {};
    UNITS.forEach((u) => {
      (u.vocab || []).forEach((v) => {
        if (v && v.ms && !msIndex[v.ms]) msIndex[v.ms] = u;
      });
      (u.sentences || []).forEach((s) => {
        if (s && s.ms && !msIndex[s.ms]) msIndex[s.ms] = u;
      });
    });
  }
  return msIndex[ms] || null;
}

/**
 * 中英两侧的 key 集合是否一致（开发期自检用）。
 * 上游 tools/verify-en.js 守的就是这条不变量。
 */
export function checkKeyParity() {
  const problems = [];
  Object.keys(UNIT_EN).forEach((id) => {
    const zh = UNITS.find((u) => u.id === id);
    const en = UNIT_EN[id];
    if (!zh) {
      problems.push(`英文侧多出单元 ${id}`);
      return;
    }
    const zhVocab = (zh.vocab || []).map((v) => v.ms);
    const enVocab = Object.keys(en.vocab || {});
    zhVocab.forEach((ms) => {
      if (!enVocab.includes(ms)) problems.push(`${id} 英文侧缺词条 ${ms}`);
    });
    enVocab.forEach((ms) => {
      if (!zhVocab.includes(ms)) problems.push(`${id} 中文侧缺词条 ${ms}`);
    });
    const zhSent = (zh.sentences || []).map((s) => s.ms);
    const enSent = Object.keys(en.sentences || {});
    zhSent.forEach((ms) => {
      if (!enSent.includes(ms)) problems.push(`${id} 英文侧缺例句 ${ms}`);
    });
    enSent.forEach((ms) => {
      if (!zhSent.includes(ms)) problems.push(`${id} 中文侧缺例句 ${ms}`);
    });
    if ((zh.gq || []).length !== (en.gq || []).length) {
      problems.push(`${id} 语法题数量不一致`);
    } else {
      (zh.gq || []).forEach((q, i) => {
        if (q.a !== en.gq[i].a) problems.push(`${id} 第 ${i + 1} 题答案下标不一致`);
      });
    }
  });
  UNITS.forEach((u) => {
    if (!UNIT_EN[u.id]) problems.push(`英文侧缺单元 ${u.id}`);
  });
  return problems;
}
