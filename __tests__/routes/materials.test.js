/**
 * M10 学习资料模块 · 测试
 *
 * 覆盖：
 *   A. 双实现一致性守卫（shared/constants/materials.js ↔ 资料库 .github/scripts/lib/rules.mjs）
 *   B. 校验层（魔数嗅探 / 文件名安全化 / 元数据 / 类型交叉校验）
 *   C. 路由（列表 / 上传 / 去重 / 敏感词 / 收藏 / 下载计数 / 越权 / 管理端）
 *
 * 全部外部依赖均被 mock：数据库、GitHub、敏感词表、课程字典。
 */

const express = require('express');
const supertest = require('supertest');
const fs = require('fs');
const path = require('path');

jest.mock('../../database', () => ({ query: jest.fn(), pool: { getConnection: jest.fn() } }));

jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: Number(req.get('x-test-uid') || 7), role: req.get('x-test-role') || 'student' };
  next();
});

jest.mock('../../middleware/adminAuth', () => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ status: -1, message: '需要管理员权限' });
});

jest.mock('../../middleware/sensitiveWordFilter', () => {
  const fn = jest.fn((_req, _res, next) => next());
  fn.getSensitiveWords = jest.fn(async () => ['违禁词']);
  fn.checkText = jest.fn((text, words) => {
    const t = String(text || '').toLowerCase();
    for (const w of words) if (t.includes(String(w).toLowerCase())) return { hit: true, word: w };
    return { hit: false };
  });
  fn.refreshCache = jest.fn();
  return fn;
});

jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn(async () => {}) }));

jest.mock('../../services/courseCatalog', () => ({
  resolveCourse: jest.fn(async () => ({
    course: { id: 7, name: '数据结构', lecturer: '', course_code: 'BSC103', is_pseudo: 0 },
    created: false,
    viaAlias: false,
  })),
  getCourseById: jest.fn(async (id) => ({ id, name: '数据结构', lecturer: '', is_pseudo: 0 })),
  listCourses: jest.fn(async () => [
    { courseId: 7, name: '数据结构', lecturer: '', courseCode: 'BSC103', isPseudo: 0, materialCount: 3 },
  ]),
  updateCourse: jest.fn(async (id, patch) => ({ id, ...patch })),
  mergeCourses: jest.fn(async () => ({ moved: 2, aliasRecorded: true, indexCommit: 'deadbeef' })),
  normalizeName: (s) => String(s || '').trim(),
  normalizeCourseInput: (i) => i,
}));

jest.mock('../../services/githubMaterials', () => ({
  isConfigured: jest.fn(() => true),
  assertConfigured: jest.fn(),
  readIndex: jest.fn(async () => ({
    index: {
      schemaVersion: 2,
      files: [
        {
          path: 'c7/notes/2025-09-第三课时.md',
          name: '2025-09-第三课时.md',
          ext: 'md',
          kind: 'markdown',
          title: '第三课时 链表',
          courseId: 7,
          courseName: '数据结构',
          lecturer: '',
          type: 'notes',
          lesson: 3,
          lessonTitle: '链表',
          examNode: null,
          source: null,
          tags: ['链表'],
          size: 1234,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      courses: [{ courseId: 7, name: '数据结构', lecturer: '' }],
      stats: { totalFiles: 1, totalBytes: 1234 },
    },
    blobSha: 'x',
    stale: false,
  })),
  getMainHead: jest.fn(async () => ({ sha: 'a'.repeat(40), tree: 't' })),
  cdnUrlFor: jest.fn((p, ref) => `https://cdn.example/gh/o/r@${ref || 'main'}/${p}`),
  getFileText: jest.fn(async () => '# 标题'),
  publishMaterial: jest.fn(async () => ({
    branch: 'upload/123-c7-abc',
    commit: 'c'.repeat(40),
    prNumber: 42,
    prUrl: 'https://github.com/o/r/pull/42',
    autoMerge: { ok: true, reason: null },
    filePath: 'c7/notes/x.md',
    mergeableState: 'clean',
  })),
  publishIndexPatch: jest.fn(async () => ({ prNumber: 43, prUrl: 'https://github.com/o/r/pull/43', autoMerge: { ok: true } })),
  removeMaterial: jest.fn(async () => ({ commit: 'd'.repeat(40), removedFile: true })),
  getPullRequest: jest.fn(async () => ({ state: 'open', merged: false, mergeable_state: 'clean', labels: [] })),
  commitIndex: jest.fn(),
}));

const { query } = require('../../database');
const gm = require('../../services/githubMaterials');
const cc = require('../../services/courseCatalog');
const V = require('../../services/materialValidation');
const M = require('../../shared/constants/materials');
const materialsRoutes = require('../../routes/materials');

/* ------------------------------------------------------------------ */
/* 夹具                                                                */
/* ------------------------------------------------------------------ */

const pdf = (n = 64) => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(n, 0x41)]);
const exe = () => Buffer.concat([Buffer.from('MZ\x90\x00'), Buffer.alloc(64, 0x41)]);
const textFile = (s = '# 笔记') => Buffer.from(s, 'utf8');

function app(user = {}) {
  const instance = express();
  instance.use(express.json());
  instance.use((req, _res, next) => {
    if (user.uid) req.headers['x-test-uid'] = String(user.uid);
    if (user.role) req.headers['x-test-role'] = user.role;
    next();
  });
  instance.use('/api/materials', materialsRoutes);
  return instance;
}

/** 按 SQL 内容分派 mock 返回，比依赖调用顺序更稳 */
function installQueryMock(overrides = {}) {
  query.mockImplementation(async (sql) => {
    const s = String(sql);
    if (overrides[s]) return overrides[s];
    if (/INSERT INTO materials/.test(s)) return { insertId: 123, affectedRows: 1 };
    if (/FROM users/.test(s)) return [{ nickname: '小明', username: 'xm123' }];
    if (/FROM materials[\s\S]*file_sha256 = \?/.test(s)) return []; // 去重：无重复
    if (/course_id <> \?/.test(s)) return []; // 同内容别处：无
    if (/UPDATE materials/.test(s)) return { affectedRows: 1 };
    if (/FROM material_saves/.test(s)) return [];
    if (/INSERT INTO material_downloads/.test(s)) return { insertId: 1 };
    return [];
  });
}

beforeEach(() => {
  query.mockReset();
  installQueryMock();
  // 恢复默认的 GitHub 行为（clearMocks 会清掉实现）
  gm.isConfigured.mockReturnValue(true);
  gm.publishMaterial.mockResolvedValue({
    branch: 'upload/123-c7-abc',
    commit: 'c'.repeat(40),
    prNumber: 42,
    prUrl: 'https://github.com/o/r/pull/42',
    autoMerge: { ok: true, reason: null },
    mergeableState: 'clean',
  });
  gm.getMainHead.mockResolvedValue({ sha: 'a'.repeat(40), tree: 't' });
  gm.cdnUrlFor.mockImplementation((p, ref) => `https://cdn.example/gh/o/r@${ref || 'main'}/${p}`);
  gm.getFileText.mockResolvedValue('# 标题');
  cc.resolveCourse.mockResolvedValue({
    course: { id: 7, name: '数据结构', lecturer: '', course_code: 'BSC103', is_pseudo: 0 },
    created: false,
    viaAlias: false,
  });
});

/* ================================================================== */
/* A. 双实现一致性守卫                                                 */
/* ================================================================== */

describe('A. 规则双实现一致性（后端 ↔ 资料库校验器）', () => {
  const rulesPath = path.join(__dirname, '..', '..', 'materials-repo', '.github', 'scripts', 'lib', 'rules.mjs');
  const src = fs.readFileSync(rulesPath, 'utf8');

  const extractArray = (name) => {
    const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`));
    if (!m) return null;
    return m[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter((s) => s && !s.startsWith('//'));
  };

  it('TYPES 完全一致', () => {
    expect(extractArray('TYPES')).toEqual(M.TYPES);
  });

  it('EXAM_NODES 完全一致', () => {
    expect(extractArray('EXAM_NODES')).toEqual(M.EXAM_NODES);
  });

  it('SOURCES 完全一致', () => {
    expect(extractArray('SOURCES')).toEqual(M.SOURCES);
  });

  it('体积上限一致（20 MiB）', () => {
    expect(src).toMatch(/MAX_FILE_BYTES = 20 \* 1024 \* 1024/);
    expect(M.MAX_FILE_BYTES).toBe(20 * 1024 * 1024);
  });

  it('永久黑名单两边的关键扩展名都在', () => {
    for (const ext of ['html', 'svg', 'js', 'exe', 'sh', 'mjs']) {
      expect(M.BLOCKED_EXT).toContain(ext);
      expect(src).toMatch(new RegExp(`'${ext}'`));
    }
  });

  it('EXT_KIND 白名单一致', () => {
    const m = src.match(/export const EXT_KIND = \{([\s\S]*?)\n\};/);
    expect(m).toBeTruthy();
    const keys = [...m[1].matchAll(/^\s*([a-z0-9]+):/gm)].map((x) => x[1]);
    expect(keys.sort()).toEqual([...M.ALLOWED_EXT].sort());
  });
});

/* ================================================================== */
/* B. 校验层                                                           */
/* ================================================================== */

describe('B. 校验层', () => {
  it('识别常见二进制魔数，且不误判可执行文件', () => {
    expect(V.detectBinaryFamily(pdf())).toBe('pdf');
    expect(V.detectBinaryFamily(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]))).toBe('png');
    expect(V.detectBinaryFamily(exe())).toBeNull();
    expect(V.detectBinaryFamily(textFile())).toBeNull();
  });

  it('文件名安全化：保留中文、剥离危险字符、阻断路径穿越', () => {
    expect(V.safeFileName('2025-09-第三课时.md')).toBe('2025-09-第三课时.md');
    expect(V.safeFileName('讲义#1.pdf')).toBe('讲义1.pdf');
    expect(V.safeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(V.safeFileName('..\\..\\win.pdf')).toBe('win.pdf');
    expect(V.safeFileName('.hidden.md')).toBe('hidden.md');
  });

  it('拒绝扩展名与真实类型不符', async () => {
    await expect(
      V.validateUpload({ file: { originalname: 'evil.pdf', buffer: exe() }, body: { title: '测试标题', type: 'notes' } })
    ).rejects.toMatchObject({ code: 'MATERIALS_DANGEROUS_FILE' });

    await expect(
      V.validateUpload({ file: { originalname: 'fake.pdf', buffer: textFile() }, body: { title: '测试标题', type: 'notes' } })
    ).rejects.toMatchObject({ code: 'MATERIALS_TYPE_MISMATCH' });
  });

  it('拒绝黑名单扩展名与超限体积', async () => {
    await expect(
      V.validateUpload({ file: { originalname: 'x.html', buffer: textFile('<b>') }, body: { title: '测试标题', type: 'notes' } })
    ).rejects.toMatchObject({ code: 'MATERIALS_BAD_EXT' });

    await expect(
      V.validateUpload({
        file: { originalname: 'big.pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(20 * 1024 * 1024)]) },
        body: { title: '测试标题', type: 'notes' },
      })
    ).rejects.toMatchObject({ code: 'MATERIALS_TOO_LARGE' });
  });

  it('元数据：标签去重、课时转整数、source 仅限试题', () => {
    const meta = V.validateMetadata({
      title: '第三课时 链表',
      type: 'notes',
      tags: '期中,链表，期中',
      lesson: '3',
      examNode: '',
    });
    expect(meta.tags).toEqual(['期中', '链表']);
    expect(meta.lesson).toBe(3);
    expect(meta.examNode).toBeNull();

    expect(() => V.validateMetadata({ title: '测试标题', type: 'notes', source: 'official' })).toThrow(
      /只适用于试题/
    );
    expect(() => V.validateMetadata({ title: '测试标题', type: 'video' })).toThrow(/类型必须是/);
    expect(() => V.validateMetadata({ title: 'a', type: 'notes' })).toThrow(/标题需/);
  });

  it('政策锁定：不再导出「扫文件正文」的工具（正文不扫，见 17.11）', () => {
    expect(V.extractTextForScan).toBeUndefined();
    expect(V.MAX_SCAN_BYTES).toBeUndefined();
  });

  it('修复 multipart 中文文件名乱码，且幂等（乱码不得进仓库）', () => {
    const fix = require('../../utils/multipartFilename');
    const mangled = Buffer.from('讲义.pdf', 'utf8').toString('latin1');
    expect(mangled).not.toBe('讲义.pdf'); // 确认夹具真的乱码了
    expect(fix(mangled)).toBe('讲义.pdf');
    expect(fix('讲义.pdf')).toBe('讲义.pdf'); // 本来正确 → 不动
    expect(fix('plain.pdf')).toBe('plain.pdf');
    expect(fix(fix(mangled))).toBe('讲义.pdf'); // 幂等
    expect(V.safeFileName(mangled)).toBe('讲义.pdf'); // 校验层兜底
    expect(V.safeFileName('2025-09-第三课时-链表与树.md')).toBe('2025-09-第三课时-链表与树.md');
  });
});

/* ================================================================== */
/* C. 路由                                                             */
/* ================================================================== */

describe('C. 路由', () => {
  it('未配置资料库时列表返回 configured=false 而不是报错', async () => {
    gm.isConfigured.mockReturnValue(false);
    const res = await supertest(app()).get('/api/materials');
    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(false);
    expect(res.body.data.items).toEqual([]);
  });

  it('列表返回 pinned CDN 地址（含中文路径正确编码）', async () => {
    const res = await supertest(app()).get('/api/materials');
    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.path).toBe('c7/notes/2025-09-第三课时.md');
    expect(item.cdnUrl).toContain('a'.repeat(40));
    expect(item.typeMeta.labelZh).toBe('笔记');
    expect(res.body.data.total).toBe(1);
  });

  it('列表支持按类型与关键词筛选', async () => {
    const miss = await supertest(app()).get('/api/materials?type=exam');
    expect(miss.body.data.total).toBe(0);

    const hit = await supertest(app()).get('/api/materials?q=链表');
    expect(hit.body.data.total).toBe(1);
  });

  it('课程字典列表可用（轻量 API）', async () => {
    const res = await supertest(app()).get('/api/materials/courses');
    expect(res.status).toBe(200);
    expect(res.body.data.courses[0]).toMatchObject({ courseId: 7, name: '数据结构' });
  });

  it('上传合法文件成功，并返回 PR 信息与状态', async () => {
    const res = await supertest(app({ uid: 7, role: 'student' }))
      .post('/api/materials/upload')
      .field('title', '第三课时 链表与树')
      .field('type', 'notes')
      .field('courseName', '数据结构')
      .field('lesson', '3')
      .attach('file', pdf(), '讲义.pdf');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(0);
    expect(res.body.data.prNumber).toBe(42);
    expect(res.body.data.status).toBe('pending');
    expect(gm.publishMaterial).toHaveBeenCalledTimes(1);
    const arg = gm.publishMaterial.mock.calls[0][0];
    expect(arg.fileName).toBe('讲义.pdf');
    expect(arg.entryBase.size).toBeGreaterThan(0);
    expect(arg.entryBase.uploaderNickname).toBe('小明');
  });

  it('上传时 .html 被 multer 文件过滤器直接拒绝', async () => {
    const res = await supertest(app({ uid: 7 }))
      .post('/api/materials/upload')
      .field('title', '第三课时 链表')
      .field('type', 'notes')
      .field('courseName', '数据结构')
      .attach('file', textFile('<script>alert(1)</script>'), 'evil.html');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MATERIALS_BAD_EXT');
  });

  it('敏感词命中元数据时被拒，并明确告知是哪个词、哪个字段', async () => {
    const res = await supertest(app({ uid: 7 }))
      .post('/api/materials/upload')
      .field('title', '这里是违禁词内容')
      .field('type', 'notes')
      .field('courseName', '数据结构')
      .attach('file', pdf(), 'a.pdf');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MATERIALS_SENSITIVE');
    // 旧版只说「内容包含违规词汇」，用户无从下手 —— 必须带上词与字段
    expect(res.body.meta).toEqual({ word: '违禁词', field: '标题' });
    expect(res.body.message).toContain('违禁词');
    expect(res.body.message).toContain('标题');
    expect(gm.publishMaterial).not.toHaveBeenCalled();
  });

  it('政策 17.11：文件正文不扫敏感词 —— .md 正文含敏感词仍可上传', async () => {
    const body = '# 第三课时\n\n这里写着违禁词三个字，但正文按政策不参与敏感词检查。\n';
    const res = await supertest(app({ uid: 7 }))
      .post('/api/materials/upload')
      .field('title', '第三课时 链表与树')
      .field('type', 'notes')
      .field('courseName', '数据结构')
      .attach('file', textFile(body), '笔记.md');

    expect(res.status).toBe(200);
    expect(gm.publishMaterial).toHaveBeenCalledTimes(1);
    // 敏感词检查只应拿到元数据，绝不能拿到正文
    const sensitive = require('../../middleware/sensitiveWordFilter');
    for (const call of sensitive.checkText.mock.calls) {
      expect(String(call[0])).not.toContain('第三课时\n');
    }
  });

  it('软去重：同课程同类型同路径同内容 → 409', async () => {
    installQueryMock();
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/FROM materials[\s\S]*file_sha256 = \?/.test(s)) {
        return [{ id: 99, course_id: 7, type: 'notes', material_path: 'c7/notes/讲义.pdf', title: '旧版讲义', status: 'merged' }];
      }
      if (/FROM users/.test(s)) return [{ nickname: '小明', username: 'xm' }];
      return [];
    });

    const res = await supertest(app({ uid: 7 }))
      .post('/api/materials/upload')
      .field('title', '第三课时 链表')
      .field('type', 'notes')
      .field('courseName', '数据结构')
      .attach('file', pdf(), '讲义.pdf');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MATERIALS_DUPLICATE');
    expect(gm.publishMaterial).not.toHaveBeenCalled();
  });

  it('上传权限可通过 MATERIALS_UPLOAD_ROLE=admin 收紧', async () => {
    const old = process.env.MATERIALS_UPLOAD_ROLE;
    process.env.MATERIALS_UPLOAD_ROLE = 'admin';
    try {
      const res = await supertest(app({ uid: 7, role: 'student' }))
        .post('/api/materials/upload')
        .field('title', '第三课时 链表')
        .field('type', 'notes')
        .field('courseName', '数据结构')
        .attach('file', pdf(), 'a.pdf');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MATERIALS_FORBIDDEN');
    } finally {
      process.env.MATERIALS_UPLOAD_ROLE = old;
    }
  });

  it('MATERIALS_ENABLED=0 时上传返回 503（应急开关）', async () => {
    const old = process.env.MATERIALS_ENABLED;
    process.env.MATERIALS_ENABLED = '0';
    try {
      const res = await supertest(app({ uid: 7 }))
        .post('/api/materials/upload')
        .field('title', '第三课时 链表')
        .field('type', 'notes')
        .field('courseName', '数据结构')
        .attach('file', pdf(), 'a.pdf');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('MATERIALS_DISABLED');
    } finally {
      process.env.MATERIALS_ENABLED = old;
    }
  });

  it('下载计数按 path 工作，未知 path 也返回成功（尽力而为）', async () => {
    const res = await supertest(app())
      .post('/api/materials/download')
      .send({ path: 'c7/notes/2025-09-第三课时.md' });
    expect(res.status).toBe(200);
    expect(res.body.data.counted).toBe(true);

    const bad = await supertest(app()).post('/api/materials/download').send({ path: '../../etc/passwd' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('MATERIALS_BAD_PATH');
  });

  it('收藏 toggle：不存在与存在分别插入与删除', async () => {
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/FROM materials/.test(s)) return [{ id: 5 }];
      if (/FROM material_saves/.test(s)) return [];
      return { affectedRows: 1 };
    });
    const on = await supertest(app({ uid: 7 })).post('/api/materials/5/save');
    expect(on.body.data.saved).toBe(true);

    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/FROM materials/.test(s)) return [{ id: 5 }];
      if (/FROM material_saves/.test(s)) return [{ id: 77 }];
      return { affectedRows: 1 };
    });
    const off = await supertest(app({ uid: 7 })).post('/api/materials/5/save');
    expect(off.body.data.saved).toBe(false);
  });

  it('管理端接口对非管理员返回 403', async () => {
    const res = await supertest(app({ uid: 7, role: 'student' })).get('/api/materials/admin/stats');
    expect(res.status).toBe(403);
  });

  it('课程合并：管理员可用，且把 index 重写委托给 GitHub 层', async () => {
    const res = await supertest(app({ uid: 1, role: 'admin' }))
      .post('/api/materials/admin/courses/merge')
      .send({ fromId: 9, toId: 7 });
    expect(res.status).toBe(200);
    expect(cc.mergeCourses).toHaveBeenCalledTimes(1);
    const arg = cc.mergeCourses.mock.calls[0][0];
    expect(arg.fromId).toBe(9);
    expect(arg.toId).toBe(7);
    expect(typeof arg.commitIndexFn.commitIndex).toBe('function');
  });

  it('下架：非本人非管理员 403；本人成功且返回 CDN 残留缓存提示', async () => {
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/SELECT \* FROM materials/.test(s)) {
        return [{ id: 5, user_id: 8, material_path: 'c7/notes/a.md', title: 'a', status: 'merged' }];
      }
      return { affectedRows: 1 };
    });

    const forbidden = await supertest(app({ uid: 7, role: 'student' })).delete('/api/materials/5');
    expect(forbidden.status).toBe(403);

    const own = await supertest(app({ uid: 8, role: 'student' })).delete('/api/materials/5');
    expect(own.status).toBe(200);
    expect(own.body.data.notice).toMatch(/CDN/);
    expect(gm.removeMaterial).toHaveBeenCalledTimes(1);
  });

  it('元数据修改：禁止改类型（会影响目录）', async () => {
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/SELECT \* FROM materials/.test(s)) {
        return [{ id: 5, user_id: 7, material_path: 'c7/notes/a.md', title: '旧标题', type: 'notes', status: 'merged' }];
      }
      return { affectedRows: 1 };
    });
    const res = await supertest(app({ uid: 7 }))
      .patch('/api/materials/5')
      .send({ type: 'exam' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MATERIALS_TYPE_IMMUTABLE');
  });

  it('元数据修改：成功后触发 metadata-only PR', async () => {
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/SELECT \* FROM materials/.test(s)) {
        return [{
          id: 5, user_id: 7, material_path: 'c7/notes/a.md', title: '旧标题', type: 'notes',
          status: 'merged', lesson: null, lesson_title: null, exam_node: null, source: null,
          description: null, semester: null, tags: null,
        }];
      }
      return { affectedRows: 1 };
    });
    const res = await supertest(app({ uid: 7 }))
      .patch('/api/materials/5')
      .send({ title: '新标题' });
    expect(res.status).toBe(200);
    expect(gm.publishIndexPatch).toHaveBeenCalledTimes(1);
    expect(res.body.data.meta.title).toBe('新标题');
  });

  it('上传状态轮询：PR 已合并时把状态推进为 merged', async () => {
    gm.getPullRequest.mockResolvedValue({
      state: 'closed', merged: true, mergeable_state: 'unknown', labels: [], merge_commit_sha: 'e'.repeat(40),
    });
    query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (/FROM materials m/.test(s)) {
        return [{
          id: 123, user_id: 7, status: 'pending', pr_number: 42, material_path: 'c7/notes/a.md',
          title: 'a', course_id: 7, course_name: '数据结构', lecturer: '', pr_url: 'u', branch_name: 'b',
        }];
      }
      return { affectedRows: 1 };
    });

    const res = await supertest(app({ uid: 7 })).get('/api/materials/upload/123/status');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('merged');
    expect(res.body.data.github.merged).toBe(true);
  });
});
