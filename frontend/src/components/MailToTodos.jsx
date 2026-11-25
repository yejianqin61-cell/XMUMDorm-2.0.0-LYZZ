import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Toast } from '../context/toast';
import { createTodo } from '@shared/api/todos';
import { extractTodosFromMail, getMailReaderConfig } from '@shared/api/mailReader';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './MailToTodos.css';

const LIST_LABELS = { personal: ['个人', 'Personal'], course: ['课程', 'Course'], club: ['社团', 'Club'], other: ['其他', 'Other'] };

/**
 * 邮件识别待办（任务管理表 #7 第一期）：粘贴学校邮件 → AI 识别要做的事和截止时间 → 勾选、修改 → 加入待办。
 * 服务端没配置 AI 服务时整个入口不显示。邮件原文不保存。
 */
export default function MailToTodos({ isZh, isLoggedIn }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [result, setResult] = useState(null); // { summary, items: [{...item, picked}] }

  const config = useQuery({
    queryKey: ['mailReader', 'config'],
    queryFn: getMailReaderConfig,
    enabled: !!isLoggedIn,
    staleTime: 10 * 60 * 1000,
  });

  const extract = useMutation({
    mutationFn: () => extractTodosFromMail(content, isZh ? 'zh' : 'en'),
    onSuccess: (data) => setResult({ summary: data?.summary || '', items: (data?.items || []).map((it, i) => ({ ...it, key: i, picked: true })) }),
    onError: (e) => Toast.error(getApiErrorMessage(e)),
  });

  const save = useMutation({
    mutationFn: async (items) => {
      let ok = 0;
      for (const it of items) {
        await createTodo({
          title: it.title,
          description: [it.note, isZh ? '（来自邮件识别）' : '(from email)'].filter(Boolean).join(' '),
          priority: it.priority,
          due_date: it.due_date || null,
          due_time: it.due_date && it.due_time ? it.due_time : null,
          list_type: it.list_type,
        });
        ok += 1;
      }
      return ok;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      Toast.success(isZh ? `已加入 ${n} 条待办` : `Added ${n} to-dos`);
      setResult(null);
      setContent('');
      setOpen(false);
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      Toast.error(getApiErrorMessage(e));
    },
  });

  if (!config.data?.enabled) return null;
  const maxChars = config.data.maxChars || 8000;

  const patch = (key, changes) => setResult((r) => ({ ...r, items: r.items.map((it) => (it.key === key ? { ...it, ...changes } : it)) }));
  const picked = result ? result.items.filter((it) => it.picked && it.title.trim()) : [];

  if (!open) {
    return (
      <button type="button" className="mail2todo-open pressable" onClick={() => setOpen(true)}>
        <Mail size={16} aria-hidden /> {isZh ? '从邮件识别待办' : 'Import to-dos from an email'}
      </button>
    );
  }

  return (
    <section className="mail2todo" aria-label={isZh ? '从邮件识别待办' : 'Import from email'}>
      <div className="mail2todo-head">
        <strong>{isZh ? '从邮件识别待办' : 'Import to-dos from an email'}</strong>
        <button type="button" className="mail2todo-link" onClick={() => { setOpen(false); setResult(null); }}>{isZh ? '收起' : 'Close'}</button>
      </div>

      {!result ? (
        <>
          <p className="mail2todo-hint">
            {isZh
              ? '把学校邮件正文复制进来，AI 会找出要做的事和截止时间，你确认后再加入待办。邮件内容不会被保存。'
              : 'Paste a school email. AI finds the tasks and deadlines; you confirm before anything is added. The email is not stored.'}
          </p>
          <textarea
            className="mail2todo-input"
            rows={7}
            maxLength={maxChars}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isZh ? '粘贴邮件正文…' : 'Paste the email here…'}
            aria-label={isZh ? '邮件正文' : 'Email text'}
          />
          <div className="mail2todo-actions">
            <span className="mail2todo-count">{content.length}/{maxChars}</span>
            <button type="button" className="mail2todo-primary pressable" disabled={!content.trim() || extract.isPending} onClick={() => extract.mutate()}>
              {extract.isPending ? (isZh ? '识别中…' : 'Reading…') : (isZh ? '识别' : 'Find to-dos')}
            </button>
          </div>
        </>
      ) : (
        <>
          {result.summary ? <p className="mail2todo-summary">{result.summary}</p> : null}
          {result.items.length === 0 ? (
            <p className="mail2todo-hint">{isZh ? '这封邮件里没有找到需要你做的事。' : 'No action items found in this email.'}</p>
          ) : (
            <ul className="mail2todo-items">
              {result.items.map((it) => (
                <li key={it.key} className={`mail2todo-item ${it.picked ? '' : 'is-off'}`}>
                  <input type="checkbox" checked={it.picked} onChange={(e) => patch(it.key, { picked: e.target.checked })} aria-label={isZh ? '加入这一条' : 'Include'} />
                  <div className="mail2todo-fields">
                    <input className="mail2todo-title" value={it.title} maxLength={120} onChange={(e) => patch(it.key, { title: e.target.value })} aria-label={isZh ? '标题' : 'Title'} />
                    <div className="mail2todo-row">
                      <input type="date" value={it.due_date || ''} onChange={(e) => patch(it.key, { due_date: e.target.value || null })} aria-label={isZh ? '截止日期' : 'Due date'} />
                      <input type="time" value={it.due_time || ''} disabled={!it.due_date} onChange={(e) => patch(it.key, { due_time: e.target.value || null })} aria-label={isZh ? '截止时间' : 'Due time'} />
                      <span className="mail2todo-tag">{(LIST_LABELS[it.list_type] || LIST_LABELS.personal)[isZh ? 0 : 1]}</span>
                      {!it.due_date ? <span className="mail2todo-warn">{isZh ? '邮件里没写日期' : 'No date in email'}</span> : null}
                    </div>
                    {it.note ? <span className="mail2todo-note">{it.note}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mail2todo-hint">{isZh ? 'AI 可能看错日期，加入前请核对。' : 'AI can misread dates. Please double-check.'}</p>
          <div className="mail2todo-actions">
            <button type="button" className="mail2todo-link" onClick={() => setResult(null)}>{isZh ? '重新粘贴' : 'Start over'}</button>
            <button type="button" className="mail2todo-primary pressable" disabled={!picked.length || save.isPending} onClick={() => save.mutate(picked)}>
              {save.isPending ? (isZh ? '加入中…' : 'Adding…') : (isZh ? `加入待办（${picked.length}）` : `Add ${picked.length} to-dos`)}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
