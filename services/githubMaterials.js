/**
 * ============================================
 * 学习资料 · GitHub 通信层（唯一与 GitHub 通信的模块）
 * ============================================
 * 设计约束（均有实测依据，见 docs/04-Module/M10-学习资料/Module10-学习资料设计.md）：
 *
 *  1. **PAT 只在本文件使用**，永不记录、永不下发前端。
 *  2. **大 blob 必须退避重试**：实测 20MB blob 偶发 502 Bad Gateway。
 *  3. **分支只能复用，不能依赖删除**：仓库 ruleset 对 `~ALL` 生效且 bypass 为空，
 *     只能靠 ref 排除项让 `upload/*` 可删；为稳妥，重试时一律复用同名分支。
 *  4. **index.json 必须从 API 读，不能从 CDN 读**：jsDelivr 缓存 7 天，
 *     读过期副本再写回会把别人的新条目**回滚**。CDN 只提供给前端读文件字节。
 *  5. 使用 Git Data API（blobs/trees/commits）而非 Contents API 写文件：
 *     Contents API 的 base64 请求体约 1MB 上限，20MB 走不通。
 *  6. 显式带 X-GitHub-Api-Version，避免行为漂移。
 */

const fs = require('fs');
const path = require('path');
const { MaterialError } = require('./materialErrors');

const API = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';
const API_VERSION = '2022-11-28';

const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'materials-index.cache.json');

/* ============================================================
 * 配置
 * ============================================================ */

function cfg() {
  const owner = (process.env.GITHUB_MATERIALS_OWNER || '').trim();
  const repo = (process.env.GITHUB_MATERIALS_REPO || '').trim();
  const token = (process.env.GITHUB_MATERIALS_TOKEN || '').trim();
  return {
    owner,
    repo,
    token,
    branch: (process.env.GITHUB_MATERIALS_BRANCH || 'main').trim(),
    cdnBase: (process.env.GITHUB_MATERIALS_CDN_BASE || 'https://cdn.jsdelivr.net/gh').trim(),
    enabled: String(process.env.MATERIALS_ENABLED ?? '1') !== '0',
    timeoutMs: Number(process.env.MATERIALS_GITHUB_TIMEOUT_MS || 60000),
  };
}

/** 是否已配置资料库（未配置时上传接口应返回 503，而不是 500） */
function isConfigured() {
  const c = cfg();
  return Boolean(c.owner && c.repo && c.token);
}

function assertConfigured() {
  const c = cfg();
  if (!c.enabled) {
    throw new MaterialError('MATERIALS_DISABLED', '学习资料上传已暂停', 503);
  }
  if (!isConfigured()) {
    throw new MaterialError(
      'MATERIALS_NOT_CONFIGURED',
      '学习资料库尚未配置（缺少 GITHUB_MATERIALS_* 环境变量）',
      503
    );
  }
  return c;
}

/* ============================================================
 * 底层请求
 * ============================================================ */

/** 脱敏日志：任何情况下都不输出 token */
function logWarn(...args) {
  console.warn('[materials]', ...args);
}

function mapHttpError(status, body, endpoint) {
  const msg = (body && (body.message || body.error)) || '';
  if (status === 401) {
    return new MaterialError(
      'MATERIALS_GITHUB_AUTH_FAILED',
      '资料库访问凭据无效或已过期，请联系管理员',
      502
    );
  }
  if (status === 403) {
    // 细粒度 PAT 常见：权限不足 或 触顶限流
    const rateLimited = /rate limit/i.test(msg);
    return new MaterialError(
      'MATERIALS_GITHUB_FORBIDDEN',
      rateLimited ? '资料库写入过于频繁，请稍后重试' : '资料库写入权限不足，请联系管理员',
      502
    );
  }
  if (status === 404) {
    return new MaterialError('MATERIALS_GITHUB_NOT_FOUND', '资料库资源不存在（可能仓库名或分支有误）', 502);
  }
  if (status === 409 || status === 422) {
    return new MaterialError(
      'MATERIALS_GITHUB_CONFLICT',
      msg || '资料库状态冲突，请稍后重试',
      409
    );
  }
  if (status >= 500) {
    return new MaterialError('MATERIALS_GITHUB_UPSTREAM', '资料库暂时不可用，请稍后重试', 502);
  }
  return new MaterialError('MATERIALS_GITHUB_ERROR', msg || `资料库请求失败（${status}）`, 502);
}

/**
 * 发起一次 GitHub REST 请求。
 * @param {string} method
 * @param {string} endpoint - 以 / 开头的路径
 * @param {object} [opts]
 * @param {object} [opts.body]
 * @param {boolean} [opts.allow404]
 * @param {number} [opts.retries=0] - 5xx / 网络错误的额外重试次数（指数退避）
 */
async function gh(method, endpoint, opts = {}) {
  const c = assertConfigured();
  const { body, allow404 = false, retries = 0 } = opts;
  const url = `${API}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${c.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'xmumdorm-materials',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      logWarn(`重试 ${method} ${endpoint}（第 ${attempt} 次，等待 ${delay}ms）`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), c.timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      const isAbort = e && e.name === 'AbortError';
      lastErr = isAbort
        ? new MaterialError('MATERIALS_GITHUB_TIMEOUT', '资料库请求超时，请稍后重试', 504)
        : new MaterialError('MATERIALS_GITHUB_ERROR', '无法连接资料库，请稍后重试', 502);
      if (attempt < retries) continue;
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (res.ok) return { status: res.status, json };

    if (res.status === 404 && allow404) return { status: 404, json: null };

    // 仅 5xx 重试；4xx 立即返回（重试无意义，且 403 重试可能加重限流）
    if (res.status >= 500 && attempt < retries) {
      lastErr = mapHttpError(res.status, json, endpoint);
      continue;
    }
    throw mapHttpError(res.status, json, endpoint);
  }
  throw lastErr || new MaterialError('MATERIALS_GITHUB_ERROR', '资料库请求失败', 502);
}

/** GraphQL（用于开启 auto-merge） */
async function gql(query, variables) {
  const c = assertConfigured();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), c.timeoutMs);
  try {
    const res = await fetch(GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'xmumdorm-materials',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw mapHttpError(res.status, json);
    if (json && Array.isArray(json.errors) && json.errors.length > 0) {
      const first = json.errors[0];
      throw new MaterialError('MATERIALS_GITHUB_ERROR', first.message || 'GraphQL 请求失败', 502);
    }
    return json && json.data;
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
 * 读操作
 * ============================================================ */

let _cachedHead = { at: 0, value: null };
const HEAD_TTL_MS = 5000;

/** 取 main 的 HEAD（短缓存，避免同一请求内重复拉取） */
async function getMainHead({ force = false } = {}) {
  const c = cfg();
  if (!force && _cachedHead.value && Date.now() - _cachedHead.at < HEAD_TTL_MS) {
    return _cachedHead.value;
  }
  const ref = await gh('GET', `/repos/${c.owner}/${c.repo}/git/ref/heads/${encodeURIComponent(c.branch)}`);
  const sha = ref.json.object.sha;
  const commit = await gh('GET', `/repos/${c.owner}/${c.repo}/git/commits/${sha}`);
  const value = { sha, tree: commit.json.tree.sha };
  _cachedHead = { at: Date.now(), value };
  return value;
}

function invalidateHead() {
  _cachedHead = { at: 0, value: null };
}

function emptyIndex() {
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    commit: null,
    baseUrl: null,
    stats: { totalFiles: 0, totalBytes: 0 },
    courses: [],
    files: [],
  };
}

/** 写入本地快照（离线兜底） */
function saveSnapshot(index) {
  try {
    fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(index), 'utf8');
  } catch (e) {
    logWarn('写索引快照失败:', e.message);
  }
}

/** 读取本地快照（API 不可达时兜底） */
function readSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return null;
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

let _indexCache = { at: 0, value: null, blobSha: null };
const INDEX_TTL_MS = Number(process.env.MATERIALS_INDEX_CACHE_MS || 30000);

/**
 * 从 **GitHub API** 读取 main 上的 index.json（**不是 CDN**，理由见文件头注释 4）。
 * @param {object} [opts]
 * @param {boolean} [opts.force] - 忽略短缓存
 * @param {boolean} [opts.fallbackToSnapshot] - API 不可达时用本地快照
 * @returns {Promise<{ index: object, blobSha: string|null, stale: boolean }>}
 */
async function readIndex({ force = false, fallbackToSnapshot = false } = {}) {
  const c = cfg();
  const useCache = !force && _indexCache.value && Date.now() - _indexCache.at < INDEX_TTL_MS;
  if (useCache) {
    return { index: _indexCache.value, blobSha: _indexCache.blobSha, stale: false, cached: true };
  }

  try {
    const res = await gh(
      'GET',
      `/repos/${c.owner}/${c.repo}/contents/index.json?ref=${encodeURIComponent(c.branch)}`,
      { allow404: true }
    );
    if (res.status === 404) {
      const idx = emptyIndex();
      _indexCache = { at: Date.now(), value: idx, blobSha: null };
      return { index: idx, blobSha: null, stale: false };
    }
    const raw = Buffer.from(res.json.content, res.json.encoding || 'base64').toString('utf8');
    const idx = JSON.parse(raw);
    _indexCache = { at: Date.now(), value: idx, blobSha: res.json.sha };
    saveSnapshot(idx);
    return { index: idx, blobSha: res.json.sha, stale: false };
  } catch (e) {
    if (fallbackToSnapshot) {
      const snap = readSnapshot();
      if (snap) {
        logWarn('index 读取失败，改用本地快照:', e.message);
        return { index: snap, blobSha: null, stale: true };
      }
    }
    throw e;
  }
}

/** 健康检查（部署后自检用；只输出额度，绝不输出 token） */
async function healthcheck() {
  const c = cfg();
  if (!isConfigured()) return { ok: false, reason: '未配置', configured: false };
  try {
    const repo = await gh('GET', `/repos/${c.owner}/${c.repo}`);
    const rl = await gh('GET', '/rate_limit').catch(() => null);
    const head = await getMainHead({ force: true });
    return {
      ok: true,
      configured: true,
      repo: `${c.owner}/${c.repo}`,
      visibility: repo.json.visibility,
      defaultBranch: repo.json.default_branch,
      branch: c.branch,
      headSha: head.sha,
      rateLimit: rl && rl.json && rl.json.resources ? rl.json.resources.core : null,
    };
  } catch (e) {
    return { ok: false, configured: true, reason: e.message, code: e.code || null };
  }
}

/** 拼接文件字节的 CDN 地址（前端读字节用；零服务器） */
function cdnUrlFor(filePath, ref) {
  const c = cfg();
  const base = c.cdnBase.replace(/\/+$/, '');
  const encoded = String(filePath).split('/').map(encodeURIComponent).join('/');
  return `${base}/${c.owner}/${c.repo}@${ref || c.branch}/${encoded}`;
}

/** 读取单个文本文件内容（仅文本类，硬限 1MB 防内存爆） */
const MAX_TEXT_BYTES = 1024 * 1024;

async function getFileText(filePath) {
  const c = cfg();
  if (!/\.(md|markdown|txt)$/i.test(filePath)) {
    throw new MaterialError('MATERIALS_NOT_TEXT', '该文件不是可在线阅读的文本类型', 400);
  }
  const res = await gh(
    'GET',
    `/repos/${c.owner}/${c.repo}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(c.branch)}`,
    { allow404: true }
  );
  if (res.status === 404) {
    throw new MaterialError('MATERIALS_GITHUB_NOT_FOUND', '资料不存在或已被移除', 404);
  }
  if (typeof res.json.size === 'number' && res.json.size > MAX_TEXT_BYTES) {
    throw new MaterialError('MATERIALS_TOO_LARGE_TO_RENDER', '文件过大，无法在线渲染，请下载后查看', 413);
  }
  return Buffer.from(res.json.content, res.json.encoding || 'base64').toString('utf8');
}

/* ============================================================
 * 写操作（Git Data API）
 * ============================================================ */

/**
 * 上传一个 blob。**带退避重试** —— 实测 20MB 请求体偶发 502。
 * @param {Buffer} buffer
 * @returns {Promise<string>} blob sha
 */
async function putBlob(buffer) {
  const c = assertConfigured();
  const res = await gh('POST', `/repos/${c.owner}/${c.repo}/git/blobs`, {
    body: { content: buffer.toString('base64'), encoding: 'base64' },
    retries: Number(process.env.MATERIALS_BLOB_RETRIES || 4),
  });
  return res.json.sha;
}

async function createTree({ baseTree, entries }) {
  const c = cfg();
  const res = await gh('POST', `/repos/${c.owner}/${c.repo}/git/trees`, {
    body: { base_tree: baseTree, tree: entries },
    retries: 2,
  });
  return res.json.sha;
}

async function createCommit({ message, tree, parents }) {
  const c = cfg();
  const res = await gh('POST', `/repos/${c.owner}/${c.repo}/git/commits`, {
    body: { message, tree, parents },
    retries: 2,
  });
  return res.json.sha;
}

/** 取分支 ref；不存在返回 null */
async function getRef(branch) {
  const c = cfg();
  const res = await gh('GET', `/repos/${c.owner}/${c.repo}/git/ref/heads/${branch}`, { allow404: true });
  return res.status === 404 ? null : res.json.object.sha;
}

async function createRef({ branch, sha }) {
  const c = cfg();
  const res = await gh('POST', `/repos/${c.owner}/${c.repo}/git/refs`, {
    body: { ref: `refs/heads/${branch}`, sha },
  });
  return res.json.object.sha;
}

/**
 * 推进分支。
 * 注意：仓库 ruleset 对 `~ALL` 生效，`upload/*` 通过 exclude 才可 force-push；
 * 因此这里允许 force，并在调用方保证只对 `upload/*` 使用。
 */
async function updateRef({ branch, sha, force = true }) {
  const c = cfg();
  const res = await gh('PATCH', `/repos/${c.owner}/${c.repo}/git/refs/heads/${branch}`, {
    body: { sha, force },
  });
  return res.json.object.sha;
}

/* ============================================================
 * PR 操作
 * ============================================================ */

async function openPullRequest({ branch, title, body, base }) {
  const c = cfg();
  const res = await gh('POST', `/repos/${c.owner}/${c.repo}/pulls`, {
    body: { title, head: branch, base: base || c.branch, body, draft: false },
  });
  return res.json;
}

async function getPullRequest(number) {
  const c = cfg();
  const res = await gh('GET', `/repos/${c.owner}/${c.repo}/pulls/${number}`);
  return res.json;
}

async function listPullRequestsForHead(branch, state = 'all') {
  const c = cfg();
  const res = await gh(
    'GET',
    `/repos/${c.owner}/${c.repo}/pulls?head=${c.owner}:${branch}&state=${state}&per_page=5`
  );
  return Array.isArray(res.json) ? res.json : [];
}

/** 给 PR 打 label（失败不阻断主流程） */
async function addLabels(number, labels) {
  const c = cfg();
  try {
    await gh('POST', `/repos/${c.owner}/${c.repo}/issues/${number}/labels`, { body: { labels } });
  } catch (e) {
    logWarn('打 label 失败:', e.message);
  }
}

/**
 * 开启 auto-merge（squash）。
 * 需要分支保护规则里有 required status check —— 本仓库已把 `validate` 设为 required，
 * 因此 PR 打开后 check 处于 pending，此时才能开启 auto-merge。
 * 失败不抛错（返回原因），由调用方决定如何提示。
 */
async function enableAutoMerge(pullRequestNodeId) {
  if (!pullRequestNodeId) return { ok: false, reason: '缺少 node_id' };
  try {
    const data = await gql(
      `mutation($id: ID!) {
         enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) {
           pullRequest { number autoMergeRequest { enabledAt } }
         }
       }`,
      { id: pullRequestNodeId }
    );
    const ok = Boolean(data && data.enablePullRequestAutoMerge);
    return { ok, reason: ok ? null : '仓库未开启 Allow auto-merge 或缺少分支保护规则' };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/* ============================================================
 * 高层操作
 * ============================================================ */

/** 分支名：与上传一一对应；因 ruleset 可能禁止删除，重试时必须复用同名分支 */
function buildBranchName({ materialId, courseId, sha256 }) {
  const short = String(sha256 || '').slice(0, 8);
  return `upload/${materialId}-c${courseId}-${short}`;
}

/** 把一条资料并入 index（幂等：同 path 覆盖） */
function mergeIntoIndex(index, entry, course) {
  const next = {
    schemaVersion: 2,
    baseUrl: index.baseUrl || null,
    commit: index.commit || null,
    courses: Array.isArray(index.courses) ? [...index.courses] : [],
    files: Array.isArray(index.files) ? index.files.filter((f) => f && f.path !== entry.path) : [],
  };
  next.files.push(entry);
  next.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const ci = next.courses.findIndex((c) => Number(c.courseId) === Number(entry.courseId));
  const courseEntry = {
    courseId: Number(entry.courseId),
    name: (course && course.name) || entry.courseName || null,
    lecturer: (course && course.lecturer) || entry.lecturer || '',
  };
  if (ci >= 0) next.courses[ci] = courseEntry;
  else next.courses.push(courseEntry);
  next.courses.sort((a, b) => Number(a.courseId) - Number(b.courseId));

  next.stats = {
    totalFiles: next.files.length,
    totalBytes: next.files.reduce((s, f) => s + (Number(f.size) || 0), 0),
  };
  return next;
}

/**
 * 发布一份资料：blob → tree → commit → 分支 → PR → auto-merge。
 *
 * 并发保护：上传会改 index.json，两个并发 PR 会冲突。这里在打开 PR 后检查
 * `mergeable_state`，若为 dirty 则从最新 main 重建并强推同一分支，最多尝试 maxAttempts 次。
 *
 * @returns {Promise<{branch, commit, prNumber, prUrl, autoMerge, filePath, indexSha}>}
 */
async function publishMaterial({
  fileBuffer,
  fileName,
  courseId,
  type,
  meta,
  entryBase,
  course,
  materialId,
  maxAttempts = 3,
}) {
  const c = assertConfigured();
  const filePath = `c${courseId}/${type}/${fileName}`;

  let branch = buildBranchName({ materialId, courseId, sha256: entryBase.sha256 });
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    invalidateHead();
    const head = await getMainHead({ force: true });
    const { index } = await readIndex({ force: true });

    const entry = {
      ...entryBase,
      path: filePath,
      name: fileName,
      courseId: Number(courseId),
      courseName: course ? course.name : null,
      lecturer: course ? course.lecturer : '',
      type,
    };
    const nextIndex = mergeIntoIndex(index, entry, course);
    nextIndex.commit = head.sha;
    nextIndex.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    // baseUrl 在仓库里恒为 null：写 index.json 时还不知道本次 commit 的 sha，
    // 无法给出「钉到 sha」的不可变地址。改由 API 在**读取时**用当前 main HEAD
    // 拼出 pinned baseUrl 返回给前端（既真·零服务器读字节，又天然破 CDN 缓存）。
    nextIndex.baseUrl = null;

    const fileBlobSha = await putBlob(fileBuffer);
    const indexSha = await putBlob(Buffer.from(JSON.stringify(nextIndex, null, 2) + '\n', 'utf8'));

    const treeSha = await createTree({
      baseTree: head.tree,
      entries: [
        { path: filePath, mode: '100644', type: 'blob', sha: fileBlobSha },
        { path: 'index.json', mode: '100644', type: 'blob', sha: indexSha },
      ],
    });

    // ⚠️ commit message 会永久留在**公开**资料库里：
    //    不写上传者（那是用户数据），也不写任何指向本项目的字样。
    const message = [
      `[materials] ${entry.title} (${entry.courseName || `c${courseId}`})`,
      '',
      `Course-Id: ${courseId}`,
      `Type: ${type}`,
      `Material-Id: ${materialId}`,
    ].join('\n');

    const commitSha = await createCommit({ message, tree: treeSha, parents: [head.sha] });

    const existing = await getRef(branch);
    if (existing) {
      // 复用而非删除重建（ruleset 可能禁止删分支）
      await updateRef({ branch, sha: commitSha, force: true });
    } else {
      await createRef({ branch, sha: commitSha });
    }

    // 已有同分支 PR 时复用，避免重复开 PR
    const existingPrs = await listPullRequestsForHead(branch, 'open');
    let pr = existingPrs[0] || null;
    if (!pr) {
      pr = await openPullRequest({
        branch,
        title: `[materials] ${entry.title} (${entry.courseName || `c${courseId}`})`,
        body: [
          `**课程**：${entry.courseName || `c${courseId}`}${entry.lecturer ? ` · ${entry.lecturer}` : ''}`,
          `**类型**：${type}`,
          `**课时**：${entry.lesson ?? '—'}　**考试节点**：${entry.examNode ?? '—'}　**来源**：${entry.source ?? '—'}`,
          `**文件**：\`${filePath}\`（${(entry.size / 1024 / 1024).toFixed(2)} MB）`,
          '',
          `> 自动提交。校验通过后将自动合并。`,
        ].join('\n'),
      });
    }

    const autoMerge = await enableAutoMerge(pr.node_id);

    // 冲突检测：dirty 说明 index.json 与 main 冲突，重建后重试
    let mergeableState = pr.mergeable_state || null;
    if (attempt < maxAttempts) {
      for (let i = 0; i < 3 && (mergeableState == null || mergeableState === 'unknown'); i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const fresh = await getPullRequest(pr.number);
        mergeableState = fresh.mergeable_state;
      }
      if (mergeableState === 'dirty') {
        logWarn(`PR #${pr.number} 与 main 冲突，重建索引后重试（第 ${attempt + 1} 次）`);
        lastResult = { branch, commit: commitSha, prNumber: pr.number, prUrl: pr.html_url, autoMerge, filePath, indexSha };
        continue;
      }
    }

    return {
      branch,
      commit: commitSha,
      prNumber: pr.number,
      prUrl: pr.html_url,
      autoMerge,
      filePath,
      indexSha,
      mergeableState,
      attempts: attempt,
    };
  }

  // 达到重试上限仍有冲突：返回最后一次结果，状态标为需人工处理
  return { ...lastResult, mergeableState: 'dirty', attempts: maxAttempts };
}

/**
 * 通用「走 PR 的仓库变更」。
 *
 * ⚠️ **为什么所有写操作都必须走 PR（实测结论）**：
 *   ruleset 的 `required_status_checks` **不只约束 PR，也拦截对 main 的直推**。
 *   直推会得到：
 *     409 Repository rule violations found
 *     N of N required status checks are expected
 *   因此「下架」「课程合并重写索引」这类管理员动作也**必须**经 PR + auto-merge，
 *   原先「直推 main 以求即时」的写法在生产上必然失败。
 *
 * @param {object} opts
 * @param {(index: object, ctx: {head: object}) => object} opts.mutateIndex - 返回新的 index
 * @param {(ctx: {index: object, nextIndex: object, head: object}) => Promise<Array>} [opts.extraEntries]
 *        追加到同一次 commit 的 tree 条目（删除文件用 { path, mode:'100644', type:'blob', sha: null }）
 * @param {string} [opts.branchPrefix='upload/change']
 * @param {string} opts.slug
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} opts.message
 * @param {number} [opts.maxAttempts=2]
 */
async function publishChange({
  mutateIndex,
  extraEntries,
  branchPrefix = 'upload/change',
  slug,
  title,
  body,
  message,
  maxAttempts = 2,
}) {
  assertConfigured();
  const branch = `${branchPrefix}-${slug}-${Date.now().toString(36)}`;

  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    invalidateHead();
    const head = await getMainHead({ force: true });
    const { index } = await readIndex({ force: true });

    const nextIndex = mutateIndex(index, { head });
    nextIndex.commit = head.sha;
    nextIndex.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    nextIndex.stats = {
      totalFiles: Array.isArray(nextIndex.files) ? nextIndex.files.length : 0,
      totalBytes: (Array.isArray(nextIndex.files) ? nextIndex.files : [])
        .reduce((s, f) => s + (Number(f.size) || 0), 0),
    };

    const indexSha = await putBlob(Buffer.from(JSON.stringify(nextIndex, null, 2) + '\n', 'utf8'));
    const entries = [{ path: 'index.json', mode: '100644', type: 'blob', sha: indexSha }];
    if (typeof extraEntries === 'function') {
      const extra = await extraEntries({ index, nextIndex, head });
      if (Array.isArray(extra)) entries.push(...extra);
    }

    const treeSha = await createTree({ baseTree: head.tree, entries });
    const commitSha = await createCommit({ message, tree: treeSha, parents: [head.sha] });

    // 复用同名分支（ruleset 的 deletion 规则可能不允许删除分支）
    const existing = await getRef(branch);
    if (existing) await updateRef({ branch, sha: commitSha, force: true });
    else await createRef({ branch, sha: commitSha });

    const pr = await openPullRequest({ branch, title, body });
    const autoMerge = await enableAutoMerge(pr.node_id);

    // 索引已变，清缓存
    _indexCache = { at: 0, value: null, blobSha: null };

    last = {
      branch,
      commit: commitSha,
      prNumber: pr.number,
      prUrl: pr.html_url,
      autoMerge,
      index: nextIndex,
      attempts: attempt,
    };

    let state = pr.mergeable_state || null;
    if (attempt < maxAttempts) {
      for (let i = 0; i < 3 && (state == null || state === 'unknown'); i++) {
        await new Promise((r) => setTimeout(r, 1500));
        state = (await getPullRequest(pr.number)).mergeable_state;
      }
      if (state === 'dirty') {
        logWarn(`变更 PR #${pr.number} 与 main 冲突，重建后重试（第 ${attempt + 1} 次）`);
        continue;
      }
    }
    return { ...last, mergeableState: state };
  }
  return last;
}

/**
 * 下架一份资料。**走 PR**（直推 main 会被 required checks 拒绝）。
 * 文件真正消失发生在 PR 合并之后；调用方必须写审计日志。
 */
async function removeMaterial({ filePath, title = '', reason = '', slug = null }) {
  const c = assertConfigured();

  // 先确认文件是否存在（决定 tree 里是否加删除条目）
  const found = await gh(
    'GET',
    `/repos/${c.owner}/${c.repo}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(c.branch)}`,
    { allow404: true }
  );

  const cleanSlug = slug || (filePath.split('/').pop() || 'item').replace(/[^\w.-]/g, '').slice(0, 30) || 'item';

  const res = await publishChange({
    branchPrefix: 'upload/remove',
    slug: cleanSlug,
    title: `[materials] 下架 ${title || filePath}`,
    body: [
      `下架资料 \`${filePath}\`。`,
      '',
      `**理由**：${reason || '未填写'}`,
      '',
      '> 由 XMUMDorm 学习资料模块自动提交，校验通过后自动合并。',
      '> ⚠️ CDN 可能仍缓存该文件，合并后短时间内可能继续可访问。',
    ].join('\n'),
    message: `[materials] 下架 ${title || filePath}\n\nReason: ${reason || '未填写'}`,
    mutateIndex: (index) => ({
      ...index,
      files: (Array.isArray(index.files) ? index.files : []).filter((f) => f && f.path !== filePath),
    }),
    extraEntries: async () =>
      found.status === 200 && found.json && found.json.sha
        ? [{ path: filePath, mode: '100644', type: 'blob', sha: null }] // sha:null = 删除
        : [],
  });

  return { ...res, removedFile: found.status === 200 };
}

/**
 * metadata-only PR：只改 index.json 的元数据，不动文件本体。
 * 用于「上传后修正标题 / 课时 / 标签」，保持 git 单一真相源 + 可回滚。
 */
async function publishIndexPatch({ mutate, slug, title, body, message, maxAttempts = 2 }) {
  return publishChange({
    mutateIndex: mutate,
    branchPrefix: 'upload/meta',
    slug,
    title,
    body,
    message,
    maxAttempts,
  });
}

/**
 * 索引维护 PR（例如课程合并后重写 courseId）。
 *
 * 走 PR 而非直推：ruleset 的 required checks 同样拦截直推（见 publishChange 注释）。
 * 传入 `mutate(index)` 而非成品 index —— 这样冲突重试时会基于**重新读取的最新 index**
 * 再算一次，才能真正解决冲突。
 */
async function commitIndex({ mutate, message, slug = 'maint', title = '[materials] 索引维护' }) {
  const res = await publishChange({
    branchPrefix: 'upload/maint',
    slug,
    title,
    // 不写项目名：这段文字会出现在公开资料库的 PR 里
    body: '资料库索引维护变更。\n\n> 自动提交，校验通过后自动合并。',
    message,
    mutateIndex: mutate,
  });
  return {
    commit: res.commit,
    prNumber: res.prNumber,
    prUrl: res.prUrl,
    autoMerge: res.autoMerge,
    index: res.index,
  };
}

module.exports = {
  // 配置
  isConfigured,
  assertConfigured,
  // 读
  healthcheck,
  getMainHead,
  readIndex,
  readSnapshot,
  cdnUrlFor,
  getFileText,
  // 写
  putBlob,
  createTree,
  createCommit,
  getRef,
  createRef,
  updateRef,
  // PR
  openPullRequest,
  getPullRequest,
  listPullRequestsForHead,
  addLabels,
  enableAutoMerge,
  // 高层
  publishMaterial,
  publishChange,
  publishIndexPatch,
  removeMaterial,
  commitIndex,
  buildBranchName,
  mergeIntoIndex,
  // 常量
  SNAPSHOT_FILE,
  MAX_TEXT_BYTES,
};
