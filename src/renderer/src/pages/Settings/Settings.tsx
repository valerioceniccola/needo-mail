import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Plus } from 'lucide-react'
import type { Account, AppSettings } from '@shared/types'
import type { UpdateStatus } from '@shared/api'
import { isPaused } from '@shared/pause'
import { api, useStore } from '@/app/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import Avatar from '@/components/atoms/Avatar/Avatar'
import MacNotifications from '@/components/organisms/MacNotifications/MacNotifications'
import content from '@/content.json'

const TOGGLES = ['badge', 'notifications', 'notificationsWarning', 'launchAtLogin'] as const satisfies readonly (keyof AppSettings)[]

/** Impostazioni generali: elenco degli account (riordinabile) e interruttori dell'app. */
export default function Settings() {
  const { accounts, settings, canLaunchAtLogin, appVersion, update, now } = useStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) api.move(String(active.id), String(over.id))
  }

  return (
    <main className="mr-2 mb-2 flex min-w-0 flex-1 flex-col overflow-y-auto rounded-[10px] bg-background shadow-[0_0_0_1px_#26262b]">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3.5 px-6 py-7">
        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="text-[15px] font-semibold">{content.general.accounts}</h2>
            <span className="text-muted-foreground">{content.general.accountsHint}</span>
          </div>
          <Button onClick={api.startAdd}>
            <Plus className="size-[13px]" strokeWidth={2.2} />
            {content.general.addAccount}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          {accounts.length === 0 && <p className="bg-sidebar px-4 py-3.5 text-muted-foreground">{content.general.noAccounts}</p>}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              {accounts.map((account, index) => (
                <AccountItem key={account.id} account={account} index={index} paused={isPaused(account, now)} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <h2 className="mt-5 text-[15px] font-semibold">{content.general.general}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          {TOGGLES.map((key, i) => {
            const [label, hint] = content.general.toggles[key]
            const disabled = key === 'launchAtLogin' && !canLaunchAtLogin
            return (
              <label key={key} className={cn('flex items-center gap-3 bg-sidebar px-3.5 py-[11px]', i > 0 && 'border-t border-[#232328]', disabled && 'opacity-60')}>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{disabled ? content.general.loginOnlyInstalled : hint}</span>
                </span>
                <Switch checked={settings[key]} disabled={disabled} onCheckedChange={(on) => api.setSetting(key, on)} />
              </label>
            )
          })}
        </div>

        <MacNotifications />

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-subtle">
          <span>
            {content.appName} · {content.general.version} {appVersion}
            {updateText(update) && <> · {updateText(update)}</>}
          </span>
          {update.state === 'ready' ? (
            <Button size="sm" onClick={api.installUpdate}>
              {content.updates.restart}
            </Button>
          ) : (
            update.state !== 'dev' && (
              <Button variant="outline" size="sm" disabled={update.state === 'checking' || update.state === 'downloading'} onClick={api.checkForUpdates}>
                {content.updates.check}
              </Button>
            )
          )}
        </div>
      </div>
    </main>
  )
}

/** Riga di stato degli aggiornamenti sotto la versione. */
function updateText(update: UpdateStatus): string {
  switch (update.state) {
    case 'checking':
      return content.updates.checking
    case 'latest':
      return content.updates.latest
    case 'available':
      return `${content.updates.available} ${update.version}`
    case 'downloading':
      return `${content.updates.downloading} ${update.percent}%`
    case 'ready':
      return `${update.version} ${content.updates.ready}`
    case 'error':
      return content.updates.error
    default:
      return ''
  }
}

type ItemProps = {
  account: Account
  index: number
  paused: boolean
}

/** Riga dell'elenco account: maniglia per trascinare, avatar, nomi, stato, scorciatoia, menu. */
function AccountItem({ account, index, paused }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const state = paused ? content.general.statePaused : account.autoPause.enabled ? content.general.stateScheduled : content.general.stateActive

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onContextMenu={(e) => {
        e.preventDefault()
        api.openAccountMenu(account.id)
      }}
      className={cn('flex h-[52px] items-center gap-3 bg-sidebar pr-2.5 pl-2', index > 0 && 'border-t border-[#232328]', isDragging && 'relative z-10 shadow-lg')}
    >
      <button
        type="button"
        aria-label={`Trascina ${account.label}`}
        className="flex h-8 w-5 cursor-grab items-center justify-center rounded text-[#5a5b63] outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Avatar account={account} paused={paused} />
      <span className="w-[120px] truncate font-medium">{account.label}</span>
      <span className="flex-1 truncate text-muted-foreground">{account.email}</span>
      <span className="text-xs text-muted-foreground">{state}</span>
      {index < 9 && <kbd className="rounded border border-[#2e2e34] bg-[#1c1c21] px-1.5 text-[11px] leading-[18px] text-sidebar-foreground">⌘{index + 1}</kbd>}
      <Button variant="ghost" size="icon" aria-label={content.general.options} onClick={() => api.openAccountMenu(account.id)}>
        <MoreHorizontal className="size-4" />
      </Button>
    </div>
  )
}
