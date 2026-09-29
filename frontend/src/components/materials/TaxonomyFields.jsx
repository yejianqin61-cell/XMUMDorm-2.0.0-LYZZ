/**
 * 三层 details 表单字段
 *
 *   L1 类型：笔记 / 课件 / 试题 / 答案 / 其他（必填）
 *   L3a 课时：整数 + 可选标题
 *   L3b 考试节点：期中/期末/平时测验/作业/月考（空 = 整门课）
 *   附加 来源：官方 / 回忆版 —— **仅当类型 = 试题时出现**
 */

import { TYPES, TYPE_META, EXAM_NODES, EXAM_NODE_META, SOURCES, SOURCE_META, MAX_LESSON_TITLE_LEN } from '@shared/constants/materials';

export default function TaxonomyFields({ value, onChange, isZh = true, disabled = false }) {
  const { type, lesson, lessonTitle, examNode, source } = value;

  const set = (patch) => onChange({ ...value, ...patch });

  const onTypeChange = (next) => {
    // 切成非试题时，自动清掉 source（后端会拒绝「source 用于非试题」）
    set({ type: next, ...(next === 'exam' ? {} : { source: '' }) });
  };

  return (
    <>
      {/* L1 类型 */}
      <div className="mat-field">
        <label className="mat-label">
          {isZh ? '文件类型' : 'File type'}<span className="mat-req">*</span>
        </label>
        <div className="mat-tabs" style={{ marginTop: 0 }}>
          {TYPES.map((t) => {
            const m = TYPE_META[t] || {};
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                className={`mat-tab${type === t ? ' mat-tab--active' : ''}`}
                onClick={() => onTypeChange(t)}
              >
                {m.emoji} {isZh ? m.labelZh : m.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* L3a 课时 */}
      <div className="mat-row2">
        <div className="mat-field">
          <label className="mat-label">{isZh ? '课时序号（选填）' : 'Lesson no. (optional)'}</label>
          <input
            className="mat-input"
            style={{ width: '100%' }}
            type="number"
            min="1"
            inputMode="numeric"
            disabled={disabled}
            placeholder={isZh ? '如 3' : 'e.g. 3'}
            value={lesson ?? ''}
            onChange={(e) => set({ lesson: e.target.value === '' ? '' : e.target.value })}
          />
        </div>
        <div className="mat-field">
          <label className="mat-label">{isZh ? '课时标题（选填）' : 'Lesson title (optional)'}</label>
          <input
            className="mat-input"
            style={{ width: '100%' }}
            maxLength={MAX_LESSON_TITLE_LEN}
            disabled={disabled}
            placeholder={isZh ? '如 链表与树' : 'e.g. Linked lists'}
            value={lessonTitle || ''}
            onChange={(e) => set({ lessonTitle: e.target.value })}
          />
        </div>
      </div>

      {/* L3b 考试节点 */}
      <div className="mat-field">
        <label className="mat-label">{isZh ? '考试节点（选填）' : 'Exam node (optional)'}</label>
        <select
          className="mat-select"
          style={{ width: '100%' }}
          disabled={disabled}
          value={examNode || ''}
          onChange={(e) => set({ examNode: e.target.value })}
        >
          <option value="">{isZh ? '不指定（整门课 / 通用）' : 'None (whole course)'}</option>
          {EXAM_NODES.map((n) => (
            <option key={n} value={n}>{isZh ? EXAM_NODE_META[n].labelZh : EXAM_NODE_META[n].labelEn}</option>
          ))}
        </select>
      </div>

      {/* 来源：仅试题 */}
      {type === 'exam' && (
        <div className="mat-field">
          <label className="mat-label">{isZh ? '试题来源（选填）' : 'Source (optional)'}</label>
          <div className="mat-tabs" style={{ marginTop: 0 }}>
            <button
              type="button"
              disabled={disabled}
              className={`mat-tab${!source ? ' mat-tab--active' : ''}`}
              onClick={() => set({ source: '' })}
            >
              {isZh ? '未知' : 'Unknown'}
            </button>
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                className={`mat-tab${source === s ? ' mat-tab--active' : ''}`}
                onClick={() => set({ source: s })}
              >
                {isZh ? SOURCE_META[s].labelZh : SOURCE_META[s].labelEn}
              </button>
            ))}
          </div>
          <div className="mat-hint">
            {isZh
              ? '「回忆版」指考生凭记忆还原的题目，不是官方原卷。'
              : '“Recalled” means reconstructed from memory, not an official paper.'}
          </div>
        </div>
      )}
    </>
  );
}
