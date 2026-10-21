import { Trash2 } from 'lucide-react'
import type { PauseRule, Weekday } from '@shared/types'
import { cn } from '@/lib/utils'
import content from '@/content.json'

type Props = {
  rule: PauseRule
  onChange: (rule: PauseRule) => void
  onRemove: () => void
}

const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** Una fascia di pausa automatica: giorni della settimana + orario oppure tutto il giorno. */
export default function PauseRuleEditor({ rule, onChange, onRemove }: Props) {
  const toggleDay = (day: Weekday) => {
    const days = rule.days.includes(day) ? rule.days.filter((d) => d !== day) : [...rule.days, day].sort()
    onChange({ ...rule, days })
  }
  // fascia che scavalca la mezzanotte (es. 19:00–09:00): la fine è il giorno dopo
  const overnight = !rule.allDay && rule.from > rule.to

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-sidebar p-3">
      <div className="flex items-center gap-1.5">
        {DAYS.map((day) => {
          const on = rule.days.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={content.settings.dayNames[day]}
              onClick={() => toggleDay(day)}
              className={cn(
                'size-7 rounded-md text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on ? 'bg-primary text-white' : 'border border-input text-muted-foreground hover:text-foreground'
              )}
            >
              {content.settings.dayLetters[day]}
            </button>
          )
        })}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={content.settings.removeRule}
          title={content.settings.removeRule}
          className="flex size-[26px] items-center justify-center rounded-md text-subtle outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-[13px]" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span>{content.settings.pausedFrom}</span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rule.allDay} onChange={(e) => onChange({ ...rule, allDay: e.target.checked })} className="accent-[var(--primary)]" />
          <span className="text-foreground">{content.settings.allDay}</span>
        </label>
        {!rule.allDay && (
          <>
            <span>{content.settings.from}</span>
            <input
              type="time"
              aria-label={content.settings.fromLabel}
              value={rule.from}
              onChange={(e) => onChange({ ...rule, from: e.target.value || rule.from })}
              className="h-7 rounded-md border border-input bg-card px-2 text-foreground tabular-nums outline-none [color-scheme:dark] focus:border-primary"
            />
            <span>{content.settings.to}</span>
            <input
              type="time"
              aria-label={content.settings.toLabel}
              value={rule.to}
              onChange={(e) => onChange({ ...rule, to: e.target.value || rule.to })}
              className="h-7 rounded-md border border-input bg-card px-2 text-foreground tabular-nums outline-none [color-scheme:dark] focus:border-primary"
            />
            {overnight && <span className="text-xs text-subtle">{content.settings.nextDay}</span>}
          </>
        )}
      </div>
      {rule.days.length === 0 && <p className="text-xs text-destructive">{content.settings.noDays}</p>}
    </div>
  )
}
