/**
 * 管理端「课程测评」接口的结构一致性测试。
 *
 * 为什么不用全量 mock：routes/admin.js 的模块配置直接拼列名，mock 掉 query 后
 * 写成 `cr.title` 也能全绿。这里从 migrations/ 解析 course_reviews 的真实列集，
 * 再用一个校验列名的假 query 跑接口——引用不存在的列会像 MySQL 一样报错。
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  if (!req.user) req.user = { id: 1, role: 'admin', username: 'admin_test' };
  next();
});
jest.mock('../../middleware/adminAuth', () => (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ status: -1, message: '需要管理员权限' });
});
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn().mockResolvedValue() }));

const { query } = require('../../database');
const adminRoutes = require('../../routes/admin');

const MIGRATIONS = path.join(__dirname, '..', '..', 'migrations');

function loadCourseReviewColumns() {
  const columns = new Set();
  for (const file of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
    const create = /CREATE TABLE(?: IF NOT EXISTS)?\s+`?course_reviews`?\s*\(([\s\S]*?)\n\)\s*ENGINE/i.exec(sql);
    if (create) {
      for (const line of create[1].split('\n')) {
        const m = /^\s*`?([a-z_][a-z0-9_]*)`?\s+[A-Z]/i.exec(line);
        if (m && !/^(primary|key|index|unique|constraint|foreign)$/i.test(m[1])) columns.add(m[1]);
      }
    }
    const alter = /ALTER TABLE\s+`?course_reviews`?\s*([\s\S]*?);/gi;
    let block;
    while ((block = alter.exec(sql))) {
      const add = /ADD\s+(?:COLUMN\s+)?`?([a-z_][a-z0-9_]*)`?\s+/gi;
      let m;
      while ((m = add.exec(block[1]))) {
        if (!/^(index|unique|constraint|foreign|primary|key)$/i.test(m[1])) columns.add(m[1]);
      }
    }
  }
  return columns;
}

const REAL_COLUMNS = loadCourseReviewColumns();

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/admin', adminRoutes);
  a.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return a;
}

/** 像 MySQL 一样校验 SQL 里 cr.<column> 的列名，并返回真实形状的行。 */
function schemaAwareQuery(selectRows, seen) {
  return jest.fn(async (sql, params) => {
    seen.push({ sql, params });
    const referenced = [...sql.matchAll(/\bcr\.([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]);
    for (const column of referenced) {
      if (!REAL_COLUMNS.has(column)) throw new Error(`ER_BAD_FIELD_ERROR: Unknown column 'cr.${column}'`);
    }
    if (/^\s*SELECT COUNT\(\*\)/i.test(sql)) return [{ total: selectRows.length }];
    if (/FROM course_reviews/i.test(sql)) return selectRows;
    if (/FROM course_review_comments/i.test(sql)) return [];
    return [{ affectedRows: 1 }];
  });
}

const reviewRow = {
  id: 7,
  title: '数据结构',
  teacher: '张老师',
  rating: 5,
  difficulty: 3,
  username: 'alice',
  created_at: '2026-10-01 10:00:00',
  deleted_at: null,
};

describe('admin course-review endpoints against the real table shape', () => {
  beforeEach(() => query.mockReset());

  it('parses the real course_reviews columns from migrations', () => {
    for (const column of ['course_name', 'teacher', 'comment', 'rating', 'difficulty', 'created_by', 'deleted_at', 'tag', 'term_year']) {
      expect(REAL_COLUMNS.has(column)).toBe(true);
    }
    expect(REAL_COLUMNS.has('title')).toBe(false);
    expect(REAL_COLUMNS.has('content')).toBe(false);
  });

  it('lists live reviews with course_name as title and only known columns', async () => {
    const seen = [];
    query.mockImplementation(schemaAwareQuery([reviewRow], seen));

    const res = await supertest(app()).get('/api/admin/contents/course-review');

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0]).toMatchObject({ id: 7, title: '数据结构', teacher: '张老师', rating: 5 });
    const listSql = seen.find((s) => /FROM course_reviews/i.test(s.sql) && /LIMIT/i.test(s.sql)).sql;
    expect(listSql).toContain('cr.course_name AS title');
    expect(listSql).toContain('cr.deleted_at IS NULL');
  });

  it('finds soft-deleted reviews for restore when includeDeleted=1', async () => {
    const seen = [];
    const deleted = { ...reviewRow, id: 9, deleted_at: '2026-10-20 09:00:00' };
    query.mockImplementation(schemaAwareQuery([deleted], seen));

    const res = await supertest(app()).get('/api/admin/contents/course-review?includeDeleted=1');

    expect(res.status).toBe(200);
    expect(res.body.data.list[0].deleted_at).toBe('2026-10-20 09:00:00');
    const listSql = seen.find((s) => /FROM course_reviews/i.test(s.sql) && /LIMIT/i.test(s.sql)).sql;
    expect(listSql).not.toContain('cr.deleted_at IS NULL');
  });

  it('returns the review body as content on the detail endpoint', async () => {
    const seen = [];
    query.mockImplementation(schemaAwareQuery([{ ...reviewRow, content: '给分很好，作业偏多' }], seen));

    const res = await supertest(app()).get('/api/admin/contents/course-review/7');

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('给分很好，作业偏多');
    const detailSql = seen.find((s) => /FROM course_reviews/i.test(s.sql) && /WHERE/i.test(s.sql)).sql;
    expect(detailSql).toContain('cr.comment AS content');
  });

  it('clears deleted_at when the admin restores a review', async () => {
    const seen = [];
    query.mockImplementation(schemaAwareQuery([reviewRow], seen));

    const res = await supertest(app())
      .patch('/api/admin/contents/course-review/9/toggle-visibility')
      .send({ hidden: false });

    expect(res.status).toBe(200);
    const update = seen.find((s) => /^UPDATE course_reviews/i.test(s.sql.trim())).sql;
    // UPDATE 没有表别名：列名必须是裸列名，否则 MySQL 报 Unknown table 'cr'。
    expect(update).toContain('SET deleted_at = NULL');
    expect(update).not.toContain('cr.');
  });
});
