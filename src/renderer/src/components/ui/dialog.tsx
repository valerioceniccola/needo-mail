import type { ComponentProps } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Dialog shadcn, ridotto alle parti che usiamo, con lo stile della tela. */
function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(5,5,7,0.62)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-[120px] left-1/2 z-50 w-[460px] -translate-x-1/2 rounded-xl border border-[#2c2c33] bg-card text-card-foreground shadow-[0_24px_70px_rgba(0,0,0,0.6)] outline-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

export { Dialog, DialogContent, DialogTitle, DialogDescription }
