import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTranslateConfig, translateContent } from '@shared/api/translate';
import { QK } from '@shared/query/queryKeys';
import { needsTranslation, translationTarget } from '@shared/utils/translation';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { useLanguage } from '../context/LanguageContextState';
import './TranslateToggle.css';

const CONFIG_STALE_MS = 10 * 60 * 1000;

/**
 * 推特式「翻译」：内容语言和界面语言不一样时，在原文下面出现一个小按钮；
 * 点了才请求（控制成本），译文显示在原文下方，可以收起。
 * 服务端没配置翻译、或用户没登录时整个组件不渲染。
 */
export default function TranslateToggle({ kind, id, text, isLoggedIn, className = '' }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const target = translationTarget(lang);
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);

  const configQuery = useQuery({
    queryKey: QK.translateConfig(),
    queryFn: getTranslateConfig,
    staleTime: CONFIG_STALE_MS,
    enabled: Boolean(isLoggedIn),
  });
  const enabled = Boolean(configQuery.data?.enabled);
  const show = Boolean(isLoggedIn && id && enabled && needsTranslation(text, lang));

  const translationQuery = useQuery({
    queryKey: QK.translation(kind, id, target),
    queryFn: () => translateContent({ kind, id, target }),
    enabled: show && requested,
    staleTime: Infinity,
    retry: false,
  });

  if (!show) return null;

  const translated = translationQuery.data?.text;
  const onClick = () => {
    setRequested(true);
    setOpen((value) => !value);
  };

  return (
    <div className={`translate-toggle ${className}`.trim()}>
      <button type="button" className="translate-toggle__button" onClick={onClick}>
        {open ? (isEn ? 'Show original only' : '收起译文') : (isEn ? 'Translate' : '翻译')}
      </button>
      {open && (
        <div className="translate-toggle__result" aria-live="polite">
          {translationQuery.isFetching && !translated && (
            <span className="translate-toggle__hint">{isEn ? 'Translating…' : '翻译中…'}</span>
          )}
          {translationQuery.isError && (
            <span className="translate-toggle__hint">{getApiErrorMessage(translationQuery.error)}</span>
          )}
          {translated && (
            <>
              <span className="translate-toggle__hint">{isEn ? 'Translated by AI' : '由 AI 翻译'}</span>
              <p className="translate-toggle__text">{translated}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
