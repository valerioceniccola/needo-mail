import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Settings } from 'lucide-react'
import { isPaused } from '@shared/pause'
import { api, useStore } from '@/app/store'
import AccountRow from '@/components/molecules/AccountRow/AccountRow'
import content from '@/content.json'

/** Colonna laterale minimale: un avatar per account, poi + e impostazioni in fondo. */
export default function Sidebar() {
  const { accounts, unread, selectedId, adding, avatarPending, now } = useStore()

  // il trascinamento parte solo dopo 4px, così un clic resta un clic
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) api.move(String(active.id), String(over.id))
  }

  return (
    <nav aria-label={content.sidebar.accounts} className="flex w-[92px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar pb-3">
      {/* riga dei semafori: da qui si trascina la finestra */}
      <div className="app-drag h-11 w-full shrink-0" />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="flex w-full flex-col gap-3 pt-2.5">
            {accounts.map((account, index) => (
              <AccountRow
                key={account.id}
                account={account}
                index={index}
                unread={unread[account.id] ?? 0}
                paused={isPaused(account, now)}
                loading={avatarPending.includes(account.id)}
                selected={!adding && account.id === selectedId}
                onSelect={() => api.select(account.id)}
                onMenu={() => api.openAccountMenu(account.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* account in fase di aggiunta: segnaposto tratteggiato */}
      {adding && (
        <div aria-current="page" className="relative mt-3 flex h-11 w-full items-center justify-center" title={content.sidebar.newAccount}>
          <span aria-hidden="true" className="absolute top-2.5 left-0 h-6 w-1 rounded-r-[3px] bg-foreground" />
          <span className="size-10 rounded-full border border-dashed border-subtle" />
        </div>
      )}

      {/* l'area vuota sotto gli avatar sposta la finestra, come la riga in alto */}
      <div className="app-drag w-full flex-1" />

      <button
        type="button"
        onClick={api.startAdd}
        disabled={!!adding}
        aria-label={content.sidebar.addAccount}
        title={content.sidebar.addAccount}
        className="mb-1.5 flex size-9 items-center justify-center rounded-full border border-dashed border-[#34343b] text-muted-foreground outline-none hover:border-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
      >
        <Plus className="size-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled
        aria-label={content.sidebar.settings}
        title={`${content.sidebar.settings} · ${content.sidebar.settingsSoon}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-[#1c1c21] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Settings className="size-[18px]" strokeWidth={1.8} />
      </button>
    </nav>
  )
}
