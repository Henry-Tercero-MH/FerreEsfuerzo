import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'
import { useAuth } from './AuthContext'

export const CajaContext = createContext(null)

const POLLING_MS = 20_000
const CAMPOS_NUM = ['monto_apertura','total_ventas_efectivo','total_ventas_tarjeta','total_ventas_credito','total_ventas_otros','total_ingresos','total_egresos','monto_esperado','monto_real','diferencia']
const CAMPOS_ACUMULADOS = ['total_ventas_efectivo','total_ventas_tarjeta','total_ventas_credito','total_ventas_otros','total_ingresos','total_egresos']

// Normaliza una apertura que viene de Sheets (strings → números, campos faltantes → 0)
function normalizarApertura(a) {
  const n = { ...a }
  CAMPOS_NUM.forEach(c => { n[c] = Number(n[c]) || 0 })
  return n
}

export function CajaProvider({ children }) {
  const { tieneAcceso, sesion } = useAuth()
  const puede = useCallback(() => !!sesion && tieneAcceso('/caja'), [sesion, tieneAcceso])
  const [aperturas, setAperturas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_aperturas') || '[]') } catch { return [] }
  })
  const [movimientos, setMovimientos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_movimientos') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem('ferreapp_caja_aperturas') || '[]'); return !Array.isArray(c) || c.length === 0 } catch { return true }
  })

  // Persistir en localStorage cada vez que cambia el estado
  useEffect(() => {
    localStorage.setItem('ferreapp_caja_aperturas', JSON.stringify(aperturas))
  }, [aperturas])

  useEffect(() => {
    localStorage.setItem('ferreapp_caja_movimientos', JSON.stringify(movimientos))
  }, [movimientos])

  // Carga inicial desde Google Sheets — normaliza campos numéricos que vienen como string de Sheets
  useEffect(() => {
    Promise.all([
      db.forceRefresh('cajaAperturas').then(data => { if (data.length) setAperturas(data.map(normalizarApertura)) }),
      db.forceRefresh('cajaMovimientos').then(data => { if (data.length) setMovimientos(data) }),
    ]).finally(() => setLoading(false))
  }, [puede])

  // Sincronizar entre pestañas del mismo navegador (mismo dispositivo, distintas pestañas)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'ferreapp_caja_aperturas' && e.newValue) {
        try { setAperturas(JSON.parse(e.newValue)) } catch { /* ignore */ }
      }
      if (e.key === 'ferreapp_caja_movimientos' && e.newValue) {
        try { setMovimientos(JSON.parse(e.newValue)) } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [puede])

  const cajaAbierta = useMemo(
    () => aperturas.find(a => a.estado === 'ABIERTA'),
    [aperturas]
  )

  // Polling contra Google Sheets para sincronizar entre dispositivos distintos (móvil ↔ PC).
  // Corre siempre para detectar si otra sesión abrió/cerró caja.
  // Para aperturas ABIERTA: merge tomando el mayor valor acumulado (evita borrar totales locales).
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState === 'hidden') return
      const [ap, mv] = await Promise.all([
        db.forceRefresh('cajaAperturas'),
        db.forceRefresh('cajaMovimientos'),
      ])
      if (ap.length) {
        setAperturas(prev => ap.map(normalizarApertura).map(remota => {
          const local = prev.find(a => a.id === remota.id)
          if (!local || remota.estado !== 'ABIERTA') return remota
          // Merge: tomar el mayor valor acumulado entre local y remoto
          const merged = { ...remota }
          CAMPOS_ACUMULADOS.forEach(c => {
            merged[c] = Math.max(local[c] || 0, remota[c] || 0)
          })
          return merged
        }))
      }
      if (mv.length) setMovimientos(mv)
    }
    const id = setInterval(tick, POLLING_MS)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const abrirCaja = useCallback(async (data) => {
    if (!puede()) return null
    const nueva = {
      ...data,
      id: shortId(),
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      estado: 'ABIERTA',
      total_ventas_efectivo: 0,
      total_ventas_tarjeta: 0,
      total_ventas_credito: 0,
      total_ventas_otros: 0,
      total_ingresos: 0,
      total_egresos: 0,
      monto_esperado: data.monto_apertura || 0,
      monto_real: 0,
      diferencia: 0,
    }
    setAperturas(prev => [nueva, ...prev])
    await db.insert('cajaAperturas', nueva)
    return nueva
  }, [])

  const cerrarCaja = useCallback(async (id, data) => {
    if (!puede()) return null
    const cambio = {
      ...data,
      fecha_cierre: new Date().toISOString(),
      estado: 'CERRADA',
      diferencia: data.monto_real - data.monto_esperado,
    }
    setAperturas(prev => prev.map(a => a.id === id ? { ...a, ...cambio } : a))
    await db.update('cajaAperturas', id, cambio)
  }, [])

  const registrarMovimiento = useCallback(async (data) => {
    if (!puede()) return null
    const nuevo = { ...data, id: shortId(), fecha: new Date().toISOString() }
    setMovimientos(prev => [nuevo, ...prev])
    await db.insert('cajaMovimientos', nuevo)
    const abierta = aperturas.find(a => a.estado === 'ABIERTA')
    if (abierta) {
      const campo = data.tipo === 'INGRESO' ? 'total_ingresos' : 'total_egresos'
      const actualizado = { [campo]: (Number(abierta[campo]) || 0) + Number(data.monto) }
      setAperturas(prev => prev.map(a => a.id === abierta.id ? { ...a, ...actualizado } : a))
      db.update('cajaAperturas', abierta.id, actualizado)
    }
    return nuevo
  }, [aperturas, puede])

  const registrarVentaEnCaja = useCallback((metodo_pago, total) => {
    if (!puede()) return null
    const abierta = aperturas.find(a => a.estado === 'ABIERTA')
    if (!abierta) return
    const campo =
      metodo_pago === 'efectivo' ? 'total_ventas_efectivo' :
      metodo_pago === 'tarjeta'  ? 'total_ventas_tarjeta'  :
      metodo_pago === 'credito'  ? 'total_ventas_credito'  :
      'total_ventas_otros'
    const actualizado = { [campo]: (Number(abierta[campo]) || 0) + Number(total) }
    setAperturas(prev => prev.map(a => a.id === abierta.id ? { ...a, ...actualizado } : a))
    db.update('cajaAperturas', abierta.id, actualizado)
  }, [aperturas, puede])

  const revertirVentaEnCaja = useCallback((metodo_pago, total) => {
    if (!puede()) return null
    const abierta = aperturas.find(a => a.estado === 'ABIERTA')
    if (!abierta) return
    const campo =
      metodo_pago === 'efectivo' ? 'total_ventas_efectivo' :
      metodo_pago === 'tarjeta'  ? 'total_ventas_tarjeta'  :
      metodo_pago === 'credito'  ? 'total_ventas_credito'  :
      'total_ventas_otros'
    const actualizado = { [campo]: Math.max(0, (Number(abierta[campo]) || 0) - Number(total)) }
    setAperturas(prev => prev.map(a => a.id === abierta.id ? { ...a, ...actualizado } : a))
    db.update('cajaAperturas', abierta.id, actualizado)
  }, [aperturas, puede])

  const refrescarCaja = useCallback(async () => {
    const [ap, mv] = await Promise.all([
      db.forceRefresh('cajaAperturas'),
      db.forceRefresh('cajaMovimientos'),
    ])
    if (ap.length) {
      setAperturas(prev => ap.map(normalizarApertura).map(remota => {
        const local = prev.find(a => a.id === remota.id)
        if (!local || remota.estado !== 'ABIERTA') return remota
        const merged = { ...remota }
        CAMPOS_ACUMULADOS.forEach(c => {
          merged[c] = Math.max(local[c] || 0, remota[c] || 0)
        })
        return merged
      }))
    }
    if (mv.length) setMovimientos(mv)
  }, [])

  return (
    <CajaContext.Provider value={{
      aperturas,
      movimientos,
      cajaAbierta,
      abrirCaja,
      cerrarCaja,
      registrarMovimiento,
      registrarVentaEnCaja,
      revertirVentaEnCaja,
      refrescarCaja,
      loading,
    }}>
      {children}
    </CajaContext.Provider>
  )
}

export const useCaja = () => {
  const context = useContext(CajaContext)
  if (!context) throw new Error('useCaja debe usarse dentro de CajaProvider')
  return context
}

CajaProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
