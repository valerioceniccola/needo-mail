import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Mail, Settings } from 'lucide-react'
import { isPaused } from '@shared/pause'
import { useStore } from '@/app/store'
import AccountRow from '@/components/molecules/AccountRow/AccountRow'
import content from '@/content.json'

/** Barra laterale: nome dell'app, lista unica degli account (riordinabile), Impostazioni in fondo. */
export default function Sidebar() {
  const { accounts, unread, selectedId, now, select, move, pause, resume, remove } = useStore()

  // il trascinamento parte solo dopo 4px, così un clic resta un clic
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(String(active.id), String(over.id))
  }

  return (
    <nav aria-label={content.sidebar.accounts} className="flex w-[236px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2.5 pb-2.5">
      {/* riga dei semafori: da qui si trascina la finestra */}
      <div className="app-drag h-11 shrink-0" />

      <div className="app-drag mb-[18px] flex h-[30px] items-center gap-2 px-1.5">
        <span className="flex size-5 items-center justify-center rounded-[5px] bg-primary">
          <Mail className="size-3 text-white" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <strong className="text-sm font-semibold">{content.appName}</strong>
      </div>

      <div className="px-2 pb-1.5 text-xs font-medium text-subtle">{content.sidebar.accounts}</div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-px">
            {accounts.map((account, index) => (
              <AccountRow
                key={account.id}
                account={account}
                index={index}
                unread={unread[account.id] ?? 0}
                paused={isPaused(account, now)}
                selected={account.id === selectedId}
                onSelect={() => select(account.id)}
                onPause={() => pause(account.id)}
                onResume={() => resume(account.id)}
                onSettings={() => select(account.id)}
                onRemove={() => remove(account.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex-1" />

      <button type="button" className="flex h-[30px] items-center gap-2.5 rounded-md px-2 font-medium text-sidebar-foreground outline-none hover:bg-[#1c1c21] focus-visible:ring-2 focus-visible:ring-ring">
        <Settings className="size-[15px]" aria-hidden="true" />
        {content.sidebar.settings}
      </button>
    </nav>
  )
}
