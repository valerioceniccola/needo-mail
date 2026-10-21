import { useClock } from '@/app/useClock'
import { useStore } from '@/app/store'
import Sidebar from '@/components/organisms/Sidebar/Sidebar'
import Main from '@/pages/Main/Main'
import Welcome from '@/pages/Welcome/Welcome'

/** Finestra dell'app: barra laterale scura + area principale (o benvenuto se non ci sono account). */
export default function App() {
  useClock()
  const { ready, accounts, adding } = useStore()

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      {ready && (accounts.length === 0 && !adding ? <Welcome /> : <Main />)}
    </div>
  )
}
