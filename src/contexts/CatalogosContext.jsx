import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { CATEGORIAS, METODOS_PAGO, UNIDADES_SEED } from '../utils/constants'

const SEED = {
  categorias:   CATEGORIAS,
  unidades:     UNIDADES_SEED,
  metodos_pago: METODOS_PAGO,
}

const CatalogosContext = createContext(null)

export function CatalogosProvider({ children }) {
  const [catalogos, setCatalogos] = useLocalStorage('ferreapp_catalogos', SEED)

  // ── Categorías ────────────────────────────────────────────────────────────
  const agregarCategoria = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    setCatalogos(prev => ({ ...prev, categorias: [...prev.categorias, n] }))
  }, [setCatalogos])

  const editarCategoria = useCallback((index, nombre) => {
    setCatalogos(prev => {
      const updated = [...prev.categorias]
      updated[index] = nombre.trim()
      return { ...prev, categorias: updated }
    })
  }, [setCatalogos])

  const eliminarCategoria = useCallback((index) => {
    setCatalogos(prev => ({
      ...prev,
      categorias: prev.categorias.filter((_, i) => i !== index),
    }))
  }, [setCatalogos])

  // ── Unidades ──────────────────────────────────────────────────────────────
  const agregarUnidad = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    setCatalogos(prev => ({ ...prev, unidades: [...prev.unidades, n] }))
  }, [setCatalogos])

  const editarUnidad = useCallback((index, nombre) => {
    setCatalogos(prev => {
      const updated = [...prev.unidades]
      updated[index] = nombre.trim()
      return { ...prev, unidades: updated }
    })
  }, [setCatalogos])

  const eliminarUnidad = useCallback((index) => {
    setCatalogos(prev => ({
      ...prev,
      unidades: prev.unidades.filter((_, i) => i !== index),
    }))
  }, [setCatalogos])

  // ── Métodos de pago ───────────────────────────────────────────────────────
  const agregarMetodoPago = useCallback(({ value, label }) => {
    if (!value.trim() || !label.trim()) return
    setCatalogos(prev => ({
      ...prev,
      metodos_pago: [...prev.metodos_pago, { value: value.trim(), label: label.trim() }],
    }))
  }, [setCatalogos])

  const editarMetodoPago = useCallback((index, item) => {
    setCatalogos(prev => {
      const updated = [...prev.metodos_pago]
      updated[index] = item
      return { ...prev, metodos_pago: updated }
    })
  }, [setCatalogos])

  const eliminarMetodoPago = useCallback((index) => {
    setCatalogos(prev => ({
      ...prev,
      metodos_pago: prev.metodos_pago.filter((_, i) => i !== index),
    }))
  }, [setCatalogos])

  return (
    <CatalogosContext.Provider value={{
      categorias:   catalogos.categorias,
      unidades:     catalogos.unidades,
      metodos_pago: catalogos.metodos_pago,
      catalogos, // raw — para backup
      agregarCategoria, editarCategoria, eliminarCategoria,
      agregarUnidad,    editarUnidad,    eliminarUnidad,
      agregarMetodoPago, editarMetodoPago, eliminarMetodoPago,
    }}>
      {children}
    </CatalogosContext.Provider>
  )
}

export function useCatalogos() {
  const ctx = useContext(CatalogosContext)
  if (!ctx) throw new Error('useCatalogos debe usarse dentro de <CatalogosProvider>')
  return ctx
}
