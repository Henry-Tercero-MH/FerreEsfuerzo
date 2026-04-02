import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateNumeroDocumento } from '../utils/formatters'
import { db } from '../services/db'

export const ComprasContext = createContext(null)

export function ComprasProvider({ children }) {
  const [compras, setCompras] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_compras') || '[]') } catch { return [] }
  })

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
    })
  }, [])

  const crearCompra = useCallback(async (data) => {
    const nueva = {
      ...data,
      id: shortId(),
      numero_documento: data.numero_documento || generateNumeroDocumento('COM'),
      fecha_recepcion: data.fecha_recepcion || new Date().toISOString(),
      estado: 'REGISTRADA',
      creado_en: new Date().toISOString(),
    }
    setCompras(prev => [nueva, ...prev])
    await db.insert('compras', nueva)
    return nueva
  }, [])

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

  const comprasActivas = useMemo(() => compras.filter(c => c.estado !== 'ANULADA'), [compras])

  return (
    <ComprasContext.Provider value={{
      compras,
      comprasActivas,
      crearCompra,
      editarCompra,
      anularCompra,
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
