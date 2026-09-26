/**
 * 万能墙评论区「悬浮居中弹窗」结构测试 — M09
 *
 * 根 jest 配置是 testEnvironment: node，且 frontend/ 自带 package.json（"type": "module"），
 * 根 .babelrc 不覆盖 frontend/src/**，因此这里沿用仓库既有做法：读源码做结构断言。
 * 纯逻辑（Tab 环绕、按键映射）已在 focusTrap.test.js / confessionKeyboard.test.js 覆盖。
 */
const fs = require('fs');
const path = require('path');

const read = (...segments) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...segments), 'utf8');

describe('评论区弹窗：组件结构', () => {
  const panel = read('frontend', 'src', 'components', 'confession', 'ConfessionCommentPanel.jsx');

  it('通过 portal 挂到 body，脱离 .cf-wall 子树（否则会被翻页视口与页面流挤压）', () => {
    expect(panel).toContain("import { createPortal } from 'react-dom'");
    expect(panel).toContain('createPortal(');
    expect(panel).toContain('document.body');
    expect(panel).toContain("if (typeof document === 'undefined') return null;");
  });

  it('是无障碍意义上的模态对话框', () => {
    expect(panel).toContain('role="dialog"');
    expect(panel).toContain('aria-modal="true"');
    expect(panel).toContain('aria-labelledby="cf-comments-title"');
    expect(panel).toContain('id="cf-comments-title"');
  });

  it('打开时锁定背景滚动，卸载时恢复原值', () => {
    expect(panel).toContain('const previousOverflow = document.body.style.overflow;');
    expect(panel).toContain("document.body.style.overflow = 'hidden';");
    expect(panel).toContain('document.body.style.overflow = previousOverflow;');
  });

  it('关闭时把焦点还给打开弹窗的元素', () => {
    expect(panel).toContain('const previousFocus = document.activeElement;');
    expect(panel).toContain('document.contains(previousFocus)');
    expect(panel).toContain('previousFocus.focus()');
  });

  it('自己处理 Esc 与 Tab（portal 之后事件不再冒泡到墙容器）', () => {
    expect(panel).toContain("window.addEventListener('keydown', onKeyDown)");
    expect(panel).toContain("window.removeEventListener('keydown', onKeyDown)");
    expect(panel).toContain("event.key === 'Escape'");
    expect(panel).toContain("event.key !== 'Tab'");
    expect(panel).toContain('computeTabTargetIndex');
  });

  it('内部还有更深的浮层（举报弹层）时，Esc 让给它', () => {
    expect(panel).toContain('function hasNestedOverlay(target, root)');
    expect(panel).toContain("window.getComputedStyle(node).position === 'fixed'");
    expect(panel).toContain('if (hasNestedOverlay(event.target, panelRef.current)) return;');
  });

  it('只有按下与松开都落在遮罩上才关闭（拖选文字不误判）', () => {
    expect(panel).toContain('backdropPressedRef');
    expect(panel).toContain('onMouseDown={handleBackdropMouseDown}');
    expect(panel).toContain('onClick={handleBackdropClick}');
    expect(panel).toContain('backdropPressedRef.current && event.target === event.currentTarget');
  });

  it('焦点陷阱只收集真正可见的元素', () => {
    expect(panel).toContain('function visibleFocusable(panel)');
    expect(panel).toContain('getClientRects().length > 0');
  });

  it('未登录时焦点进入关闭按钮，保证焦点不留在弹窗外', () => {
    expect(panel).toContain('closeBtnRef');
    expect(panel).toContain('closeBtnRef.current?.focus()');
  });
});

describe('评论区弹窗：样式几何', () => {
  const css = read('frontend', 'src', 'pages', 'ConfessionWall.css');

  it('遮罩固定铺满并居中', () => {
    expect(css).toMatch(/\.cf-comments-backdrop\s*\{[^}]*position:\s*fixed;/s);
    expect(css).toMatch(/\.cf-comments-backdrop\s*\{[^}]*align-items:\s*center;/s);
    expect(css).toMatch(/\.cf-comments-backdrop\s*\{[^}]*justify-content:\s*center;/s);
  });

  it('层级在站点外壳与业务弹窗之上、Toast 之下', () => {
    expect(css).toMatch(/\.cf-comments-backdrop\s*\{[^}]*z-index:\s*2000;/s);
  });

  it('强调色变量在遮罩上重新声明（portal 后不再继承 .cf-wall）', () => {
    expect(css).toMatch(/\.cf-wall,\s*\n\.cf-compose,\s*\n\.cf-comments-backdrop\s*\{/);
  });

  it('弹窗限高，只有列表区滚动、输入框常驻', () => {
    expect(css).toMatch(/\.cf-comments\s*\{[^}]*max-height:\s*min\(84vh,\s*780px\);/s);
    expect(css).toMatch(/\.cf-comments__body\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.cf-comments__form\s*\{[^}]*flex-shrink:\s*0;/s);
  });

  it('动效降级时遮罩与弹窗都不做动画', () => {
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*?\.cf-comments-backdrop,\s*\n\s*\.cf-comments\s*\{\s*\n\s*animation:\s*none;/);
  });
});

describe('万能墙：一屏一篇高度', () => {
  const css = read('frontend', 'src', 'pages', 'ConfessionWall.css');
  const pager = read('frontend', 'src', 'components', 'confession', 'ConfessionPager.jsx');

  it('桌面视口高度为 88vh', () => {
    expect(css).toContain('--cf-pager-height: 88vh;');
  });

  it('窄屏为 82vh', () => {
    expect(css).toContain('--cf-pager-height: 82vh;');
  });

  it('翻页位移用的兜底值与 CSS 一致', () => {
    expect(pager).toContain("export const PAGER_PANE_HEIGHT = 'var(--cf-pager-height, 88vh)';");
  });
});

describe('万能墙：评论入口无障碍状态', () => {
  const card = read('frontend', 'src', 'components', 'confession', 'ConfessionCard.jsx');
  const wall = read('frontend', 'src', 'pages', 'ConfessionWall.jsx');

  it('评论按钮声明弹出对话框并播报展开状态', () => {
    expect(card).toContain('aria-haspopup="dialog"');
    expect(card).toContain('aria-expanded={commentsOpen}');
  });

  it('只有当前展示的那一篇会拿到展开状态', () => {
    expect(wall).toContain('commentsOpen={commentsOpen && item.id === currentId}');
  });
});
