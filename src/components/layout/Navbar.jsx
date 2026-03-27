import { Menu, Bell, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { usePWAUpdate } from '../../hooks/usePWAUpdate'
import SyncStatusBar from '../SyncStatusBar'

const TITLES = {
  '/':                   'Dashboard',
  '/ventas':             'Historial de Ventas',
  '/ventas/nueva':       'Nueva Venta',
  '/productos':          'Productos',
  '/inventario':         'Inventario',
  '/clientes':           'Clientes',
  '/proveedores':        'Proveedores',
  '/compras':            'Compras',
  '/cotizaciones':       'Cotizaciones',
  '/cuentas-por-cobrar': 'Cuentas por Cobrar',
  '/caja':               'Caja',
  '/reportes':           'Reportes',
  '/contabilidad':       'Contabilidad',
  '/pedidos':            'Pedidos',
  '/catalogos':          'Catálogos',
  '/configuracion':      'Configuración Empresa',
  '/ajustes':            'Ajustes del Sistema',
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { updateAvailable, applyUpdate } = usePWAUpdate()
  const title = TITLES[pathname] ?? 'Ferretería El Esfuerzo'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="btn-icon btn-ghost text-gray-500 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <h1 className="flex-1 text-lg font-semibold text-gray-900">{title}</h1>

      <SyncStatusBar />

      <div className="flex items-center gap-2">
        {/* Botón de actualización PWA */}
        {updateAvailable && (
          <button
            onClick={applyUpdate}
            title="Actualización disponible — click para instalar"
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-primary-700 transition-colors animate-pulse-soft"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        )}

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
