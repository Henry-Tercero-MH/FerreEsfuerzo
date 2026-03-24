import { createContext, useState, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateCodigoProducto } from '../utils/formatters'

export const ProductosContext = createContext(null)

const SEED = [
  { id: shortId(), codigo: 'PROD-001', nombre: 'Martillo 16oz', categoria: 'Herramientas Manuales', precio_compra: 45, precio_venta: 75, stock: 20, stock_minimo: 5, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), codigo: 'PROD-002', nombre: 'Destornillador Phillips', categoria: 'Herramientas Manuales', precio_compra: 15, precio_venta: 28, stock: 35, stock_minimo: 10, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), codigo: 'PROD-003', nombre: 'Taladro 3/8"', categoria: 'Herramientas Eléctricas', precio_compra: 350, precio_venta: 580, stock: 8, stock_minimo: 3, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), codigo: 'PROD-004', nombre: 'Tornillos 1/2" (100u)', categoria: 'Fijaciones y Tornillería', precio_compra: 12, precio_venta: 22, stock: 3, stock_minimo: 10, unidad: 'bolsa', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), codigo: 'PROD-005', nombre: 'Llave Ajustable 12"', categoria: 'Herramientas Manuales', precio_compra: 55, precio_venta: 95, stock: 15, stock_minimo: 5, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), codigo: 'PROD-006', nombre: 'Cemento Gris 42.5kg', categoria: 'Construcción', precio_compra: 72, precio_venta: 98, stock: 50, stock_minimo: 20, unidad: 'saco', activo: true, creado_en: new Date().toISOString() },
]

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useLocalStorage('ferreapp_productos', SEED)

  const agregarProducto = useCallback((data) => {
    const nuevo = {
      ...data,
      id: shortId(),
      codigo: data.codigo || generateCodigoProducto(),
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }
    setProductos(prev => [nuevo, ...prev])
    return nuevo
  }, [setProductos])

  const editarProducto = useCallback((id, data) => {
    setProductos(prev =>
      prev.map(p => p.id === id ? { ...p, ...data, actualizado_en: new Date().toISOString() } : p)
    )
  }, [setProductos])

  const eliminarProducto = useCallback((id) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
  }, [setProductos])

  const actualizarStock = useCallback((id, delta) => {
    setProductos(prev =>
      prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)
    )
  }, [setProductos])

  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos])

  const stockBajo = useMemo(
    () => productosActivos.filter(p => p.stock <= p.stock_minimo),
    [productosActivos]
  )

  return (
    <ProductosContext.Provider value={{
      productos, productosActivos, stockBajo,
      agregarProducto, editarProducto, eliminarProducto, actualizarStock,
    }}>
      {children}
    </ProductosContext.Provider>
  )
}
