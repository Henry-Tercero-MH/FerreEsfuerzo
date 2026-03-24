import { createContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateNumeroVenta } from '../utils/formatters'

export const VentasContext = createContext(null)

export function VentasProvider({ children }) {
  const [ventas, setVentas] = useLocalStorage('ferreapp_ventas', [])
  const [movimientos, setMovimientos] = useLocalStorage('ferreapp_movimientos', [])

  const registrarVenta = useCallback((data) => {
    const numero = generateNumeroVenta(ventas.length + 1)
    const nueva = {
      ...data,
      id: shortId(),
      numero_venta: numero,
      fecha: new Date().toISOString(),
      estado: data.estado || 'completada',
    }
    setVentas(prev => [nueva, ...prev])

    // Registrar movimientos de inventario por cada item
    const movs = data.items.map(item => ({
      id: shortId(),
      producto_id: item.producto_id,
      producto_nombre: item.nombre,
      tipo: 'salida',
      cantidad: item.cantidad,
      motivo: 'venta',
      referencia: numero,
      fecha: nueva.fecha,
    }))
    setMovimientos(prev => [...movs, ...prev])

    return nueva
  }, [ventas.length, setVentas, setMovimientos])

  const registrarMovimiento = useCallback((data) => {
    const mov = { ...data, id: shortId(), fecha: new Date().toISOString() }
    setMovimientos(prev => [mov, ...prev])
    return mov
  }, [setMovimientos])

  const cancelarVenta = useCallback((id) => {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'cancelada' } : v))
  }, [setVentas])

  const resumenHoy = useMemo(() => {
    const hoy = new Date().toDateString()
    const ventasHoy = ventas.filter(v =>
      new Date(v.fecha).toDateString() === hoy && v.estado !== 'cancelada'
    )
    return {
      cantidad: ventasHoy.length,
      total: ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0),
    }
  }, [ventas])

  const resumenMes = useMemo(() => {
    const ahora = new Date()
    const ventasMes = ventas.filter(v => {
      const d = new Date(v.fecha)
      return d.getMonth() === ahora.getMonth() &&
             d.getFullYear() === ahora.getFullYear() &&
             v.estado !== 'cancelada'
    })
    return {
      cantidad: ventasMes.length,
      total: ventasMes.reduce((acc, v) => acc + (v.total || 0), 0),
    }
  }, [ventas])

  return (
    <VentasContext.Provider value={{
      ventas, movimientos,
      registrarVenta, cancelarVenta, registrarMovimiento,
      resumenHoy, resumenMes,
    }}>
      {children}
    </VentasContext.Provider>
  )
}
