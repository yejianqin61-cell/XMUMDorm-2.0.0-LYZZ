/**
 * 协作者本地指南只读预览网关。
 *
 * 只使用 PREVIEW_DATABASE_URL，绝不回退到应用运行时的 DATABASE_URL。
 * 生产环境必须把 PREVIEW_DATABASE_URL 配成只读账号或只读副本。
 */

const crypto = require('crypto');
const mysql = require('mysql2/promise');

function hashPreviewToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function parseTokenEntries(raw) {
  const entries = new Map();
  for (const part of String(raw || '').split(',')) {
    const [clientId, hash] = part.trim().split(':', 2);
    if (/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(clientId || '') && /^[a-f0-9]{64}$/i.test(hash || '')) {
      entries.set(clientId, hash.toLowerCase());
    }
  }
  return entries;
}

function parseOrigins(raw) {
  return new Set(String(raw || '').split(',').map((origin) => origin.trim()).filter(Boolean));
}

function createPreviewGateway({
  previewDatabaseUrl = process.env.PREVIEW_DATABASE_URL,
  tokenEntries = process.env.PREVIEW_GATEWAY_TOKENS,
  allowedOrigins = process.env.PREVIEW_ALLOWED_ORIGINS,
  createPool = mysql.createPool,
} = {}) {
  const clients = parseTokenEntries(tokenEntries);
  const origins = parseOrigins(allowedOrigins);
  const enabled = Boolean(previewDatabaseUrl && clients.size > 0 && origins.size > 0);
  let pool = null;

  function authorize({ token, origin }) {
    if (!enabled) return { ok: false, code: 'PREVIEW_DISABLED' };
    if (!origin || !origins.has(origin)) return { ok: false, code: 'PREVIEW_ORIGIN_DENIED' };

    const candidate = Buffer.from(hashPreviewToken(token), 'hex');
    for (const [clientId, expectedHash] of clients) {
      const expected = Buffer.from(expectedHash, 'hex');
      if (crypto.timingSafeEqual(candidate, expected)) return { ok: true, clientId };
    }
    return { ok: false, code: 'PREVIEW_UNAUTHORIZED' };
  }

  function readPool() {
    if (!enabled) throw new Error('Preview gateway is disabled');
    if (!pool) {
      pool = createPool(previewDatabaseUrl, {
        waitForConnections: true,
        connectionLimit: 4,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        multipleStatements: false,
      });
    }
    return pool;
  }

  async function exportGuides({ afterId = '0', snapshot = '', limit = '30' } = {}) {
    if (!/^\d{1,15}$/.test(String(afterId)) || !/^\d{1,3}$/.test(String(limit))
        || Number(limit) < 1 || Number(limit) > 30
        || (snapshot && !/^[a-f0-9]{64}$/.test(String(snapshot)))
        || (Number(afterId) > 0 && !snapshot)) {
      const error = new Error('Invalid guide export cursor');
      error.status = 400;
      throw error;
    }
    // One SELECT creates a coherent snapshot. Reject oversize exports rather
    // than silently losing articles. No author/account/interaction data or writes.
    const [rows] = await readPool().execute(
      `SELECT a.id, a.title, a.summary, a.content, a.content_type AS contentType,
              a.external_url AS externalUrl, a.published_at AS publishedAt,
              a.updated_at AS updatedAt, t.slug AS category
         FROM handbook_articles a
         JOIN handbook_tabs t ON t.id = a.tab_id
        WHERE a.deleted_at IS NULL AND a.status = 'published' AND t.is_enabled = 1
        ORDER BY a.id ASC LIMIT 1001`, []
    );
    const items = rows.map(row => ({
      id: Number(row.id), title: row.title, summary: row.summary || '',
      content: row.content || '', contentType: row.contentType || 'markdown',
      externalUrl: row.externalUrl || null, publishedAt: row.publishedAt,
      updatedAt: row.updatedAt, category: row.category, status: 'published',
    }));
    const serialized = JSON.stringify(items);
    if (items.length > 1000 || Buffer.byteLength(serialized) > 10 * 1024 * 1024) {
      const error = new Error('Guide export exceeds snapshot limit');
      error.status = 413;
      throw error;
    }
    const revision = crypto.createHash('sha256').update(serialized).digest('hex');
    if (snapshot && snapshot !== revision) {
      const error = new Error('Guide snapshot changed; restart the export');
      error.status = 409;
      throw error;
    }
    const remaining = items.filter(item => item.id > Number(afterId));
    const page = remaining.slice(0, Number(limit));
    const hasMore = remaining.length > page.length;
    return { schemaVersion: 1, snapshot: revision, total: items.length, items: page,
      hasMore, nextAfterId: hasMore ? page[page.length - 1].id : null };
  }

  return { enabled, authorize, exportGuides };
}

module.exports = { createPreviewGateway, hashPreviewToken };
