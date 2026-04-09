import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, FileText,
  Users, Truck, Wallet, BarChart3, Building2, Settings, X, LogOut,
  ClipboardList, BookOpen, Calculator, ChevronLeft, ChevronRight, ShieldCheck,
} from 'lucide-react'
import IconQ from '../ui/IconQ'
import { useAuth, ROLES } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/',                   label: 'Dashboard',          icon: LayoutDashboard, end: true },
  { separator: true,           label: 'VENTAS' },
  { to: '/ventas/nueva',       label: 'Nueva Venta',        icon: ShoppingCart },
  { to: '/ventas',             label: 'Historial Ventas',   icon: FileText },
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
  { to: '/contabilidad',       label: 'Contabilidad',       icon: Calculator },
  { separator: true,           label: 'DESPACHO' },
  { to: '/pedidos',            label: 'Pedidos',            icon: ClipboardList },
  { separator: true,           label: 'CONFIGURACIÓN' },
  { to: '/catalogos',          label: 'Catálogos',          icon: BookOpen },
  { to: '/configuracion',      label: 'Empresa',            icon: Building2 },
  { to: '/ajustes',            label: 'Sistema',            icon: Settings },
  { to: '/auditoria',          label: 'Auditoría',          icon: ShieldCheck },
]

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { sesion, logout, tieneAcceso } = useAuth()
  const items = NAV_ITEMS.filter(item => {
    if (item.separator) return true
    return tieneAcceso(item.to)
  }).filter((item, i, arr) => {
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

      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-100
        transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:shadow-none
        w-64 ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}
      `}>

        {/* Cabecera */}
        <div className="flex h-16 items-center border-b border-gray-100 px-3 flex-shrink-0">

          {/* Logo + nombre — oculto cuando colapsado en PC */}
          <div className={`flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}>
            <img
              src="/icons/logo-esfuerzo.png"
              alt="Logo"
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover shadow"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 leading-tight truncate">FERRETERÍA EL ESFUERZO</p>
              <p className="text-xs text-gray-400">Sistema de Ferretería</p>
            </div>
          </div>

          {/* Botón cerrar — solo móvil */}
          <button onClick={onClose} className="lg:hidden btn-icon btn-ghost text-gray-400 flex-shrink-0">
            <X size={18} />
          </button>

          {/* Botón colapsar — solo PC */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex-shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
          {items.map((item, index) => {
            if (item.separator) {
              return collapsed ? (
                <div key={`sep-${index}`} className="hidden lg:block my-1.5 border-t border-gray-100 mx-1" />
              ) : (
                <div key={`sep-${index}`} className="pt-3 pb-1 px-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap overflow-hidden">
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
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `${isActive ? 'sidebar-item-active' : 'sidebar-item'} ${collapsed ? 'lg:justify-center lg:px-0 lg:w-10 lg:mx-auto' : ''}`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={`truncate transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-gray-100 p-2 flex-shrink-0">
          <div className={`flex items-center gap-2.5 rounded-lg p-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
              {sesion?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-medium text-gray-900">{sesion?.nombre}</p>
              <p className="truncate text-xs text-gray-400">{ROLES[sesion?.rol]?.label}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className={`btn-icon btn-ghost text-gray-400 hover:text-red-500 flex-shrink-0 ${collapsed ? 'lg:hidden' : ''}`}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

      </aside>
    </>
  )
}
