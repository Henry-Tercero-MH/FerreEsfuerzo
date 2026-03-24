import { useContext } from 'react'
import { ProductosContext } from '../contexts/ProductosContext'

export function useProducts() {
  const ctx = useContext(ProductosContext)
  if (!ctx) throw new Error('useProducts debe usarse dentro de <ProductosProvider>')
  return ctx
}
