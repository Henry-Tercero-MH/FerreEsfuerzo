import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'

export const ProveedoresContext = createContext(null)

export function ProveedoresProvider({ children }) {
  const [proveedores, setProveedores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]') } catch { return [] }
  })

  useEffect(() => {
    db.getAll('proveedores').then(data => { if (data.length) setProveedores(data) })
  }, [])

  const agregarProveedor = useCallback(async (data) => {
    const nuevo = {
      ...data,
      id: shortId(),
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }
    setProveedores(prev => [nuevo, ...prev])
    await db.insert('proveedores', nuevo)
    return nuevo
  }, [])

  const editarProveedor = useCallback(async (id, data) => {
    const actualizado = { ...data, actualizado_en: new Date().toISOString() }
    setProveedores(prev => prev.map(p => p.id === id ? { ...p, ...actualizado } : p))
    await db.update('proveedores', id, actualizado)
  }, [])

  const eliminarProveedor = useCallback(async (id) => {
    setProveedores(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    await db.remove('proveedores', id)
  }, [])

  const proveedoresActivos = useMemo(() => proveedores.filter(p => p.activo), [proveedores])

  return (
    <ProveedoresContext.Provider value={{
      proveedores: proveedoresActivos,
      agregarProveedor,
      editarProveedor,
      eliminarProveedor,
    }}>
      {children}
    </ProveedoresContext.Provider>
  )
}

export const useProveedores = () => {
  const context = useContext(ProveedoresContext)
  if (!context) throw new Error('useProveedores debe usarse dentro de ProveedoresProvider')
  return context
}
