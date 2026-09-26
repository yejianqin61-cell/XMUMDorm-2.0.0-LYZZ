/**
 * 万能墙投稿页 — M09
 *
 * 设计文档 §5、§7。用户只填**正文** + 选**版式**（Key 决策 #2、#3）。
 * 版式即展示版式，发帖时选择，首版发布后不可更换（决策 #4）。
 *
 * 路由：/confession/new
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { QK } from '@shared/query/queryKeys';
import { CONFESSION_TEMPLATES, getTemplate } from '@shared/constants/confessionTemplates';
import { createConfession } from '@shared/api/confessions';
import ConfessionBody from '../components/confession/ConfessionBody';
import './ConfessionWall.css';

export default function ConfessionCompose() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [templateKey, setTemplateKey] = useState(CONFESSION_TEMPLATES[0].key);
  const [content, setContent] = useState('');

  const template = useMemo(() => getTemplate(templateKey), [templateKey]);
  const maxLength = template.maxLength;
  const trimmed = content.trim();
  const overLimit = content.length > maxLength;
  const canSubmit = trimmed.length > 0 && !overLimit;

  const mutation = useMutation({
    mutationFn: () => createConfession({ content: trimmed, template_key: templateKey }),
    onSuccess: () => {
      // 让墙重新拉最新一窗（新投稿会出现在最前面）
      queryClient.invalidateQueries({ queryKey: QK.confessionWindow });
      queryClient.invalidateQueries({ queryKey: QK.confessionMeta() });
      Toast.success(isZh ? '发布成功！' : 'Posted!');
      navigate('/confession');
    },
    onError: (err) => {
      Toast.error(err && err.message ? err.message : isZh ? '发布失败，请稍后重试' : 'Failed to post');
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate();
  };

  return (
    <div className="cf-compose">
      <header className="cf-compose__header">
        <h1 className="cf-compose__title">{isZh ? '投一帖到万能墙' : 'Post to the Wall'}</h1>
        <p className="cf-compose__subtitle">
          {isZh
            ? '表白、寻人、寻物、提问都可以。以匿名身份发布，只有管理员能追溯作者。'
            : 'Confessions, lost & found, questions. Posted anonymously; only admins can trace authors.'}
        </p>
      </header>

      <form className="cf-compose__form" onSubmit={handleSubmit}>
        {/* ---------- 版式选择 ---------- */}
        <fieldset className="cf-compose__fieldset">
          <legend className="cf-compose__legend">{isZh ? '选择版式' : 'Choose a layout'}</legend>
          <div className="cf-compose__templates" role="radiogroup" aria-label={isZh ? '版式' : 'Layout'}>
            {CONFESSION_TEMPLATES.map((item) => {
              const active = item.key === templateKey;
              return (
                <button
                  type="button"
                  key={item.key}
                  role="radio"
                  aria-checked={active}
                  className={`cf-template-option${active ? ' is-active' : ''}`}
                  onClick={() => setTemplateKey(item.key)}
                >
                  <span className={`cf-template-option__preview cf-template-option__preview--${item.key}`}>
                    {item.key === 'bigtype' && <span className="cf-tpl-demo cf-tpl-demo--big">Aa</span>}
                    {item.key === 'letter' && (
                      <span className="cf-tpl-demo cf-tpl-demo--letter">
                        <i /><i /><i />
                      </span>
                    )}
                    {item.key === 'note' && (
                      <span className="cf-tpl-demo cf-tpl-demo--note">
                        <i /><i /><i />
                      </span>
                    )}
                  </span>
                  <strong className="cf-template-option__name">
                    {isZh ? item.labelZh : item.labelEn}
                  </strong>
                  <span className="cf-template-option__desc">
                    {isZh ? item.descZh : item.descEn}
                  </span>
                  <span className="cf-template-option__limit">{item.maxLength}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ---------- 正文 ---------- */}
        <div className="cf-compose__field">
          <label className="cf-compose__legend" htmlFor="cf-compose-content">
            {isZh ? '正文' : 'Content'}
          </label>
          <textarea
            id="cf-compose-content"
            className="cf-compose__textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isZh
                ? '写下你想说的话…（纯文字，不支持图片）'
                : 'Write what you want to say… (text only, no images)'
            }
            rows={8}
            aria-describedby="cf-compose-counter"
          />
          <div
            id="cf-compose-counter"
            className={`cf-compose__counter${overLimit ? ' is-over' : ''}`}
          >
            {content.length} / {maxLength}
          </div>
        </div>

        {/* ---------- 实时预览 ---------- */}
        <div className="cf-compose__field">
          <span className="cf-compose__legend">{isZh ? '效果预览' : 'Preview'}</span>
          <div className="cf-compose__preview">
            {trimmed ? (
              <ConfessionBody
                templateKey={templateKey}
                content={trimmed}
                anonymousLabel={isZh ? '匿名' : 'Anonymous'}
              />
            ) : (
              <p className="cf-compose__preview-empty">
                {isZh ? '输入正文后在这里预览版式效果' : 'Type something to preview the layout'}
              </p>
            )}
          </div>
        </div>

        <div className="cf-compose__actions">
          <button
            type="button"
            className="cf-compose__cancel"
            onClick={() => navigate('/confession')}
          >
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="cf-compose__submit"
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending
              ? isZh
                ? '发布中…'
                : 'Posting…'
              : isZh
                ? '匿名发布'
                : 'Post anonymously'}
          </button>
        </div>

        {overLimit && (
          <p className="cf-compose__warning" role="alert">
            {isZh
              ? `当前版式最多 ${maxLength} 字，请精简或换用信笺卡`
              : `This layout allows up to ${maxLength} characters.`}
          </p>
        )}
      </form>
    </div>
  );
}
