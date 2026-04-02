import { useState } from 'react'
import { Plus, Pencil, Trash2, Download, Wifi, RefreshCw } from 'lucide-react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { testConexion } from '../services/googleAppsScript.js'
import { storage } from '../services/storage.js'
import { db } from '../services/db.js'
import { useToast } from '../hooks/useToast'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import Input, { Select } from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'

const FORM_VACÍO = { nombre: '', email: '', password: '', rol: 'vendedor' }

export default function Ajustes() {
  const { usuarios, agregarUsuario, editarUsuario, eliminarUsuario, sesion } = useAuth()
  const { productos, ventas, clientes, movimientos } = useApp()
  const { toasts, toast, remove: removeToast } = useToast()
  const [modal, setModal]   = useState({ open: false, modo: 'crear', usuario: null })
  const [confirm, setConfirm] = useState(null)
  const [form, setForm]     = useState(FORM_VACÍO)
  const [errores, setErrores] = useState({})
  const [loading, setLoading] = useState(false)
  const [alerta, setAlerta]  = useState(null)
  const [testLoading, setTestLoading]     = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)

  const mostrarAlerta = (type, message) => {
    setAlerta({ type, message })
    setTimeout(() => setAlerta(null), 4000)
  }

  const abrirCrear  = () => { setForm(FORM_VACÍO); setErrores({}); setModal({ open: true, modo: 'crear', usuario: null }) }
  const abrirEditar = (u) => { setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol }); setErrores({}); setModal({ open: true, modo: 'editar', usuario: u }) }
  const cerrar      = () => setModal(m => ({ ...m, open: false }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errores[name]) setErrores(p => ({ ...p, [name]: '' }))
  }

  const validar = () => {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.email.trim())  errs.email  = 'El email es requerido'
    if (modal.modo === 'crear' && !form.password) errs.password = 'La contraseña es requerida'
    return errs
  }

  const handleGuardar = async () => {
    const errs = validar()
    if (Object.keys(errs).length) { setErrores(errs); return }
    setLoading(true)
    if (modal.modo === 'crear') {
      const result = await agregarUsuario(form)
      if (!result.ok) { setErrores({ email: result.error }); setLoading(false); return }
      mostrarAlerta('success', 'Usuario creado correctamente')
    } else {
      const data = { nombre: form.nombre, rol: form.rol }
      if (form.password) data.password = form.password
      await editarUsuario(modal.usuario.id, data)
      mostrarAlerta('success', 'Usuario actualizado')
    }
    setLoading(false)
    cerrar()
  }

  const ejecutarEliminar = async (usuario) => {
    const result = await eliminarUsuario(usuario.id)
    if (!result.ok) toast(result.error, 'error')
    else toast(`Usuario "${usuario.nombre}" desactivado`, 'warning')
  }

  const handleTestConexion = async () => {
    setTestLoading(true)
    const res = await testConexion()
    if (res.ok) mostrarAlerta('success', 'Conexión con Google Sheets exitosa')
    else mostrarAlerta('error', `Error de conexión: ${res.error}`)
    setTestLoading(false)
  }

  const handleRefrescarDatos = async () => {
    setRefreshLoading(true)
    try {
      await db.refreshAll()
      mostrarAlerta('success', 'Datos actualizados desde Google Sheets')
    } catch (e) {
      mostrarAlerta('error', `Error al actualizar: ${e.message}`)
    }
    setRefreshLoading(false)
  }

  const handleExportarJSON = () => {
    const data = storage.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ferreapp-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    mostrarAlerta('success', 'Backup JSON descargado')
  }

  const rolesColor = { admin: 'orange', vendedor: 'blue', bodeguero: 'green', cotizador: 'purple' }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Gestión de usuarios y configuración del sistema</p>
      </div>

      {alerta && <Alert type={alerta.type} message={alerta.message} onClose={() => setAlerta(null)} />}

      {/* Gestión de usuarios */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Usuarios del sistema</h2>
          <Button variant="primary" size="sm" icon={Plus} onClick={abrirCrear}>Agregar usuario</Button>
        </div>
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.nombre} {u.id === sesion?.id && <span className="text-xs text-gray-400">(tú)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={rolesColor[u.rol] ?? 'gray'}>{ROLES[u.rol]?.label}</Badge>
                <button onClick={() => abrirEditar(u)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600">
                  <Pencil size={15} />
                </button>
                {u.id !== 'usr-admin' && (
                  <button onClick={() => setConfirm(u)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conexión y datos */}
      <div className="card">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Conexión y datos</h2>
        <p className="mb-4 text-sm text-gray-400">
          Los datos se sincronizan automáticamente con Google Sheets. Usa estas opciones para verificar o forzar una actualización.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={RefreshCw} loading={refreshLoading} onClick={handleRefrescarDatos}>
            Refrescar desde Google Sheets
          </Button>
          <Button variant="secondary" icon={Wifi} loading={testLoading} onClick={handleTestConexion}>
            Probar conexión
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleExportarJSON}>
            Exportar copia JSON
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Configura <code className="bg-gray-100 px-1 rounded">VITE_APPS_SCRIPT_URL</code> en el archivo <code className="bg-gray-100 px-1 rounded">.env</code> para habilitar la sincronización.
        </p>
      </div>

      {/* Info del sistema */}
      <div className="card">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Información del sistema</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{productos.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Productos</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{ventas.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Ventas</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clientes</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{movimientos.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Movimientos</p>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => ejecutarEliminar(confirm)}
        title="¿Desactivar usuario?"
        message={`Se desactivará al usuario "${confirm?.nombre}". No podrá iniciar sesión.`}
        confirmText="Desactivar"
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modal usuario */}
      <Modal
        open={modal.open}
        onClose={cerrar}
        title={modal.modo === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}
        footer={<>
          <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleGuardar}>
            {modal.modo === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} error={errores.nombre} />
          <Input label="Correo electrónico *" name="email" type="email" value={form.email} onChange={handleChange} error={errores.email} disabled={modal.modo === 'editar'} />
          <Input label={modal.modo === 'crear' ? 'Contraseña *' : 'Nueva contraseña (opcional)'} name="password" type="password" value={form.password} onChange={handleChange} error={errores.password} />
          <Select label="Rol" name="rol" value={form.rol} onChange={handleChange}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          {form.rol === 'cotizador' && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
              El rol <strong>Cotizador</strong> es ideal para tablet. Solo tiene acceso a cotizaciones, clientes y consulta de productos. No puede facturar ni ver caja.
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
