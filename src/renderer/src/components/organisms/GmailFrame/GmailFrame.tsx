import { Mail } from 'lucide-react'
import content from '@/content.json'

type Props = {
  email: string
}

/**
 * Riquadro dove apparirà Gmail. Per ora è un segnaposto: la vista vera (WebContentsView)
 * verrà posizionata dal processo principale esattamente sopra questo rettangolo.
 */
export default function GmailFrame({ email }: Props) {
  return (
    <div className="flex min-h-0 flex-1 p-2">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[10px] bg-[#bbd5ec] text-[#1f1f1f] shadow-[0_0_0_1px_#26262b]">
        <Mail className="size-8 text-[#444746]" strokeWidth={1.6} aria-hidden="true" />
        <p className="text-[15px] font-medium">{content.gmail.placeholder}</p>
        <p className="text-[#444746]">
          {content.gmail.placeholderHint} {email}
        </p>
      </div>
    </div>
  )
}
