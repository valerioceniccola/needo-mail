import { cn } from '@/lib/utils'

type Props = {
  color: string
  className?: string
}

/** Quadratino colorato che identifica un account. */
export default function ColorDot({ color, className }: Props) {
  return <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-[3px]', className)} style={{ background: color }} />
}
