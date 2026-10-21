import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Account, PauseRule } from '@shared/types'
import { ACCOUNT_COLORS } from '@shared/types'
import { isScheduledPause, nextScheduledPauseAt, scheduledPauseEndsAt } from '@shared/pause'
import { api, useStore } from '@/app/store'
import { formatWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import ColorDot from '@/components/atoms/ColorDot/ColorDot'
import PauseRuleEditor from '@/components/molecules/PauseRuleEditor/PauseRuleEditor'
import content from '@/content.json'

type Props = {
  account: Account
}

const NEW_RULE: PauseRule = { days: [0, 1, 2, 3, 4], allDay: false, from: '19:00', to: '09:00' }

/** Impostazioni di un account: etichetta, colore, pausa automatica, rimozione. */
export default function AccountSettingsDialog({ account }: Props) {
  const now = useStore((s) => s.now)
  const [label, setLabel] = useState(account.label)
  const [color, setColor] = useState(account.color)
  const [enabled, setEnabled] = useState(account.autoPause.enabled)
  const [rules, setRules] = useState<PauseRule[]>(account.autoPause.rules)

  // la vista Gmail starebbe sopra il dialog: la nascondiamo finché è aperto
  useEffect(() => {
    api.setOverlay(true)
    return () => api.setOverlay(false)
  }, [])

  const toggleEnabled = (on: boolean) => {
    setEnabled(on)
    // accendendo senza fasce ne proponiamo una tipica: sere e mattine dei giorni feriali
    if (on && rules.length === 0) setRules([NEW_RULE])
  }

  const updateRule = (index: number, rule: PauseRule) => setRules(rules.map((r, i) => (i === index ? rule : r)))
  const removeRule = (index: number) => setRules(rules.filter((_, i) => i !== index))

  const invalid = enabled && rules.some((r) => r.days.length === 0)
  const save = () => api.updateAccount(account.id, { label, color, autoPause: { enabled, rules } })

  return (
    <Dialog open onOpenChange={(open) => !open && api.closeSettings()}>
      <DialogContent className="top-[70px] w-[560px]">
        <header className="flex h-[52px] items-center gap-2.5 border-b border-[#232328] pr-3.5 pl-5">
          <ColorDot color={color} />
          <DialogTitle className="flex-1 truncate text-sm font-semibold">
            {label.trim() || account.label} <span className="font-normal text-muted-foreground">· {account.email}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">{content.settings.description}</DialogDescription>
          <Button variant="ghost" size="icon" aria-label={content.settings.close} onClick={api.closeSettings}>
            <X className="size-3.5" />
          </Button>
        </header>

        <form
          className="flex max-h-[calc(100vh-220px)] flex-col gap-4 overflow-y-auto px-5 py-[18px]"
          onSubmit={(e) => {
            e.preventDefault()
            if (!invalid) save()
          }}
        >
          <label className="flex items-center gap-3">
            <span className="w-[110px] text-muted-foreground">{content.add.label}</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 flex-1 rounded-md border border-input bg-sidebar px-2.5 text-foreground outline-none select-text focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="w-[110px] text-muted-foreground">{content.add.color}</span>
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

          <div className="-mx-5 h-px bg-[#232328]" />

          <label className="flex items-start gap-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="font-semibold">{content.settings.autoPause}</span>
              <span className="leading-relaxed text-muted-foreground">{content.settings.autoPauseHint}</span>
            </span>
            <Switch checked={enabled} onCheckedChange={toggleEnabled} className="mt-0.5" />
          </label>

          {enabled && (
            <>
              {rules.map((rule, i) => (
                <PauseRuleEditor key={i} rule={rule} onChange={(r) => updateRule(i, r)} onRemove={() => removeRule(i)} />
              ))}
              <Button type="button" variant="outline" className="self-start border-dashed" onClick={() => setRules([...rules, NEW_RULE])}>
                <Plus className="size-[13px]" strokeWidth={2.2} />
                {content.settings.addRule}
              </Button>
            </>
          )}

          <footer className="-mx-5 -mb-[18px] mt-1 flex items-center gap-2 border-t border-[#232328] py-3 pr-3.5 pl-5">
            <Button type="button" variant="destructive" size="sm" className="-ml-2.5" onClick={() => api.removeAccount(account.id)}>
              {content.settings.remove}
            </Button>
            <span className="flex-1 truncate text-xs text-muted-foreground">{status({ ...account, autoPause: { enabled, rules } }, now)}</span>
            <Button type="button" variant="outline" onClick={api.closeSettings}>
              {content.add.cancel}
            </Button>
            <Button type="submit" disabled={invalid}>
              {content.settings.save}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** "Adesso attivo · in pausa da lunedì alle 19:00", calcolato sulle fasce non ancora salvate. */
function status(draft: Account, now: Date): string {
  if (!draft.autoPause.enabled) return ''
  if (isScheduledPause(draft, now)) {
    const end = scheduledPauseEndsAt(draft, now)
    return end ? `${content.settings.nowPaused} ${formatWhen(end, now)}` : content.settings.alwaysPaused
  }
  const next = nextScheduledPauseAt(draft, now)
  return next ? `${content.settings.nowActive} ${formatWhen(next, now)}` : ''
}
