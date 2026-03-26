import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'

export const ProveedoresContext = createContext(null)

const SEED = [
  {
    id: shortId(),
    nit: '12345678-9',
    nombre: 'Distribuidora La Unión',
    nombre_contacto: 'Juan Pérez',
    direccion: 'Zona 1, Guatemala',
    telefono: '2234-5678',
    correo: 'ventas@launion.com.gt',
    dias_credito: 30,
    porcentaje_descuento: 2,
    activo: true,
    creado_en: new Date().toISOString(),
  },
  {
    id: shortId(),
    nit: '98765432-1',
    nombre: 'Ferretería Nacional',
    nombre_contacto: 'María López',
    direccion: 'Zona 12, Guatemala',
    telefono: '2456-7890',
    correo: 'contacto@ferrenacional.com',
    dias_credito: 15,
    porcentaje_descuento: 0,
    activo: true,
    creado_en: new Date().toISOString(),
  },
]

export function ProveedoresProvider({ children }) {
  const [proveedores, setProveedores] = useLocalStorage('ferreapp_proveedores', SEED)

  const agregarProveedor = useCallback((data) => {
    const nuevo = {
      ...data,
      id: shortId(),
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }
    setProveedores(prev => [nuevo, ...prev])
    return nuevo
  }, [setProveedores])

  const editarProveedor = useCallback((id, data) => {
    setProveedores(prev =>
      prev.map(p => p.id === id ? { ...p, ...data, actualizado_en: new Date().toISOString() } : p)
    )
  }, [setProveedores])

  const eliminarProveedor = useCallback((id) => {
    setProveedores(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
  }, [setProveedores])

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
