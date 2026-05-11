import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { gasGetAll } from '../services/googleAppsScript'
import {
  ShoppingCart, Package, Plus, Pencil, Trash2, User, Truck,
  Wallet, Lock, FileText, LogIn, LogOut, Activity,
} from 'lucide-react'

const LS_LEIDAS      = 'ferreapp_notif_leidas'
const LS_LEIDAS_HASTA = 'ferreapp_notif_leidas_hasta'
const LS_CACHE       = 'ferreapp_notif_cache'
const MAX_NOTIF      = 50
const POLLING_MS     = 60_000 // 1 minuto

export const ACCION_ICONO = {
  venta_creada:       { icon: ShoppingCart, color: 'text-green-600',  bg: 'bg-green-50'  },
  pedido_creado:      { icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  producto_creado:    { icon: Plus,         color: 'text-primary-600',bg: 'bg-primary-50'},
  producto_editado:   { icon: Pencil,       color: 'text-yellow-600', bg: 'bg-yellow-50' },
  producto_eliminado: { icon: Trash2,       color: 'text-red-600',    bg: 'bg-red-50'    },
  cliente_creado:     { icon: User,         color: 'text-purple-600', bg: 'bg-purple-50' },
  cliente_editado:    { icon: User,         color: 'text-purple-600', bg: 'bg-purple-50' },
  compra_creada:      { icon: Truck,        color: 'text-orange-600', bg: 'bg-orange-50' },
  caja_abierta:       { icon: Wallet,       color: 'text-green-600',  bg: 'bg-green-50'  },
  caja_cerrada:       { icon: Lock,         color: 'text-gray-600',   bg: 'bg-gray-100'  },
  cotizacion_creada:  { icon: FileText,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  login:              { icon: LogIn,        color: 'text-green-600',  bg: 'bg-green-50'  },
  logout:             { icon: LogOut,       color: 'text-gray-600',   bg: 'bg-gray-100'  },
}

export const ACCION_DEFAULT = { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-50' }

function getLeidas() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_LEIDAS) || '[]')) } catch { return new Set() }
}
function saveLeidas(set) {
  localStorage.setItem(LS_LEIDAS, JSON.stringify([...set]))
}
function getLeidasHasta() {
  return localStorage.getItem(LS_LEIDAS_HASTA) || null
}
function saveLeidasHasta(fecha) {
  localStorage.setItem(LS_LEIDAS_HASTA, fecha)
}
function getCacheLocal() {
  try { return JSON.parse(localStorage.getItem(LS_CACHE) || '[]') } catch { return [] }
}

const NotificacionesContext = createContext(null)

export function NotificacionesProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState(() => getCacheLocal())
  const [leidas, setLeidas] = useState(getLeidas)
  const [leidasHasta, setLeidasHasta] = useState(getLeidasHasta)
  const timerRef = useRef(null)

  const cargarDesdeSheet = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    try {
      const res = await gasGetAll('auditoria')
      if (res?.ok && Array.isArray(res.data) && res.data.length) {
        const ordenadas = [...res.data]
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, MAX_NOTIF)
        setNotificaciones(ordenadas)
        localStorage.setItem(LS_CACHE, JSON.stringify(ordenadas))
      }
    } catch {
      // sin conexión — mantiene cache local
    }
  }, [])

  useEffect(() => {
    cargarDesdeSheet()
    // Polling cada 60s
    timerRef.current = setInterval(cargarDesdeSheet, POLLING_MS)
    // Al volver a la pestaña, refresca inmediatamente
    const onVisible = () => { if (document.visibilityState === 'visible') cargarDesdeSheet() }
    document.addEventListener('visibilitychange', onVisible)
    // Al registrar una acción local, refresca también
    const onAuditoria = () => cargarDesdeSheet()
    window.addEventListener('ferreapp:auditoria', onAuditoria)
    return () => {
      clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('ferreapp:auditoria', onAuditoria)
    }
  }, [cargarDesdeSheet])

  const esLeida = useCallback((n) => {
    if (leidasHasta && n.fecha <= leidasHasta) return true
    return leidas.has(n.id)
  }, [leidas, leidasHasta])

  const noLeidas = notificaciones.filter(n => !esLeida(n)).length

  const marcarLeida = useCallback((id) => {
    setLeidas(prev => {
      const s = new Set(prev); s.add(id); saveLeidas(s); return s
    })
  }, [])

  const marcarTodasLeidas = useCallback(() => {
    const ahora = new Date().toISOString()
    saveLeidasHasta(ahora)
    setLeidasHasta(ahora)
  }, [])

  return (
    <NotificacionesContext.Provider value={{
      notificaciones, noLeidas, esLeida, marcarLeida, marcarTodasLeidas,
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export function useNotificaciones() {
  return useContext(NotificacionesContext)
}
