/**
 * 邮件识别待办（任务管理表 #7「web:自动读邮件」第一期）
 *
 * 用户把学校邮件正文粘进来，调用任意 OpenAI 兼容的 chat/completions 接口，
 * 抽出「要做的事 + 截止日期/时间」，前端确认后再写进待办。
 * 原文只在这次请求里用，不落库、不写日志。
 *
 * 配置（服务端环境变量，三项配齐才开启）：
 *   MAIL_AI_BASE_URL / MAIL_AI_API_KEY / MAIL_AI_MODEL
 *   没配时回退到翻译功能的 TRANSLATE_API_BASE_URL / TRANSLATE_API_KEY / TRANSLATE_MODEL（同一家服务商就不用配两遍）
 */

const MAX_INPUT_CHARS = 8000;
const MAX_ITEMS = 8;
const LIST_TYPES = ['personal', 'course', 'club', 'other'];

const SYSTEM_PROMPT = [
  'You read university emails for a student at Xiamen University Malaysia and extract action items.',
  'Return ONLY a JSON object, no markdown, with this shape:',
  '{"summary": string, "items": [{"title": string, "due_date": "YYYY-MM-DD" | null, "due_time": "HH:MM" | null, "priority": 0-3, "list_type": "personal"|"course"|"club"|"other", "note": string}]}',
  'Rules:',
  '- summary: one sentence in the same language as the user interface language given below.',
  '- items: only things the student must DO (submit, register, attend, pay, reply...). Max 8. Empty array if none.',
  '- title: short imperative phrase (<= 60 chars) in the interface language; keep course codes like EEE203 as-is.',
  '- Resolve relative dates ("this Friday", "next week Monday") against the given today date. If no date is stated, use null. Never invent dates.',
  '- due_time in 24h. Malaysia time (UTC+8). null if not stated.',
  '- priority: 3 if graded/mandatory with a deadline within 3 days, 2 if graded/mandatory, 1 otherwise, 0 if purely informational.',
  '- list_type: "course" for coursework/exams/lectures, "club" for clubs/societies/events, else "personal" or "other".',
  '- note: where/how (location, link text, submission method), <= 120 chars, may be empty.',
].join('\n');

function pickConfig(env = process.env) {
  const baseUrl = env.MAIL_AI_BASE_URL || env.TRANSLATE_API_BASE_URL || '';
  const apiKey = env.MAIL_AI_API_KEY || env.TRANSLATE_API_KEY || '';
  const model = env.MAIL_AI_MODEL || env.TRANSLATE_MODEL || '';
  return { baseUrl, apiKey, model };
}

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isValidTime(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function clip(v, max) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** 模型输出 → 干净结构；容忍代码块包裹和多余文字，字段逐个校验，不合法的丢掉或置空 */
function parseModelOutput(raw) {
  if (typeof raw !== 'string') throw new Error('empty model output');
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('model output is not JSON');
  text = text.slice(start, end + 1);
  const obj = JSON.parse(text);
  const items = [];
  for (const it of Array.isArray(obj.items) ? obj.items : []) {
    const title = clip(it && it.title, 120);
    if (!title) continue;
    const dueDate = isValidDate(it.due_date) ? it.due_date : null;
    const priority = Math.min(3, Math.max(0, Number.parseInt(it.priority, 10) || 0));
    items.push({
      title,
      due_date: dueDate,
      due_time: dueDate && isValidTime(it.due_time) ? it.due_time : null,
      priority,
      list_type: LIST_TYPES.includes(it.list_type) ? it.list_type : 'personal',
      note: clip(it.note, 200),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return { summary: clip(obj.summary, 300), items };
}

function createMailExtractor({ baseUrl, apiKey, model, fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
  const enabled = Boolean(baseUrl && apiKey && model && typeof fetchImpl === 'function');

  async function extract(content, { today, lang = 'zh' } = {}) {
    if (!enabled) throw Object.assign(new Error('mail extract disabled'), { code: 'DISABLED' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Today: ${today}\nInterface language: ${lang === 'en' ? 'English' : 'Simplified Chinese'}\n\nEmail:\n${content}` },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { code: 'UPSTREAM' });
      const data = await res.json();
      const raw = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      try {
        return parseModelOutput(raw);
      } catch (e) {
        throw Object.assign(new Error(`bad model output: ${e.message}`), { code: 'UPSTREAM' });
      }
    } catch (e) {
      if (e && e.name === 'AbortError') throw Object.assign(new Error('upstream timeout'), { code: 'UPSTREAM' });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  return { enabled, extract };
}

module.exports = { createMailExtractor, parseModelOutput, pickConfig, MAX_INPUT_CHARS, MAX_ITEMS };
