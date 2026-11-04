import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { api, useStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

/**
 * Barra "Cerca nella pagina" (⌘F) nell'intestazione: cerca nella pagina di Gmail dell'account aperto,
 * come nei browser. Invio = successivo, ⇧Invio = precedente, esc = chiudi.
 */
export default function FindBar() {
  const find = useStore((s) => s.find)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // a ogni ⌘F il cursore torna nel campo, col testo selezionato
  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [find.focus])

  const search = (value: string) => {
    setText(value)
    api.find(value, true, true)
  }
  const step = (forward: boolean) => text && api.find(text, forward, false)

  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-sidebar pr-1 pl-2.5">
      <input
        ref={input}
        value={text}
        placeholder={content.find.placeholder}
        onChange={(e) => search(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') step(!e.shiftKey)
          if (e.key === 'Escape') api.closeFind()
        }}
        className="h-7 w-[200px] bg-transparent text-[13px] text-foreground outline-none select-text placeholder:text-subtle"
      />
      <span className="min-w-[64px] text-right text-xs text-subtle tabular-nums">
        {text ? (find.total ? `${find.active} ${content.find.of} ${find.total}` : content.find.none) : ''}
      </span>
      <Button variant="ghost" size="icon" tabIndex={-1} className="size-6" aria-label={content.find.previous} title={content.find.previous} disabled={!find.total} onClick={() => step(false)}>
        <ChevronUp className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" tabIndex={-1} className="size-6" aria-label={content.find.next} title={content.find.next} disabled={!find.total} onClick={() => step(true)}>
        <ChevronDown className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" tabIndex={-1} className="size-6" aria-label={content.find.close} title={content.find.close} onClick={api.closeFind}>
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
