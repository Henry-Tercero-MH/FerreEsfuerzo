import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuditoriaLocal } from '../services/auditoria'
import {
  ShoppingCart, Package, Plus, Pencil, Trash2, User, Truck,
  Wallet, Lock, FileText, LogIn, LogOut, Activity,
} from 'lucide-react'

const LS_LEIDAS = 'ferreapp_notif_leidas'
const MAX_NOTIF = 50

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

const NotificacionesContext = createContext(null)

export function NotificacionesProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [leidas, setLeidas] = useState(getLeidas)

  const cargar = useCallback(() => {
    setNotificaciones(getAuditoriaLocal().slice(0, MAX_NOTIF))
  }, [])

  useEffect(() => {
    cargar()
    const handler = () => cargar()
    window.addEventListener('ferreapp:auditoria', handler)
    return () => window.removeEventListener('ferreapp:auditoria', handler)
  }, [cargar])

  const noLeidas = notificaciones.filter(n => !leidas.has(n.id)).length

  const marcarLeida = useCallback((id) => {
    setLeidas(prev => {
      const s = new Set(prev); s.add(id); saveLeidas(s); return s
    })
  }, [])

  const marcarTodasLeidas = useCallback(() => {
    setLeidas(prev => {
      const s = new Set(prev)
      notificaciones.forEach(n => s.add(n.id))
      saveLeidas(s)
      return s
    })
  }, [notificaciones])

  return (
    <NotificacionesContext.Provider value={{
      notificaciones, noLeidas, leidas, marcarLeida, marcarTodasLeidas,
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export function useNotificaciones() {
  return useContext(NotificacionesContext)
}
