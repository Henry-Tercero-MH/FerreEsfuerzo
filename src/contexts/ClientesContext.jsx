import { createContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'

export const ClientesContext = createContext(null)

const SEED = [
  { id: shortId(), nombre: 'Consumidor Final', telefono: '', email: '', direccion: '', nit: 'CF', tipo: 'natural', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), nombre: 'Juan García', telefono: '5555-1234', email: 'jgarcia@mail.com', direccion: 'Zona 1, Ciudad', nit: '1234567-8', tipo: 'natural', activo: true, creado_en: new Date().toISOString() },
  { id: shortId(), nombre: 'Constructora XYZ', telefono: '2222-9876', email: 'info@xyz.com', direccion: 'Zona 10, Guatemala', nit: '9876543-2', tipo: 'empresa', activo: true, creado_en: new Date().toISOString() },
]

export function ClientesProvider({ children }) {
  const [clientes, setClientes] = useLocalStorage('ferreapp_clientes', SEED)

  const agregarCliente = useCallback((data) => {
    const nuevo = { ...data, id: shortId(), activo: true, creado_en: new Date().toISOString() }
    setClientes(prev => [nuevo, ...prev])
    return nuevo
  }, [setClientes])

  const editarCliente = useCallback((id, data) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }, [setClientes])

  const eliminarCliente = useCallback((id) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
  }, [setClientes])

  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes])

  return (
    <ClientesContext.Provider value={{ clientes, clientesActivos, agregarCliente, editarCliente, eliminarCliente }}>
      {children}
    </ClientesContext.Provider>
  )
}
