/**
 * 认证页输入框（极简：浅灰底 + 细边框 + focus 主色描边）
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
  inputClassName = '',
}) {
  const gap = compact ? 'space-y-1' : 'space-y-1.5';
  const labelCls = compact
    ? 'block pl-0.5 text-[11px] font-medium leading-tight text-slate-700'
    : 'block pl-0.5 text-xs font-medium tracking-wide text-slate-700';
  const inputCls = compact
    ? 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
    : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60';

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
        className={`${inputCls} ${inputClassName}`.trim()}
      />
    </div>
  );
}
