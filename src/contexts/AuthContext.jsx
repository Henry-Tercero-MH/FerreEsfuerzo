import { createContext, useContext, useState, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'

export const AuthContext = createContext(null)

// Roles y sus permisos de navegación
export const ROLES = {
  admin: {
    label: 'Administrador',
    rutas: ['/', '/ventas', '/ventas/nueva', '/productos', '/inventario', '/clientes', '/reportes', '/ajustes'],
  },
  vendedor: {
    label: 'Vendedor',
    rutas: ['/', '/ventas', '/ventas/nueva', '/clientes'],
  },
  bodeguero: {
    label: 'Bodeguero',
    rutas: ['/', '/productos', '/inventario'],
  },
}

const USUARIOS_DEFAULT = [
  {
    id: 'usr-admin',
    nombre: 'Administrador',
    email: 'admin@ferreapp.com',
    password: 'admin123',
    rol: 'admin',
    activo: true,
    creado_en: new Date().toISOString(),
  },
]

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useLocalStorage('ferreapp_usuarios', USUARIOS_DEFAULT)
  const [sesion, setSesion] = useLocalStorage('ferreapp_sesion', null)

  const login = useCallback((email, password) => {
    const usuario = usuarios.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.activo
    )
    if (!usuario) return { ok: false, error: 'Credenciales incorrectas' }
    const { password: _, ...sesionData } = usuario
    setSesion(sesionData)
    return { ok: true }
  }, [usuarios, setSesion])

  const logout = useCallback(() => setSesion(null), [setSesion])

  const tieneAcceso = useCallback((ruta) => {
    if (!sesion) return false
    const rol = ROLES[sesion.rol]
    if (!rol) return false
    return rol.rutas.some(r => ruta === r || ruta.startsWith(r + '/'))
  }, [sesion])

  const agregarUsuario = useCallback((data) => {
    if (usuarios.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { ok: false, error: 'Ya existe un usuario con ese email' }
    }
    const nuevo = { ...data, id: `usr-${shortId()}`, activo: true, creado_en: new Date().toISOString() }
    setUsuarios(prev => [...prev, nuevo])
    return { ok: true }
  }, [usuarios, setUsuarios])

  const editarUsuario = useCallback((id, data) => {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
  }, [setUsuarios])

  const eliminarUsuario = useCallback((id) => {
    if (id === 'usr-admin') return { ok: false, error: 'No puedes eliminar el admin principal' }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
    return { ok: true }
  }, [setUsuarios])

  return (
    <AuthContext.Provider value={{
      sesion,
      usuarios: usuarios.filter(u => u.activo),
      login,
      logout,
      tieneAcceso,
      agregarUsuario,
      editarUsuario,
      eliminarUsuario,
      estaAutenticado: !!sesion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
