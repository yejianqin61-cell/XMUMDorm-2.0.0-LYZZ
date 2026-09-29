/**
 * ============================================
 * 学习资料库 · PAT 权限体检
 * ============================================
 * 用途：换了 PAT、改了权限、或上传功能整体报 401/403 时，用这个脚本判定
 *      「到底是权限不足，还是别的问题」。
 *
 * 设计要点（很重要）：
 *   本脚本**默认只读**。唯一可选的写探针是 `POST /git/blobs`——它只创建一个
 *   **无引用的 blob**（不会建分支、不会被任何 commit 引用，随后由 GitHub GC 回收），
 *   因此**不会**踩到本仓库 ruleset 的 `deletion` 规则（该仓库任何分支都删不掉，
 *   详见 Module10 设计文档 §8.4）。绝不要用「建临时分支」来做权限探针。
 *
 * 用法：
 *   node scripts/materials/probe-github-permissions.js              # 只读体检
 *   node scripts/materials/probe-github-permissions.js --write-probe # 额外测 blob 写入
 *
 * 退出码：0 = 全部通过；1 = 有失败项。
 */

require('dotenv').config();

const argv = process.argv.slice(2);
const WRITE_PROBE = argv.includes('--write-probe');

const OWNER = (process.env.GITHUB_MATERIALS_OWNER || '').trim();
const REPO = (process.env.GITHUB_MATERIALS_REPO || '').trim();
const BRANCH = (process.env.GITHUB_MATERIALS_BRANCH || 'main').trim();
const TOKEN = (process.env.GITHUB_MATERIALS_TOKEN || '').trim();

if (!OWNER || !REPO || !TOKEN) {
  console.error('缺少 GITHUB_MATERIALS_OWNER / GITHUB_MATERIALS_REPO / GITHUB_MATERIALS_TOKEN');
  process.exit(1);
}

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'xmumdorm-pat-doctor',
};
const J = { ...H, 'Content-Type': 'application/json' };
const API = 'https://api.github.com';
const REPO_API = `${API}/repos/${OWNER}/${REPO}`;

let failures = 0;

function report(label, ok, detail) {
  const icon = ok ? '✅' : '❌';
  if (!ok) failures++;
  console.log(`  ${icon} ${label.padEnd(30)} ${detail}`);
}

async function check(label, endpoint, { method = 'GET', body, expect, hint } = {}) {
  let res;
  try {
    res = await fetch(`${API}${endpoint}`, {
      method,
      headers: body ? J : H,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    report(label, false, `网络异常：${e.message}`);
    return { ok: false, json: null };
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }

  const ok = expect.includes(res.status);
  report(label, ok, ok ? `HTTP ${res.status}` : `HTTP ${res.status} ${(json && json.message) || text.slice(0, 120)}`);
  if (!ok && hint) console.log(`     提示：${hint}`);
  return { ok, json, status: res.status };
}

(async () => {
  console.log('─'.repeat(72));
  console.log(`PAT 权限体检 · ${OWNER}/${REPO} @ ${BRANCH}`);
  console.log('─'.repeat(72));

  // ---- 1. 仓库可达性与可见性
  const repo = await check('读取仓库信息', `/repos/${OWNER}/${REPO}`, { expect: [200] });
  if (repo.json) {
    console.log(`     可见性：${repo.json.visibility}（读路径要求 public）`);
    if (repo.json.visibility !== 'public') {
      console.log('     ⚠️  非 public：浏览器端无法直接读取资料');
    }
    console.log(`     默认分支：${repo.json.default_branch}`);
  }

  // ---- 2. 分支读取（读路径不依赖，但上传流程要用）
  await check('读取 main HEAD', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, { expect: [200] });

  // ---- 3. 读取 index.json（后端读索引用）
  await check('读取 index.json', `/repos/${OWNER}/${REPO}/contents/index.json`, {
    expect: [200, 404],
    hint: '404 表示索引还没生成，属正常',
  });

  // ---- 4. 写能力探针（无副作用）
  if (WRITE_PROBE) {
    const blob = await check('创建 blob（上传文件本体）', `/repos/${OWNER}/${REPO}/git/blobs`, {
      method: 'POST',
      body: { content: Buffer.from('permission-probe').toString('base64'), encoding: 'base64' },
      expect: [201],
      hint: '403 通常意味着 PAT 缺少 Contents: Read and write',
    });
    if (blob.ok) {
      console.log('     注：该 blob 无引用，会由 GitHub 自动回收，不会残留到仓库里。');
    }
  } else {
    console.log('  ⏭  写探针已跳过（加 --write-probe 可测 blob 写入）');
  }

  // ---- 5. 明确不测的东西（避免误伤）
  console.log('\n  ⏭  以下项**故意不测**，因为会产生无法清理的副作用：');
  console.log('     · POST /git/refs（建分支）—— 本仓库 ruleset 禁止删除任何分支，建了就删不掉');
  console.log('     · 写 .github/workflows/** —— 需要额外的 Workflows 权限，且该文件由人工维护');

  // ---- 6. 速率额度
  const rl = await check('查询速率额度', '/rate_limit', { expect: [200] });
  if (rl.json && rl.json.resources && rl.json.resources.core) {
    const c = rl.json.resources.core;
    console.log(`     已认证额度：${c.remaining}/${c.limit} 次/小时`);
  }

  console.log('\n' + '─'.repeat(72));
  if (failures === 0) {
    console.log('✅ 体检通过');
    process.exit(0);
  }
  console.log(`❌ ${failures} 项失败`);
  process.exit(1);
})().catch((e) => {
  console.error('\n脚本异常：', e.message);
  process.exit(1);
});
