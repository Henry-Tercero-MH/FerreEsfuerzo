import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateNumeroDocumento } from '../utils/formatters'
import { db } from '../services/db'

export const CotizacionesContext = createContext(null)

export function CotizacionesProvider({ children }) {
  const [cotizaciones, setCotizaciones] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_cotizaciones') || '[]') } catch { return [] }
  })

  useEffect(() => {
    db.getAll('cotizaciones').then(data => { if (data.length) setCotizaciones(data) })
  }, [])

  const crearCotizacion = useCallback(async (data) => {
    const nueva = {
      ...data,
      id: shortId(),
      numero_cotizacion: data.numero_cotizacion || generateNumeroDocumento('COT'),
      fecha: data.fecha || new Date().toISOString(),
      estado: 'VIGENTE',
      creado_en: new Date().toISOString(),
    }
    setCotizaciones(prev => [nueva, ...prev])
    await db.insert('cotizaciones', nueva)
    return nueva
  }, [])

  const editarCotizacion = useCallback(async (id, data) => {
    const actualizado = { ...data, actualizado_en: new Date().toISOString() }
    setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, ...actualizado } : c))
    await db.update('cotizaciones', id, actualizado)
  }, [])

  const cambiarEstado = useCallback(async (id, nuevoEstado) => {
    const cambio = { estado: nuevoEstado, actualizado_en: new Date().toISOString() }
    setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, ...cambio } : c))
    await db.update('cotizaciones', id, cambio)
  }, [])

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
