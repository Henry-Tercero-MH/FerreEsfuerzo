import { useContext } from 'react'
import { VentasContext } from '../contexts/VentasContext'

export function useSales() {
  const ctx = useContext(VentasContext)
  if (!ctx) throw new Error('useSales debe usarse dentro de <VentasProvider>')
  return ctx
}
