import { useClock } from '@/app/useClock'
import { useStore } from '@/app/store'
import Sidebar from '@/components/organisms/Sidebar/Sidebar'
import Main from '@/pages/Main/Main'
import Welcome from '@/pages/Welcome/Welcome'
import AccountSettingsDialog from '@/components/organisms/AccountSettingsDialog/AccountSettingsDialog'

/** Finestra dell'app: barra laterale scura + area principale (o benvenuto se non ci sono account). */
export default function App() {
  useClock()
  const { ready, accounts, adding, editingId } = useStore()
  const editing = accounts.find((a) => a.id === editingId)

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      {ready && (accounts.length === 0 && !adding ? <Welcome /> : <Main />)}
      {/* key: riaprendo le impostazioni di un altro account il modulo riparte dai suoi dati */}
      {editing && <AccountSettingsDialog key={editing.id} account={editing} />}
    </div>
  )
}
