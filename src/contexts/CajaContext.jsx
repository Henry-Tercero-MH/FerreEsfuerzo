import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'

export const CajaContext = createContext(null)

const SEED = []

export function CajaProvider({ children }) {
  const [aperturas, setAperturas] = useLocalStorage('ferreapp_caja_aperturas', SEED)
  const [movimientos, setMovimientos] = useLocalStorage('ferreapp_caja_movimientos', [])

  const abrirCaja = useCallback((data) => {
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
    return nueva
  }, [setAperturas])

  const cerrarCaja = useCallback((id, data) => {
    setAperturas(prev =>
      prev.map(a => a.id === id ? {
        ...a,
        ...data,
        fecha_cierre: new Date().toISOString(),
        estado: 'CERRADA',
        diferencia: data.monto_real - data.monto_esperado,
      } : a)
    )
  }, [setAperturas])

  const registrarMovimiento = useCallback((data) => {
    const nuevo = {
      ...data,
      id: shortId(),
      fecha: new Date().toISOString(),
    }
    setMovimientos(prev => [nuevo, ...prev])
    return nuevo
  }, [setMovimientos])

  const cajaAbierta = useMemo(
    () => aperturas.find(a => a.estado === 'ABIERTA'),
    [aperturas]
  )

  return (
    <CajaContext.Provider value={{
      aperturas,
      movimientos,
      cajaAbierta,
      abrirCaja,
      cerrarCaja,
      registrarMovimiento,
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
