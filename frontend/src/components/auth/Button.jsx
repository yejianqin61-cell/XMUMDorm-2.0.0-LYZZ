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
    'inline-flex items-center justify-center font-sans text-center transition select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'w-full py-3.5 px-5 rounded-full font-bold text-base text-zinc-900 bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300 shadow-lg shadow-sky-950/15 border border-white/50 active:scale-[0.98]',
    skip:
      'py-2 px-5 rounded-full text-sm font-bold text-zinc-900 bg-gradient-to-r from-sky-500 to-cyan-400 shadow-md border border-white/40 active:scale-[0.98]',
    ghost:
      'w-full py-3 px-4 rounded-full text-sm font-semibold text-zinc-800 bg-white/55 backdrop-blur-md border border-white/55 shadow-sm hover:bg-white/75 active:scale-[0.99]',
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
