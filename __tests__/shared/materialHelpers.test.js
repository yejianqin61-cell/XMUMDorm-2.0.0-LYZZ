/**
 * 学习资料前端纯逻辑测试
 *
 * 覆盖两类「写错了很难在界面上发现」的逻辑：
 *   ① Markdown 相对链接解析 —— 中文文件名要编码，但路径分隔符必须保留；
 *   ② 展示格式化 —— 脏数据不能把页面搞崩。
 */

const {
  slugify,
  extractHeadings,
  tocHeadings,
  resolveRepoUrl,
  dirOf,
} = require('../../shared/utils/materialMarkdown');

const {
  humanSize,
  formatDate,
  courseLabel,
  parseTagInput,
} = require('../../shared/utils/materialDisplay');

describe('Markdown 辅助', () => {
  it('slugify 保留中英文数字，去掉标点与空白', () => {
    expect(slugify('第三课时 链表与树')).toBe('第三课时-链表与树');
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  a   b  ')).toBe('a-b');
    expect(slugify(null)).toBe('');
  });

  it('extractHeadings 只取 # 标题，忽略正文里的 # 号', () => {
    const md = [
      '# 一级标题',
      '',
      '正文里有 # 但不是标题',
      '',
      '## 二级标题 ###',
      '### 三级',
      '#### 四级',
    ].join('\n');
    const hs = extractHeadings(md);
    expect(hs.map((h) => h.level)).toEqual([1, 2, 3, 4]);
    expect(hs[1].text).toBe('二级标题'); // 结尾的 ### 被剥掉
    expect(hs[0].id).toBe('一级标题');
  });

  it('tocHeadings 只取前三级', () => {
    const md = '# a\n## b\n### c\n#### d';
    expect(tocHeadings(md).map((h) => h.level)).toEqual([1, 2, 3]);
    expect(tocHeadings(md, 2).map((h) => h.level)).toEqual([1, 2]);
  });

  it('dirOf 取目录且无尾随斜杠', () => {
    expect(dirOf('c7/notes/a.md')).toBe('c7/notes');
    expect(dirOf('a.md')).toBe('');
    expect(dirOf('/a.md')).toBe('');
  });

  describe('resolveRepoUrl', () => {
    const base = 'https://cdn.jsdelivr.net/gh/o/r@abc123';

    it('绝对地址与锚点原样返回', () => {
      expect(resolveRepoUrl('https://example.com/a.png', base, 'c7')).toBe('https://example.com/a.png');
      expect(resolveRepoUrl('http://example.com/a.png', base, 'c7')).toBe('http://example.com/a.png');
      expect(resolveRepoUrl('#section-1', base, 'c7')).toBe('#section-1');
      expect(resolveRepoUrl('data:image/png;base64,AAA', base, 'c7')).toBe('data:image/png;base64,AAA');
    });

    it('相对路径按当前目录拼接', () => {
      expect(resolveRepoUrl('./img/a.png', base, 'c7/notes')).toBe(`${base}/c7/notes/img/a.png`);
      expect(resolveRepoUrl('img/a.png', base, 'c7/notes')).toBe(`${base}/c7/notes/img/a.png`);
    });

    it('以 / 开头视为仓库根相对路径', () => {
      expect(resolveRepoUrl('/img/a.png', base, 'c7/notes')).toBe(`${base}/img/a.png`);
    });

    it('中文文件名逐段编码，但保留路径分隔符 /', () => {
      const out = resolveRepoUrl('./第三课时 笔记.md', base, 'c7/notes');
      expect(out).toBe(`${base}/c7/notes/${encodeURIComponent('第三课时 笔记.md')}`);
      expect(out).toContain('c7/notes/'); // 分隔符没被编成 %2F
      expect(out).not.toContain('%2F');
    });

    it('没有 baseUrl 时原样返回（不至于拼出坏地址）', () => {
      expect(resolveRepoUrl('./a.png', '', 'c7')).toBe('./a.png');
      expect(resolveRepoUrl('./a.png', null, 'c7')).toBe('./a.png');
    });

    it('忽略空值与多余斜杠', () => {
      expect(resolveRepoUrl('', base, 'c7')).toBe('');
      expect(resolveRepoUrl(null, base, 'c7')).toBe(null);
      expect(resolveRepoUrl('./a.png', `${base}///`, '')).toBe(`${base}/a.png`);
    });
  });
});

describe('展示格式化', () => {
  it('humanSize 覆盖 B/KB/MB', () => {
    expect(humanSize(0)).toBe('0 B');
    expect(humanSize(1023)).toBe('1023 B');
    expect(humanSize(2048)).toBe('2.0 KB');
    expect(humanSize(20 * 1024 * 1024)).toBe('20.00 MB');
  });

  it('humanSize 对脏数据不抛错', () => {
    expect(humanSize(null)).toBe('0 B');
    expect(humanSize(undefined)).toBe('0 B');
    expect(humanSize('abc')).toBe('0 B');
  });

  it('formatDate 输出 YYYY-MM-DD，非法输入返回空串', () => {
    expect(formatDate('2026-01-15T08:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });

  it('courseLabel 处理伪课程与讲师', () => {
    expect(courseLabel({ courseId: 1 }, true)).toBe('通用 / 其他');
    expect(courseLabel({ courseId: 1 }, false)).toBe('General');
    expect(courseLabel({ courseId: 7, courseName: '数据结构' }, true)).toBe('数据结构');
    expect(courseLabel({ courseId: 7, courseName: '数据结构', lecturer: '张三' }, true)).toBe('数据结构 · 张三');
    expect(courseLabel({ courseId: 9 }, true)).toBe('c9'); // 名字缺失时兜底
    expect(courseLabel(null)).toBe('');
  });

  it('parseTagInput 支持中英文逗号、去空去重', () => {
    expect(parseTagInput('期中, 链表，期中')).toEqual(['期中', '链表']);
    expect(parseTagInput(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(parseTagInput('')).toEqual([]);
    expect(parseTagInput(null)).toEqual([]);
  });
});
