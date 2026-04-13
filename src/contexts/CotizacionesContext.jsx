import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId, generateNumeroSecuencial } from '../utils/formatters'
import { db } from '../services/db'

export const CotizacionesContext = createContext(null)

export function CotizacionesProvider({ children }) {
  const [cotizaciones, setCotizaciones] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_cotizaciones') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem('ferreapp_cotizaciones') || '[]'); return !Array.isArray(c) || c.length === 0 } catch { return true }
  })

  useEffect(() => {
    localStorage.setItem('ferreapp_cotizaciones', JSON.stringify(cotizaciones))
  }, [cotizaciones])

  useEffect(() => {
    Promise.all([
      db.forceRefresh('cotizaciones'),
      db.forceRefresh('cotizacionItems'),
    ]).then(([cotizaciones, items]) => {
      if (!cotizaciones.length) return
      setCotizaciones(cotizaciones.map(c => ({
        ...c,
        items: items.filter(i => String(i.cotizacion_id) === String(c.id)),
      })))
    }).finally(() => setLoading(false))
  }, [])

  const crearCotizacion = useCallback(async (data) => {
    const nums = cotizaciones.map(c => parseInt(c.numero_cotizacion?.replace('COT-', '') || '0')).filter(n => !isNaN(n))
    const nueva = {
      ...data,
      id: shortId(),
      numero_cotizacion: data.numero_cotizacion || generateNumeroSecuencial('COT', (nums.length ? Math.max(...nums) : 0) + 1),
      fecha: data.fecha || new Date().toISOString(),
      estado: 'VIGENTE',
      creado_en: new Date().toISOString(),
    }
    setCotizaciones(prev => [nueva, ...prev])
    await db.insert('cotizaciones', nueva)
    return nueva
  }, [cotizaciones])

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
      loading,
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
