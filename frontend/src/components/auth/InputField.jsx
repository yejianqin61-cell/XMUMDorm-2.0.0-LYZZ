/**
 * 认证页圆角输入框（手稿：白底 pill）
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
}) {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label ? (
        <label htmlFor={id} className="block pl-1 text-xs font-semibold tracking-wide text-zinc-800/80">
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
        className="w-full rounded-full border-0 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-sky-500/50 disabled:opacity-60"
      />
    </div>
  );
}
