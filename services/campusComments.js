'use strict';
const crypto = require('node:crypto');
// Campus-only extension. SQL is always executed by the 04C transaction connection.
function createCampusComments({ transaction, cleanText, mapAuthor, InteractionError, id, writeResult }) {
  const fail = (status, code, message) => { throw new InteractionError(status, code, message); };
  const base = `SELECT c.*,u.username,u.nickname,u.avatar FROM campus_post_comments c LEFT JOIN users u ON u.id=c.user_id`;
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const keyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function text(raw, max = 2000) {
    if (typeof raw !== 'string') fail(400, 'COMMENT_INVALID', '评论必须为文本');
    const value = cleanText(raw.replace(/\r\n?/g, '\n')).trim();
    if (!value || [...value].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail(400, 'COMMENT_INVALID', `请输入1–${max}字纯文本`);
    return value;
  }
  async function row(sql, postId, commentId, lock = false) {
    // Lock only comment records, never nullable user-side join rows.
    if (lock) await sql('SELECT id FROM campus_post_comments WHERE post_id=? AND id=? FOR UPDATE', [postId, commentId]);
    const found = await sql(`${base} WHERE c.post_id=? AND c.id=?`, [postId, commentId]);
    return found[0];
  }
  async function count(sql, postId) {
    const rows = await sql('SELECT COUNT(*) AS cnt FROM campus_post_comments WHERE post_id=? AND deleted_at IS NULL', [postId]);
    const n=Number(rows[0]?.cnt);
    if(!Number.isSafeInteger(n)||n<0)fail(503,'COMMENT_COUNT_UNAVAILABLE','评论数量暂不可用');
    return n;
  }
  function dto(c, user, targets = new Map()) {
    const deleted = Boolean(c.deleted_at), target = targets.get(Number(c.reply_to_comment_id));
    return { id: String(c.id), post_id: String(c.post_id), user_id: c.user_id == null ? null : String(c.user_id),
      parent_id: c.parent_id == null ? null : String(c.parent_id), root_id: String(c.parent_id ?? c.id),
      content: deleted ? null : c.content, created_at: c.created_at, deleted_at: c.deleted_at ?? null, is_deleted: deleted,
      author: { ...mapAuthor(c), ...(!c.username&&!c.nickname?{name:'用户已不可用'}:{}) }, can_delete: Boolean(user && (Number(c.user_id) === Number(user.id) || user.role === 'admin')),
      reply_to: c.reply_to_comment_id == null ? null : { comment_id: String(c.reply_to_comment_id),
        user_id: c.reply_to_user_id == null ? null : String(c.reply_to_user_id),
        display_name: c.reply_to_name || '用户已不可用', is_deleted: !target || Boolean(target.deleted_at) } };
  }
  async function serialize(sql, rows, user) {
    const ids = [...new Set(rows.filter(c => c.reply_to_comment_id != null).map(c => Number(c.reply_to_comment_id)))];
    const targets = ids.length ? await sql(`SELECT id,deleted_at FROM campus_post_comments WHERE post_id=? AND id IN (${ids.map(() => '?').join(',')})`, [rows[0].post_id, ...ids]) : [];
    return rows.map(c => dto(c, user, new Map(targets.map(t => [Number(t.id), t]))));
  }
  function cursorSecret() {
    if (!process.env.JWT_SECRET) fail(503, 'COMMENT_CURSOR_UNAVAILABLE', '评论分页暂不可用');
    return process.env.JWT_SECRET;
  }
  function encodeCursor(data) {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    return `${payload}.${crypto.createHmac('sha256', cursorSecret()).update('campus-comments:v1:'+payload).digest('base64url')}`;
  }
  function parseCursor(raw, postId, rootId) {
    if (!raw) return null;
    if (typeof raw !== 'string' || raw.length > 1500) fail(400, 'COMMENT_CURSOR_INVALID', '分页游标无效');
    try {
      const [payload, sig, extra] = raw.split('.');
      const expected = crypto.createHmac('sha256', cursorSecret()).update('campus-comments:v1:'+payload).digest();
      const supplied = Buffer.from(sig || '', 'base64url');
      if (extra || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw Error();
      const c = JSON.parse(Buffer.from(payload, 'base64url'));
      if (c.v !== 1 || c.p !== postId || c.r !== rootId || !Number.isSafeInteger(c.max) || c.max < 0
        || !Number.isSafeInteger(c.last) || c.last < 0 || c.last > c.max || !Number.isFinite(Date.parse(c.time))) throw Error();
      return c;
    } catch (e) { if (e instanceof InteractionError && e.status === 503) throw e; fail(400, 'COMMENT_CURSOR_INVALID', '分页游标无效或不属于当前线程'); }
  }
  function limitOf(raw) {
    const n = raw == null ? 20 : Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 50) fail(400, 'COMMENT_LIMIT_INVALID', '分页数量须为1–50');
    return n;
  }
  async function page(sql, postId, rootId, max, cursor, limit, user) {
    const params = [postId, max], conditions = ['c.post_id=?', 'c.id<=?'];
    if (rootId == null) conditions.push('c.parent_id IS NULL', '(c.deleted_at IS NULL OR EXISTS (SELECT 1 FROM campus_post_comments child WHERE child.post_id=c.post_id AND child.parent_id=c.id AND child.deleted_at IS NULL))');
    else { conditions.push('c.parent_id=?'); params.push(rootId); }
    if (cursor) { conditions.push('(c.created_at>? OR (c.created_at=? AND c.id>?))'); params.push(new Date(cursor.time), new Date(cursor.time), cursor.last); }
    const rows = await sql(`${base} WHERE ${conditions.join(' AND ')} ORDER BY c.created_at ASC,c.id ASC LIMIT ${limit + 1}`, params);
    const more = rows.length > limit, chosen = rows.slice(0, limit), tail = chosen.at(-1);
    return { items: await serialize(sql, chosen, user), next_cursor: more && tail ? encodeCursor({ v:1,p:postId,r:rootId,max,last:Number(tail.id),time:new Date(tail.created_at).toISOString() }) : null };
  }
  async function create(actorId, postId, body, requestKey) {
    if (!body || Object.keys(body).some(k => !['content','parent_id','reply_to_comment_id'].includes(k))) fail(400, 'COMMENT_FIELDS_INVALID', '评论包含不支持的字段');
    if (body.parent_id != null && body.reply_to_comment_id != null) fail(400, 'COMMENT_TARGET_AMBIGUOUS', '只能指定一种回复目标');
    const content = text(body.content), targetId = body.reply_to_comment_id ?? body.parent_id;
    const target = targetId == null ? null : id(targetId);
    if (requestKey != null && (typeof requestKey !== 'string' || !keyPattern.test(requestKey))) fail(400, 'COMMENT_KEY_INVALID', '请求标识必须为UUID v4');
    const key = requestKey?.toLowerCase(), fingerprint = digest(JSON.stringify([1,'campus_comment_create','campus_post',String(id(postId)),content,target == null ? null : String(target)]));
    const execute = () => transaction(actorId, postId, async ({ sql, user, postId, actorId }) => {
      if (key) {
        const receipts = await sql('SELECT operation,post_id,payload_sha256,result_comment_id FROM campus_interaction_requests WHERE actor_id=? AND request_key=? FOR UPDATE', [actorId,key]);
        if (receipts.length) {
          const receipt = receipts[0];
          if (receipt.operation !== 'campus_comment_create' || Number(receipt.post_id) !== postId || receipt.payload_sha256 !== fingerprint) fail(409, 'COMMENT_REQUEST_CONFLICT', '同一请求标识不能用于不同内容');
          const previous = receipt.result_comment_id && await row(sql, postId, receipt.result_comment_id);
          if (!previous || Number(previous.user_id) !== actorId) fail(503, 'COMMENT_RECEIPT_INVALID', '请求记录不完整，请联系管理员核对');
          return { ...(await serialize(sql, [previous], user))[0], comment_count: await count(sql,postId), replayed:true };
        }
      }
      let parent = null, reply = null;
      if (target != null) {
        reply = await row(sql,postId,target,true);
        if (!reply) fail(404, 'COMMENT_PARENT_UNAVAILABLE', '回复目标不存在');
        parent = reply.parent_id == null ? reply : await row(sql,postId,Number(reply.parent_id),true);
        if (!parent || parent.parent_id != null || Number(parent.post_id) !== postId) fail(409, 'COMMENT_THREAD_INVALID', '评论线程不兼容，请刷新');
        if (reply.deleted_at || parent.deleted_at) fail(409, 'COMMENT_TARGET_DELETED', '回复目标已删除，请刷新后直接评论');
      }
      const result = await sql('INSERT INTO campus_post_comments (post_id,user_id,parent_id,content,reply_to_comment_id,reply_to_user_id,reply_to_name) VALUES (?,?,?,?,?,?,?)',
        [postId,actorId,parent?.id ?? null,content,reply?.id ?? null,reply?.user_id ?? null,reply ? reply.username||reply.nickname ? mapAuthor(reply).name : '用户已不可用' : null]);writeResult(result);
      if (key) {
        try { writeResult(await sql('INSERT INTO campus_interaction_requests (actor_id,request_key,operation,post_id,payload_sha256,result_comment_id) VALUES (?,?,?,?,?,?)', [actorId,key,'campus_comment_create',postId,fingerprint,result.insertId])); }
        catch (e) { if (e.code === 'ER_DUP_ENTRY' && /PRIMARY/.test(e.sqlMessage || e.message || '')) fail(503,'COMMENT_RECEIPT_RACE','请求竞争，请用原标识重试'); throw e; }
      }
      const created = await row(sql,postId,result.insertId);
      if (!created) fail(503,'COMMENT_READBACK_FAILED','未确认评论写入');
      return { ...(await serialize(sql,[created],user))[0], comment_count:await count(sql,postId), replayed:false };
    });
    // Only retry a known rolled-back receipt uniqueness race, never unknown COMMIT.
    try { return await execute(); } catch(e) { if (key && e.code === 'COMMENT_RECEIPT_RACE') return execute(); throw e; }
  }
  return {
    comment(actorId,postId,body = {},requestKey) { return create(actorId,postId,body,requestKey); },
    comments(actorId,postId,options = {}) {
      return transaction(actorId,postId,async ({sql,user,postId,complete}) => {
        const rootId = options.rootId == null ? null : id(options.rootId), limit = limitOf(options.limit);
        if (rootId != null) { const root = await row(sql,postId,rootId); if (!root || root.parent_id != null) fail(404,'COMMENT_ROOT_UNAVAILABLE','评论线程不存在'); }
        if (!options.threads && rootId == null) {
          const rows = await sql(`${base} WHERE c.post_id=? ORDER BY c.created_at ASC,c.id ASC`,[postId]);
          const all = await serialize(sql,rows,user), liveRoots = all.filter(c=>c.parent_id==null);
          return liveRoots.map(c=>({...c,replies:all.filter(r=>r.parent_id===c.id)})).filter(c=>!c.is_deleted || c.replies.some(r=>!r.is_deleted));
        }
        const cursor = parseCursor(options.cursor,postId,rootId);
        const [watermark] = await sql('SELECT COALESCE(MAX(id),0) AS max_id FROM campus_post_comments WHERE post_id=?',[postId]);
        const max = cursor?.max ?? Number(watermark.max_id);
        const result = await page(sql,postId,rootId,max,cursor,limit,user);
        if (rootId == null) for (const root of result.items) {
          const replies = await page(sql,postId,Number(root.id),max,null,limit,user);
          const counts = await sql('SELECT COUNT(*) AS cnt FROM campus_post_comments WHERE post_id=? AND parent_id=? AND deleted_at IS NULL',[postId,Number(root.id)]);
          root.replies = replies.items; root.reply_next_cursor = replies.next_cursor;root.reply_count = Number(counts[0].cnt);
          root.reply_start_cursor=encodeCursor({v:1,p:postId,r:Number(root.id),max,last:0,time:'1970-01-01T00:00:00.000Z'});
        }
        return { ...result,snapshot_max_id:max,comment_count:await count(sql,postId),can_comment:Boolean(user&&complete) };
      },true);
    },
    deleteComment(actorId,postId,commentId,body = {}) {
      commentId=id(commentId);
      return transaction(actorId,postId,async ({sql,user,postId,actorId})=>{
        const c=await row(sql,postId,commentId,true);if(!c)fail(404,'COMMENT_NOT_FOUND','评论不存在');
        const own=Number(c.user_id)===actorId;
        if(!own&&user.role!=='admin')fail(403,'COMMENT_DELETE_FORBIDDEN','不能删除他人的评论');
        if(!c.deleted_at){
          const reason=own?null:text(body.reason,500);
          writeResult(await sql('UPDATE campus_post_comments SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND post_id=? AND deleted_at IS NULL',[commentId,postId]));
          writeResult(await sql('INSERT INTO audit_logs (user_id,role,action,target_type,target_id,meta) VALUES (?,?,?,?,?,?)',
            [actorId,user.role,own?'CAMPUS_COMMENT_SELF_DELETE':'CAMPUS_COMMENT_ADMIN_DELETE','campus_comment',commentId,JSON.stringify({schema_version:1,post_id:postId,root_id:c.parent_id??c.id,author_id:c.user_id,reply_to_comment_id:c.reply_to_comment_id??null,reason,content_sha256:digest(c.content),content_length:[...c.content].length})]));
        }
        const deleted=await row(sql,postId,commentId);
        return { ...(await serialize(sql,[deleted],user))[0],changed:!c.deleted_at,comment_count:await count(sql,postId) };
      });
    },
  };
}
module.exports={createCampusComments};
