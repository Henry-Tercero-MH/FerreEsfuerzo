import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, RefreshCw, Search, Package } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePWAUpdate } from '../../hooks/usePWAUpdate'
import { useApp } from '../../contexts/AppContext'
import { formatCurrency } from '../../utils/formatters'
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

function BuscadorGlobal() {
  const { productos } = useApp()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  const resultados = (() => {
    if (!q.trim()) return []
    const t = q.toLowerCase()
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      String(p.codigo ?? '').toLowerCase().includes(t)
    ).slice(0, 8)
  })()

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 50)
  }, [abierto])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setAbierto(v => !v) }
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-300 transition-colors"
      >
        <Search size={14} />
        <span>Buscar producto...</span>
        <kbd className="ml-1 text-xs bg-white border border-gray-200 rounded px-1">Ctrl K</kbd>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
              />
              <kbd className="text-xs text-gray-300">Esc</kbd>
            </div>
            {resultados.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {resultados.map(p => (
                  <li key={p.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => { navigate('/productos'); setAbierto(false); setQ('') }}
                  >
                    <Package size={14} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400">Cód: {p.codigo} · Stock: {p.stock}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary-700 shrink-0">{formatCurrency(p.precio_venta)}</p>
                  </li>
                ))}
              </ul>
            ) : q.trim() ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Sin resultados para "{q}"</div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-gray-300">Escribe para buscar</div>
            )}
          </div>
        </div>
      )}
    </>
  )
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

      <BuscadorGlobal />

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
