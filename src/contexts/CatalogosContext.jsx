import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CATEGORIAS, METODOS_PAGO, UNIDADES_SEED } from '../utils/constants'
import { gasGetAll, sincronizarCatalogos } from '../services/googleAppsScript'

const SEED = {
  categorias:   CATEGORIAS,
  unidades:     UNIDADES_SEED,
  metodos_pago: METODOS_PAGO,
  ubicaciones:  ['Pasillo 1', 'Pasillo 2', 'Pasillo 3', 'Bodega', 'Estante A', 'Estante B'],
  tipos_cliente: ['natural', 'empresa', 'frecuente'],
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
      const ubics  = res.data.filter(r => r.tipo === 'ubicacion').map(r => r.valor)
      const tclien = res.data.filter(r => r.tipo === 'tipo_cliente').map(r => r.valor)
      if (cats.length || units.length || metods.length || ubics.length || tclien.length) {
        const remoto = {
          categorias:    cats.length   ? cats   : SEED.categorias,
          unidades:      units.length  ? units  : SEED.unidades,
          metodos_pago:  metods.length ? metods : SEED.metodos_pago,
          ubicaciones:   ubics.length  ? ubics  : SEED.ubicaciones,
          tipos_cliente: tclien.length ? tclien : SEED.tipos_cliente,
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
      ...nuevo.categorias.map((v, i)    => ({ id: `cat-${i}`,  tipo: 'categoria',    codigo: `cat-${i}`,  valor: v,       descripcion: v,       orden: i })),
      ...nuevo.unidades.map((v, i)      => ({ id: `uni-${i}`,  tipo: 'unidad',       codigo: `uni-${i}`,  valor: v,       descripcion: v,       orden: i })),
      ...nuevo.metodos_pago.map((m, i)  => ({ id: `mp-${i}`,   tipo: 'metodo_pago',  codigo: m.value,     valor: m.label, descripcion: m.label, orden: i })),
      ...(nuevo.ubicaciones  || []).map((v, i) => ({ id: `ubi-${i}`, tipo: 'ubicacion',   codigo: `ubi-${i}`, valor: v, descripcion: v, orden: i })),
      ...(nuevo.tipos_cliente|| []).map((v, i) => ({ id: `tc-${i}`,  tipo: 'tipo_cliente',codigo: `tc-${i}`,  valor: v, descripcion: v, orden: i })),
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

  // ── Ubicaciones ───────────────────────────────────────────────────────────
  const agregarUbicacion = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    _syncSheet({ ...catalogos, ubicaciones: [...(catalogos.ubicaciones || []), n] })
  }, [catalogos, _syncSheet])

  const editarUbicacion = useCallback((index, nombre) => {
    const updated = [...(catalogos.ubicaciones || [])]
    updated[index] = nombre.trim()
    _syncSheet({ ...catalogos, ubicaciones: updated })
  }, [catalogos, _syncSheet])

  const eliminarUbicacion = useCallback((index) => {
    _syncSheet({ ...catalogos, ubicaciones: (catalogos.ubicaciones || []).filter((_, i) => i !== index) })
  }, [catalogos, _syncSheet])

  // ── Tipos de cliente ──────────────────────────────────────────────────────
  const agregarTipoCliente = useCallback((nombre) => {
    const n = nombre.trim()
    if (!n) return
    _syncSheet({ ...catalogos, tipos_cliente: [...(catalogos.tipos_cliente || []), n] })
  }, [catalogos, _syncSheet])

  const editarTipoCliente = useCallback((index, nombre) => {
    const updated = [...(catalogos.tipos_cliente || [])]
    updated[index] = nombre.trim()
    _syncSheet({ ...catalogos, tipos_cliente: updated })
  }, [catalogos, _syncSheet])

  const eliminarTipoCliente = useCallback((index) => {
    _syncSheet({ ...catalogos, tipos_cliente: (catalogos.tipos_cliente || []).filter((_, i) => i !== index) })
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
      categorias:    catalogos.categorias,
      unidades:      catalogos.unidades,
      metodos_pago:  catalogos.metodos_pago,
      ubicaciones:   catalogos.ubicaciones   || SEED.ubicaciones,
      tipos_cliente: catalogos.tipos_cliente || SEED.tipos_cliente,
      catalogos, // raw — para backup
      agregarCategoria,   editarCategoria,   eliminarCategoria,
      agregarUnidad,      editarUnidad,      eliminarUnidad,
      agregarMetodoPago,  editarMetodoPago,  eliminarMetodoPago,
      agregarUbicacion,   editarUbicacion,   eliminarUbicacion,
      agregarTipoCliente, editarTipoCliente, eliminarTipoCliente,
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
