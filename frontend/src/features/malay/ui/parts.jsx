import { speak } from '../audio.js';

/** 页头：标题 + 副标题 */
export function PageHead({ title, sub }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub ? <p className="mt-1 text-sm opacity-70">{sub}</p> : null}
    </header>
  );
}

/** 区块标题 */
export function SectionTitle({ children, className = '' }) {
  return (
    <h3 className={`mb-3 mt-6 text-base font-semibold ${className}`}>{children}</h3>
  );
}

/** 朗读按钮：点一下播放对应马来语音频 */
export function SpeakButton({ text, className = '', label }) {
  return (
    <button
      type="button"
      title={label || text}
      aria-label={label || text}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        speak(text);
      }}
      className={`malay-speak ${className}`}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}

/** 空状态提示 */
export function EmptyTip({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-current/20 px-4 py-6 text-center text-sm opacity-60">
      {children}
    </p>
  );
}
