import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, FileText,
  Users, Truck, Wallet, BarChart3, Building2, Settings, Wrench, X, LogOut,
  ClipboardList, BookOpen,
} from 'lucide-react'
import IconQ from '../ui/IconQ'
import { useAuth, ROLES } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/',                   label: 'Dashboard',          icon: LayoutDashboard, end: true },
  { separator: true,           label: 'VENTAS' },
  { to: '/ventas',             label: 'Ventas',             icon: ShoppingCart },
  { to: '/cotizaciones',       label: 'Cotizaciones',       icon: FileText },
  { to: '/cuentas-por-cobrar', label: 'Cuentas por Cobrar', icon: IconQ },
  { separator: true,           label: 'INVENTARIO' },
  { to: '/productos',          label: 'Productos',          icon: Package },
  { to: '/inventario',         label: 'Inventario',         icon: Warehouse },
  { separator: true,           label: 'COMPRAS' },
  { to: '/proveedores',        label: 'Proveedores',        icon: Truck },
  { to: '/compras',            label: 'Compras',            icon: Package },
  { separator: true,           label: 'OTROS' },
  { to: '/clientes',           label: 'Clientes',           icon: Users },
  { to: '/caja',               label: 'Caja',               icon: Wallet },
  { to: '/reportes',           label: 'Reportes',           icon: BarChart3 },
  { separator: true,           label: 'DESPACHO' },
  { to: '/pedidos',            label: 'Pedidos',            icon: ClipboardList },
  { separator: true,           label: 'CONFIGURACIÓN' },
  { to: '/catalogos',          label: 'Catálogos',          icon: BookOpen },
  { to: '/configuracion',      label: 'Empresa',            icon: Building2 },
  { to: '/ajustes',            label: 'Sistema',            icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { sesion, logout, tieneAcceso } = useAuth()
  const items = NAV_ITEMS.filter(item => {
    if (item.separator) return true
    return tieneAcceso(item.to)
  }).filter((item, i, arr) => {
    // Elimina separadores que quedan al final o seguidos de otro separador
    if (!item.separator) return true
    const next = arr[i + 1]
    return next && !next.separator
  })

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-xl border-r border-gray-100
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:shadow-none
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
              <Wrench size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">FerreApp</p>
              <p className="text-xs text-gray-400">Sistema de Ferretería</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn-icon btn-ghost text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div key={`sep-${index}`} className="pt-3 pb-1 px-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  isActive ? 'sidebar-item-active' : 'sidebar-item'
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
              {sesion?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{sesion?.nombre}</p>
              <p className="truncate text-xs text-gray-400">{ROLES[sesion?.rol]?.label}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
