import NeoButton, { buttonVariants } from '../retroui/Button';
import './Button.css';

const VARIANT_MAP = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  danger: 'destructive',
  tertiary: 'ghost',
  ghost: 'ghost',
  skip: 'link',
  link: 'link',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  block = false,
  ...rest
}) {
  const ruVariant = VARIANT_MAP[variant] || 'default';
  const mergedDisabled = disabled || loading;

  if (Component === 'button') {
    return (
      <NeoButton
        type={type ?? 'button'}
        variant={ruVariant}
        size={size}
        disabled={mergedDisabled}
        loading={loading}
        iconLeft={iconLeft}
        iconRight={iconRight}
        className={`${block ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {children}
      </NeoButton>
    );
  }

  return (
    <Component
      className={`${buttonVariants({ variant: ruVariant, size })} ${block ? 'w-full' : ''} ${className}`}
      disabled={mergedDisabled}
      aria-disabled={mergedDisabled ? 'true' : undefined}
      {...rest}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </Component>
  );
}