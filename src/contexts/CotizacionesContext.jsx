import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateNumeroDocumento } from '../utils/formatters'

export const CotizacionesContext = createContext(null)

const SEED = []

export function CotizacionesProvider({ children }) {
  const [cotizaciones, setCotizaciones] = useLocalStorage('ferreapp_cotizaciones', SEED)

  const crearCotizacion = useCallback((data) => {
    const nueva = {
      ...data,
      id: shortId(),
      numero_cotizacion: data.numero_cotizacion || generateNumeroDocumento('COT'),
      fecha: data.fecha || new Date().toISOString(),
      estado: 'VIGENTE',
      creado_en: new Date().toISOString(),
    }
    setCotizaciones(prev => [nueva, ...prev])
    return nueva
  }, [setCotizaciones])

  const editarCotizacion = useCallback((id, data) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === id ? { ...c, ...data, actualizado_en: new Date().toISOString() } : c)
    )
  }, [setCotizaciones])

  const cambiarEstado = useCallback((id, nuevoEstado) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === id ? { ...c, estado: nuevoEstado, actualizado_en: new Date().toISOString() } : c)
    )
  }, [setCotizaciones])

  const cotizacionesVigentes = useMemo(
    () => cotizaciones.filter(c => c.estado === 'VIGENTE'),
    [cotizaciones]
  )

  return (
    <CotizacionesContext.Provider value={{
      cotizaciones,
      cotizacionesVigentes,
      crearCotizacion,
      editarCotizacion,
      cambiarEstado,
    }}>
      {children}
    </CotizacionesContext.Provider>
  )
}

export const useCotizaciones = () => {
  const context = useContext(CotizacionesContext)
  if (!context) throw new Error('useCotizaciones debe usarse dentro de CotizacionesProvider')
  return context
}
