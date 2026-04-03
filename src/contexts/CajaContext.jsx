import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'

export const CajaContext = createContext(null)

export function CajaProvider({ children }) {
  const [aperturas, setAperturas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_aperturas') || '[]') } catch { return [] }
  })
  const [movimientos, setMovimientos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_caja_movimientos') || '[]') } catch { return [] }
  })

  useEffect(() => {
    db.forceRefresh('cajaAperturas').then(data => { if (data.length) setAperturas(data) })
    db.forceRefresh('cajaMovimientos').then(data => { if (data.length) setMovimientos(data) })
  }, [])

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
    // Actualizar totales de ingresos/egresos en la apertura
    const abierta = aperturas.find(a => a.estado === 'ABIERTA')
    if (abierta) {
      const campo = data.tipo === 'INGRESO' ? 'total_ingresos' : 'total_egresos'
      const actualizado = { [campo]: (Number(abierta[campo]) || 0) + Number(data.monto) }
      setAperturas(prev => prev.map(a => a.id === abierta.id ? { ...a, ...actualizado } : a))
      db.update('cajaAperturas', abierta.id, actualizado)
    }
    return nuevo
  }, [aperturas])

  const cajaAbierta = useMemo(
    () => aperturas.find(a => a.estado === 'ABIERTA'),
    [aperturas]
  )

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
