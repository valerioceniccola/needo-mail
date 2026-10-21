import { useEffect, useState } from 'react'
import { ACCOUNT_COLORS } from '@shared/types'
import { api, useStore } from '@/app/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import content from '@/content.json'

type Props = {
  email: string
}

/** Secondo passo dell'aggiunta: login riuscito, si scelgono etichetta e colore. */
export default function NewAccountDialog({ email }: Props) {
  const accounts = useStore((s) => s.accounts)
  const [label, setLabel] = useState(() => defaultLabel(email))
  // primo colore non ancora usato da un altro account
  const [color, setColor] = useState<string>(() => ACCOUNT_COLORS.find((c) => !accounts.some((a) => a.color === c)) ?? ACCOUNT_COLORS[0])

  // la vista Gmail starebbe sopra il dialog: la nascondiamo finché è aperto
  useEffect(() => {
    api.setOverlay(true)
    return () => api.setOverlay(false)
  }, [])

  const confirm = () => api.confirmAdd(label, color)

  return (
    <Dialog open onOpenChange={(open) => !open && api.cancelAdd()}>
      <DialogContent>
        <div className="flex flex-col items-center gap-2.5 border-b border-[#232328] px-[22px] pt-6 pb-[18px] text-center">
          <span className="rounded-[10px] border border-[#2c2c33] px-2 text-xs font-semibold text-sidebar-foreground">{content.add.step2}</span>
          <span className="flex size-12 items-center justify-center rounded-xl text-lg font-semibold text-black/70" style={{ background: color }}>
            {(label.trim()[0] ?? '?').toUpperCase()}
          </span>
          <DialogTitle className="text-base font-semibold">{content.add.connected}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{email}</DialogDescription>
        </div>

        <form
          className="flex flex-col gap-4 px-[22px] py-[18px]"
          onSubmit={(e) => {
            e.preventDefault()
            confirm()
          }}
        >
          <label className="flex items-center gap-3">
            <span className="w-[90px] text-muted-foreground">{content.add.label}</span>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 flex-1 rounded-md border border-input bg-sidebar px-2.5 text-foreground outline-none select-text focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="w-[90px] text-muted-foreground">{content.add.color}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={content.add.color}>
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === color}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn('size-5 rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-ring', c === color && 'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-card')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-subtle">{content.add.note}</p>
          <div className="-mx-[22px] -mb-[18px] flex justify-end gap-2 border-t border-[#232328] px-3.5 py-3">
            <Button type="button" variant="outline" onClick={api.cancelAdd}>
              {content.add.cancel}
            </Button>
            <Button type="submit">{content.add.confirm}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Proposta di etichetta: la parte prima della @, con l'iniziale maiuscola. */
function defaultLabel(email: string): string {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}
