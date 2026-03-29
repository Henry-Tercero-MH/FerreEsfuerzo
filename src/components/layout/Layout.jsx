import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useServiceWorker } from '../../hooks/useServiceWorker'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { updateAvailable, applyUpdate } = useServiceWorker()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {updateAvailable && (
          <div className="flex items-center justify-between gap-3 bg-primary-600 px-4 py-2 text-white text-sm">
            <span>Nueva versión disponible</span>
            <button
              onClick={applyUpdate}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30 transition-colors"
            >
              <RefreshCw size={14} />
              Actualizar ahora
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
