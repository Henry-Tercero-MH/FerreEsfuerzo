import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'
import { sha256 } from '../services/googleAppsScript'
import { auditar } from '../services/auditoria'

export const AuthContext = createContext(null)

// Roles y sus permisos de navegación
export const ROLES = {
  admin: {
    label: 'Administrador',
    rutas: ['/', '/ventas', '/ventas/nueva', '/productos', '/inventario', '/clientes', '/reportes', '/contabilidad', '/ajustes', '/pedidos', '/catalogos', '/compras', '/proveedores', '/cotizaciones', '/cuentas-por-cobrar', '/caja', '/configuracion', '/auditoria', '/bi'],
  },
  vendedor: {
    label: 'Vendedor',
    rutas: ['/', '/ventas', '/ventas/nueva', '/clientes', '/cotizaciones', '/cotizaciones/nueva'],
  },
  bodeguero: {
    label: 'Bodeguero',
    rutas: ['/', '/productos', '/inventario', '/pedidos'],
  },
  // Rol para tablet: solo puede crear y ver cotizaciones y consultar clientes/productos
  cotizador: {
    label: 'Cotizador',
    rutas: ['/', '/cotizaciones', '/cotizaciones/nueva', '/clientes', '/productos'],
  },
}

// Google Sheets devuelve booleanos como strings "TRUE"/"FALSE"
function isActivo(u) {
  const v = u.activo
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toUpperCase() === 'TRUE'
  return !!v
}

function normalizeUsuario(u) {
  return { ...u, activo: isActivo(u) }
}

// SHA-256 de 'admin123' — precalculado para el seed inicial
const HASH_ADMIN_DEFAULT = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'

const USUARIOS_DEFAULT = [
  {
    id: 'usr-admin',
    nombre: 'Administrador',
    email: 'admin@ferreapp.com',
    password_hash: HASH_ADMIN_DEFAULT,
    rol: 'admin',
    activo: true,
    creado_en: new Date().toISOString(),
  },
]

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ferreapp_usuarios') || 'null')
      return saved ? saved.map(normalizeUsuario) : USUARIOS_DEFAULT
    } catch { return USUARIOS_DEFAULT }
  })
  const [sesion, setSesion] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ferreapp_sesion') || 'null') } catch { return null }
  })

  const persistSesion = useCallback((value) => {
    setSesion(value)
    if (value) sessionStorage.setItem('ferreapp_sesion', JSON.stringify(value))
    else sessionStorage.removeItem('ferreapp_sesion')
  }, [])

  useEffect(() => {
    db.forceRefresh('usuarios').then(data => {
      if (!data.length) return
      const normalizados = data.map(normalizeUsuario)
      // Si el sheet no tiene el admin default, lo conservamos para no perder acceso
      const tieneAdmin = normalizados.some(u => u.id === 'usr-admin')
      setUsuarios(tieneAdmin ? normalizados : [...USUARIOS_DEFAULT, ...normalizados])
    })
  }, [])

  useEffect(() => {
    if (!sesion) return
    const usuarioActivo = usuarios.find(u => u.id === sesion.id && isActivo(u))
    if (!usuarioActivo) persistSesion(null)
  }, [usuarios, sesion, persistSesion])

  const login = useCallback(async (email, password) => {
    const hash = await sha256(password)
    const usuario = usuarios.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password_hash === hash && isActivo(u)
    )
    if (!usuario) {
      auditar({ accion: 'login_fallido', entidad: 'usuarios', descripcion: `Intento de login fallido: ${email}` })
      return { ok: false, error: 'Credenciales incorrectas' }
    }
    const sesionData = { ...usuario }
    delete sesionData.password_hash
    persistSesion(sesionData)
    auditar({ accion: 'login', entidad: 'usuarios', entidad_id: usuario.id, descripcion: `${usuario.nombre} inició sesión`, sesion: sesionData })
    return { ok: true }
  }, [usuarios, persistSesion])

  const logout = useCallback(() => {
    if (sesion) auditar({ accion: 'logout', entidad: 'usuarios', entidad_id: sesion.id, descripcion: `${sesion.nombre} cerró sesión`, sesion })
    persistSesion(null)
  }, [sesion, persistSesion])

  const tieneAcceso = useCallback((ruta) => {
    if (!sesion || !ruta) return false
    const rol = ROLES[sesion.rol]
    if (!rol) return false
    return rol.rutas.some(r => ruta === r || ruta.startsWith(r + '/'))
  }, [sesion])

  const agregarUsuario = useCallback(async (data) => {
    if (usuarios.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { ok: false, error: 'Ya existe un usuario con ese email' }
    }
    const { password, ...resto } = data
    const password_hash = password ? await sha256(password) : ''
    const nuevo = { ...resto, password_hash, id: `usr-${shortId()}`, activo: true, creado_en: new Date().toISOString() }
    setUsuarios(prev => [...prev, nuevo])
    await db.insert('usuarios', nuevo)
    return { ok: true }
  }, [usuarios])

  const editarUsuario = useCallback(async (id, data) => {
    let cambios = { ...data }
    if (data.password) {
      cambios.password_hash = await sha256(data.password)
      delete cambios.password
    }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...cambios } : u))
    await db.update('usuarios', id, cambios)
  }, [])

  const eliminarUsuario = useCallback(async (id) => {
    if (id === 'usr-admin') return { ok: false, error: 'No puedes eliminar el admin principal' }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
    await db.remove('usuarios', id)
    return { ok: true }
  }, [])

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

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
