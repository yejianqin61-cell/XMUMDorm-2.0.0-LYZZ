/**
 * 万能墙三款版式的正文渲染 — M09
 *
 * 版式契约见 docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §5.2。
 * 三款版式共用同一个卡片外壳（ConfessionCard），差异只在这里的正文排布。
 */
import { getTemplate, normalizeTemplateKey } from '@shared/constants/confessionTemplates';

/** 大字卡：短句心意，居中大字 */
function BigTypeBody({ content }) {
  // 超过 3 行时整体降一级字号，避免长句把卡片撑破
  const length = content.length;
  const density = length > 40 ? 'is-dense' : length > 20 ? 'is-medium' : 'is-sparse';
  return (
    <div className={`cf-body cf-body--bigtype ${density}`}>
      <p className="cf-bigtype-text">{content}</p>
    </div>
  );
}

/** 信笺卡：长文倾诉，纸感信笺 + 落款 */
function LetterBody({ content, anonymousLabel }) {
  return (
    <div className="cf-body cf-body--letter">
      <p className="cf-letter-text">{content}</p>
      <p className="cf-letter-sign">—— {anonymousLabel}</p>
    </div>
  );
}

/**
 * 便签卡：寻人寻物，按换行渲染为要点行。
 * 空行被跳过；单行过长时自然换行（由 CSS 处理）。
 */
function NoteBody({ content }) {
  const lines = String(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="cf-body cf-body--note">
      {lines.length > 1 ? (
        <ul className="cf-note-list">
          {lines.map((line, idx) => (
            // 便签内容是纯文本要点，用下标作 key 是安全的（列表无重排/编辑）
            <li className="cf-note-item" key={`${idx}-${line.slice(0, 8)}`}>
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="cf-note-single">{lines[0] || String(content)}</p>
      )}
    </div>
  );
}

/**
 * 按 template_key 分派正文渲染。
 * 未知 key 一律回落到默认版式（后端已做白名单，这里是第二道防线）。
 */
export default function ConfessionBody({ templateKey, content, anonymousLabel = '匿名' }) {
  const key = normalizeTemplateKey(templateKey);
  const safeContent = String(content == null ? '' : content);

  switch (key) {
    case 'letter':
      return <LetterBody content={safeContent} anonymousLabel={anonymousLabel} />;
    case 'note':
      return <NoteBody content={safeContent} />;
    case 'bigtype':
    default:
      return <BigTypeBody content={safeContent} />;
  }
}

export { getTemplate };
