import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateNumeroSecuencial } from '../utils/formatters'
import { db } from '../services/db'

export const ComprasContext = createContext(null)

export function ComprasProvider({ children }) {
  const [compras, setCompras] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_compras') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem('ferreapp_compras') || '[]'); return !Array.isArray(c) || c.length === 0 } catch { return true }
  })

  useEffect(() => {
    localStorage.setItem('ferreapp_compras', JSON.stringify(compras))
  }, [compras])

  useEffect(() => {
    Promise.all([
      db.forceRefresh('compras'),
      db.forceRefresh('compraItems'),
    ]).then(([compras, items]) => {
      if (!compras.length) return
      setCompras(compras.map(c => ({
        ...c,
        items: items.filter(i => String(i.compra_id) === String(c.id)),
      })))
    }).finally(() => setLoading(false))
  }, [])

  const crearCompra = useCallback(async (data) => {
    const nums = compras.map(c => parseInt(c.numero_documento?.replace('COM-', '') || '0')).filter(n => !isNaN(n))
    const nueva = {
      ...data,
      id: shortId(),
      numero_documento: data.numero_documento || generateNumeroSecuencial('COM', (nums.length ? Math.max(...nums) : 0) + 1),
      fecha_recepcion: data.fecha_recepcion || new Date().toISOString(),
      estado: 'REGISTRADA',
      creado_en: new Date().toISOString(),
    }
    setCompras(prev => [nueva, ...prev])
    await db.insert('compras', nueva)
    return nueva
  }, [compras])

  const editarCompra = useCallback(async (id, data) => {
    const actualizado = { ...data, actualizado_en: new Date().toISOString() }
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...actualizado } : c))
    await db.update('compras', id, actualizado)
  }, [])

  const anularCompra = useCallback(async (id) => {
    const cambio = { estado: 'ANULADA', actualizado_en: new Date().toISOString() }
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...cambio } : c))
    await db.update('compras', id, cambio)
  }, [])

  const aplicarCompra = useCallback(async (id) => {
    const cambio = { estado: 'APLICADA', actualizado_en: new Date().toISOString() }
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...cambio } : c))
    await db.update('compras', id, cambio)
  }, [])

  const comprasActivas = useMemo(() => compras.filter(c => c.estado !== 'ANULADA'), [compras])

  return (
    <ComprasContext.Provider value={{
      compras,
      comprasActivas,
      crearCompra,
      editarCompra,
      anularCompra,
      aplicarCompra,
      loading,
    }}>
      {children}
    </ComprasContext.Provider>
  )
}

export const useCompras = () => {
  const context = useContext(ComprasContext)
  if (!context) throw new Error('useCompras debe usarse dentro de ComprasProvider')
  return context
}
