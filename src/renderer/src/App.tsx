import { useClock } from '@/app/useClock'
import { useStore } from '@/app/store'
import Header from '@/components/organisms/Header/Header'
import Sidebar from '@/components/organisms/Sidebar/Sidebar'
import Main from '@/pages/Main/Main'
import Welcome from '@/pages/Welcome/Welcome'
import AccountSettingsDialog from '@/components/organisms/AccountSettingsDialog/AccountSettingsDialog'

/** Finestra dell'app: riga in alto, colonna degli avatar, area principale (o benvenuto se non ci sono account). */
export default function App() {
  useClock()
  const { ready, accounts, adding, editingId } = useStore()
  const editing = accounts.find((a) => a.id === editingId)

  return (
    // un solo sfondo per riga in alto e colonna, Gmail in un riquadro staccato (come Slack)
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {ready && (accounts.length === 0 && !adding ? <Welcome /> : <Main />)}
      </div>
      {/* key: riaprendo le impostazioni di un altro account il modulo riparte dai suoi dati */}
      {editing && <AccountSettingsDialog key={editing.id} account={editing} />}
    </div>
  )
}
