import { cn } from '../../lib/utils';
import NeoText from './Text';
import { Ghost } from 'lucide-react';

function NeoEmpty({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-4 md:p-8 border-2 shadow-[4px_4px_0_0_#122E8A] transition-all hover:shadow-none bg-card text-center',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function EmptyContent({ className = '', children, ...props }) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} {...props}>
      {children}
    </div>
  );
}

function EmptyIcon({ children, className = '', ...props }) {
  return (
    <div className={cn(className)} {...props}>
      {children || <Ghost className="w-12 h-12 text-muted-foreground" />}
    </div>
  );
}

function EmptyTitle({ className = '', children, ...props }) {
  return (
    <NeoText as="h3" className={cn('text-lg md:text-2xl font-bold', className)} {...props}>
      {children}
    </NeoText>
  );
}

function EmptySeparator({ className = '', ...props }) {
  return <div role="separator" className={cn('w-full h-1 bg-primary', className)} {...props} />;
}

function EmptyDescription({ className = '', children, ...props }) {
  return (
    <p className={cn('text-muted-foreground max-w-[320px]', className)} {...props}>
      {children}
    </p>
  );
}

const NeoEmptyCompound = Object.assign(NeoEmpty, {
  Content: EmptyContent,
  Icon: EmptyIcon,
  Title: EmptyTitle,
  Separator: EmptySeparator,
  Description: EmptyDescription,
});

export { NeoEmptyCompound as NeoEmpty };