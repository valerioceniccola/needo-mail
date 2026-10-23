import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-transparent text-foreground hover:bg-accent',
        ghost: 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'text-destructive hover:bg-accent'
      },
      size: {
        default: 'h-[30px] px-3',
        sm: 'h-7 px-2.5',
        icon: 'size-7'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

/** Pulsante shadcn con le varianti dello stile Linear. */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  // col mouse il pulsante non prende il focus: niente bordo azzurro che resta acceso dopo il clic
  // (il clic funziona lo stesso; da tastiera con Tab il bordo c'è ancora)
  const onMouseDown: ComponentProps<'button'>['onMouseDown'] = (e) => {
    e.preventDefault()
    props.onMouseDown?.(e)
  }
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} onMouseDown={onMouseDown} />
}

export { Button, buttonVariants }
