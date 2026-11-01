'use strict';

// Reviewed stable IDs only. Labels and programme records always come from MySQL.
const COLLEGE_IDS = Object.freeze(['xmum-sem', 'xmum-soc', 'xmum-sass', 'xmum-sece', 'xmum-cams', 'xmum-scds', 'xmum-sair', 'xmum-somp', 'xmum-stcm', 'xmum-sfs']);
class IdentityError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const text = v => v == null ? null : String(v).trim() || null;
function id(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || v.length > 64 || !/^[a-z0-9-]+$/.test(v)) throw new IdentityError(400, 'INVALID_ACADEMIC_ID', '学院或专业标识无效');
  return v;
}
const sqlRows = async (c, sql, params = []) => {
  const [rows] = await c.execute(sql, params);
  return rows;
};
async function colleges(c) {
  return sqlRows(c, `SELECT id,code,name,name_en AS nameEn FROM colleges WHERE is_active=1 AND id IN (${COLLEGE_IDS.map(() => '?').join(',')}) ORDER BY code,id`, COLLEGE_IDS);
}
async function college(c, value, lock = false) {
  const key = id(value);
  if (!COLLEGE_IDS.includes(key)) throw new IdentityError(400, 'INVALID_COLLEGE', '请选择有效的正式学院');
  const rows = await sqlRows(c, 'SELECT id,code,name,name_en AS nameEn FROM colleges WHERE id=? AND is_active=1' + (lock ? ' FOR SHARE' : ''), [key]);
  if (!rows.length) throw new IdentityError(400, 'INVALID_COLLEGE', '学院不存在或已停用');
  return rows[0];
}
async function programmes(c, key) {
  await college(c, key);
  return sqlRows(c, 'SELECT id,code,college_id AS collegeId,name,name_en AS nameEn,level FROM academic_programmes WHERE college_id=? AND is_active=1 ORDER BY level,code,id', [key]);
}
async function selection(c, user) {
  const available = has(user, 'college_id');
  let school = null,
    programme = null;
  if (available && user.college_id) {
    try {
      school = await college(c, user.college_id);
      if (user.programme_id) {
        const p = await sqlRows(c, 'SELECT id,college_id AS collegeId,name,name_en AS nameEn,level FROM academic_programmes WHERE id=? AND college_id=? AND is_active=1', [user.programme_id, school.id]);
        programme = p[0] || null;
      }
    } catch (e) {
      if (!(e instanceof IdentityError)) throw e;
    }
  }
  return {
    collegeId: school?.id || null,
    programmeId: programme?.id || null,
    academicIdentity: {
      available,
      college: school,
      programme,
      needsSelection: !school || !!(user.programme_id && !programme),
      legacy: {
        college: text(user.college),
        major: text(user.major)
      }
    }
  };
}
async function ownSelection(c, userId) {
  const rows = await sqlRows(c, 'SELECT * FROM users WHERE id=? LIMIT 1', [userId]);
  if (!rows.length) throw new IdentityError(404, 'USER_NOT_FOUND', '用户不存在');
  return selection(c, rows[0]);
}
async function saveProfile(pool, userId, body) {
  if (['id', 'user_id', 'userId', 'role', 'status'].some(k => has(body, k))) throw new IdentityError(400, 'PROFILE_TARGET_FORBIDDEN', '只能更新当前登录用户的个人资料');
  const name = text(body.nickname ?? body.username);
  if (!name) throw new IdentityError(400, 'NICKNAME_REQUIRED', '昵称不能为空');
  if (['admin', 'xmumdorm_official'].includes(name.toLowerCase())) throw new IdentityError(400, 'NICKNAME_RESERVED', '该昵称不可用');
  const stable = has(body, 'collegeId') || has(body, 'programmeId');
  if (stable && (!has(body, 'collegeId') || !has(body, 'programmeId'))) throw new IdentityError(400, 'INCOMPLETE_IDENTITY', '学院和专业标识须同时提交，专业可为空');
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const rows = await sqlRows(c, 'SELECT * FROM users WHERE id=? FOR UPDATE', [userId]);
    const old = rows[0];
    if (!old || old.status !== 'active') throw new IdentityError(403, 'USER_INACTIVE', '账号当前不可用');
    const fields = {
      nickname: name
    };
    for (const k of ['college', 'major', 'grade']) if (has(body, k)) fields[k] = text(body[k]);
    for (const k of ['show_college', 'show_grade', 'show_major']) if (has(body, k)) fields[k] = body[k] === true || body[k] === 1 ? 1 : 0;
    if (stable) {
      if (!has(old, 'college_id') || !has(old, 'programme_id')) throw new IdentityError(503, 'ACADEMIC_SCHEMA_UNAVAILABLE', '学院资料功能尚未部署');
      const cid = id(body.collegeId),
        pid = id(body.programmeId);
      if (pid && !cid) throw new IdentityError(400, 'COLLEGE_REQUIRED', '请选择学院后再选择专业');
      fields.college_id = cid;
      fields.programme_id = pid;
      if (cid) {
        const school = await college(c, cid, true);
        fields.college = school.name;
        fields.major = null;
        if (pid) {
          const p = await sqlRows(c, 'SELECT id,college_id,name FROM academic_programmes WHERE id=? AND is_active=1 FOR SHARE', [pid]);
          if (!p.length) throw new IdentityError(400, 'INVALID_PROGRAMME', '专业不存在或已停用');
          if (p[0].college_id !== cid) throw new IdentityError(400, 'PROGRAMME_COLLEGE_MISMATCH', '专业不属于所选学院');
          fields.major = p[0].name;
        }
      } else {
        fields.college = old.college;
        fields.major = old.major;
      }
    } else if (old.college_id && ['college', 'major'].some(k => has(body, k) && text(body[k]) !== text(old[k]))) throw new IdentityError(409, 'RESELECT_ACADEMIC_IDENTITY', '请使用新版学院和专业选择器修改身份');
    // Legacy clients keep their existing fields. Unsupported schema never reports an ID save success.
    for (const key of Object.keys(fields)) if (!has(old, key)) delete fields[key];
    const keys = Object.keys(fields);
    const [result] = await c.execute('UPDATE users SET ' + keys.map(k => '`' + k + '`=?').join(',') + ' WHERE id=?', [...keys.map(k => fields[k]), userId]);
    if (result.affectedRows > 1) throw new Error('Unexpected profile update row count');
    const updated = {
      ...old,
      ...fields
    };
    const academic = await selection(c, updated);
    await c.commit();
    return {
      nickname: updated.nickname,
      college: text(updated.college),
      major: text(updated.major),
      grade: text(updated.grade),
      show_college: !!updated.show_college,
      show_grade: !!updated.show_grade,
      show_major: !!updated.show_major,
      ...academic
    };
  } catch (e) {
    await c.rollback();
    if (e.code === 'ER_LOCK_DEADLOCK' || e.code === 'ER_LOCK_WAIT_TIMEOUT') throw new IdentityError(409, 'PROFILE_RETRY', '资料暂时冲突，请重试');
    throw e;
  } finally {
    c.release();
  }
}
module.exports = {
  COLLEGE_IDS,
  IdentityError,
  colleges,
  college,
  programmes,
  selection,
  ownSelection,
  saveProfile
};
