import { cva } from 'class-variance-authority';
export const buttonVariants = cva(
  'font-semibold transition-all cursor-pointer rounded-none duration-200 font-medium flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary border-2 border-black',
  {
    variants: {
      variant: {
        default:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-primary text-primary-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1 hover:bg-primary-hover',
        secondary:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-secondary text-secondary-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        outline:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-transparent transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        destructive:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-destructive text-destructive-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        ghost:
          'border-transparent bg-transparent hover:bg-muted shadow-none',
        link: 'border-transparent bg-transparent hover:underline shadow-none',
      },
      size: {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-1.5 text-base',
        lg: 'px-6 py-2 text-lg',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);
