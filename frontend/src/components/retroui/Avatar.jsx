import { useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 items-center justify-center border-2 border-black overflow-hidden font-bold',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-14 w-14 text-base',
        xl: 'h-20 w-20 text-lg',
      },
      shape: {
        circle: '',
        square: 'rounded-none',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
    compoundVariants: [
      { shape: 'circle', className: 'rounded-full' },
    ],
  }
);

function NeoAvatar({ className = '', size, shape, children, ...props }) {
  return (
    <div className={cn(avatarVariants({ size, shape }), className)} {...props}>
      {children}
    </div>
  );
}

function AvatarImage({ className = '', src, alt = '', ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'aspect-square h-full w-full object-cover',
        shape === 'circle' ? 'rounded-full' : '',
        !loaded && 'hidden',
        className
      )}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...props}
    />
  );
}

function AvatarFallback({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const NeoAvatarCompound = Object.assign(NeoAvatar, {
  Image: AvatarImage,
  Fallback: AvatarFallback,
});

export { NeoAvatarCompound as NeoAvatar };