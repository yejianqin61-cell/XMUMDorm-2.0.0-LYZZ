import { cn } from '../../lib/utils';

function NeoSkeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse border-2 border-black bg-muted',
        className
      )}
      {...props}
    />
  );
}

function SkeletonText({ className = '', lines = 3, ...props }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <NeoSkeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className = '', ...props }) {
  return (
    <div className={cn('border-2 border-black shadow-[4px_4px_0_0_#122E8A] p-4 space-y-3 bg-background', className)} {...props}>
      <NeoSkeleton className="h-40 w-full" />
      <NeoSkeleton className="h-5 w-2/3" />
      <NeoSkeleton className="h-4 w-full" />
      <NeoSkeleton className="h-4 w-1/2" />
    </div>
  );
}

function SkeletonAvatar({ className = '', size = 'md', ...props }) {
  return (
    <NeoSkeleton
      className={cn(
        'rounded-full',
        size === 'sm' && 'h-8 w-8',
        size === 'md' && 'h-10 w-10',
        size === 'lg' && 'h-14 w-14',
        className
      )}
      {...props}
    />
  );
}

function SkeletonCircle({ className = '', size = 'md', ...props }) {
  return (
    <NeoSkeleton
      className={cn(
        'rounded-full',
        size === 'sm' && 'h-6 w-6',
        size === 'md' && 'h-10 w-10',
        size === 'lg' && 'h-16 w-16',
        className
      )}
      {...props}
    />
  );
}

const NeoSkeletonCompound = Object.assign(NeoSkeleton, {
  Text: SkeletonText,
  Card: SkeletonCard,
  Avatar: SkeletonAvatar,
  Circle: SkeletonCircle,
});

export { NeoSkeletonCompound as NeoSkeleton };