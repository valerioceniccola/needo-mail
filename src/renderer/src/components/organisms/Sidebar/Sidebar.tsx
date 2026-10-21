import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Settings } from 'lucide-react'
import { isPaused } from '@shared/pause'
import { api, useStore } from '@/app/store'
import AccountRow from '@/components/molecules/AccountRow/AccountRow'
import appIcon from '@/assets/app-icon.png'
import content from '@/content.json'

/** Barra laterale: nome dell'app, lista unica degli account (riordinabile), Impostazioni in fondo. */
export default function Sidebar() {
  const { accounts, unread, selectedId, adding, now } = useStore()

  // il trascinamento parte solo dopo 4px, così un clic resta un clic
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) api.move(String(active.id), String(over.id))
  }

  return (
    <nav aria-label={content.sidebar.accounts} className="flex w-[236px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2.5 pb-2.5">
      {/* riga dei semafori: da qui si trascina la finestra */}
      <div className="app-drag h-11 shrink-0" />

      <div className="app-drag mb-[18px] flex h-[30px] items-center gap-2 px-1.5">
        <img src={appIcon} alt="" className="size-5" draggable={false} />
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
                selected={!adding && account.id === selectedId}
                onSelect={() => api.select(account.id)}
                onMenu={() => api.openAccountMenu(account.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {adding && (
        <div aria-current="page" className="mt-px flex h-[30px] items-center gap-2.5 rounded-md bg-sidebar-accent px-2 font-medium text-sidebar-accent-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] border border-dashed border-subtle" />
          {content.sidebar.newAccount}
        </div>
      )}

      {/* senza account l'unico modo di aggiungerne uno; poi l'aggiunta sta nel menu File (e nelle Impostazioni) */}
      {accounts.length === 0 && !adding && (
        <button
          type="button"
          onClick={api.startAdd}
          className="flex h-[30px] items-center gap-2.5 rounded-md border border-dashed border-[#34343b] px-2 font-medium text-sidebar-foreground outline-none hover:bg-[#1c1c21] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-[13px]" strokeWidth={2.2} aria-hidden="true" />
          {content.sidebar.addAccount}
        </button>
      )}

      <div className="flex-1" />

      <button
        type="button"
        disabled
        title={content.sidebar.settingsSoon}
        className="flex h-[30px] items-center gap-2.5 rounded-md px-2 font-medium text-sidebar-foreground outline-none hover:bg-[#1c1c21] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Settings className="size-[15px]" aria-hidden="true" />
        {content.sidebar.settings}
      </button>
    </nav>
  )
}
