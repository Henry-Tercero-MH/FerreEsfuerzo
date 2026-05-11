import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  const [qDebounced, setQDebounced] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 180)
    return () => clearTimeout(t)
  }, [q])

  const resultados = useMemo(() => {
    if (!qDebounced.trim()) return []
    const t = qDebounced.toLowerCase()
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      String(p.codigo ?? '').toLowerCase().includes(t)
    ).slice(0, 8)
  }, [productos, qDebounced])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 50)
  }, [abierto])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F7') { e.preventDefault(); setAbierto(v => !v) }
      if (e.key === 'F3') { e.preventDefault(); setQ(''); inputRef.current?.focus() }
      if (e.key === 'Escape') { setAbierto(false); setQ('') }
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
        <kbd className="ml-1 text-xs bg-white border border-gray-200 rounded px-1">F7</kbd>
      </button>

      {abierto && createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 bg-black/40" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-7xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 px-7 py-5 border-b border-gray-200">
              <Search size={26} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="flex-1 text-2xl outline-none text-gray-800 placeholder-gray-400"
              />
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="text-sm text-gray-400 border border-gray-200 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-50" onClick={() => { setQ(''); inputRef.current?.focus() }} title="Limpiar búsqueda (F3)">F3 limpiar</kbd>
                <kbd className="text-sm text-gray-400 border border-gray-200 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-50" onClick={() => { setAbierto(false); setQ('') }} title="Cerrar (Esc)">Esc cerrar</kbd>
              </div>
            </div>
            {resultados.length > 0 ? (
              <div className="max-h-[32rem] overflow-y-auto">
                {/* Cabecera de columnas */}
                <div className="flex items-center gap-5 px-7 py-2 border-b border-gray-200 bg-gray-50">
                  <div className="w-6 shrink-0" />
                  <div className="flex-1 grid grid-cols-4 gap-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Producto</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Código</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Categoría</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Ubicación</p>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right shrink-0 w-32">Precio</p>
                </div>
                <ul className="divide-y divide-gray-100">
                {resultados.map(p => (
                  <li key={p.id}
                    className="flex items-center gap-5 px-7 py-4 hover:bg-primary-50 cursor-pointer transition-colors"
                    onClick={() => { navigate('/productos'); setAbierto(false); setQ('') }}
                  >
                    <Package size={24} className="text-gray-400 shrink-0" />
                    <div className="flex-1 grid grid-cols-4 gap-6 items-center min-w-0">
                      <p className="text-xl font-semibold text-gray-900 truncate text-center">{p.nombre}</p>
                      <p className="text-xl font-semibold text-gray-900 truncate text-center">{p.codigo}</p>
                      <p className="text-xl font-semibold text-gray-900 truncate text-center">{p.categoria || '—'}</p>
                      <p className="text-xl font-semibold text-gray-900 truncate text-center">{p.ubicacion || '—'}</p>
                    </div>
                    <div className="shrink-0 w-32 text-right">
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(p.precio_venta)}</p>
                    </div>
                  </li>
                ))}
                </ul>
              </div>
            ) : q.trim() ? (
              <div className="px-7 py-12 text-center text-lg text-gray-400">Sin resultados para "{q}"</div>
            ) : (
              <div className="px-7 py-10 text-center text-base text-gray-300">Escribe para buscar</div>
            )}
          </div>
        </div>
      , document.body)}
    </>
  )
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { updateAvailable, applyUpdate } = usePWAUpdate()
  const title = TITLES[pathname] ?? 'Ferretería El Esfuerzo'
  const esNuevaVenta = pathname === '/ventas/nueva'

  return (
    <header className={`sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-blue-100 px-4 sm:px-6 shadow-sm transition-all duration-300 ${esNuevaVenta ? 'lg:w-[calc(100%-480px)]' : ''}`} style={{ backgroundColor: '#f5f8fe' }}>
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
