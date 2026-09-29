/**
 * ============================================
 * 学习资料模块路由（M10）—— /api/materials
 * ============================================
 * 设计要点：
 *  · 列表与元数据走本 API（**必须**从 GitHub API 读最新 index，不能读 CDN：
 *    jsDelivr 缓存 7 天，读过期副本回写会回滚别人的条目）；
 *  · 文件**字节**由前端直连 CDN 读取（零服务器带宽），本 API 只提供
 *    pinned baseUrl 与一个 text 兜底接口；
 *  · 写操作（上传 / 改元数据 / 下架）全部经本服务端，PAT 只存在于服务端。
 *
 * 路由顺序注意：具体路径必须写在 `/:id` 之前。
 */

const express = require('express');

const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');
const materialUpload = require('../middleware/materialUpload');

const { query } = require('../database');
const { inlineLimit, inlineOffset } = require('../utils/sqlLimit');
const { logAudit } = require('../services/auditLog');
const gm = require('../services/githubMaterials');
const cc = require('../services/courseCatalog');
const mv = require('../services/materialValidation');
const { MaterialError, httpStatusFor } = require('../services/materialErrors');
const {
  TYPES,
  TYPE_META,
  EXAM_NODES,
  EXAM_NODE_META,
  SOURCES,
  SOURCE_META,
  MAX_FILE_BYTES,
  PSEUDO_COURSE_ID,
  MATERIAL_PATH_RE,
  extOf,
} = require('../shared/constants/materials');

const router = express.Router();

/* ============================================================
 * 通用助手
 * ============================================================ */

function ok(res, data, message = 'ok') {
  return res.status(200).json({ status: 0, message, data });
}

/** 统一的错误出口：MaterialError → 其 httpStatus + code；其它 → 500 */
function fail(res, err, context = '') {
  if (err instanceof MaterialError) {
    return res.status(err.httpStatus || httpStatusFor(err.code)).json({
      status: -1,
      code: err.code,
      message: err.message,
      ...(err.meta ? { meta: err.meta } : {}),
    });
  }
  console.error(`[materials] ${context} 未预期错误:`, err);
  return res.status(500).json({ status: -1, code: 'MATERIALS_INTERNAL', message: '服务器内部错误' });
}

/**
 * async 路由包装：把 MaterialError 映射为带 code 的响应。
 * （不能只交给 next()：本项目没有全局错误中间件，
 *   那样所有业务错误都会退化成一个无 code 的 500。）
 */
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (res.headersSent) return next(err);
    return fail(res, err, `${req.method} ${req.originalUrl}`);
  });

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;

const userAgent = (req) => String(req.headers['user-agent'] || '').slice(0, 255);

/* ============================================================
 * 上传频率限制（单用户）
 * ============================================================ */
/**
 * 内存滑动窗口。单实例部署下准确；多实例会放宽，属可接受的近似。
 * 与全站 express-rate-limit（按 IP）互补：这里按**用户**，防单个账号刷量。
 */
const uploadHits = new Map();
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

function checkUploadRate(userId) {
  const limit = Number(process.env.MATERIALS_UPLOAD_PER_HOUR || 5);
  if (!Number.isFinite(limit) || limit <= 0) return { allowed: true, remaining: Infinity };
  const now = Date.now();
  const list = (uploadHits.get(userId) || []).filter((t) => now - t < UPLOAD_WINDOW_MS);
  if (list.length >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: UPLOAD_WINDOW_MS - (now - list[0]) };
  }
  list.push(now);
  uploadHits.set(userId, list);
  // 顺手清理过期条目，避免 Map 无限增长
  if (uploadHits.size > 5000) {
    for (const [k, v] of uploadHits) {
      if (v.every((t) => now - t >= UPLOAD_WINDOW_MS)) uploadHits.delete(k);
    }
  }
  return { allowed: true, remaining: limit - list.length };
}

/** 上传权限：MATERIALS_UPLOAD_ROLE=admin 时收紧为仅管理员 */
function assertCanUpload(req) {
  const need = String(process.env.MATERIALS_UPLOAD_ROLE || 'student').toLowerCase();
  if (need === 'admin' && req.user.role !== 'admin') {
    throw new MaterialError('MATERIALS_FORBIDDEN', '当前仅管理员可上传学习资料', 403);
  }
  if (!req.user || !req.user.id) {
    throw new MaterialError('MATERIALS_FORBIDDEN', '请先登录', 401);
  }
}

/* ============================================================
 * 1. GET /api/materials —— 资料列表（公开）
 * ============================================================ */

router.get(
  '/',
  wrap(async (req, res) => {
    if (!gm.isConfigured()) {
      return ok(res, {
        configured: false,
        items: [],
        total: 0,
        baseUrl: null,
        message: '学习资料库尚未配置',
      });
    }

    const { index, stale } = await gm.readIndex({ fallbackToSnapshot: true });

    // pinned baseUrl：用当前 main HEAD 的 sha，既不可变又天然破 CDN 缓存
    let ref = null;
    try {
      ref = (await gm.getMainHead()).sha;
    } catch (e) {
      console.warn('[materials] 取 main HEAD 失败，改用分支名:', e.message);
    }
    const baseUrlRef = ref || process.env.GITHUB_MATERIALS_BRANCH || 'main';

    const q = String(req.query.q || '').trim().toLowerCase();
    const courseId = req.query.course ? Number(req.query.course) : null;
    const type = String(req.query.type || '').trim();
    const examNode = String(req.query.examNode || '').trim();
    const lesson =
      req.query.lesson != null && String(req.query.lesson) !== '' ? Number(req.query.lesson) : null;
    const kind = String(req.query.kind || '').trim();
    const sort = String(req.query.sort || 'recent');
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    let files = Array.isArray(index.files) ? index.files.slice() : [];

    if (courseId) files = files.filter((f) => Number(f.courseId) === courseId);
    if (type && TYPES.includes(type)) files = files.filter((f) => f.type === type);
    if (examNode) files = files.filter((f) => f.examNode === examNode);
    if (lesson != null && Number.isFinite(lesson)) {
      files = files.filter((f) => Number(f.lesson) === lesson);
    }
    if (kind) files = files.filter((f) => f.kind === kind);
    if (q) {
      files = files.filter((f) =>
        [f.title, f.description, f.courseName, f.lecturer, f.lessonTitle, ...(f.tags || [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sort === 'name') files.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh'));
    else if (sort === 'size') files.sort((a, b) => (b.size || 0) - (a.size || 0));
    else files.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    const total = files.length;
    const slice = files.slice((page - 1) * pageSize, page * pageSize);

    // 附加本站信息（下载数 / DB id）
    const paths = slice.map((f) => f.path);
    const dbMap = new Map();
    if (paths.length > 0) {
      const placeholders = paths.map(() => '?').join(',');
      const rows = await query(
        `SELECT id, material_path, download_count, status, user_id
           FROM materials
          WHERE material_path IN (${placeholders}) AND deleted_at IS NULL`,
        paths
      );
      for (const r of Array.isArray(rows) ? rows : []) dbMap.set(r.material_path, r);
    }

    const items = slice.map((f) => {
      const db = dbMap.get(f.path);
      const pinned = gm.cdnUrlFor(f.path, baseUrlRef);
      return {
        ...f,
        id: db ? db.id : null,
        status: db ? db.status : 'merged',
        downloadCount: db ? db.download_count : 0,
        cdnUrl: pinned,
        downloadUrl: pinned,
        renderUrl: `/api/materials/file/${f.path.split('/').map(encodeURIComponent).join('/')}`,
        typeMeta: TYPE_META[f.type] || null,
        examNodeMeta: f.examNode ? EXAM_NODE_META[f.examNode] || null : null,
        sourceMeta: f.source ? SOURCE_META[f.source] || null : null,
      };
    });

    return ok(res, {
      configured: true,
      stale: Boolean(stale),
      baseUrl: `${(process.env.GITHUB_MATERIALS_CDN_BASE || 'https://cdn.jsdelivr.net/gh').replace(/\/+$/, '')}/${
        process.env.GITHUB_MATERIALS_OWNER
      }/${process.env.GITHUB_MATERIALS_REPO}@${baseUrlRef}`,
      ref: baseUrlRef,
      totals: {
        files: index.stats?.totalFiles ?? (index.files || []).length,
        bytes: index.stats?.totalBytes ?? 0,
      },
      total,
      page,
      pageSize,
      items,
    });
  })
);

/* ============================================================
 * 2. GET /api/materials/courses —— 课程字典（公开，轻量）
 * ============================================================ */

router.get(
  '/courses',
  wrap(async (req, res) => {
    const q = String(req.query.q || '');
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    try {
      const courses = await cc.listCourses({ q, limit });
      return ok(res, { courses });
    } catch (e) {
      // 表不存在时给出可读提示（迁移未执行的典型症状）
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        return res.status(503).json({
          status: -1,
          code: 'MATERIALS_MIGRATION_REQUIRED',
          message: '数据库缺少 courses 表，请先执行迁移 migrations/069_materials.sql',
        });
      }
      throw e;
    }
  })
);

/* ============================================================
 * 3. POST /api/materials/courses/resolve —— 课程解析 / 自注册（需登录）
 * ============================================================ */

router.post(
  '/courses/resolve',
  authenticateToken,
  wrap(async (req, res) => {
    const body = req.body || {};
    const input = mv.validateCourseInput(body);

    // 兼容前端直接传 courseId 的情况（从下拉选中）
    const directId = body.courseId != null ? Number(body.courseId) : null;
    if (directId && Number.isInteger(directId) && directId > 0) {
      const c = await cc.getCourseById(directId);
      if (c) return ok(res, { course: c, created: false, viaAlias: false });
    }

    const autoCreate = body.autoCreate !== false && String(body.autoCreate) !== 'false';
    const result = await cc.resolveCourse(input, { autoCreate });
    if (!result.course) {
      return ok(res, { course: null, created: false, viaAlias: false, matched: false });
    }
    return ok(res, {
      course: result.course,
      created: result.created,
      viaAlias: result.viaAlias,
      matched: true,
    });
  })
);

/* ============================================================
 * 4. GET /api/materials/file/* —— 文本兜底 / 二进制跳转（公开）
 * ============================================================ */

router.get(
  '/file/*',
  wrap(async (req, res) => {
    const filePath = String(req.params[0] || '');
    if (!MATERIAL_PATH_RE.test(filePath)) {
      throw new MaterialError('MATERIALS_BAD_PATH', '路径不合法', 400);
    }

    // 只允许读取 index 里登记过的文件，避免任意仓库文件读取
    const { index } = await gm.readIndex({ fallbackToSnapshot: true });
    const entry = (index.files || []).find((f) => f.path === filePath);
    if (!entry) {
      throw new MaterialError('MATERIALS_GITHUB_NOT_FOUND', '资料不存在或已被移除', 404);
    }

    // 文本类：代理返回内容（供 Markdown 渲染；CDN 被墙时的兜底）
    if (entry.kind === 'markdown' || ['md', 'markdown', 'txt'].includes(extOf(filePath))) {
      const text = await gm.getFileText(filePath);
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).send(text);
    }

    // 其它：302 跳到 CDN（不经过本服务器传字节）
    let ref = null;
    try {
      ref = (await gm.getMainHead()).sha;
    } catch {
      ref = null;
    }
    return res.redirect(302, gm.cdnUrlFor(filePath, ref));
  })
);

/* ============================================================
 * 5. POST /api/materials/upload —— 上传（需登录 + 限流）
 * ============================================================ */

router.post(
  '/upload',
  authenticateToken,
  (req, res, next) => {
    materialUpload(req, res, (err) => {
      if (err) {
        const t = materialUpload.translateMulterError(err);
        return res.status(400).json({ status: -1, code: t.code, message: t.message });
      }
      // busyboy 默认按 latin1 解文件名，中文会变乱码 —— 统一在此修正
      if (req.file) {
        req.file.originalname = materialUpload.fixMultipartFilename(req.file.originalname);
      }
      next();
    });
  },
  wrap(async (req, res) => {
    assertCanUpload(req);

    if (String(process.env.MATERIALS_ENABLED ?? '1') === '0') {
      throw new MaterialError('MATERIALS_DISABLED', '学习资料上传已暂停', 503);
    }
    if (!gm.isConfigured()) {
      throw new MaterialError(
        'MATERIALS_NOT_CONFIGURED',
        '学习资料库尚未配置，暂时无法上传',
        503
      );
    }

    const rate = checkUploadRate(req.user.id);
    if (!rate.allowed) {
      const mins = Math.ceil((rate.retryAfterMs || 0) / 60000);
      throw new MaterialError(
        'MATERIALS_RATE_LIMITED',
        `上传过于频繁，请约 ${mins} 分钟后再试`,
        429
      );
    }

    // ---- 校验（扩展名 / 体积 / 魔数 / 元数据 / 敏感词）
    const v = await mv.validateUpload({ file: req.file, body: req.body || {} });

    // ---- 解析课程
    const body = req.body || {};
    let course = null;
    const directId = body.courseId != null ? Number(body.courseId) : null;
    if (directId && Number.isInteger(directId) && directId > 0) {
      course = await cc.getCourseById(directId);
      if (!course) throw new MaterialError('MATERIALS_BAD_COURSE', '课程不存在，请重新选择', 400);
    } else {
      const input = mv.validateCourseInput(body);
      const r = await cc.resolveCourse(input, { autoCreate: true });
      course = r.course;
    }
    if (!course) throw new MaterialError('MATERIALS_BAD_COURSE', '课程解析失败', 400);

    const materialPath = `c${course.id}/${v.meta.type}/${v.fileName}`;

    // ---- 软去重
    const dup = await mv.findDuplicate({
      sha256: v.sha256,
      courseId: course.id,
      type: v.meta.type,
      materialPath,
    });
    if (dup) {
      throw new MaterialError(
        'MATERIALS_DUPLICATE',
        `这门课下已存在相同内容的资料：${dup.title}`,
        409,
        { existingId: dup.id, existingPath: dup.material_path }
      );
    }
    const sameContentElsewhere = await mv.findSameContentElsewhere({
      sha256: v.sha256,
      courseId: course.id,
    });

    // ---- 落库（先拿到 id，用于分支名与 commit message）
    let inserted;
    try {
      inserted = await query(
        `INSERT INTO materials
           (user_id, course_id, type, material_path, title, description,
            lesson, lesson_title, exam_node, source, tags, semester, kind,
            file_name, file_size, file_sha256, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
        [
          req.user.id,
          course.id,
          v.meta.type,
          materialPath,
          v.meta.title,
          v.meta.description,
          v.meta.lesson,
          v.meta.lessonTitle,
          v.meta.examNode,
          v.meta.source,
          v.meta.tags.join(','),
          v.meta.semester,
          v.kind,
          v.fileName,
          v.size,
          v.sha256,
        ]
      );
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        throw new MaterialError(
          'MATERIALS_MIGRATION_REQUIRED',
          '数据库缺少 materials 表，请先执行迁移 migrations/069_materials.sql',
          503
        );
      }
      throw e;
    }

    const materialId = inserted.insertId;

    // ---- 昵称（资料库内唯一允许的用户数据，且只是昵称）
    let nickname = '匿名同学';
    try {
      const u = await query('SELECT nickname, username FROM users WHERE id = ? LIMIT 1', [req.user.id]);
      if (Array.isArray(u) && u[0]) nickname = u[0].nickname || u[0].username || nickname;
    } catch {
      /* 昵称取不到不影响上传 */
    }

    // ---- 推送 PR
    let publish;
    try {
      publish = await gm.publishMaterial({
        fileBuffer: req.file.buffer,
        fileName: v.fileName,
        courseId: course.id,
        type: v.meta.type,
        meta: v.meta,
        course,
        materialId,
        entryBase: {
          name: v.fileName,
          ext: v.ext,
          kind: v.kind,
          title: v.meta.title,
          description: v.meta.description,
          lesson: v.meta.lesson,
          lessonTitle: v.meta.lessonTitle,
          examNode: v.meta.examNode,
          source: v.meta.source,
          tags: v.meta.tags,
          semester: v.meta.semester,
          size: v.size,
          sha256: v.sha256,
          updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
          uploaderNickname: nickname,
          downloads: 0,
        },
      });
    } catch (e) {
      const reason = e instanceof MaterialError ? e.message : '资料库写入失败';
      await query(
        `UPDATE materials SET status = 'rejected', reject_reason = ? WHERE id = ?`,
        [String(reason).slice(0, 255), materialId]
      ).catch(() => {});
      await logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'MATERIAL_UPLOAD_FAIL',
        targetType: 'material',
        targetId: materialId,
        ip: clientIp(req),
        userAgent: userAgent(req),
        meta: { path: materialPath, reason: String(reason).slice(0, 300) },
      });
      throw e;
    }

    // ---- 回写 PR 信息
    await query(
      `UPDATE materials SET branch_name = ?, pr_number = ?, pr_url = ?, commit_sha = ? WHERE id = ?`,
      [publish.branch, publish.prNumber, publish.prUrl, publish.commit, materialId]
    ).catch((e) => console.warn('[materials] 回写 PR 信息失败:', e.message));

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'MATERIAL_UPLOAD',
      targetType: 'material',
      targetId: materialId,
      ip: clientIp(req),
      userAgent: userAgent(req),
      meta: {
        path: materialPath,
        course: course.name,
        type: v.meta.type,
        size: v.size,
        pr: publish.prNumber,
        autoMerge: publish.autoMerge?.ok ?? false,
      },
    });

    return ok(
      res,
      {
        id: materialId,
        path: materialPath,
        course,
        prNumber: publish.prNumber,
        prUrl: publish.prUrl,
        commit: publish.commit,
        autoMergeEnabled: Boolean(publish.autoMerge && publish.autoMerge.ok),
        autoMergeReason: publish.autoMerge && publish.autoMerge.reason,
        mergeableState: publish.mergeableState || null,
        status: 'pending',
        sameContentElsewhere,
        remainingUploads: rate.remaining,
      },
      '已提交，正在校验'
    );
  })
);

/* ============================================================
 * 6. GET /api/materials/upload/:id/status —— 轮询上传状态（需登录）
 * ============================================================ */

router.get(
  '/upload/:id/status',
  authenticateToken,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const rows = await query(
      `SELECT m.*, c.name AS course_name, c.lecturer
         FROM materials m LEFT JOIN courses c ON c.id = m.course_id
        WHERE m.id = ? LIMIT 1`,
      [id]
    );
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) throw new MaterialError('MATERIALS_NOT_FOUND', '上传记录不存在', 404);

    const isOwner = Number(row.user_id) === Number(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      throw new MaterialError('MATERIALS_FORBIDDEN', '无权查看该上传记录', 403);
    }

    let github = null;
    let status = row.status;

    if (row.pr_number && gm.isConfigured() && status === 'pending') {
      try {
        const pr = await gm.getPullRequest(row.pr_number);
        github = {
          state: pr.state,
          merged: Boolean(pr.merged),
          mergeableState: pr.mergeable_state,
          labels: (pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
        };
        if (pr.merged) {
          status = 'merged';
          await query('UPDATE materials SET status = ?, commit_sha = ? WHERE id = ?', [
            'merged',
            pr.merge_commit_sha || row.commit_sha,
            id,
          ]);
        } else if (pr.state === 'closed') {
          status = 'rejected';
          await query('UPDATE materials SET status = ?, reject_reason = ? WHERE id = ?', [
            'rejected',
            'PR 被关闭',
            id,
          ]);
        }
      } catch (e) {
        console.warn('[materials] 查询 PR 状态失败:', e.message);
      }
    }

    return ok(res, {
      id,
      status,
      rejectReason: row.reject_reason,
      path: row.material_path,
      title: row.title,
      course: { id: row.course_id, name: row.course_name, lecturer: row.lecturer },
      prNumber: row.pr_number,
      prUrl: row.pr_url,
      branch: row.branch_name,
      github,
    });
  })
);

/* ============================================================
 * 7. GET /api/materials/me/uploads —— 我上传的（需登录）
 * ============================================================ */

router.get(
  '/me/uploads',
  authenticateToken,
  wrap(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const rows = await query(
      `SELECT m.id, m.material_path, m.title, m.type, m.lesson, m.lesson_title,
              m.exam_node, m.source, m.kind, m.file_size, m.status, m.reject_reason,
              m.pr_number, m.pr_url, m.download_count, m.created_at,
              c.name AS course_name, c.lecturer
         FROM materials m LEFT JOIN courses c ON c.id = m.course_id
        WHERE m.user_id = ? AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT ${inlineLimit(pageSize, { fallback: 20, max: 100 })} OFFSET ${inlineOffset(offset)}`,
      [req.user.id]
    );
    const cnt = await query(
      'SELECT COUNT(*) AS n FROM materials WHERE user_id = ? AND deleted_at IS NULL',
      [req.user.id]
    );

    return ok(res, {
      total: cnt?.[0]?.n ?? 0,
      page,
      pageSize,
      items: Array.isArray(rows) ? rows : [],
    });
  })
);

/* ============================================================
 * 8. GET /api/materials/admin/stats —— 统计看板（admin）
 * ============================================================ */

router.get(
  '/admin/stats',
  authenticateToken,
  requireAdmin,
  wrap(async (req, res) => {
    const byStatus = await query(
      `SELECT status, COUNT(*) AS n FROM materials WHERE deleted_at IS NULL GROUP BY status`
    );
    const byType = await query(
      `SELECT type, COUNT(*) AS n, SUM(file_size) AS bytes
         FROM materials WHERE deleted_at IS NULL AND status = 'merged' GROUP BY type`
    );
    const topDownloads = await query(
      `SELECT id, title, material_path, download_count
         FROM materials WHERE deleted_at IS NULL
        ORDER BY download_count DESC LIMIT 10`
    );
    const topUploaders = await query(
      `SELECT m.user_id, u.nickname, u.username, COUNT(*) AS n
         FROM materials m LEFT JOIN users u ON u.id = m.user_id
        WHERE m.deleted_at IS NULL
        GROUP BY m.user_id, u.nickname, u.username
        ORDER BY n DESC LIMIT 10`
    );
    const courseCount = await query('SELECT COUNT(*) AS n FROM courses');

    let repo = null;
    if (gm.isConfigured()) {
      try {
        const { index } = await gm.readIndex({ fallbackToSnapshot: true });
        repo = {
          totalFiles: index.stats?.totalFiles ?? (index.files || []).length,
          totalBytes: index.stats?.totalBytes ?? 0,
          courses: (index.courses || []).length,
        };
      } catch (e) {
        repo = { error: e.message };
      }
    }

    return ok(res, {
      configured: gm.isConfigured(),
      // 供管理端展示（仓库标识不是机密；token 绝不下发）
      repoLabel: `${process.env.GITHUB_MATERIALS_OWNER || '?'}/${process.env.GITHUB_MATERIALS_REPO || '?'}`,
      cdnBase: process.env.GITHUB_MATERIALS_CDN_BASE || 'https://cdn.jsdelivr.net/gh',
      enabled: String(process.env.MATERIALS_ENABLED ?? '1') !== '0',
      maxFileMB: MAX_FILE_BYTES / 1024 / 1024,
      uploadRole: process.env.MATERIALS_UPLOAD_ROLE || 'student',
      byStatus: Array.isArray(byStatus) ? byStatus : [],
      byType: Array.isArray(byType) ? byType : [],
      topDownloads: Array.isArray(topDownloads) ? topDownloads : [],
      topUploaders: Array.isArray(topUploaders) ? topUploaders : [],
      dbCourses: courseCount?.[0]?.n ?? 0,
      repo,
    });
  })
);

/* ============================================================
 * 9. 课程维护（admin）
 * ============================================================ */

router.patch(
  '/admin/courses/:id',
  authenticateToken,
  requireAdmin,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const course = await cc.updateCourse(id, req.body || {});
    await logAudit({
      userId: req.user.id, role: req.user.role, action: 'MATERIAL_COURSE_UPDATE',
      targetType: 'course', targetId: id, ip: clientIp(req), userAgent: userAgent(req),
      meta: { after: course },
    });
    return ok(res, { course });
  })
);

router.post(
  '/admin/courses/merge',
  authenticateToken,
  requireAdmin,
  wrap(async (req, res) => {
    const fromId = Number((req.body || {}).fromId);
    const toId = Number((req.body || {}).toId);
    if (!fromId || !toId) {
      throw new MaterialError('MATERIALS_BAD_MERGE', '需要 fromId 与 toId', 400);
    }
    const result = await cc.mergeCourses({
      fromId,
      toId,
      operatorId: req.user.id,
      commitIndexFn: { commitIndex: gm.commitIndex },
    });
    await logAudit({
      userId: req.user.id, role: req.user.role, action: 'MATERIAL_COURSE_MERGE',
      targetType: 'course', targetId: toId, ip: clientIp(req), userAgent: userAgent(req),
      meta: { fromId, toId, ...result },
    });
    return ok(res, result);
  })
);

/* ============================================================
 * 10. POST /api/materials/download —— 下载计数（公开，按 path）
 * ============================================================ */
/**
 * 用 path 而不是 DB id：管理员手工加进仓库的文件没有 DB 行，
 * 按 path 计数更健壮。计数失败不影响下载（下载本身走 CDN，不经过本服务）。
 */
router.post(
  '/download',
  wrap(async (req, res) => {
    const p = String((req.body || {}).path || '');
    if (!MATERIAL_PATH_RE.test(p)) {
      throw new MaterialError('MATERIALS_BAD_PATH', '路径不合法', 400);
    }
    try {
      const rows = await query(
        'SELECT id FROM materials WHERE material_path = ? AND deleted_at IS NULL LIMIT 1',
        [p]
      );
      const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (row) {
        await query('INSERT INTO material_downloads (material_id, user_id) VALUES (?, ?)', [
          row.id,
          req.user ? req.user.id : null,
        ]);
        await query('UPDATE materials SET download_count = download_count + 1 WHERE id = ?', [row.id]);
      }
    } catch (e) {
      // 计数是尽力而为
      console.warn('[materials] 下载计数失败:', e.message);
    }
    return ok(res, { counted: true });
  })
);

/* ============================================================
 * 11. POST /api/materials/:id/save —— 收藏 toggle（需登录）
 * ============================================================ */

router.post(
  '/:id/save',
  authenticateToken,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new MaterialError('MATERIALS_BAD_ID', 'id 不合法', 400);
    }
    const rows = await query('SELECT id FROM materials WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows[0]) {
      throw new MaterialError('MATERIALS_NOT_FOUND', '资料不存在', 404);
    }

    const existing = await query(
      'SELECT id FROM material_saves WHERE user_id = ? AND material_id = ? LIMIT 1',
      [req.user.id, id]
    );
    let saved;
    if (Array.isArray(existing) && existing[0]) {
      await query('DELETE FROM material_saves WHERE id = ?', [existing[0].id]);
      saved = false;
    } else {
      await query('INSERT INTO material_saves (user_id, material_id) VALUES (?, ?)', [req.user.id, id]);
      saved = true;
    }
    return ok(res, { saved });
  })
);

router.get(
  '/me/saves',
  authenticateToken,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT m.id, m.material_path, m.title, m.type, m.kind, m.file_size,
              c.name AS course_name, c.lecturer
         FROM material_saves s
         JOIN materials m ON m.id = s.material_id AND m.deleted_at IS NULL
         LEFT JOIN courses c ON c.id = m.course_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
        LIMIT 200`,
      [req.user.id]
    );
    return ok(res, { items: Array.isArray(rows) ? rows : [] });
  })
);

/* ============================================================
 * 12. PATCH /api/materials/:id —— 改元数据（走 metadata-only PR）
 * ============================================================ */

router.patch(
  '/:id',
  authenticateToken,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new MaterialError('MATERIALS_BAD_ID', 'id 不合法', 400);
    }
    const rows = await query('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) throw new MaterialError('MATERIALS_NOT_FOUND', '资料不存在', 404);

    const isOwner = Number(row.user_id) === Number(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      throw new MaterialError('MATERIALS_FORBIDDEN', '只能修改自己上传的资料', 403);
    }
    if (row.status === 'removed') {
      throw new MaterialError('MATERIALS_REMOVED', '该资料已下架，无法修改', 400);
    }

    const body = req.body || {};
    // 只允许改元数据；type 改变会影响目录，禁止
    if (body.type != null && String(body.type) !== row.type) {
      throw new MaterialError('MATERIALS_TYPE_IMMUTABLE', '不支持修改文件类型，请删除后重新上传', 400);
    }

    const merged = {
      title: body.title != null ? body.title : row.title,
      type: row.type,
      examNode: body.examNode != null ? body.examNode : row.exam_node,
      source: body.source != null ? body.source : row.source,
      lesson: body.lesson != null ? body.lesson : row.lesson,
      lessonTitle: body.lessonTitle != null ? body.lessonTitle : row.lesson_title,
      description: body.description != null ? body.description : row.description,
      semester: body.semester != null ? body.semester : row.semester,
      tags: body.tags != null ? body.tags : row.tags,
    };
    const meta = mv.validateMetadata(merged);
    await mv.assertNoSensitive([
      { field: '标题', text: meta.title },
      { field: '简介', text: meta.description },
      { field: '课时标题', text: meta.lessonTitle },
      ...meta.tags.map((t) => ({ field: '标签', text: t })),
    ]);

    await query(
      `UPDATE materials SET title=?, description=?, lesson=?, lesson_title=?, exam_node=?,
              source=?, tags=?, semester=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        meta.title, meta.description, meta.lesson, meta.lessonTitle,
        meta.examNode, meta.source, meta.tags.join(','), meta.semester, id,
      ]
    );

    // metadata-only PR：只改 index.json
    let pr = null;
    if (gm.isConfigured()) {
      try {
        pr = await gm.publishIndexPatch({
          slug: id,
          title: `[materials] 修改元数据：${meta.title}`,
          body: `资料 \`${row.material_path}\` 的元数据更新。\n\n> 由 XMUMDorm 学习资料模块自动提交。`,
          message: `[materials] 修改元数据 ${row.material_path}\n\nMaterial-Id: ${id}`,
          mutate: (index) => {
            const files = (Array.isArray(index.files) ? index.files : []).map((f) => {
              if (!f || f.path !== row.material_path) return f;
              return {
                ...f,
                title: meta.title,
                description: meta.description,
                lesson: meta.lesson,
                lessonTitle: meta.lessonTitle,
                examNode: meta.examNode,
                source: meta.source,
                tags: meta.tags,
                semester: meta.semester,
                updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
              };
            });
            return { ...index, files };
          },
        });
      } catch (e) {
        console.error('[materials] 元数据 PR 失败:', e.message);
        throw new MaterialError(
          'MATERIALS_GITHUB_ERROR',
          '元数据已在本站更新，但同步到资料库失败，请稍后重试',
          502
        );
      }
    }

    await logAudit({
      userId: req.user.id, role: req.user.role, action: 'MATERIAL_UPDATE',
      targetType: 'material', targetId: id, ip: clientIp(req), userAgent: userAgent(req),
      meta: { path: row.material_path, pr: pr ? pr.prNumber : null },
    });

    return ok(res, { id, meta, pr });
  })
);

/* ============================================================
 * 13. DELETE /api/materials/:id —— 下架（本人 or admin）
 * ============================================================ */

router.delete(
  '/:id',
  authenticateToken,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new MaterialError('MATERIALS_BAD_ID', 'id 不合法', 400);
    }
    const rows = await query('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) throw new MaterialError('MATERIALS_NOT_FOUND', '资料不存在', 404);

    const isOwner = Number(row.user_id) === Number(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new MaterialError('MATERIALS_FORBIDDEN', '无权下架该资料', 403);
    }

    const reason = String((req.body || {}).reason || '').slice(0, 255);

    // 逻辑删除 + 状态标记
    await query(
      `UPDATE materials SET deleted_at = CURRENT_TIMESTAMP, status = 'removed', reject_reason = ? WHERE id = ?`,
      [reason || (isAdmin ? '管理员下架' : '上传者删除'), id]
    );

    let github = null;
    if (gm.isConfigured()) {
      try {
        github = await gm.removeMaterial({ filePath: row.material_path, title: row.title, reason });
      } catch (e) {
        console.error('[materials] 资料库下架失败:', e.message);
        github = { error: e.message };
      }
    }

    await logAudit({
      userId: req.user.id, role: req.user.role,
      action: isAdmin && !isOwner ? 'MATERIAL_ADMIN_REMOVE' : 'MATERIAL_REMOVE',
      targetType: 'material', targetId: id, ip: clientIp(req), userAgent: userAgent(req),
      meta: { path: row.material_path, reason, github: github && github.commit ? github.commit : null },
    });

    return ok(res, {
      id,
      removed: true,
      github,
      // 如实告知：CDN 可能有残留缓存，无法保证即时不可访问
      notice: '文件可能仍被 CDN 缓存，短时间内可能继续可访问；已尽力清理。',
    });
  })
);

module.exports = router;
