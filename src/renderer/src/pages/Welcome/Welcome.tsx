import { Plus } from 'lucide-react'
import { api } from '@/app/store'
import { Button } from '@/components/ui/button'
import appIcon from '@/assets/app-icon.png'
import content from '@/content.json'

/** Primo avvio: nessun account ancora collegato. */
export default function Welcome() {
  return (
    <main className="mr-2 mb-2 flex min-w-0 flex-1 flex-col rounded-[10px] bg-background shadow-[0_0_0_1px_#26262b]">
      <div className="flex flex-1 flex-col items-center justify-center gap-[18px] p-10 text-center">
        <img src={appIcon} alt="" className="size-20" draggable={false} />
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight">{content.welcome.title}</h1>
        <p className="max-w-[420px] text-sm leading-relaxed text-muted-foreground">{content.welcome.text}</p>
        <Button onClick={api.startAdd} className="mt-1.5 h-9 px-4 text-sm">
          <Plus className="size-3.5" strokeWidth={2.2} />
          {content.welcome.cta}
        </Button>
        <div className="mt-6 flex gap-[22px] text-xs text-subtle">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[#2e2e34] bg-[#1c1c21] px-1.5 leading-[18px] text-sidebar-foreground">⌘1–9</kbd>
            {content.welcome.hintSwitch}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[#2e2e34] bg-[#1c1c21] px-1.5 leading-[18px] text-sidebar-foreground">{content.welcome.rightClick}</kbd>
            {content.welcome.hintMenu}
          </span>
        </div>
      </div>
    </main>
  )
}
