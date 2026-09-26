/**
 * 公众号推文模板守卫
 *
 * 对象：marketing/wechat/dorm-wechat-template.html
 *
 * 为什么需要这个测试：
 * 这个模板是要「复制 → 粘贴进公众号后台」的。微信编辑器会剥离 <style> 标签、
 * class / id 选择器与外部 CSS，只有标签上的内联 style 确定能活下来。
 * 也就是说——**排版全靠内联样式，谁往复制区里塞一个 class 或 <style>，
 * 粘过去就会掉格式，而且是静默掉**。这种回归在浏览器里看不出来（本地渲染完全正常），
 * 只有粘进公众号才会发现。所以只能靠测试盯住。
 *
 * 关于「官方 vs 社区共识」：`<style>` / `class` 会被剥离这件事，微信官方从未正式声明过，
 * 是社区与工具源码的一致结论。官方唯一发布过的是编辑器插件开发规范，内容方向是
 * 「什么不该做」。详见 docs/06-Analyze/content-research/ 的调研文档。
 * 但无论限制多严，「复制区全内联」都是安全解 —— 所以这里就把这条线焊死。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE_PATH = path.join(ROOT, 'marketing', 'wechat', 'dorm-wechat-template.html');
const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

/**
 * 只取「复制范围」—— 即 #articleBody 到结束标记之间的那段。
 * 外层工具栏和手机壳的 <style> 用了 class，那是预览页自己的样式、不在复制范围内，
 * 所以不能拿整个文件去断言。
 */
const COPY_START = '<section id="articleBody"';
const COPY_END = '复制范围到这里结束';

function copyRegion() {
  const start = html.indexOf(COPY_START);
  const end = html.indexOf(COPY_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('复制范围的起止标记找不到，测试锚点需要同步更新');
  }
  return html.slice(start, end);
}

describe('公众号模板 — 复制范围必须全内联', () => {
  it('复制范围里没有任何 class 属性', () => {
    expect(copyRegion()).not.toMatch(/\bclass\s*=/);
  });

  it('复制范围里没有 <style> / <link>', () => {
    expect(copyRegion()).not.toMatch(/<style[\s>]/i);
    expect(copyRegion()).not.toMatch(/<link[\s>]/i);
  });

  it('复制范围里没有脚本与嵌入内容', () => {
    const region = copyRegion();
    for (const tag of ['script', 'iframe', 'video', 'audio', 'canvas', 'form', 'input', 'button']) {
      expect(region).not.toMatch(new RegExp(`<${tag}[\\s>]`, 'i'));
    }
  });
});

describe('公众号模板 — 避开微信官方明确的违规写法', () => {
  it('不用 !important（官方明确不建议）', () => {
    expect(copyRegion()).not.toContain('!important');
  });

  it('不设置 font-family（官方明确不建议）', () => {
    expect(copyRegion()).not.toContain('font-family');
  });

  it('不用 @media / 伪元素（没有样式表可用，写了也是死代码）', () => {
    const region = copyRegion();
    expect(region).not.toContain('@media');
    expect(region).not.toMatch(/::(before|after)/);
  });

  it('文字背景不用渐变（官方 Dark Mode 规则不建议）', () => {
    // 顶部品牌条原来是 linear-gradient，被官方校验器判为 darkmode-no-gradient，
    // 已改纯色。渐变在 Dark Mode 下会先被 mix 成纯色，文字对比度会失控。
    expect(copyRegion()).not.toMatch(/(linear|radial|conic)-gradient/);
  });

  it('容器用 max-width 而不是写死宽度（官方把固定宽度列为违规）', () => {
    expect(copyRegion()).toContain('max-width:677px');
    expect(copyRegion()).toContain('width:100%');
    // 正文区不能出现写死的 width:677px（max-width:677px 才是对的，故用负向后顾排除）
    expect(copyRegion()).not.toMatch(/(?<!max-)width\s*:\s*677px/);
  });

  it('图片带 data-w 与 max-width（官方建议用 data-w 兜底）', () => {
    const region = copyRegion();
    expect(region).toMatch(/data-w="\d+"/);
    expect(region).toContain('max-width:100%');
  });
});

describe('公众号模板 — 联系方式与品牌', () => {
  it('CTA 里是官方微信号与邮箱，没有历史微信号', () => {
    const region = copyRegion();
    expect(region).toContain('xmumdorm666');
    expect(region).toContain('yejianqin61@gmail.com');
    expect(region).not.toContain('YEJIANQIN_git');
  });

  it('不出现 Jack 字样，中文名保留「厦马小筑」', () => {
    const region = copyRegion();
    expect(region).not.toMatch(/Jack/i);
    expect(region).toContain('厦马小筑');
  });
});

describe('公众号模板 — 复制按钮仍然可用', () => {
  it('按钮写 text/html，而不是只写纯文本', () => {
    // 只复制纯文本的话，粘进公众号就是一堆没有样式的黑字
    expect(html).toContain("'text/html'");
    expect(html).toContain('ClipboardItem');
  });

  it('保留 execCommand 回退路径（不支持 ClipboardItem 的浏览器）', () => {
    expect(html).toContain('execCommand');
    expect(html).toContain('selectNodeContents');
  });

  it('复制按钮本身不在复制范围里（否则会被一起贴进公众号）', () => {
    expect(copyRegion()).not.toContain('copyBtn');
  });
});
