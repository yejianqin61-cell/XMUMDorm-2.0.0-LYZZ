import NeoBadge from '../retroui/Badge';
import { cn } from '../../lib/utils';
import './Tag.css';

const TONE_VARIANT_MAP = {
  default: { default: 'default', outline: 'outline', solid: 'solid' },
  neutral: { default: 'default', outline: 'outline', solid: 'solid' },
  success: { default: 'accent', outline: 'outline', solid: 'solid' },
  warning: { default: 'primary', outline: 'outline', solid: 'primary' },
  danger: { default: 'destructive', outline: 'outline', solid: 'destructive' },
  info: { default: 'outline', outline: 'outline', solid: 'solid' },
  accent: { default: 'accent', outline: 'outline', solid: 'solid' },
  canteen: { default: 'primary', outline: 'outline', solid: 'primary' },
  square: { default: 'accent', outline: 'outline', solid: 'solid' },
  club: { default: 'default', outline: 'outline', solid: 'solid' },
  marketplace: { default: 'default', outline: 'outline', solid: 'solid' },
};

const SIZE_MAP = { sm: 'sm', md: 'md', lg: 'md' };

export default function Tag({
  as: Component = 'span',
  tone = 'default',
  variant = 'soft',
  size = 'sm',
  active = false,
  interactive = false,
  className = '',
  children,
  type,
  ...rest
}) {
  const ruVariant = TONE_VARIANT_MAP[tone]?.[
    variant === 'soft' ? 'default' : variant
  ] || 'default';
  const ruSize = SIZE_MAP[size] || 'sm';

  const resolvedInteractive = interactive || Component === 'button' || Component === 'a';

  return (
    <NeoBadge
      variant={ruVariant}
      size={ruSize}
      className={cn(
        resolvedInteractive && 'cursor-pointer hover:shadow-[2px_2px_0_0_var(--color-black)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all',
        active && 'bg-foreground text-background border-foreground',
        className
      )}
      type={Component === 'button' ? (type ?? 'button') : undefined}
      as={Component}
      {...rest}
    >
      {children}
    </NeoBadge>
  );
}