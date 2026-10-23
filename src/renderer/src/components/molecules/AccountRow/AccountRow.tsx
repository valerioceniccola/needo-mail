import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Account } from '@shared/types'
import { cn } from '@/lib/utils'
import Avatar from '@/components/atoms/Avatar/Avatar'

type Props = {
  account: Account
  index: number
  unread: number
  paused: boolean
  loading: boolean
  selected: boolean
  onSelect: () => void
  onMenu: () => void
}

/** Avatar di un account nella colonna laterale: clic per aprirlo, trascinamento, tasto destro per il menu. */
export default function AccountRow({ account, index, unread, paused, loading, selected, onSelect, onMenu }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const shortcut = index < 9 ? ` · ⌘${index + 1}` : ''

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('relative flex h-10 items-center justify-center', isDragging && 'z-10')}>
      {/* barretta dell'account aperto, come in Slack */}
      {selected && <span aria-hidden="true" className="absolute top-2 left-0 h-6 w-1 rounded-r-[3px] bg-foreground" />}

      <button
        type="button"
        onClick={onSelect}
        // col mouse niente focus (bordo azzurro acceso dopo il clic); il trascinamento usa i pointer event, non questo
        onMouseDown={(e) => e.preventDefault()}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu()
        }}
        aria-current={selected ? 'page' : undefined}
        aria-label={`${account.label}${paused ? ', in pausa' : ''}${unread ? `, ${unread} non letti` : ''}`}
        // suggerimento nativo di macOS: un tooltip HTML finirebbe sotto la vista Gmail
        title={`${account.label}${shortcut}${paused ? ' · in pausa' : ''}`}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-sidebar"
        {...attributes}
        {...listeners}
      >
        <Avatar account={account} selected={selected} paused={paused} loading={loading} />
      </button>

      {!paused && unread > 0 && (
        <span
          aria-hidden="true"
          // "99+" è più largo: invece di partire da sinistra si allinea a destra dentro la colonna,
          // così cresce verso l'avatar e non finisce sotto il riquadro di Gmail
          className={cn(
            'pointer-events-none absolute -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d93f45] px-[5px] text-[11px] font-semibold text-white shadow-[0_0_0_2px_var(--sidebar)]',
            unread > 99 ? 'right-[3px]' : 'left-[40px]'
          )}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </div>
  )
}
