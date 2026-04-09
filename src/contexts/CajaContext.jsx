import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'

export const CajaContext = createContext(null)

const POLLING_MS = 20_000 // cada 20 segundos cuando hay caja abierta

export function CajaProvider({ children }) {
  const [aperturas, setAperturas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_aperturas') || '[]') } catch { return [] }
  })
  const [movimientos, setMovimientos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_movimientos') || '[]') } catch { return [] }
  })

  // Persistir en localStorage cada vez que cambia el estado
  useEffect(() => {
    localStorage.setItem('ferreapp_caja_aperturas', JSON.stringify(aperturas))
  }, [aperturas])

  useEffect(() => {
    localStorage.setItem('ferreapp_caja_movimientos', JSON.stringify(movimientos))
  }, [movimientos])

  // Carga inicial desde Google Sheets
  useEffect(() => {
    db.forceRefresh('cajaAperturas').then(data => { if (data.length) setAperturas(data) })
    db.forceRefresh('cajaMovimientos').then(data => { if (data.length) setMovimientos(data) })
  }, [])

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
  }, [])

  const cajaAbierta = useMemo(
    () => aperturas.find(a => a.estado === 'ABIERTA'),
    [aperturas]
  )

  // Polling contra Google Sheets para sincronizar entre dispositivos distintos (móvil ↔ PC)
  // Solo corre mientras haya una caja abierta
  const hayaCajaAbierta = !!cajaAbierta
  useEffect(() => {
    if (!hayaCajaAbierta) return
    const tick = async () => {
      const [ap, mv] = await Promise.all([
        db.forceRefresh('cajaAperturas'),
        db.forceRefresh('cajaMovimientos'),
      ])
      if (ap.length) setAperturas(ap)
      if (mv.length) setMovimientos(mv)
    }
    const id = setInterval(tick, POLLING_MS)
    return () => clearInterval(id)
  }, [hayaCajaAbierta])

  const abrirCaja = useCallback(async (data) => {
    const nueva = {
      ...data,
      id: shortId(),
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      estado: 'ABIERTA',
      total_ventas_efectivo: 0,
      total_ventas_tarjeta: 0,
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
  }, [aperturas])

  const registrarVentaEnCaja = useCallback((metodo_pago, total) => {
    const abierta = aperturas.find(a => a.estado === 'ABIERTA')
    if (!abierta) return
    const campo =
      metodo_pago === 'efectivo' ? 'total_ventas_efectivo' :
      metodo_pago === 'tarjeta'  ? 'total_ventas_tarjeta'  :
      metodo_pago === 'credito'  ? null :
      'total_ventas_otros'
    if (!campo) return // crédito no afecta caja
    const actualizado = { [campo]: (Number(abierta[campo]) || 0) + Number(total) }
    setAperturas(prev => prev.map(a => a.id === abierta.id ? { ...a, ...actualizado } : a))
    db.update('cajaAperturas', abierta.id, actualizado)
  }, [aperturas])

  return (
    <CajaContext.Provider value={{
      aperturas,
      movimientos,
      cajaAbierta,
      abrirCaja,
      cerrarCaja,
      registrarMovimiento,
      registrarVentaEnCaja,
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
