const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../../database', () => ({ query: jest.fn() }));
const { query } = require('../../database');
const { createTranslateRouter } = require('../../routes/translate');
const { createTranslator } = require('../../services/translation');

const loginKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = () => jwt.sign({ id: 7, role: 'student' }, loginKey, { expiresIn: 60 });
const config = { baseUrl: 'https://llm.example/v1', apiKey: 'test-key', model: 'test-model' };
const completion = text => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }),
  { status: 200, headers: { 'Content-Type': 'application/json' } });

function app({ fetchImpl = jest.fn().mockResolvedValue(completion('你好')), translatorOptions = config,
  loadContent = jest.fn().mockResolvedValue('Hello') } = {}) {
  const translator = createTranslator({ ...translatorOptions, fetchImpl });
  const value = express();
  value.use(express.json());
  value.use('/api/translate', createTranslateRouter({ translator, loadContent }));
  return { value, fetchImpl, loadContent };
}
const send = (target, body) => request(target).post('/api/translate').auth(token(), { type: 'bearer' }).send(body);

beforeEach(() => { query.mockReset(); query.mockResolvedValue([{ status: 'active' }]); });

test('config reports whether translation is configured, without login', async () => {
  expect((await request(app().value).get('/api/translate/config')).body).toEqual({ status: 0, data: { enabled: true } });
  const off = app({ translatorOptions: { ...config, apiKey: '' } });
  expect((await request(off.value).get('/api/translate/config')).body).toEqual({ status: 0, data: { enabled: false } });
});

test('requires login before translating', async () => {
  const { value, fetchImpl } = app();
  expect((await request(value).post('/api/translate').send({ kind: 'post', id: 1, target: 'zh' })).status).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('translates stored content by kind and id', async () => {
  const { value, fetchImpl, loadContent } = app();
  const reply = await send(value, { kind: 'comment', id: 42, target: 'zh' });
  expect(reply.status).toBe(200);
  expect(reply.body).toEqual({ status: 0, data: { text: '你好', target: 'zh', cached: false } });
  expect(loadContent).toHaveBeenCalledWith('comment', 42);
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url).toBe('https://llm.example/v1/chat/completions');
  expect(options.headers.Authorization).toBe('Bearer test-key');
  const body = JSON.parse(options.body);
  expect(body.model).toBe('test-model');
  expect(body.messages[0].content).toContain('Simplified Chinese');
  expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
});

test('serves a repeated request from the cache', async () => {
  const { value, fetchImpl } = app();
  await send(value, { kind: 'post', id: 1, target: 'zh' });
  const second = await send(value, { kind: 'post', id: 1, target: 'zh' });
  expect(second.body.data.cached).toBe(true);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('rejects unknown kinds, bad ids, unsupported targets and free text', async () => {
  const { value, loadContent } = app();
  for (const body of [
    { kind: 'diary', id: 1, target: 'zh' },
    { kind: 'post', id: 0, target: 'zh' },
    { kind: 'post', id: 'abc', target: 'zh' },
    { kind: 'post', id: 1, target: 'fr' },
    { kind: '__proto__', id: 1, target: 'zh' },
    { text: 'translate me', target: 'zh' },
  ]) {
    expect((await send(value, body)).status).toBe(400);
  }
  expect(loadContent).not.toHaveBeenCalled();
});

test('returns 503 when not configured and 404 for missing or deleted content', async () => {
  const off = app({ translatorOptions: { ...config, model: '' } });
  expect((await send(off.value, { kind: 'post', id: 1, target: 'en' })).status).toBe(503);
  expect(off.fetchImpl).not.toHaveBeenCalled();
  const missing = app({ loadContent: jest.fn().mockResolvedValue(null) });
  expect((await send(missing.value, { kind: 'review', id: 9, target: 'en' })).status).toBe(404);
  expect(missing.fetchImpl).not.toHaveBeenCalled();
});

test('refuses overly long content and hides upstream failures', async () => {
  const long = app({ loadContent: jest.fn().mockResolvedValue('a'.repeat(4001)) });
  expect((await send(long.value, { kind: 'post', id: 1, target: 'zh' })).status).toBe(413);
  const broken = app({ fetchImpl: jest.fn().mockResolvedValue(new Response('{"error":"bad key sk-123"}', { status: 401 })) });
  const reply = await send(broken.value, { kind: 'post', id: 1, target: 'zh' });
  expect(reply.status).toBe(502);
  expect(JSON.stringify(reply.body)).not.toContain('sk-123');
});

test('loads content only through the fixed per-kind queries', async () => {
  const translator = createTranslator({ ...config, fetchImpl: jest.fn().mockResolvedValue(completion('嗨')) });
  const value = express();
  value.use(express.json());
  value.use('/api/translate', createTranslateRouter({ translator }));
  query.mockImplementation(async sql => (sql.includes('FROM posts') && !sql.includes('JOIN')
    ? [{ content: 'Hi' }] : [{ status: 'active' }]));
  const reply = await send(value, { kind: 'post', id: 3, target: 'zh' });
  expect(reply.status).toBe(200);
  const postQuery = query.mock.calls.find(([sql]) => sql.includes('FROM posts') && !sql.includes('JOIN'));
  expect(postQuery[0]).toMatch(/deleted_at IS NULL AND hidden_by_admin = 0/);
  expect(postQuery[1]).toEqual([3]);
});
