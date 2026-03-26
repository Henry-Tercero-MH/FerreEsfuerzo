import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateNumeroDocumento } from '../utils/formatters'

export const ComprasContext = createContext(null)

const SEED = []

export function ComprasProvider({ children }) {
  const [compras, setCompras] = useLocalStorage('ferreapp_compras', SEED)

  const crearCompra = useCallback((data) => {
    const nueva = {
      ...data,
      id: shortId(),
      numero_documento: data.numero_documento || generateNumeroDocumento('COM'),
      fecha_recepcion: data.fecha_recepcion || new Date().toISOString(),
      estado: 'REGISTRADA',
      creado_en: new Date().toISOString(),
    }
    setCompras(prev => [nueva, ...prev])
    return nueva
  }, [setCompras])

  const editarCompra = useCallback((id, data) => {
    setCompras(prev =>
      prev.map(c => c.id === id ? { ...c, ...data, actualizado_en: new Date().toISOString() } : c)
    )
  }, [setCompras])

  const anularCompra = useCallback((id) => {
    setCompras(prev =>
      prev.map(c => c.id === id ? { ...c, estado: 'ANULADA', actualizado_en: new Date().toISOString() } : c)
    )
  }, [setCompras])

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
