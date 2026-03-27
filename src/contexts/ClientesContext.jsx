import { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'

export const ClientesContext = createContext(null)

export function ClientesProvider({ children }) {
  const [clientes, setClientes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]') } catch { return [] }
  })

  useEffect(() => {
    db.getAll('clientes').then(data => { if (data.length) setClientes(data) })
  }, [])

  const agregarCliente = useCallback(async (data) => {
    const nuevo = { ...data, id: shortId(), activo: true, creado_en: new Date().toISOString() }
    setClientes(prev => [nuevo, ...prev])
    await db.insert('clientes', nuevo)
    return nuevo
  }, [])

  const editarCliente = useCallback(async (id, data) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    await db.update('clientes', id, data)
  }, [])

  const eliminarCliente = useCallback(async (id) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
    await db.remove('clientes', id)
  }, [])

  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes])

  return (
    <ClientesContext.Provider value={{ clientes, clientesActivos, agregarCliente, editarCliente, eliminarCliente }}>
      {children}
    </ClientesContext.Provider>
  )
}
