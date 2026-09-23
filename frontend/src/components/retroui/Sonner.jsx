import { Toaster as Sonner } from 'sonner';

function NeoToaster(props) {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast:
            'h-auto w-full p-4 bg-background border-2 border-border shadow-[4px_4px_0_0_#000] group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border flex items-center relative',
          description:
            'group-[.toast]:text-muted-foreground ml-2 text-sm font-sans',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground py-1 px-2 bg-background border-2 border-border shadow hover:shadow-xs hover:translate-x-[2px] hover:translate-y-[2px] duration-200 transition-all focus:shadow-none ml-auto h-fit min-w-fit font-semibold',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-foreground py-1 px-2 text-sm bg-background border-2 border-border shadow hover:shadow-xs hover:translate-x-[2px] hover:translate-y-[2px] duration-200 transition-all focus:shadow-none ml-auto h-fit min-w-fit',
          title: 'ml-2 font-sans font-semibold',
          closeButton:
            'absolute bg-background -top-1 -left-1 rounded-full p-0.5 border-2 border-border',
        },
        unstyled: true,
      }}
      {...props}
    />
  );
}

export { NeoToaster };