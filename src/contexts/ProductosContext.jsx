import { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateCodigoProducto } from '../utils/formatters'
import { db } from '../services/db'

export const ProductosContext = createContext(null)

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_productos') || '[]') } catch { return [] }
  })

  // Carga inicial desde el Sheet (si hay conexión) o desde localStorage
  useEffect(() => {
    db.getAll('productos').then(data => { if (data.length) setProductos(data) })
  }, [])

  const agregarProducto = useCallback(async (data) => {
    const nuevo = {
      ...data,
      id: shortId(),
      codigo: data.codigo || generateCodigoProducto(),
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }
    setProductos(prev => [nuevo, ...prev])
    await db.insert('productos', nuevo)
    return nuevo
  }, [])

  const editarProducto = useCallback(async (id, data) => {
    const actualizado = { ...data, actualizado_en: new Date().toISOString() }
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...actualizado } : p))
    await db.update('productos', id, actualizado)
  }, [])

  const eliminarProducto = useCallback(async (id) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    await db.remove('productos', id)
  }, [])

  const actualizarStock = useCallback(async (id, delta) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== id) return p
      const nuevoStock = Math.max(0, p.stock + delta)
      db.update('productos', id, { stock: nuevoStock })
      return { ...p, stock: nuevoStock }
    }))
  }, [])

  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos])
  const stockBajo = useMemo(() => productosActivos.filter(p => p.stock <= p.stock_minimo), [productosActivos])

  return (
    <ProductosContext.Provider value={{
      productos, productosActivos, stockBajo,
      agregarProducto, editarProducto, eliminarProducto, actualizarStock,
    }}>
      {children}
    </ProductosContext.Provider>
  )
}
