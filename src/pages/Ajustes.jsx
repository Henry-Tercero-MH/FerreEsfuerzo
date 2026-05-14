import { useState } from 'react'
import { Plus, Pencil, Trash2, Download, Wifi, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useCompras } from '../contexts/ComprasContext'
import { useProveedores } from '../contexts/ProveedoresContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useCaja } from '../contexts/CajaContext'
import { testConexion } from '../services/googleAppsScript.js'
import { auditar } from '../services/auditoria'
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
  const { cotizaciones } = useCotizaciones()
  const { compras } = useCompras()
  const { proveedores } = useProveedores()
  const { cuentas, abonos } = useCuentasPorCobrar()
  const { aperturas, movimientos: movimientosCaja } = useCaja()
  const { toasts, toast, remove: removeToast } = useToast()
  const [modal, setModal]   = useState({ open: false, modo: 'crear', usuario: null })
  const [confirm, setConfirm] = useState(null)
  const [form, setForm]     = useState(FORM_VACÍO)
  const [errores, setErrores] = useState({})
  const [loading, setLoading] = useState(false)
  const [alerta, setAlerta]  = useState(null)
  const [testLoading, setTestLoading]     = useState(false)


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
      auditar({ accion: 'usuario_creado', entidad: 'usuarios', descripcion: `Usuario creado: ${form.nombre} (${form.rol})`, detalle: { nombre: form.nombre, email: form.email, rol: form.rol }, sesion })
      mostrarAlerta('success', 'Usuario creado correctamente')
    } else {
      const data = { nombre: form.nombre, rol: form.rol }
      if (form.password) data.password = form.password
      await editarUsuario(modal.usuario.id, data)
      auditar({ accion: 'usuario_editado', entidad: 'usuarios', entidad_id: modal.usuario.id, descripcion: `Usuario editado: ${form.nombre} (${form.rol})`, sesion })
      mostrarAlerta('success', 'Usuario actualizado')
    }
    setLoading(false)
    cerrar()
  }

  const ejecutarEliminar = async (usuario) => {
    const result = await eliminarUsuario(usuario.id)
    if (!result.ok) toast(result.error, 'error')
    else {
      toast(`Usuario "${usuario.nombre}" desactivado`, 'warning')
      auditar({ accion: 'usuario_eliminado', entidad: 'usuarios', entidad_id: usuario.id, descripcion: `Usuario desactivado: ${usuario.nombre} (${usuario.rol})`, detalle: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }, sesion })
    }
  }


  const handleLimpiarCuentas = () => {
    const totalCuentas = cuentas.length
    const totalAbonos = abonos.length
    localStorage.removeItem('ferreapp_cuentas_cobrar')
    localStorage.removeItem('ferreapp_cuentasCobrar')
    localStorage.removeItem('ferreapp_abonos')
    localStorage.removeItem('ferreapp_cuentasCobrar_ts')
    localStorage.removeItem('ferreapp_abonos_ts')
    auditar({ accion: 'datos_limpiados', entidad: 'cuentasCobrar', descripcion: `Cache limpiado: ${totalCuentas} cuentas y ${totalAbonos} abonos`, sesion })
    mostrarAlerta('success', `Cache limpiado. Recarga la página para confirmar.`)
  }

  const handleTestConexion = async () => {
    setTestLoading(true)
    const res = await testConexion()
    if (res.ok) mostrarAlerta('success', 'Conexión con Google Sheets exitosa')
    else mostrarAlerta('error', `Error de conexión: ${res.error}`)
    setTestLoading(false)
  }


  const handleExportarJSON = () => {
    const data = Object.keys(localStorage)
      .filter(k => k.startsWith('ferreapp_'))
      .reduce((acc, k) => {
        const key = k.replace('ferreapp_', '')
        if (key === 'sesion') return acc
        try {
          const value = JSON.parse(localStorage.getItem(k))
          acc[key] = key === 'usuarios' && Array.isArray(value)
            ? value.map(usuario => {
                const copia = { ...usuario }
                delete copia.password_hash
                return copia
              })
            : value
        } catch {
          acc[key] = null
        }
        return acc
      }, {})
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ferreapp-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    mostrarAlerta('success', 'Backup JSON descargado')
  }

  const handleExportarExcel = () => {
    const wb = XLSX.utils.book_new()
    const hoja = (datos, nombre) => {
      const ws = datos.length ? XLSX.utils.json_to_sheet(datos) : XLSX.utils.aoa_to_sheet([['Sin datos']])
      XLSX.utils.book_append_sheet(wb, ws, nombre)
    }

    hoja(productos.map(p => ({
      Código: p.codigo, Nombre: p.nombre, Categoría: p.categoria || '',
      Ubicación: p.ubicacion || '', Precio_Compra: p.precio_compra || 0,
      Precio_Venta: p.precio_venta, Stock: p.stock,
      Stock_Mínimo: p.stock_minimo, Unidad: p.unidad || '',
      Activo: p.activo ? 'Sí' : 'No', Creado: p.creado_en || '',
    })), 'Productos')

    hoja(clientes.map(c => ({
      ID: c.id, Nombre: c.nombre, Teléfono: c.telefono || '',
      Email: c.email || '', NIT: c.nit || '', Tipo: c.tipo || '',
      Activo: c.activo ? 'Sí' : 'No', Creado: c.creado_en || '',
    })), 'Clientes')

    hoja(ventas.map(v => ({
      Número: v.numero_venta, Fecha: v.fecha, Cliente: v.cliente_nombre || '',
      Subtotal: v.subtotal || 0, Descuento: v.descuento || 0,
      Total: v.total || 0, Método_Pago: v.metodo_pago || '',
      Estado: v.estado || '', Items: (v.items || []).length,
      Es_Pedido: v.es_pedido ? 'Sí' : 'No',
    })), 'Ventas')

    // Items de ventas (detalle)
    const ventaItems = ventas.flatMap(v =>
      (v.items || []).map(i => ({
        Venta: v.numero_venta, Fecha: v.fecha,
        Producto: i.nombre || '', Código: i.codigo || '',
        Cantidad: i.cantidad, Precio_Unitario: i.precio_unitario,
        Subtotal: i.subtotal,
      }))
    )
    hoja(ventaItems, 'Detalle_Ventas')

    hoja(movimientos.map(m => ({
      ID: m.id, Producto_ID: m.producto_id, Tipo: m.tipo,
      Cantidad: m.cantidad, Motivo: m.motivo || '',
      Referencia: m.referencia || '', Fecha: m.fecha || '',
    })), 'Movimientos_Inventario')

    hoja((cotizaciones || []).map(c => ({
      Número: c.numero_cotizacion, Fecha: c.fecha,
      Cliente: c.cliente_nombre || '', Subtotal: c.subtotal || 0,
      Descuento: c.descuento || 0, Total: c.total || 0,
      Estado: c.estado || '', Vencimiento: c.fecha_vencimiento || '',
      Notas: c.notas || '',
    })), 'Cotizaciones')

    hoja((proveedores || []).map(p => ({
      ID: p.id, Nombre: p.nombre, Contacto: p.contacto || '',
      Teléfono: p.telefono || '', Email: p.email || '',
      Dirección: p.direccion || '', NIT: p.nit || '',
      Activo: p.activo ? 'Sí' : 'No',
    })), 'Proveedores')

    hoja((compras || []).map(c => ({
      Número: c.numero_documento, Fecha: c.fecha_documento,
      Proveedor: c.proveedor_nombre || '', Subtotal: c.subtotal || 0,
      Descuento: c.descuento || 0, Total: c.total || 0,
      Estado: c.estado || '', Notas: c.notas || '',
    })), 'Compras')

    hoja((cuentas || []).map(c => ({
      ID: c.id, Cliente_ID: c.cliente_id, Cliente: c.cliente_nombre || '',
      Monto_Original: c.monto_original || 0, Saldo: c.saldo || 0,
      Estado: c.estado || '', Vencimiento: c.fecha_vencimiento || '',
      Referencia_Venta: c.referencia_venta || '',
    })), 'Cuentas_por_Cobrar')

    hoja((abonos || []).map(a => ({
      ID: a.id, Cuenta_ID: a.cuenta_id, Monto: a.monto || 0,
      Fecha: a.fecha || '', Método: a.metodo_pago || '', Notas: a.notas || '',
    })), 'Abonos')

    hoja((aperturas || []).map(a => ({
      ID: a.id, Fecha_Apertura: a.fecha_apertura || '',
      Fecha_Cierre: a.fecha_cierre || '', Fondo_Inicial: a.fondo_inicial || 0,
      Total_Ventas: a.total_ventas || 0, Total_Ingresos: a.total_ingresos || 0,
      Total_Egresos: a.total_egresos || 0, Saldo_Final: a.saldo_final || 0,
      Estado: a.estado || '',
    })), 'Caja_Aperturas')

    hoja((movimientosCaja || []).map(m => ({
      ID: m.id, Apertura_ID: m.apertura_id || '', Tipo: m.tipo || '',
      Concepto: m.concepto || '', Monto: m.monto || 0, Fecha: m.fecha || '',
    })), 'Caja_Movimientos')

    hoja(usuarios.map(u => ({
      ID: u.id, Nombre: u.nombre, Email: u.email,
      Rol: u.rol, Activo: u.activo !== false ? 'Sí' : 'No',
    })), 'Usuarios')

    const fecha = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `ferreapp-backup-${fecha}.xlsx`)
    mostrarAlerta('success', 'Backup Excel descargado — ' + [
      `${productos.length} productos`, `${ventas.length} ventas`,
      `${clientes.length} clientes`, `${(cotizaciones||[]).length} cotizaciones`,
      `${(compras||[]).length} compras`,
    ].join(', '))
  }


  const rolesColor = { admin: 'orange', vendedor: 'blue', bodeguero: 'green', cotizador: 'purple' }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
          <Button variant="secondary" icon={Wifi} loading={testLoading} onClick={handleTestConexion}>
            Probar conexión
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleExportarJSON}>
            Exportar copia JSON
          </Button>
          <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportarExcel}>
            Exportar Excel (backup)
          </Button>
          {(cuentas.length > 0 || abonos.length > 0) && (
            <Button variant="danger" onClick={handleLimpiarCuentas}>
              Limpiar cuentas por cobrar ({cuentas.length})
            </Button>
          )}
        </div>

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
