/**
 * 认证页圆角输入框（手稿：白底 pill）
 * @param {boolean} [compact] 更小标签与输入高度（注册页一屏）
 */
export default function InputField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  autoComplete,
  className = '',
  compact = false,
}) {
  const gap = compact ? 'space-y-1' : 'space-y-1.5';
  const labelCls = compact
    ? 'block pl-0.5 text-[10px] font-semibold leading-tight text-zinc-800/80'
    : 'block pl-1 text-xs font-semibold tracking-wide text-zinc-800/80';
  const inputCls = compact
    ? 'w-full rounded-full border-0 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-sky-500/50 disabled:opacity-60'
    : 'w-full rounded-full border-0 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-sky-500/50 disabled:opacity-60';

  return (
    <div className={`${gap} ${className}`.trim()}>
      {label ? (
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        className={inputCls}
      />
    </div>
  );
}
