import { useClock } from '@/app/useClock'
import { useShortcuts } from '@/app/useShortcuts'
import Sidebar from '@/components/organisms/Sidebar/Sidebar'
import Main from '@/pages/Main/Main'

/** Finestra dell'app: barra laterale scura + area principale. */
export default function App() {
  useClock()
  useShortcuts()

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <Main />
    </div>
  )
}
