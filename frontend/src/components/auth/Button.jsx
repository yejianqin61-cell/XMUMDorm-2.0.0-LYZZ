import UIButton from '../ui/Button';

/**
 * 认证页通用按钮
 * @param {React.ElementType} [as] 默认 'button'；可传 react-router 的 Link
 * @param {'primary' | 'skip' | 'ghost'} [variant]
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  className = '',
  children,
  type,
  ...rest
}) {
  const variantMap = {
    primary: 'primary',
    skip: 'tertiary',
    ghost: 'secondary',
  };

  const defaultType = variant === 'primary' ? 'submit' : 'button';

  return (
    <UIButton
      as={Component}
      type={type ?? defaultType}
      variant={variantMap[variant] || 'primary'}
      size={variant === 'primary' ? 'lg' : 'md'}
      block={variant !== 'skip'}
      className={className}
      {...rest}
    >
      {children}
    </UIButton>
  );
}
