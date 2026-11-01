'use strict';
const { NewsError } = require('./domain');
const { campusLikeStats } = require('../campusLikeStats');
const iso = value => value instanceof Date ? value.toISOString() : value == null ? null : String(value);
const parseJSON = value => typeof value === 'string' ? JSON.parse(value) : value;
const sqlDate = value => value == null ? null : value instanceof Date ? value : new Date(value);
class Session {
  constructor(connection, assetUrl) { this.connection = connection; this.assetUrl = assetUrl; }
  async sql(sql, params = []) { const [rows] = await this.connection.execute(sql, params); return rows; }
  async admin(actor, lock = false) {
    this.viewerId = actor;
    const rows = await this.sql(`SELECT id,role,status,username,nickname,college,college_id,banned_until FROM users WHERE id=?${lock === 'exclusive' ? ' FOR UPDATE' : lock ? ' FOR SHARE' : ''}`, [actor]);
    return rows[0];
  }
  async readerAllowed(actor) { return require('../campusNewsNotifications').currentReader(this.sql.bind(this), actor); }
  async findPublication(actor, key) {
    const rows = await this.sql("SELECT post_id,snapshot FROM campus_news_versions WHERE actor_id=? AND JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.publicationRequest.key'))=? ORDER BY id DESC LIMIT 1 FOR UPDATE", [actor,key]);
    return rows[0] ? { postId: rows[0].post_id, request: parseJSON(rows[0].snapshot).publicationRequest } : null;
  }
  async colleges() { return this.sql('SELECT id,code,name FROM colleges WHERE is_active=1 ORDER BY name,id'); }
  async verifyColleges(ids) {
    for (const key of [...ids].sort()) {
      const rows = await this.sql('SELECT id FROM colleges WHERE id=? AND is_active=1 FOR SHARE', [key]);
      if (!rows.length || rows[0].id !== key) throw new NewsError(400, '学院不存在、ID 大小写不一致或已停用');
    }
  }
  async assets(ids) {
    const result = [];
    for (const key of [...ids].sort()) {
      const rows = await this.sql("SELECT id,object_key,storage_kind,state FROM campus_news_assets WHERE id=? FOR SHARE", [key]);
      if (rows[0]?.state !== 'ready') throw new NewsError(400, '图片尚未成功上传或资产不存在');
      result.push(rows[0]);
    }
    return ids.map(key => result.find(asset => asset.id === key));
  }
  async get(postId, lock = false, interactions = false) {
    const rows = await this.sql(`SELECT * FROM campus_posts WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [postId]);
    if (!rows.length) throw new NewsError(404, '校园帖子不存在');
    const post = await this.hydrate(rows[0]);
    if (interactions) post.interactions = (await campusLikeStats(this.sql.bind(this), [post.id], this.viewerId)).get(post.id);
    return post;
  }
  async hydrate(row) {
    const [authors, audiences, assets, legacyImages] = await Promise.all([
      this.sql('SELECT id,username,nickname FROM users WHERE id=?', [row.author_user_id]),
      this.sql('SELECT college_id FROM campus_post_audiences WHERE post_id=? ORDER BY college_id', [row.id]),
      this.sql('SELECT a.id,a.object_key,a.storage_kind FROM campus_news_images i JOIN campus_news_assets a ON a.id=i.asset_id WHERE i.post_id=? ORDER BY i.sort_order', [row.id]),
      this.sql('SELECT id,file_path FROM campus_post_images WHERE post_id=? ORDER BY sort_order,id', [row.id]),
    ]);
    const author = authors[0];
    return {
      id: String(row.id), sourceKind: row.source_kind, lifecycleStatus: row.lifecycle_status,
      title: row.title, content: row.content, category: row.category,
      audience: { scope: row.audience_scope || 'unclassified', collegeIds: audiences.map(a => a.college_id) },
      images: [...legacyImages.map(image => ({ id: `legacy-${image.id}`, url: this.assetUrl(image.file_path), legacyPath: image.file_path })),
        ...assets.map(asset => ({ id: asset.id, url: this.assetUrl(asset.object_key, asset.storage_kind, this.viewerId), objectKey: asset.object_key }))],
      revision: Number(row.revision), hiddenByAdmin: Boolean(row.hidden_by_admin), deletedAt: iso(row.deleted_at),
      createdBy: { id: String(row.author_user_id), name: author?.nickname || author?.username || `用户 ${row.author_user_id}` },
      organizationId: row.organization_id, feedTab: row.feed_tab,
      createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), publishedAt: iso(row.published_at),
      // Stable legacy fallback; classification never changes this timestamp.
      effectivePublishedAt: iso(row.source_kind === 'legacy' ? row.created_at : row.published_at || row.created_at),
    };
  }
  async list(input, publicFeed = false, unclassifiedLegacy = false) {
    const where = publicFeed ? ["lifecycle_status='published'", 'hidden_by_admin=0', 'deleted_at IS NULL', 'category IS NOT NULL', 'audience_scope IS NOT NULL', "(audience_scope='all' OR EXISTS(SELECT 1 FROM campus_post_audiences a WHERE a.post_id=campus_posts.id))"] : unclassifiedLegacy ? ["source_kind='legacy'", 'category IS NULL'] : ["(source_kind='news' OR category IS NOT NULL)"];
    const params = [];
    if (input.search) { where.push("title LIKE ? ESCAPE '='"); params.push(`%${input.search.replace(/[=%_]/g, '=$&')}%`); }
    if (input.category) { where.push('category=?'); params.push(input.category); }
    if (input.status) { where.push('lifecycle_status=?'); params.push(input.status); }
    if (!publicFeed && input.collegeId) { where.push("audience_scope='colleges' AND EXISTS(SELECT 1 FROM campus_post_audiences a WHERE a.post_id=campus_posts.id AND a.college_id=?)"); params.push(input.collegeId); }
    if (publicFeed && input.related) {
      where.push("(audience_scope='all' OR EXISTS(SELECT 1 FROM campus_post_audiences a WHERE a.post_id=campus_posts.id AND a.college_id=?))");
      params.push(input.relatedCollegeId || '');
    }
    const clause = where.join(' AND ');
    const count = await this.sql(`SELECT COUNT(*) AS total FROM campus_posts WHERE ${clause}`, params);
    const rows = await this.sql(`SELECT * FROM campus_posts WHERE ${clause} ORDER BY ${publicFeed ? "CASE WHEN source_kind='legacy' THEN created_at ELSE COALESCE(published_at,created_at) END" : 'updated_at'} DESC,id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`, params);
    const items = [];
    for (const row of rows) items.push(await this.hydrate(row));
    if (publicFeed) {
      const stats = await campusLikeStats(this.sql.bind(this), items.map(post => post.id), this.viewerId);
      for (const post of items) post.interactions = stats.get(post.id);
    }
    return { items, total: Number(count[0].total) };
  }
  async insert(actor, body, state) {
    const result = await this.sql("INSERT INTO campus_posts(organization_id,author_user_id,feed_tab,title,content,source_kind,lifecycle_status,category,audience_scope,revision,published_at,updated_at) VALUES(NULL,?,NULL,?,?,'news',?,?,?,1,IF(?='published',CURRENT_TIMESTAMP(3),NULL),CURRENT_TIMESTAMP(3))", [actor, body.title, body.content, state, body.category, body.audience.scope, state]);
    await this.relations(result.insertId, body);
    return this.get(result.insertId);
  }
  async relations(postId, body) {
    await this.sql('DELETE FROM campus_post_audiences WHERE post_id=?', [postId]);
    for (const college of [...body.audience.collegeIds].sort()) await this.sql('INSERT INTO campus_post_audiences(post_id,college_id) VALUES(?,?)', [postId, college]);
    if (body.imageAssetIds) {
      await this.sql('DELETE FROM campus_news_images WHERE post_id=?', [postId]);
      for (let index = 0; index < body.imageAssetIds.length; index++) await this.sql('INSERT INTO campus_news_images(post_id,asset_id,sort_order) VALUES(?,?,?)', [postId, body.imageAssetIds[index], index]);
    }
  }
  async update(post, changes, action) {
    const result = await this.sql('UPDATE campus_posts SET title=?,content=?,category=?,audience_scope=?,lifecycle_status=?,hidden_by_admin=?,deleted_at=?,published_at=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND revision=?', [changes.title, changes.content, changes.category, changes.audience.scope === 'unclassified' ? null : changes.audience.scope, changes.lifecycleStatus, changes.hiddenByAdmin ? 1 : 0, sqlDate(changes.deletedAt), sqlDate(changes.publishedAt), post.id, post.revision]);
    if (result.affectedRows !== 1) throw new NewsError(409, '版本冲突，请刷新');
    if (action === 'update' || action === 'classify') await this.relations(post.id, changes);
    return this.get(post.id);
  }
  async snapshot(post, actor, action) {
    // Persist stable logical image references, never expiring access tokens.
    const snapshot = { ...post, images: post.images.map(image => image.objectKey ? { ...image, url: `/api/campus-news/images/${image.id}` } : image) };
    const result = await this.sql('INSERT INTO campus_news_versions(post_id,revision,snapshot,actor_id,actor_name,action) VALUES(?,?,?,?,?,?)', [post.id, post.revision, JSON.stringify(snapshot), actor.id, actor.nickname || actor.username, action]);
    for (let index = 0; index < post.images.length; index++) {
      const image = post.images[index];
      if (!image.id.startsWith('legacy-')) await this.sql('INSERT INTO campus_news_version_assets(version_id,asset_id,sort_order) VALUES(?,?,?)', [result.insertId, image.id, index]);
    }
    await this.sql('INSERT INTO campus_news_audit(post_id,revision,version_id,actor_id,actor_name,action) VALUES(?,?,?,?,?,?)', [post.id, post.revision, result.insertId, actor.id, actor.nickname || actor.username, action]);
    if (['create_publish','publish'].includes(action)) await require('../campusNewsNotifications').freezeRecipients(this, post, result.insertId);
    return result.insertId;
  }
  async versions(postId) {
    const rows = await this.sql('SELECT revision,snapshot,actor_id,actor_name,action,created_at FROM campus_news_versions WHERE post_id=? ORDER BY revision DESC', [postId]);
    return { items: rows.map(row => {
      const snapshot = parseJSON(row.snapshot);
      return { ...snapshot, images: snapshot.images.map(image => image.objectKey ? { ...image, url: this.assetUrl(image.objectKey, 'local', this.viewerId) } : image), revision: Number(row.revision), actor: { id: String(row.actor_id), name: row.actor_name }, action: row.action, createdAt: iso(row.created_at) };
    }) };
  }
}
function createRepository(pool, assetUrl) {
  return {
    async transaction(work) {
      const connection = await pool.getConnection();
      try { await connection.beginTransaction(); const data = await work(new Session(connection, assetUrl)); await connection.commit(); return data; }
      catch (error) { await connection.rollback(); if (['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw new NewsError(409,'事务冲突，请使用原请求标识重试'); throw error; }
      finally { connection.release(); }
    },
    async read(work) {
      const connection = await pool.getConnection();
      try { return await work(new Session(connection, assetUrl)); }
      finally { connection.release(); }
    },
  };
}
module.exports = { createRepository, Session };
