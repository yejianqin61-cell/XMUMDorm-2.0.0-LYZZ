import NeoBadge from '../retroui/Badge';
import './Badge.css';

const TONE_VARIANT_MAP = {
  neutral: { default: 'default', outline: 'outline', solid: 'solid' },
  success: { default: 'accent', outline: 'outline', solid: 'solid' },
  warning: { default: 'primary', outline: 'outline', solid: 'primary' },
  danger: { default: 'destructive', outline: 'outline', solid: 'destructive' },
  info: { default: 'outline', outline: 'outline', solid: 'solid' },
  accent: { default: 'accent', outline: 'outline', solid: 'solid' },
  default: { default: 'default', outline: 'outline', solid: 'solid' },
  canteen: { default: 'primary', outline: 'outline', solid: 'primary' },
};

const SIZE_MAP = { xs: 'sm', sm: 'sm', md: 'md', lg: 'lg' };

export default function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'xs',
  className = '',
  children,
  ...rest
}) {
  const ruVariant = TONE_VARIANT_MAP[tone]?.[
    variant === 'soft' ? 'default' : variant
  ] || 'default';
  const ruSize = SIZE_MAP[size] || 'sm';

  return (
    <NeoBadge variant={ruVariant} size={ruSize} className={className} {...rest}>
      {children}
    </NeoBadge>
  );
}