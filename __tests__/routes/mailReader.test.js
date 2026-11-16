/**
 * 邮件识别待办（任务管理表 #7）
 */
const express = require('express');
const supertest = require('supertest');
const { createMailReaderRouter, malaysiaToday } = require('../../routes/mailReader');
const { createMailExtractor, parseModelOutput, pickConfig } = require('../../services/mailExtract');

function build({ extractor, user = true } = {}) {
  const app = express();
  app.use(express.json());
  const auth = (req, res, next) => {
    if (!user) return res.status(401).json({ status: -1, message: '未登录' });
    req.user = { id: 9 };
    next();
  };
  const limiter = (_req, _res, next) => next();
  app.use('/api/mail-reader', createMailReaderRouter({ extractor, auth, limiter, now: () => new Date('2026-11-16T20:00:00Z') }));
  return app;
}

const okResponse = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

describe('parseModelOutput', () => {
  it('容忍代码块包裹，逐字段校验：非法日期置空、没日期就没时间、优先级夹紧、类型白名单、最多 8 条', () => {
    const raw = '```json\n' + JSON.stringify({
      summary: '  EEE203 实验报告提醒  ',
      items: [
        { title: '提交 EEE203 Lab 3 报告', due_date: '2026-11-21', due_time: '23:59', priority: 5, list_type: 'course', note: 'Moodle' },
        { title: '报名讲座', due_date: '2026-02-30', due_time: '10:00', priority: -1, list_type: 'party' },
        { title: '  ', due_date: null },
        ...Array.from({ length: 10 }, (_, i) => ({ title: `t${i}` })),
      ],
    }) + '\n```';
    const out = parseModelOutput(raw);
    expect(out.summary).toBe('EEE203 实验报告提醒');
    expect(out.items[0]).toEqual({ title: '提交 EEE203 Lab 3 报告', due_date: '2026-11-21', due_time: '23:59', priority: 3, list_type: 'course', note: 'Moodle' });
    expect(out.items[1]).toEqual({ title: '报名讲座', due_date: null, due_time: null, priority: 0, list_type: 'personal', note: '' });
    expect(out.items).toHaveLength(8);
  });

  it('不是 JSON 时报错', () => {
    expect(() => parseModelOutput('抱歉我无法处理')).toThrow();
    expect(() => parseModelOutput(undefined)).toThrow();
  });
});

describe('createMailExtractor', () => {
  it('三项配置不齐就关闭', () => {
    expect(createMailExtractor({ baseUrl: 'x', apiKey: '', model: 'm', fetchImpl: jest.fn() }).enabled).toBe(false);
  });

  it('请求 OpenAI 兼容接口：带今天日期和界面语言，temperature 0', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(okResponse('{"summary":"s","items":[]}'));
    const ex = createMailExtractor({ baseUrl: 'https://api.example/v1/', apiKey: 'k', model: 'glm-4-flash', fetchImpl });
    const out = await ex.extract('Dear students, ...', { today: '2026-11-17', lang: 'en' });
    expect(out).toEqual({ summary: 's', items: [] });
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('glm-4-flash');
    expect(body.temperature).toBe(0);
    expect(body.messages[1].content).toContain('Today: 2026-11-17');
    expect(body.messages[1].content).toContain('Interface language: English');
  });

  it('上游非 2xx 或输出坏掉都归为 UPSTREAM', async () => {
    const bad = createMailExtractor({ baseUrl: 'u', apiKey: 'k', model: 'm', fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 429 }) });
    await expect(bad.extract('x', { today: '2026-11-17' })).rejects.toMatchObject({ code: 'UPSTREAM' });
    const junk = createMailExtractor({ baseUrl: 'u', apiKey: 'k', model: 'm', fetchImpl: jest.fn().mockResolvedValue(okResponse('nope')) });
    await expect(junk.extract('x', { today: '2026-11-17' })).rejects.toMatchObject({ code: 'UPSTREAM' });
  });

  it('pickConfig：MAIL_AI_* 优先，没有就用翻译的配置', () => {
    expect(pickConfig({ TRANSLATE_API_BASE_URL: 'a', TRANSLATE_API_KEY: 'b', TRANSLATE_MODEL: 'c' })).toEqual({ baseUrl: 'a', apiKey: 'b', model: 'c' });
    expect(pickConfig({ MAIL_AI_BASE_URL: 'x', TRANSLATE_API_BASE_URL: 'a', MAIL_AI_API_KEY: 'y', MAIL_AI_MODEL: 'z' })).toEqual({ baseUrl: 'x', apiKey: 'y', model: 'z' });
  });
});

describe('/api/mail-reader', () => {
  it('GET /config 公开，告知是否开启', async () => {
    const res = await supertest(build({ extractor: { enabled: false } })).get('/api/mail-reader/config');
    expect(res.body.data).toEqual({ enabled: false, maxChars: 8000 });
  });

  it('未登录 401，不调用识别', async () => {
    const extractor = { enabled: true, extract: jest.fn() };
    const res = await supertest(build({ extractor, user: false })).post('/api/mail-reader/extract').send({ content: 'x' });
    expect(res.status).toBe(401);
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('空内容 400，过长 413，未开启 503', async () => {
    const extractor = { enabled: false, extract: jest.fn() };
    const app = build({ extractor });
    expect((await supertest(app).post('/api/mail-reader/extract').send({ content: '  ' })).status).toBe(400);
    expect((await supertest(app).post('/api/mail-reader/extract').send({ content: 'x'.repeat(8001) })).status).toBe(413);
    expect((await supertest(app).post('/api/mail-reader/extract').send({ content: 'hello' })).status).toBe(503);
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('成功：按马来西亚日期传 today，返回识别结果', async () => {
    const extractor = { enabled: true, extract: jest.fn().mockResolvedValue({ summary: 's', items: [{ title: 't' }] }) };
    const res = await supertest(build({ extractor })).post('/api/mail-reader/extract').send({ content: 'Dear all', lang: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ summary: 's', items: [{ title: 't' }] });
    // 2026-11-16T20:00Z = 马来西亚 11-17 凌晨 4 点
    expect(extractor.extract).toHaveBeenCalledWith('Dear all', { today: '2026-11-17', lang: 'en' });
  });

  it('上游失败 502，日志里只有错误码、没有邮件原文', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const extractor = { enabled: true, extract: jest.fn().mockRejectedValue(Object.assign(new Error('boom'), { code: 'UPSTREAM' })) };
    const res = await supertest(build({ extractor })).post('/api/mail-reader/extract').send({ content: 'SECRET-EMAIL-BODY' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET-EMAIL-BODY');
    expect(JSON.stringify(res.body)).not.toContain('boom');
    spy.mockRestore();
  });

  it('malaysiaToday 按 UTC+8 算', () => {
    expect(malaysiaToday(new Date('2026-11-16T15:59:00Z'))).toBe('2026-11-16');
    expect(malaysiaToday(new Date('2026-11-16T16:00:00Z'))).toBe('2026-11-17');
  });
});
