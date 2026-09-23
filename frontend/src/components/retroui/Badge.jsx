import { cn } from '../../lib/utils';
import { cva } from 'class-variance-authority';

const badgeVariants = cva(
  'font-semibold border-2 border-black inline-flex items-center',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        outline: 'bg-transparent text-foreground',
        solid: 'bg-foreground text-background',
        accent: 'bg-accent text-accent-foreground',
        primary: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

export default function NeoBadge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  as: Component = 'span',
  ...props
}) {
  return (
    <Component className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </Component>
  );
}