import { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateNumeroVenta } from '../utils/formatters'
import { db } from '../services/db'

export const VentasContext = createContext(null)

export function VentasProvider({ children }) {
  const [ventas, setVentas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_ventas') || '[]') } catch { return [] }
  })
  const [movimientos, setMovimientos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_movimientos') || '[]') } catch { return [] }
  })

  useEffect(() => {
    // Cargar ventas y sus items desde el Sheet y cruzarlos
    Promise.all([
      db.forceRefresh('ventas'),
      db.forceRefresh('ventaItems'),
    ]).then(([ventas, items]) => {
      if (!ventas.length) return
      const conItems = ventas.map(v => ({
        ...v,
        items: items.filter(i => String(i.venta_id) === String(v.id)),
      }))
      setVentas(conItems)
    })
    db.forceRefresh('movimientos').then(data => { if (data.length) setMovimientos(data) })
  }, [])

  const registrarVenta = useCallback(async (data) => {
    const numero = generateNumeroVenta(ventas.length + 1)
    const nueva = {
      ...data,
      id: shortId(),
      numero_venta: numero,
      fecha: new Date().toISOString(),
      estado: data.estado || 'completada',
    }
    setVentas(prev => [nueva, ...prev])
    await db.insert('ventas', nueva)

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
    await Promise.all(movs.map(m => db.insert('movimientos', m)))

    return nueva
  }, [ventas.length])

  const registrarMovimiento = useCallback(async (data) => {
    const mov = { ...data, id: shortId(), fecha: new Date().toISOString() }
    setMovimientos(prev => [mov, ...prev])
    await db.insert('movimientos', mov)
    return mov
  }, [])

  const cancelarVenta = useCallback(async (id) => {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'cancelada' } : v))
    await db.update('ventas', id, { estado: 'cancelada' })
  }, [])

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
