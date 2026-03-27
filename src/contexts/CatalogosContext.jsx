import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CATEGORIAS, METODOS_PAGO, UNIDADES_SEED } from '../utils/constants'
import { gasGetAll, sincronizarCatalogos } from '../services/googleAppsScript'

const SEED = {
  categorias:   CATEGORIAS,
  unidades:     UNIDADES_SEED,
  metodos_pago: METODOS_PAGO,
}

const CatalogosContext = createContext(null)

const LS_KEY = 'ferreapp_catalogos'

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || SEED } catch { return SEED }
}
function lsSet(val) {
  localStorage.setItem(LS_KEY, JSON.stringify(val))
}

export function CatalogosProvider({ children }) {
  const [catalogos, setCatalogos] = useState(lsGet)

  // Carga desde el Sheet al arrancar
  useEffect(() => {
    gasGetAll('catalogos').then(res => {
      if (!res.ok || !res.data?.length) return
      // El Sheet guarda filas por tipo: categorias, unidades, metodos_pago
      const cats   = res.data.filter(r => r.tipo === 'categoria').map(r => r.valor)
      const units  = res.data.filter(r => r.tipo === 'unidad').map(r => r.valor)
      const metods = res.data.filter(r => r.tipo === 'metodo_pago').map(r => ({ value: r.codigo, label: r.valor }))
      if (cats.length || units.length || metods.length) {
        const remoto = {
          categorias:   cats.length   ? cats   : SEED.categorias,
          unidades:     units.length  ? units  : SEED.unidades,
          metodos_pago: metods.length ? metods : SEED.metodos_pago,
        }
        setCatalogos(remoto)
        lsSet(remoto)
      }
    }).catch(() => {})
  }, [])

  // Sincroniza todo el catálogo al Sheet (sobreescribe filas por tipo)
  const _syncSheet = useCallback(async (nuevo) => {
    lsSet(nuevo)
    setCatalogos(nuevo)
    // Construir filas planas para el Sheet
    const filas = [
      ...nuevo.categorias.map((v, i)   => ({ id: `cat-${i}`,  tipo: 'categoria',    codigo: `cat-${i}`,  valor: v,       descripcion: v,       orden: i })),
      ...nuevo.unidades.map((v, i)     => ({ id: `uni-${i}`,  tipo: 'unidad',       codigo: `uni-${i}`,  valor: v,       descripcion: v,       orden: i })),
      ...nuevo.metodos_pago.map((m, i) => ({ id: `mp-${i}`,   tipo: 'metodo_pago',  codigo: m.value,     valor: m.label, descripcion: m.label, orden: i })),
    ]
    try {
      await sincronizarCatalogos(filas)
    } catch {}
  }, [])

  // ── Categorías ────────────────────────────────────────────────────────────
  const agregarCategoria = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    const nuevo = { ...catalogos, categorias: [...catalogos.categorias, n] }
    _syncSheet(nuevo)
  }, [catalogos, _syncSheet])

  const editarCategoria = useCallback((index, nombre) => {
    const updated = [...catalogos.categorias]
    updated[index] = nombre.trim()
    _syncSheet({ ...catalogos, categorias: updated })
  }, [catalogos, _syncSheet])

  const eliminarCategoria = useCallback((index) => {
    _syncSheet({ ...catalogos, categorias: catalogos.categorias.filter((_, i) => i !== index) })
  }, [catalogos, _syncSheet])

  // ── Unidades ──────────────────────────────────────────────────────────────
  const agregarUnidad = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    _syncSheet({ ...catalogos, unidades: [...catalogos.unidades, n] })
  }, [catalogos, _syncSheet])

  const editarUnidad = useCallback((index, nombre) => {
    const updated = [...catalogos.unidades]
    updated[index] = nombre.trim()
    _syncSheet({ ...catalogos, unidades: updated })
  }, [catalogos, _syncSheet])

  const eliminarUnidad = useCallback((index) => {
    _syncSheet({ ...catalogos, unidades: catalogos.unidades.filter((_, i) => i !== index) })
  }, [catalogos, _syncSheet])

  // ── Métodos de pago ───────────────────────────────────────────────────────
  const agregarMetodoPago = useCallback(({ value, label }) => {
    if (!value.trim() || !label.trim()) return
    _syncSheet({ ...catalogos, metodos_pago: [...catalogos.metodos_pago, { value: value.trim(), label: label.trim() }] })
  }, [catalogos, _syncSheet])

  const editarMetodoPago = useCallback((index, item) => {
    const updated = [...catalogos.metodos_pago]
    updated[index] = item
    _syncSheet({ ...catalogos, metodos_pago: updated })
  }, [catalogos, _syncSheet])

  const eliminarMetodoPago = useCallback((index) => {
    _syncSheet({ ...catalogos, metodos_pago: catalogos.metodos_pago.filter((_, i) => i !== index) })
  }, [catalogos, _syncSheet])

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
