/**
 * ============================================
 * 学习资料 · 课程字典
 * ============================================
 * 课程身份 = **课程名 + 讲师**（联合唯一）；`course_code`（如 BSC103）可选、不唯一。
 *
 * 关键实现细节：
 *  · 讲师未知用**空串**而非 NULL —— MySQL 唯一约束对 NULL 不生效，
 *    用 '' 才能保证「同名 + 都没填讲师」收束成一门课。
 *  · 解析顺序：别名表 → courses 表 → （允许时）自注册。
 *  · 自注册有并发竞态（两个请求同时新建同一门课），靠 UNIQUE 约束 +
 *    ER_DUP_ENTRY 后重查来解决。
 *  · 「通用 / 其他」是 id 固定的伪课程（承接不属于任何课程的资料）。
 */

const { query, pool } = require('../database');
const { inlineLimit } = require('../utils/sqlLimit');
const { MaterialError } = require('./materialErrors');
const {
  PSEUDO_COURSE_ID,
  PSEUDO_COURSE_NAME,
  MAX_COURSE_NAME_LEN,
  MAX_LECTURER_LEN,
} = require('../shared/constants/materials');

/**
 * 规范化课程名 / 讲师：
 *  · 去首尾空白
 *  · 折叠内部连续空白为一个空格
 *  · 全角空格归一为半角
 *  · 不做大小写折叠（课程名多为中文；英文课名的官方写法应保留）
 */
function normalizeName(s) {
  return String(s == null ? '' : s)
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCourseInput({ name, lecturer, code }) {
  const n = normalizeName(name).slice(0, MAX_COURSE_NAME_LEN);
  const l = normalizeName(lecturer).slice(0, MAX_LECTURER_LEN);
  const c = normalizeName(code).slice(0, 32);
  if (!n) {
    throw new MaterialError('MATERIALS_BAD_COURSE', '请填写课程名');
  }
  return { name: n, lecturer: l, code: c || null };
}

/* ============================================================
 * 查询
 * ============================================================ */

async function getCourseById(id) {
  const rows = await query(
    'SELECT id, name, lecturer, course_code, is_pseudo FROM courses WHERE id = ? LIMIT 1',
    [id]
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/** 精确匹配（规范化后） */
async function findExact(name, lecturer) {
  const rows = await query(
    'SELECT id, name, lecturer, course_code, is_pseudo FROM courses WHERE name = ? AND lecturer = ? LIMIT 1',
    [name, lecturer]
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/** 别名表匹配（admin 合并后，旧名仍能解析到 canonical） */
async function findAlias(name, lecturer) {
  const rows = await query(
    `SELECT c.id, c.name, c.lecturer, c.course_code, c.is_pseudo
       FROM course_aliases a
       JOIN courses c ON c.id = a.course_id
      WHERE a.alias_name = ? AND a.alias_lecturer = ?
      LIMIT 1`,
    [name, lecturer]
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/**
 * 解析课程：别名 → 精确 → 自注册。
 * @param {object} input - { name, lecturer, code }
 * @param {object} [opts]
 * @param {boolean} [opts.autoCreate=false] - 未命中时是否自注册（上传时 true，补全时 false）
 * @returns {Promise<{course: object, created: boolean, viaAlias: boolean}>}
 */
async function resolveCourse(input, { autoCreate = false } = {}) {
  const { name, lecturer, code } = normalizeCourseInput(input);

  const alias = await findAlias(name, lecturer);
  if (alias) return { course: alias, created: false, viaAlias: true };

  const exact = await findExact(name, lecturer);
  if (exact) {
    // 补全缺失的 course_code（用户这次填了、库里没有）
    if (code && !exact.course_code) {
      try {
        await query('UPDATE courses SET course_code = ? WHERE id = ?', [code, exact.id]);
        exact.course_code = code;
      } catch (e) {
        console.warn('[courseCatalog] 补写 course_code 失败:', e.message);
      }
    }
    return { course: exact, created: false, viaAlias: false };
  }

  if (!autoCreate) return { course: null, created: false, viaAlias: false };

  // 自注册（并发竞态：靠 UNIQUE(name, lecturer) + 重查解决）
  try {
    const result = await query(
      'INSERT INTO courses (name, lecturer, course_code, is_pseudo) VALUES (?, ?, ?, 0)',
      [name, lecturer, code]
    );
    const created = await getCourseById(result.insertId);
    return { course: created, created: true, viaAlias: false };
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      const again = await findExact(name, lecturer);
      if (again) return { course: again, created: false, viaAlias: false };
    }
    throw e;
  }
}

/** 伪课程（通用 / 其他） */
async function getPseudoCourse() {
  const c = await getCourseById(PSEUDO_COURSE_ID);
  if (c) return c;
  // 兜底：迁移里已 INSERT IGNORE，这里再保一次
  try {
    await query(
      'INSERT IGNORE INTO courses (id, name, lecturer, course_code, is_pseudo) VALUES (?, ?, ?, NULL, 1)',
      [PSEUDO_COURSE_ID, PSEUDO_COURSE_NAME]
    );
  } catch (e) {
    console.warn('[courseCatalog] 伪课程兜底插入失败:', e.message);
  }
  return getCourseById(PSEUDO_COURSE_ID);
}

/**
 * 课程列表（带资料数）。供轻量 API / 自动补全用。
 * 只统计**未删除**的资料。
 */
async function listCourses({ q = '', limit = 200, withCounts = true } = {}) {
  const kw = normalizeName(q);
  const params = [];
  let where = '';
  if (kw) {
    where = 'WHERE (c.name LIKE ? OR c.lecturer LIKE ? OR c.course_code LIKE ?)';
    const like = `%${kw}%`;
    params.push(like, like, like);
  }
  // LIMIT 内联整数（不能写成 LIMIT ?）——原因见 utils/sqlLimit.js 的文件头注释
  const lim = inlineLimit(limit, { fallback: 200, max: 500 });

  if (!withCounts) {
    const rows = await query(
      `SELECT c.id AS courseId, c.name, c.lecturer, c.course_code AS courseCode, c.is_pseudo AS isPseudo
         FROM courses c ${where}
        ORDER BY c.name ASC, c.lecturer ASC
        LIMIT ${lim}`,
      params
    );
    return Array.isArray(rows) ? rows : [];
  }

  const rows = await query(
    `SELECT c.id AS courseId, c.name, c.lecturer, c.course_code AS courseCode, c.is_pseudo AS isPseudo,
            COUNT(m.id) AS materialCount
       FROM courses c
       LEFT JOIN materials m
              ON m.course_id = c.id AND m.deleted_at IS NULL AND m.status = 'merged'
       ${where}
      GROUP BY c.id, c.name, c.lecturer, c.course_code, c.is_pseudo
      HAVING materialCount > 0 OR c.is_pseudo = 1
      ORDER BY materialCount DESC, c.name ASC, c.lecturer ASC
      LIMIT ${lim}`,
    params
  );
  return Array.isArray(rows) ? rows : [];
}

/* ============================================================
 * 维护（admin）
 * ============================================================ */

/** 改名 / 改讲师 / 补 code。改名可能撞唯一约束，需给出可读错误。 */
async function updateCourse(id, patch = {}) {
  const cur = await getCourseById(id);
  if (!cur) throw new MaterialError('MATERIALS_COURSE_NOT_FOUND', '课程不存在', 404);
  if (cur.is_pseudo) throw new MaterialError('MATERIALS_COURSE_PSEUDO', '伪课程不可改名', 400);

  const name = patch.name != null ? normalizeName(patch.name).slice(0, MAX_COURSE_NAME_LEN) : cur.name;
  const lecturer = patch.lecturer != null ? normalizeName(patch.lecturer).slice(0, MAX_LECTURER_LEN) : cur.lecturer;
  const code = patch.code != null ? normalizeName(patch.code).slice(0, 32) : cur.course_code;
  if (!name) throw new MaterialError('MATERIALS_BAD_COURSE', '课程名不能为空');

  try {
    await query('UPDATE courses SET name = ?, lecturer = ?, course_code = ? WHERE id = ?', [
      name, lecturer, code || null, id,
    ]);
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      throw new MaterialError(
        'MATERIALS_COURSE_EXISTS',
        `已存在同名同讲师的课程：${name}${lecturer ? ` · ${lecturer}` : ''}`,
        409
      );
    }
    throw e;
  }
  return getCourseById(id);
}

/**
 * 合并课程：把 fromId 的所有资料与别名并入 toId，并**重写资料库 index.json 里的 courseId**。
 *
 * 注意：重写 index 需要调用 GitHub（由路由层传入 commitIndexFn，避免本文件依赖 githubMaterials）。
 *
 * @returns {Promise<{moved: number, aliasRecorded: boolean, indexCommit: string|null}>}
 */
async function mergeCourses({ fromId, toId, commitIndexFn = null, operatorId = null }) {
  const from = await getCourseById(fromId);
  const to = await getCourseById(toId);
  if (!from || !to) throw new MaterialError('MATERIALS_COURSE_NOT_FOUND', '课程不存在', 404);
  if (Number(fromId) === Number(toId)) {
    throw new MaterialError('MATERIALS_BAD_MERGE', '不能把课程合并到自己', 400);
  }
  if (from.is_pseudo) throw new MaterialError('MATERIALS_BAD_MERGE', '伪课程不可被合并', 400);

  const conn = await pool.getConnection();
  let moved = 0;
  let aliasRecorded = false;
  try {
    await conn.beginTransaction();

    const [r1] = await conn.execute('UPDATE materials SET course_id = ? WHERE course_id = ?', [toId, fromId]);
    moved = r1.affectedRows || 0;

    // 记录别名，让旧名仍能解析到新课程
    await conn.execute(
      `INSERT INTO course_aliases (course_id, alias_name, alias_lecturer, alias_code)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)`,
      [toId, from.name, from.lecturer, from.course_code || null]
    );
    aliasRecorded = true;

    // 把 from 自己的别名也转挂到 to
    await conn.execute('UPDATE course_aliases SET course_id = ? WHERE course_id = ?', [toId, fromId]);

    await conn.execute('DELETE FROM courses WHERE id = ?', [fromId]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // 重写资料库索引里的 courseId（失败不回滚 DB：DB 是权威，index 可再修）
  let indexCommit = null;
  let indexPrUrl = null;
  if (commitIndexFn && typeof commitIndexFn.commitIndex === 'function') {
    try {
      const res = await commitIndexFn.commitIndex({
        slug: `merge-${fromId}-${toId}`,
        message: `[materials] 课程合并：${from.name} → ${to.name}\n\nOperator: ${operatorId || 'admin'}\nMoved: ${moved}`,
        // 传 mutate 而非成品 index：冲突重试时会基于**重新读取的最新 index** 再算一次
        mutate: (index) => {
          const files = (Array.isArray(index.files) ? index.files : []).map((f) => {
            if (!f || Number(f.courseId) !== Number(fromId)) return f;
            return { ...f, courseId: Number(toId), courseName: to.name, lecturer: to.lecturer };
          });
          const courses = (Array.isArray(index.courses) ? index.courses : [])
            .filter((c) => Number(c.courseId) !== Number(fromId));
          const ci = courses.findIndex((c) => Number(c.courseId) === Number(toId));
          const courseEntry = { courseId: Number(toId), name: to.name, lecturer: to.lecturer };
          if (ci >= 0) courses[ci] = courseEntry;
          else courses.push(courseEntry);
          return { ...index, files, courses };
        },
      });
      indexCommit = res.commit;
      indexPrUrl = res.prUrl;
    } catch (e) {
      console.warn('[courseCatalog] 重写 index 失败（DB 已完成合并）:', e.message);
      indexCommit = null;
    }
  }

  return { moved, aliasRecorded, indexCommit, indexPrUrl };
}

module.exports = {
  normalizeName,
  normalizeCourseInput,
  resolveCourse,
  getCourseById,
  getPseudoCourse,
  listCourses,
  updateCourse,
  mergeCourses,
  findExact,
  findAlias,
};
