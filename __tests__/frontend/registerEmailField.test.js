/**
 * 注册页邮箱字段：后缀不得再出现在输入区里
 *
 * 2026-09-27：注册页原本在邮箱输入框**内部**右侧浮着一个 `@xmu.edu.my`
 * （`absolute inset-y-0 right-4` + `text-slate-300`，只在没输入 `@` 时出现，
 * 输入框还专门留了 `pr-[7.5rem]` 给它让位）。
 *
 * 问题在于它跟 placeholder 是同一个色阶（`text-slate-400`），人眼只会读成“提示文字”，
 * 而不是“这部分我还没填”。用户只输入前缀就会以为邮箱已经写好了，点“发送”又没有反应
 * （发送按钮对不完整的邮箱是 disabled 状态，没有任何提示），于是表现为“收不到验证码”。
 *
 * 决定：后缀从输入区彻底移除，改为输入框下方一行完整示例，用户照着自己写全。
 * 这里把这个约定钉住，避免哪天又被“优化”回输入框里。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

const WEB_REGISTER = read('frontend', 'src', 'pages', 'Register.jsx');
const APP_REGISTER = read('frontend-app', 'src', 'pages', 'Register.jsx');

const EXAMPLE = 'CST2509054@xmu.edu.my';

describe('注册页邮箱字段（Web）', () => {
  it('输入框右侧不再渲染装饰用的 @xmu.edu.my 后缀', () => {
    // 旧写法：给后缀留位的右内边距 + 绝对定位的后缀 span
    expect(WEB_REGISTER).not.toContain('pr-[7.5rem]');
    expect(WEB_REGISTER).not.toMatch(/pointer-events-none absolute inset-y-0 right-4[\s\S]{0,200}@xmu\.edu\.my/);
  });

  it('占位文案不再说“输入邮箱前缀”（那正是误导的来源）', () => {
    expect(WEB_REGISTER).not.toContain('输入邮箱前缀');
    expect(WEB_REGISTER).not.toContain('Enter your email prefix');
    expect(WEB_REGISTER).toContain('输入完整邮箱');
  });

  it('输入框下方给出完整邮箱示例，中英文都有', () => {
    expect(WEB_REGISTER).toContain(EXAMPLE);
    expect(WEB_REGISTER).toMatch(/isZh \? '例如 /);
    expect(WEB_REGISTER).toMatch(/e\.g\. CST2509054/);
  });

  it('示例在输入框之外，没有塞进 input 的包裹层里', () => {
    // 示例必须出现在 input 结束之后
    const inputEnd = WEB_REGISTER.indexOf('id="reg-email"');
    const exampleAt = WEB_REGISTER.indexOf(EXAMPLE);
    expect(inputEnd).toBeGreaterThan(-1);
    expect(exampleAt).toBeGreaterThan(inputEnd);
  });
});

describe('注册页邮箱字段（App 端保持一致）', () => {
  it('App 端同样移除了输入区里的后缀', () => {
    expect(APP_REGISTER).not.toContain('pr-[7.5rem]');
    expect(APP_REGISTER).not.toMatch(/pointer-events-none absolute inset-y-0 right-4[\s\S]{0,200}@xmu\.edu\.my/);
  });

  it('App 端同样给出完整邮箱示例', () => {
    expect(APP_REGISTER).toContain(EXAMPLE);
  });
});
