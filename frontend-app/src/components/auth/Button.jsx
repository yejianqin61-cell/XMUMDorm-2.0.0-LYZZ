/**
 * 认证页通用按钮
 * @param {React.ElementType} [as] 默认 'button'；可传 react-router 的 Link
 * @param {'primary' | 'skip' | 'ghost'} [variant]
 */
function isButtonElement(Component) {
  return Component === 'button';
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  className = '',
  children,
  type,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center font-sans text-center transition select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'w-full rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm',
    skip:
      'px-1 py-1 text-[13px] font-semibold text-slate-600 hover:text-slate-900',
    ghost:
      'w-full rounded-xl bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
  };

  const defaultType = variant === 'primary' ? 'submit' : 'button';
  const mergedType = isButtonElement(Component) ? (type ?? defaultType) : undefined;

  return (
    <Component
      type={mergedType}
      className={`${base} ${variants[variant] || variants.primary} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
