import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'
import { sha256, gasGetConfig, gasSaveConfig } from '../services/googleAppsScript'
import { auditar } from '../services/auditoria'

export const AuthContext = createContext(null)

// Módulos configurables por rol (admin siempre tiene todo, no es editable)
export const MODULOS = [
  { ruta: '/ventas',             label: 'Historial de ventas' },
  { ruta: '/ventas/nueva',       label: 'Nueva venta / Caja POS' },
  { ruta: '/productos',          label: 'Productos' },
  { ruta: '/inventario',         label: 'Inventario' },
  { ruta: '/clientes',           label: 'Clientes' },
  { ruta: '/proveedores',        label: 'Proveedores' },
  { ruta: '/compras',            label: 'Compras' },
  { ruta: '/cotizaciones',       label: 'Cotizaciones' },
  { ruta: '/cotizaciones/nueva', label: 'Nueva cotización' },
  { ruta: '/pedidos',            label: 'Pedidos' },
  { ruta: '/cuentas-por-cobrar', label: 'Cuentas por cobrar' },
  { ruta: '/caja',               label: 'Caja (apertura/cierre)' },
  { ruta: '/reportes',           label: 'Reportes' },
  { ruta: '/catalogos',          label: 'Catálogos' },
  { ruta: '/contabilidad',       label: 'Contabilidad' },
  { ruta: '/bi',                 label: 'Business Intelligence' },
]

// Permisos por defecto para cada rol (se usan si no hay RBAC guardado)
export const ROLES_DEFAULT = {
  vendedor:  ['/', '/ventas', '/ventas/nueva', '/clientes', '/cotizaciones', '/cotizaciones/nueva'],
  bodeguero: ['/', '/productos', '/inventario', '/pedidos'],
  cotizador: ['/', '/cotizaciones', '/cotizaciones/nueva', '/clientes', '/productos'],
}

// Rutas fijas de admin (no configurables)
const RUTAS_ADMIN = ['/', '/ventas', '/ventas/nueva', '/productos', '/inventario', '/clientes', '/reportes', '/contabilidad', '/ajustes', '/pedidos', '/catalogos', '/compras', '/proveedores', '/cotizaciones', '/cotizaciones/nueva', '/cuentas-por-cobrar', '/caja', '/configuracion', '/auditoria', '/bi']

// Roles y sus permisos de navegación
export const ROLES = {
  admin:     { label: 'Administrador', rutas: RUTAS_ADMIN },
  vendedor:  { label: 'Vendedor',      rutas: ROLES_DEFAULT.vendedor },
  bodeguero: { label: 'Bodeguero',     rutas: ROLES_DEFAULT.bodeguero },
  cotizador: { label: 'Cotizador',     rutas: ROLES_DEFAULT.cotizador },
}

function cargarRbac() {
  try { return JSON.parse(localStorage.getItem('ferreapp_rbac') || 'null') || {} } catch { return {} }
}

export function guardarRbac(rbac) {
  localStorage.setItem('ferreapp_rbac', JSON.stringify(rbac))
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
  const [rbac, setRbac] = useState(cargarRbac)
  const [sincronizando, setSincronizando] = useState(true)

  // Carga RBAC desde el Sheet al iniciar
  useEffect(() => {
    gasGetConfig().then(res => {
      if (res?.ok && res.data?.rbac) {
        try {
          const rbacSheet = typeof res.data.rbac === 'string'
            ? JSON.parse(res.data.rbac)
            : res.data.rbac
          if (rbacSheet && typeof rbacSheet === 'object') {
            setRbac(rbacSheet)
            guardarRbac(rbacSheet)
          }
        } catch (e) { /* ignorar error de parse */ }
      }
    }).catch(() => {})
  }, [])

  const actualizarRbac = useCallback((nuevoRbac) => {
    setRbac(nuevoRbac)
    guardarRbac(nuevoRbac)
    gasSaveConfig({ rbac: JSON.stringify(nuevoRbac) }).catch(() => {})
  }, [])

  const persistSesion = useCallback((value) => {
    setSesion(value)
    if (value) sessionStorage.setItem('ferreapp_sesion', JSON.stringify(value))
    else sessionStorage.removeItem('ferreapp_sesion')
  }, [])

  useEffect(() => {
    setSincronizando(true)
    db.forceRefresh('usuarios').then(data => {
      if (data.length) {
        const normalizados = data.map(normalizeUsuario)
        const tieneAdmin = normalizados.some(u => u.id === 'usr-admin')
        setUsuarios(tieneAdmin ? normalizados : [...USUARIOS_DEFAULT, ...normalizados])
      }
    }).catch(() => {}).finally(() => setSincronizando(false))
  }, [])

  useEffect(() => {
    if (!sesion || sincronizando) return
    const usuarioActivo = usuarios.find(u => u.id === sesion.id && isActivo(u))
    if (!usuarioActivo) persistSesion(null)
  }, [usuarios, sesion, sincronizando, persistSesion])

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
    if (sesion.rol === 'admin') return true
    // Usar RBAC personalizado si existe para este rol, si no el default
    const rutasRol = rbac[sesion.rol] || ROLES_DEFAULT[sesion.rol] || []
    return ['/', ...rutasRol].some(r => ruta === r || ruta.startsWith(r + '/'))
  }, [sesion, rbac])

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
      sincronizando,
      rbac,
      actualizarRbac,
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
