import { cn } from '../../lib/utils';

function NeoSeparator({ className = '', orientation = 'horizontal', ...props }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 border-0',
        orientation === 'horizontal'
          ? 'h-[2px] w-full bg-black my-4'
          : 'w-[2px] h-full bg-black mx-4',
        className
      )}
      {...props}
    />
  );
}

export default NeoSeparator;