import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const TITLES = {
  '/':           'Dashboard',
  '/ventas':     'Ventas',
  '/ventas/nueva': 'Nueva Venta',
  '/productos':  'Productos',
  '/inventario': 'Inventario',
  '/clientes':   'Clientes',
  '/reportes':   'Reportes',
  '/ajustes':    'Ajustes',
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'FerreApp'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="btn-icon btn-ghost text-gray-500 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <h1 className="flex-1 text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-2">
        <button className="btn-icon btn-ghost text-gray-500 relative">
          <Bell size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <span>{new Date().toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </header>
  )
}
