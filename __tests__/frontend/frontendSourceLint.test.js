/**
 * 前端源码「未定义标识符」守卫（no-undef）— 2026-09-26 /about/club/my 崩溃的回归测试
 *
 * 事故：RetroUI 化时 `components/retroui/Avatar.jsx` 的 `AvatarImage` 里写了
 * `shape === 'circle' ? ...`，而 `shape` 不在该函数作用域内 → 任何带 src 的头像在渲染时
 * 抛 `ReferenceError: shape is not defined` → 整个路由树被卸载。
 * `/about/club/my`、`/about/club/:id`、`/about/club/:id/members` 三个页面全崩。
 *
 * 这类错误 `npx eslint src`（no-undef）一眼可见，但仓库没有 CI，lint 从未自动跑过。
 * 守卫分两层：
 *   ① 本文件直接断言出事的组件源码（快、精准）；
 *   ② 调用 scripts/check-frontend-no-undef.js 全量扫描 frontend/src（覆盖同类隐患）。
 *
 * 为什么 ② 要走子进程：ESLint 9 通过动态 import 加载 flat config，
 * 在 Jest 的 VM 里会抛 `A dynamic import callback was invoked without --experimental-vm-modules`，
 * 因此无法在 jest 进程内直接调用 ESLint API。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

/** 去掉注释后再做标识符断言，避免文档注释里的变量名造成误报 */
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('RetroUI Avatar：头像渲染不得引用未定义变量', () => {
  const avatar = read('frontend', 'src', 'components', 'retroui', 'Avatar.jsx');
  const imageCode = stripComments(
    avatar.slice(avatar.indexOf('function AvatarImage'), avatar.indexOf('function AvatarFallback'))
  );

  it('AvatarImage 不得用 shape 当值判断形状（历史 bug：shape === \'circle\' ? ... 抛 ReferenceError）', () => {
    // 注意：后续 AvatarImage 合法地接收了一个 shape prop（默认 'circle'），
    // 所以不能再笼统断言「不出现 shape」——那样连合法的解构都会误报。
    // 真正要防的是把 shape 当值用（当初崩站的写法）。
    expect(imageCode).not.toMatch(/\bshape\s*===/);
    expect(imageCode).not.toMatch(/\bshape\s*\?/);
  });

  it('圆形裁切由外层 NeoAvatar 负责（rounded-full + overflow-hidden），不靠 img 自己', () => {
    expect(avatar).toContain("{ shape: 'circle', className: 'rounded-full' }");
    expect(avatar).toContain('overflow-hidden font-bold');
  });

  it('没有 src 或加载失败时安全返回 null（头像缺失不崩页面）', () => {
    // 变量后来从 src 改名为 imageSrc（为了给 /uploads/default-avatar.* 换成站内默认图）
    expect(imageCode).toContain('if (error || !imageSrc) return null;');
  });
});

describe('前端源码 no-undef 全量守卫', () => {
  const script = path.join(ROOT, 'scripts', 'check-frontend-no-undef.js');

  it('独立 frontend 工作区依赖不存在时明确标记 SKIPPED，不把环境前置误报为源码失败', () => {
    const output = execFileSync(process.execPath, [script], {
      encoding: 'utf8',
      cwd: ROOT,
      env: { ...process.env, FRONTEND_DIR: path.join(ROOT, '__missing_frontend_workspace__') },
    });

    expect(output).toContain('[no-undef] SKIPPED');
  });

  it('frontend/src 下没有未定义标识符 —— 有的话渲染时直接崩掉整个路由', () => {
    expect(fs.existsSync(script)).toBe(true);

    let output = '';
    try {
      output = execFileSync(process.execPath, [script], { encoding: 'utf8', cwd: ROOT });
    } catch (e) {
      // 把检查器自己的输出带进断言信息，失败时一眼看到是哪个文件哪一行
      throw new Error(`${e.stdout || ''}${e.stderr || ''}`);
    }

    // Web 依赖存在时必须实际完成 no-undef 扫描；根目录测试环境没有安装
    // 独立 frontend 工作区时，检查器会明确报告 SKIPPED，而不是把该环境前置
    // 条件误报成源码失败。Web CI/本地 Web 验收应先执行 frontend 的 npm ci。
    expect(output).toMatch(/\[no-undef\] (OK|SKIPPED)/);
  }, 180000);
});
