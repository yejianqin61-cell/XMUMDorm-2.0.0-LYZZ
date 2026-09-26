/**
 * 万能墙键盘控制纯逻辑测试 — M09
 *
 * 覆盖设计文档 §7.3 的两条硬规则：
 *   1. 焦点在输入框时仅放行 Esc
 *   2. 带修饰键一律不处理
 */
const {
  resolveKeyboardAction,
  CONFESSION_KEY_ACTIONS: A,
} = require('../../shared/utils/confessionKeyboard');

describe('resolveKeyboardAction', () => {
  describe('基础翻页映射（焦点不在输入框）', () => {
    const notTyping = { activeElementTag: 'DIV' };

    it.each([
      ['ArrowUp', A.PREV],
      ['ArrowLeft', A.PREV],
      ['ArrowDown', A.NEXT],
      ['ArrowRight', A.NEXT],
      ['Home', A.FIRST],
      ['End', A.LAST],
      ['Enter', A.OPEN_COMMENTS],
      [' ', A.OPEN_COMMENTS],
      ['Spacebar', A.OPEN_COMMENTS],
    ])('%s → %s', (key, expected) => {
      expect(resolveKeyboardAction(key, notTyping)).toBe(expected);
    });

    it('未映射的键返回 null（不拦截）', () => {
      expect(resolveKeyboardAction('a', notTyping)).toBeNull();
      expect(resolveKeyboardAction('Tab', notTyping)).toBeNull();
      expect(resolveKeyboardAction('PageUp', notTyping)).toBeNull();
    });

    it('key 缺失返回 null', () => {
      expect(resolveKeyboardAction(undefined, notTyping)).toBeNull();
      expect(resolveKeyboardAction('', notTyping)).toBeNull();
    });
  });

  describe('焦点让位规则（规则 1）', () => {
    it.each(['INPUT', 'TEXTAREA', 'SELECT', 'input', 'textarea'])(
      '焦点在 %s 时所有翻页键返回 null',
      (tag) => {
        expect(resolveKeyboardAction('ArrowUp', { activeElementTag: tag })).toBeNull();
        expect(resolveKeyboardAction('ArrowDown', { activeElementTag: tag })).toBeNull();
        expect(resolveKeyboardAction('Home', { activeElementTag: tag })).toBeNull();
        expect(resolveKeyboardAction('End', { activeElementTag: tag })).toBeNull();
        expect(resolveKeyboardAction(' ', { activeElementTag: tag })).toBeNull();
        expect(resolveKeyboardAction('Enter', { activeElementTag: tag })).toBeNull();
      }
    );

    it('焦点在 contenteditable 时同样让位', () => {
      expect(
        resolveKeyboardAction('ArrowDown', { activeElementTag: 'DIV', isContentEditable: true })
      ).toBeNull();
    });

    it('焦点在输入框且面板展开时，Esc 仍放行（唯一例外）', () => {
      expect(
        resolveKeyboardAction('Escape', {
          activeElementTag: 'TEXTAREA',
          commentsOpen: true,
        })
      ).toBe(A.CLOSE_COMMENTS);
    });
  });

  describe('Esc 语义', () => {
    it('面板展开时关闭面板', () => {
      expect(resolveKeyboardAction('Escape', { commentsOpen: true })).toBe(A.CLOSE_COMMENTS);
    });

    it('面板已关时不处理（不触发路由返回）', () => {
      expect(resolveKeyboardAction('Escape', { commentsOpen: false })).toBeNull();
    });

    it('焦点在输入框但面板已关时，Esc 交给浏览器原生行为', () => {
      expect(
        resolveKeyboardAction('Escape', { commentsOpen: false, activeElementTag: 'INPUT' })
      ).toBeNull();
    });
  });

  describe('修饰键规则（规则 2）', () => {
    it.each(['metaKey', 'ctrlKey', 'altKey'])('%s 按下时不处理', (mod) => {
      expect(resolveKeyboardAction('ArrowDown', { [mod]: true })).toBeNull();
      expect(resolveKeyboardAction('Enter', { [mod]: true })).toBeNull();
      expect(resolveKeyboardAction('Escape', { commentsOpen: true, [mod]: true })).toBeNull();
    });
  });

  describe('已被处理的事件不重复介入', () => {
    it('defaultPrevented 为 true 时返回 null', () => {
      expect(resolveKeyboardAction('ArrowDown', { defaultPrevented: true })).toBeNull();
    });
  });

  describe('空上下文', () => {
    it('无参数调用不抛错', () => {
      expect(() => resolveKeyboardAction('ArrowDown')).not.toThrow();
      expect(resolveKeyboardAction('ArrowDown')).toBe(A.NEXT);
    });

    it('ctx 为 null 时不抛错', () => {
      expect(resolveKeyboardAction('ArrowUp', null)).toBe(A.PREV);
    });
  });
});
