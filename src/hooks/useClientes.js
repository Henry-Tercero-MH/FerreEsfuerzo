import { useContext } from 'react'
import { ClientesContext } from '../contexts/ClientesContext'

export function useClientes() {
  const ctx = useContext(ClientesContext)
  if (!ctx) throw new Error('useClientes debe usarse dentro de <ClientesProvider>')
  return ctx
}
