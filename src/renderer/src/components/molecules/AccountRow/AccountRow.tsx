import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CirclePause, CirclePlay, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { Account } from '@shared/types'
import { cn } from '@/lib/utils'
import ColorDot from '@/components/atoms/ColorDot/ColorDot'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import content from '@/content.json'

type Props = {
  account: Account
  index: number
  unread: number
  paused: boolean
  selected: boolean
  onSelect: () => void
  onPause: () => void
  onResume: () => void
  onSettings: () => void
  onRemove: () => void
}

/** Riga di un account nella barra laterale: selezionabile, trascinabile, con menu del tasto destro. */
export default function AccountRow({ account, index, unread, paused, selected, onSelect, onPause, onResume, onSettings, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={setNodeRef}
          type="button"
          onClick={onSelect}
          aria-current={selected ? 'page' : undefined}
          title={index < 9 ? `${account.email} · ⌘${index + 1}` : account.email}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          className={cn(
            'flex h-[30px] w-full items-center gap-2.5 rounded-md px-2 text-left font-medium outline-none',
            'hover:bg-[#1c1c21] focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-1 data-[state=open]:ring-primary',
            selected ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent' : 'text-sidebar-foreground',
            paused && !selected && 'text-muted-foreground',
            isDragging && 'relative z-10 bg-[#1c1c21] shadow-lg'
          )}
          {...attributes}
          {...listeners}
        >
          {paused ? <CirclePause className="size-3 shrink-0" strokeWidth={2.4} aria-label="In pausa" /> : <ColorDot color={account.color} />}
          <span className="flex-1 truncate">{account.label}</span>
          {unread > 0 && <span className={cn('text-xs font-normal', selected ? 'text-sidebar-foreground' : 'text-subtle')}>{unread}</span>}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {paused ? (
          <ContextMenuItem onSelect={onResume}>
            <CirclePlay />
            {content.menu.resume}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={onPause}>
            <CirclePause />
            {content.menu.pause}
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={onSettings}>
          <SlidersHorizontal />
          {content.menu.settings}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2 />
          {content.menu.remove}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
