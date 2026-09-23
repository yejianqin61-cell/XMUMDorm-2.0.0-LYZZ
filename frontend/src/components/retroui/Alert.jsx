import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import NeoText from './Text';

const alertVariants = cva('relative w-full border-2 p-4', {
  variants: {
    variant: {
      default: 'bg-background text-foreground [&_svg]:shrink-0',
      solid: 'bg-black text-white',
    },
    status: {
      error: 'bg-red-300 text-red-900 border-red-800 shadow-[4px_4px_0_0_#991b1b]',
      success: 'bg-green-300 text-green-900 border-green-800 shadow-[4px_4px_0_0_#166534]',
      warning: 'bg-yellow-200 text-yellow-900 border-yellow-800 shadow-[4px_4px_0_0_#854d0e]',
      info: 'bg-blue-200 text-blue-900 border-blue-800 shadow-[4px_4px_0_0_#1e40af]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function NeoAlert({ className = '', variant, status, children, ...props }) {
  return (
    <div role="alert" className={cn(alertVariants({ variant, status }), className)} {...props}>
      {children}
    </div>
  );
}

function AlertTitle({ className = '', children, ...props }) {
  return (
    <NeoText as="h5" className={cn('font-bold mb-1', className)} {...props}>
      {children}
    </NeoText>
  );
}

function AlertDescription({ className = '', children, ...props }) {
  return (
    <div className={cn('text-sm opacity-90', className)} {...props}>
      {children}
    </div>
  );
}

const NeoAlertCompound = Object.assign(NeoAlert, {
  Title: AlertTitle,
  Description: AlertDescription,
});

export { NeoAlertCompound as NeoAlert };