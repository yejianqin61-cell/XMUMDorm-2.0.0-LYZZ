/**
 * Markdown 预览器（学习资料）
 *
 * 安全约束（重要）：
 *   **禁止渲染原始 HTML** —— 不引入 rehype-raw、不使用 dangerouslySetInnerHTML。
 *   资料库是公开可写的（任何人可开 PR），若渲染 raw HTML 就等于存储型 XSS：
 *   攻击者在 .md 里塞 <script>，一旦合并就影响所有访客。
 *   react-markdown 默认会转义 HTML，保持默认即可。
 *
 * 相对路径解析与目录生成是纯逻辑，放在 shared/utils/materialMarkdown.js 以便单测。
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify, tocHeadings, resolveRepoUrl } from '@shared/utils/materialMarkdown';

/** 把 children（可能是数组/字符串/元素）压平成纯文本，用于生成锚点 id */
function textOf(children) {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (children.props && children.props.children != null) return textOf(children.props.children);
  return '';
}

export default function MarkdownViewer({ text, baseUrl = '', dir = '', showToc = true }) {
  const toc = useMemo(() => tocHeadings(text, 3), [text]);

  const components = useMemo(() => {
    const heading = (Tag) => ({ children }) => <Tag id={slugify(textOf(children))}>{children}</Tag>;
    return {
      h1: heading('h1'),
      h2: heading('h2'),
      h3: heading('h3'),
      h4: heading('h4'),
      img: ({ node: _node, src, alt, ...rest }) => (
        <img src={resolveRepoUrl(src, baseUrl, dir)} alt={alt || ''} loading="lazy" {...rest} />
      ),
      a: ({ node: _node, href, children, ...rest }) => (
        <a href={resolveRepoUrl(href, baseUrl, dir)} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      ),
    };
  }, [baseUrl, dir]);

  if (!text) {
    return <div className="mat-state">暂无内容</div>;
  }

  return (
    <div className="mat-wrap">
      {showToc && toc.length >= 3 && (
        <nav className="mat-glass mat-toc">
          <div className="mat-toc-title">目录</div>
          {toc.map((h) => (
            <div
              key={`${h.id}-${h.level}`}
              className={h.level === 3 ? 'mat-toc-l3' : h.level === 2 ? 'mat-toc-l2' : ''}
            >
              <a href={`#${h.id}`}>{h.text}</a>
            </div>
          ))}
        </nav>
      )}
      {/* 注意：不传 rehypePlugins —— 绝不渲染 raw HTML */}
      <article className="mat-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {String(text)}
        </ReactMarkdown>
      </article>
    </div>
  );
}
