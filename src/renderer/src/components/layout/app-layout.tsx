import { Outlet } from 'react-router-dom'
import { FirstRunTour } from '@/components/tour/first-run-tour'
import { useGlobalShortcuts } from '@/hooks/use-shortcuts'
import { Sidebar } from './sidebar'

export function AppLayout() {
  useGlobalShortcuts()

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-7 pt-5 pb-10">
        <div className="max-w-[1180px]">
          <Outlet />
        </div>
      </main>
      <FirstRunTour />
    </div>
  )
}
