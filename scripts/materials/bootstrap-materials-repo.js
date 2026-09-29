/**
 * ============================================
 * 学习资料库（materials repo）引导脚本
 * ============================================
 * 把本仓库 materials-repo/ 下的脚手架（workflow、校验器、README、LICENSE 等）
 * 通过 GitHub Contents API 推送到外部资料库。
 *
 * 用法：
 *   node scripts/materials/bootstrap-materials-repo.js                          # 预演（默认，不写入）
 *   node scripts/materials/bootstrap-materials-repo.js --apply                  # 直推 main（仅首次、无分支保护时可用）
 *   node scripts/materials/bootstrap-materials-repo.js --apply --force          # 覆盖远端已存在的文件
 *   node scripts/materials/bootstrap-materials-repo.js --apply --delete-stray   # 顺带删除顶层游离文件
 *   node scripts/materials/bootstrap-materials-repo.js --apply --via-pr         # **走 PR**（分支保护开启后必须用这个）
 *   node scripts/materials/bootstrap-materials-repo.js --apply --via-pr --only=CONTRIBUTING.md
 *
 * ⚠️ 为什么需要 `--via-pr`：
 *   资料库的 ruleset 配了 required status checks 之后，**对 main 的任何直推都会被拒绝**：
 *     409 Repository rule violations found / N of N required status checks are expected
 *   所以一旦分支保护生效，`--apply`（直推）就再也用不了，必须改用 `--via-pr`。
 *
 * ⚠️ `--via-pr` 推送 `.github/**` 下的文件时，PR 会被校验器**判为失败**（绊线）——
 *   这是设计如此：CI 配置变更必须由真人手动合并。所以脚手架更新需要人工点合并。
 *   只想改 README/CONTRIBUTING 这类文件时，可用 `--only=` 精确指定，PR 会自动通过。
 *
 * 需要的环境变量（.env）：
 *   GITHUB_MATERIALS_OWNER  = James898-boom
 *   GITHUB_MATERIALS_REPO   = Xmum-opensource
 *   GITHUB_MATERIALS_BRANCH = main
 *   GITHUB_MATERIALS_TOKEN  = <fine-grained PAT：Contents 读写>
 *
 * ⚠️ 关于 .github/workflows/ 的已知限制：
 *   写 `.github/workflows/**` 下的文件，除了 Contents: write 之外还需要
 *   **Workflows: write**（GitHub 官方文档把 create-or-update-file-contents 列为
 *   Workflows 权限的附加端点）。否则会得到
 *     403 Resource not accessible by personal access token
 *   两种处置：
 *     a) 给 PAT 加 Workflows: Read and write → 重跑本脚本（可推完再撤掉该权限）；
 *     b) 不给该权限，改用 GitHub 网页端手工创建该 workflow 文件（推荐，最小权限）。
 *   本脚本遇到这种情况会给出手工指引，并按「需人工处理」计数，不算失败。
 *
 * ⚠️ 安全：本脚本永不打印 token；只读取服务端 .env。
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const API = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';
const LOCAL_ROOT = path.join(__dirname, '..', '..', 'materials-repo');

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const APPLY = has('--apply');
const FORCE = has('--force');
const DELETE_STRAY = has('--delete-stray');
const VIA_PR = has('--via-pr');
const AUTO_MERGE = has('--auto-merge');
const ONLY = (valueOf('only') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OWNER = (process.env.GITHUB_MATERIALS_OWNER || '').trim();
const REPO = (process.env.GITHUB_MATERIALS_REPO || '').trim();
const BRANCH = (process.env.GITHUB_MATERIALS_BRANCH || 'main').trim();
const TOKEN = (process.env.GITHUB_MATERIALS_TOKEN || '').trim();

/** 顶层允许的保留文件（其余顶层文件会被 validate 判为非法） */
const RESERVED_ROOT = new Set([
  'README.md', 'CONTRIBUTING.md', 'LICENSE', 'LICENSE.md', '.nojekyll', '.gitignore', 'index.json',
]);

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!OWNER || !REPO) {
  die('缺少 GITHUB_MATERIALS_OWNER / GITHUB_MATERIALS_REPO，请检查 .env');
}
if (!TOKEN) {
  die('缺少 GITHUB_MATERIALS_TOKEN，请先在 .env 里配置 fine-grained PAT');
}
if (!fs.existsSync(LOCAL_ROOT)) {
  die(`本地脚手架目录不存在：${LOCAL_ROOT}`);
}

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'xmumdorm-materials-bootstrap',
  };
}

/** 统一请求：返回 { status, json } */
async function gh(method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { ...headers(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  return { status: res.status, json };
}

/** 本地递归列出文件，返回 POSIX 相对路径 */
function listLocal(dir, base = dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) listLocal(abs, base, out);
    else if (ent.isFile()) out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

/**
 * 走 PR 的同步模式。
 *
 * 分支保护开启 required status checks 之后，对 main 的直推会被拒绝
 * （409 Repository rule violations found / N of N required status checks are expected），
 * 因此这里改为：blob → tree（base_tree = main）→ commit → 新分支 → PR。
 *
 * ⚠️ 若本次改动包含 `.github/**`，PR 会被资料库校验器**判为失败**（绊线设计），
 *    需要管理员手动合并 —— 这是有意为之，不是 bug。
 */
async function bootstrapViaPr(localFiles) {
  const targets = ONLY.length > 0 ? localFiles.filter((f) => ONLY.includes(f)) : localFiles;
  if (targets.length === 0) {
    die(`--only 未匹配到任何本地文件。可选：\n  ${localFiles.join('\n  ')}`);
  }

  const touchesGithubDir = targets.some((f) => f.startsWith('.github/'));
  console.log(`\n本地脚手架文件 ${localFiles.length} 个，本次提交 ${targets.length} 个：`);
  console.log(`模式：走 PR（--via-pr）${touchesGithubDir ? '  ⚠️ 含 .github/**，PR 会被校验器判失败，需人工合并' : ''}\n`);

  const refRes = await gh('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(BRANCH)}`);
  if (refRes.status !== 200) {
    die(`读取分支 ${BRANCH} 失败：HTTP ${refRes.status} ${(refRes.json && refRes.json.message) || ''}`);
  }
  const headSha = refRes.json.object.sha;
  const commitRes = await gh('GET', `/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  if (commitRes.status !== 200) die(`读取 ${BRANCH} 的 commit 失败：HTTP ${commitRes.status}`);
  const baseTree = commitRes.json.tree.sha;

  const entries = [];
  let skipped = 0;
  for (const rel of targets) {
    const buf = fs.readFileSync(path.join(LOCAL_ROOT, rel.split('/').join(path.sep)));

    // 内容没变就跳过，避免制造无意义 diff
    const cur = await gh(
      'GET',
      `/repos/${OWNER}/${REPO}/contents/${encodeURI(rel)}?ref=${encodeURIComponent(BRANCH)}`
    );
    if (cur.status === 200 && cur.json && cur.json.sha && !FORCE) {
      const remoteBuf = Buffer.from(cur.json.content || '', cur.json.encoding || 'base64');
      if (remoteBuf.equals(buf)) {
        console.log(`  跳过  ${rel}   （远端内容已一致）`);
        skipped++;
        continue;
      }
    }

    if (!APPLY) {
      console.log(`  [预演] 提交  ${rel}   (${buf.length} B)`);
      continue;
    }

    const blob = await gh('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
      content: buf.toString('base64'),
      encoding: 'base64',
    });
    if (blob.status !== 201) {
      console.log(`  ❌ blob 失败  ${rel}   HTTP ${blob.status}`);
      continue;
    }
    console.log(`  ✅ blob  ${rel}   (${buf.length} B)`);
    entries.push({ path: rel, mode: '100644', type: 'blob', sha: blob.json.sha });
  }

  if (!APPLY) {
    console.log('\n预演结束。确认无误后加 --apply 真正执行。');
    return;
  }
  if (entries.length === 0) {
    console.log(`\n没有需要提交的改动（跳过 ${skipped} 个）。`);
    return;
  }

  const tree = await gh('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTree,
    tree: entries,
  });
  if (tree.status !== 201) die(`创建 tree 失败：HTTP ${tree.status} ${JSON.stringify(tree.json).slice(0, 200)}`);

  const commit = await gh('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: `chore(materials): 同步脚手架（${entries.length} 个文件）`,
    tree: tree.json.sha,
    parents: [headSha],
  });
  if (commit.status !== 201) die(`创建 commit 失败：HTTP ${commit.status}`);

  // ⚠️ 分支必须落在 ruleset 的 exclude 前缀下（upload/* 或 tmp/*）。
  // 实测：不在排除列表里的分支（如 chore/*）连「创建 ref」都会被拒：
  //   POST /git/refs → 422 Reference update failed
  // 因为 required_status_checks 对该分支上的 commit 生效，而新 commit 还没有 check 结果。
  const branch = `tmp/bootstrap-${Date.now().toString(36)}`;
  const ref = await gh('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha: commit.json.sha,
  });
  if (ref.status !== 201) die(`创建分支失败：HTTP ${ref.status} ${JSON.stringify(ref.json).slice(0, 200)}`);

  const pr = await gh('POST', `/repos/${OWNER}/${REPO}/pulls`, {
    title: `chore(materials): 同步脚手架（${entries.length} 个文件）`,
    head: branch,
    base: BRANCH,
    body: [
      '由 `scripts/materials/bootstrap-materials-repo.js --via-pr` 自动提交。',
      '',
      '变更文件：',
      ...entries.map((e) => `- \`${e.path}\``),
      ...(touchesGithubDir
        ? ['', '> ⚠️ 本 PR 修改了 `.github/**`，校验器会**判为失败**（绊线设计）。', '> 请由管理员手动审查后合并。']
        : []),
    ].join('\n'),
  });
  if (pr.status !== 201) die(`创建 PR 失败：HTTP ${pr.status} ${JSON.stringify(pr.json).slice(0, 200)}`);

  console.log(`\n  ✅ PR #${pr.json.number}  ${pr.json.html_url}`);

  if (AUTO_MERGE) {
    const nodeId = pr.json.node_id;
    const res = await fetch(GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'xmumdorm-materials-bootstrap',
      },
      body: JSON.stringify({
        query: `mutation($id: ID!) {
          enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) {
            pullRequest { number }
          }
        }`,
        variables: { id: nodeId },
      }),
    });
    const json = await res.json().catch(() => null);
    const ok = res.ok && json && !json.errors && json.data && json.data.enablePullRequestAutoMerge;
    if (ok) {
      console.log('  ✅ 已开启 auto-merge（squash）');
    } else {
      const msg = json && json.errors && json.errors[0] ? json.errors[0].message : `HTTP ${res.status}`;
      console.log(`  ⚠️  开启 auto-merge 失败：${msg}`);
      console.log('     常见原因：仓库未开 Allow auto-merge，或 required checks 里存在永远不会上报的 check。');
    }
  }
  console.log('\n' + '─'.repeat(70));
  console.log('完成。PR 已创建，等待校验通过后合并。');
  if (touchesGithubDir) console.log('⚠️ 含 .github/** 改动：校验不会通过，需管理员手动合并。');
  console.log('─'.repeat(70));
}

async function main() {
  console.log('─'.repeat(70));
  console.log(`资料库引导${APPLY ? '（写入模式）' : '（预演模式，不会改动远端）'}`);
  console.log(`目标：${OWNER}/${REPO} @ ${BRANCH}`);
  console.log('─'.repeat(70));

  // ---- 预检：仓库可达 + 可见性
  const repoRes = await gh('GET', `/repos/${OWNER}/${REPO}`);
  if (repoRes.status === 404) {
    die(`仓库不存在或无权限（404）：${OWNER}/${REPO}\n` +
        `  请确认：1) 仓库名拼写正确；2) PAT 已授权该仓库（Only select repositories）`);
  }
  if (repoRes.status === 401) {
    die('PAT 无效或已过期（401）。请重新生成 fine-grained PAT。');
  }
  if (repoRes.status !== 200) {
    die(`读取仓库失败：HTTP ${repoRes.status} ${JSON.stringify(repoRes.json)}`);
  }
  const r = repoRes.json;
  console.log(`仓库可见性：${r.visibility}（读路径要求 public）`);
  console.log(`默认分支：${r.default_branch}`);
  if (r.visibility !== 'public') {
    console.log('⚠️  仓库不是 public —— 浏览器端将无法直接读取资料，请改为 public。');
  }

  // ---- 远端顶层文件（用于游离文件检测）
  const rootRes = await gh('GET', `/repos/${OWNER}/${REPO}/contents/?ref=${encodeURIComponent(BRANCH)}`);
  const remoteRoot = Array.isArray(rootRes.json) ? rootRes.json : [];
  const strayRoot = remoteRoot.filter(
    (x) => x.type === 'file' && !RESERVED_ROOT.has(x.name)
  );

  if (strayRoot.length > 0) {
    console.log('\n⚠️  远端顶层存在游离文件（会让 validate 校验失败）：');
    for (const f of strayRoot) console.log(`     ${f.name}  (${f.size} B)`);
    console.log(`  处置：${DELETE_STRAY ? '本次将删除（--delete-stray）' : '加 --delete-stray 可删除，或自行处理'}`);
  }

  const localFiles = listLocal(LOCAL_ROOT);

  if (VIA_PR) {
    await bootstrapViaPr(localFiles);
    return;
  }

  console.log(`\n本地脚手架文件 ${localFiles.length} 个：\n`);

  let created = 0, updated = 0, skipped = 0, failed = 0;
  const needManual = [];

  for (const rel of localFiles) {
    const abs = path.join(LOCAL_ROOT, rel.split('/').join(path.sep));
    const buf = fs.readFileSync(abs);

    const cur = await gh('GET', `/repos/${OWNER}/${REPO}/contents/${encodeURI(rel)}?ref=${encodeURIComponent(BRANCH)}`);
    const exists = cur.status === 200;
    const remoteSha = exists && cur.json && cur.json.sha ? cur.json.sha : null;

    if (exists && !FORCE) {
      console.log(`  跳过  ${rel}   （远端已存在，加 --force 可覆盖）`);
      skipped++;
      continue;
    }

    const verb = exists ? '覆盖' : '新建';
    if (!APPLY) {
      console.log(`  [预演] ${verb}  ${rel}   (${buf.length} B)`);
      continue;
    }

    const body = {
      message: `chore(materials): bootstrap ${rel}`,
      content: buf.toString('base64'),
      branch: BRANCH,
      ...(remoteSha ? { sha: remoteSha } : {}),
    };
    const put = await gh('PUT', `/repos/${OWNER}/${REPO}/contents/${encodeURI(rel)}`, body);

    if (put.status === 200 || put.status === 201) {
      console.log(`  ✅ ${verb}  ${rel}`);
      if (exists) updated++; else created++;
    } else if (put.status === 403 && rel.startsWith('.github/workflows/')) {
      // 已知限制：细粒度 PAT 需要额外的 Workflows: write
      console.log(`  ⚠️  需人工  ${rel}   （PAT 缺少 Workflows 权限，见下）`);
      needManual.push(rel);
      failed++;
    } else {
      console.log(`  ❌ 失败  ${rel}   HTTP ${put.status}  ${put.json && put.json.message ? put.json.message : ''}`);
      failed++;
    }
  }

  if (needManual.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('以下文件因 PAT 缺少 Workflows 权限而未能推送：');
    for (const f of needManual) console.log(`  ${f}`);
    console.log('\n处置（二选一）：');
    console.log('  a) GitHub → Settings → Developer settings → 该 token → Repository permissions');
    console.log('     把 Workflows 设为 Read and write → 重跑本脚本（推完可再撤掉该权限）');
    console.log('  b) 网页端手工创建：仓库 → Add file → Create new file');
    console.log(`     路径填 ${needManual[0]}`);
    console.log(`     内容复制本地文件：materials-repo/${needManual[0]}`);
    console.log('─'.repeat(70));
  }

  // ---- 删除游离文件
  if (strayRoot.length > 0 && DELETE_STRAY) {
    console.log('');
    for (const f of strayRoot) {
      if (!APPLY) {
        console.log(`  [预演] 删除  ${f.name}`);
        continue;
      }
      const del = await gh('DELETE', `/repos/${OWNER}/${REPO}/contents/${encodeURI(f.name)}`, {
        message: `chore(materials): 删除顶层游离文件 ${f.name}`,
        sha: f.sha,
        branch: BRANCH,
      });
      if (del.status === 200) console.log(`  🗑  已删除  ${f.name}`);
      else { console.log(`  ❌ 删除失败  ${f.name}  HTTP ${del.status}`); failed++; }
    }
  }

  // ---- 总结
  console.log('\n' + '─'.repeat(70));
  if (!APPLY) {
    console.log('预演结束。确认无误后加 --apply 真正执行。');
  } else {
    console.log(`完成：新建 ${created} · 覆盖 ${updated} · 跳过 ${skipped} · 失败 ${failed}`);
  }
  console.log('─'.repeat(70));

  if (APPLY && failed > 0) process.exit(1);
}

main().catch((e) => {
  // 注意：不要把 token 带进日志
  console.error('\n❌ 脚本异常：', e && e.message ? e.message : e);
  process.exit(1);
});
