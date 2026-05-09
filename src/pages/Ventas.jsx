import { useState, useMemo } from 'react'
import { Plus, Eye, XCircle, ShoppingCart, Lock, Filter, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useCaja } from '../contexts/CajaContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useEmpresa } from '../contexts/EmpresaContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { auditar } from '../services/auditoria'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { ESTADOS_VENTA, METODOS_PAGO } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import SearchBar from '../components/shared/SearchBar'
import { imprimirTicket } from '../components/TicketVenta'

export default function Ventas() {
  const { ventas, cancelarVenta, clientes } = useApp()
  const { sesion } = useAuth()
  const { revertirVentaEnCaja, aperturas } = useCaja()
  const { cancelarCuenta } = useCuentasPorCobrar()
  const { empresa } = useEmpresa()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [mostrarFiltroUsuario, setMostrarFiltroUsuario] = useState(false)
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const esAdmin = sesion?.rol === 'admin'
  const termino = useDebounce(busqueda)

  // Usuarios únicos que han facturado (solo para el admin)
  const usuariosConVentas = useMemo(() => {
    const mapa = new Map()
    ventas.forEach(v => {
      if (v.usuario_id && v.usuario_nombre) mapa.set(v.usuario_id, v.usuario_nombre)
    })
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }))
  }, [ventas])

  // Coincide por ID o por nombre como fallback (cuando Sheets devuelve usuario_id vacío)
  const esMiVenta = (v) =>
    (sesion?.id && v.usuario_id && v.usuario_id === sesion.id) ||
    (sesion?.nombre && v.usuario_nombre && v.usuario_nombre === sesion.nombre)

  const ventasFiltradas = useMemo(() => [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).filter(v => {
    if (!esAdmin && !esMiVenta(v)) return false
    const coincide   = !termino || v.numero_venta.includes(termino.toUpperCase())
    const porEstado  = !filtroEstado || v.estado === filtroEstado
    const porUsuario = !filtroUsuario || v.usuario_id === filtroUsuario
    return coincide && porEstado && porUsuario
  }), [ventas, termino, filtroEstado, filtroUsuario, esAdmin, sesion])

  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.nombre ?? 'Consumidor Final'
  const getMetodoPago = (val) => METODOS_PAGO.find(m => m.value === val)?.label ?? val

  const cajaYaCerrada = (venta) => {
    const f = new Date(venta.fecha).getTime()
    return aperturas.some(a =>
      a.estado === 'CERRADA' &&
      f >= new Date(a.fecha_apertura).getTime() &&
      f <= new Date(a.fecha_cierre).getTime()
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">
            {ventasFiltradas.length} de {esAdmin ? ventas.length : ventas.filter(v => v.usuario_id === sesion?.id).length} ventas
            {!esAdmin && <span className="ml-1 text-primary-600 font-medium">— solo las tuyas</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {esAdmin && (
            <Button
              variant={mostrarFiltroUsuario ? 'primary' : 'secondary'}
              icon={Filter}
              onClick={() => { setMostrarFiltroUsuario(v => !v); setFiltroUsuario('') }}
            >
              Filtrar por usuario
            </Button>
          )}
          <Link to="/ventas/nueva">
            <Button variant="primary" icon={Plus}>Nueva venta</Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por número de venta..." className="flex-1" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input sm:w-44">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_VENTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {esAdmin && mostrarFiltroUsuario && (
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="input sm:w-48">
            <option value="">Todos los usuarios</option>
            {usuariosConVentas.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>N° Venta</th><th>Fecha</th><th>Cliente</th><th>Facturó</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {ventasFiltradas.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                {ventas.length === 0 ? 'Aún no hay ventas registradas. ¡Crea la primera!' : 'No se encontraron ventas'}
              </td></tr>
            ) : ventasFiltradas.map((v, i) => {
              const estado = ESTADOS_VENTA[v.estado]
              return (
                <tr key={v.id ?? i}>
                  <td className="font-mono text-xs font-semibold text-primary-700">{v.numero_venta}</td>
                  <td className="text-xs text-gray-500">{formatDateTime(v.fecha)}</td>
                  <td className="text-sm">{getClienteNombre(v.cliente_id)}</td>
                  <td className="text-xs text-gray-500">{v.usuario_nombre || '—'}</td>
                  <td><Badge variant="gray">{getMetodoPago(v.metodo_pago)}</Badge></td>
                  <td className="font-semibold text-gray-900">{formatCurrency(v.total)}</td>
                  <td><Badge variant={estado?.badge?.replace('badge-', '')}>{estado?.label}</Badge></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setVentaDetalle(v)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600" title="Ver detalle"><Eye size={15} /></button>
                      {v.estado !== 'cancelada' && (
                        cajaYaCerrada(v)
                          ? <button
                              onClick={() => toast('La caja de ese turno ya fue cerrada. No se puede anular una venta de un arqueo cerrado.', 'error')}
                              className="btn-icon btn-ghost text-gray-300 cursor-not-allowed"
                              title="Caja cerrada — no se puede anular"
                            ><Lock size={15} /></button>
                          : <button onClick={() => setConfirm(v)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500" title="Cancelar venta"><XCircle size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      <Modal open={!!ventaDetalle} onClose={() => setVentaDetalle(null)} title={`Detalle — ${ventaDetalle?.numero_venta}`} size="lg">
        {ventaDetalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400 text-xs">Cliente</p><p className="font-medium">{getClienteNombre(ventaDetalle.cliente_id)}</p></div>
              <div><p className="text-gray-400 text-xs">Fecha</p><p className="font-medium">{formatDateTime(ventaDetalle.fecha)}</p></div>
              <div><p className="text-gray-400 text-xs">Método de pago</p><p className="font-medium">{getMetodoPago(ventaDetalle.metodo_pago)}</p></div>
              <div><p className="text-gray-400 text-xs">Estado</p><Badge variant={ESTADOS_VENTA[ventaDetalle.estado]?.badge?.replace('badge-', '')}>{ESTADOS_VENTA[ventaDetalle.estado]?.label}</Badge></div>
              <div><p className="text-gray-400 text-xs">Facturó</p><p className="font-medium">{ventaDetalle.usuario_nombre || '—'}</p></div>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="table">
                <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(Array.isArray(ventaDetalle.items) ? ventaDetalle.items : []).map((item, i) => (
                    <tr key={item.producto_id ?? i}>
                      <td className="text-sm">{item.nombre}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatCurrency(item.precio_unitario)}</td>
                      <td className="font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 text-sm text-right">
              <p className="text-gray-500">Subtotal: <span className="font-medium text-gray-800">{formatCurrency(ventaDetalle.subtotal)}</span></p>
              {ventaDetalle.descuento > 0 && <p className="text-red-500">Descuento: <span>-{formatCurrency(ventaDetalle.descuento)}</span></p>}
              <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(ventaDetalle.total)}</p>
            </div>
            {esAdmin && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => imprimirTicket(ventaDetalle, clientes.find(c => c.id === ventaDetalle.cliente_id) || null, empresa, false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
                >
                  <Printer size={14} /> Reimprimir ticket
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const resultado = cancelarVenta(confirm.id)
          if (resultado === null) return
          revertirVentaEnCaja(confirm.metodo_pago, confirm.total)
          if (confirm.metodo_pago === 'credito') cancelarCuenta(confirm.id)
          auditar({ accion: 'venta_cancelada', entidad: 'ventas', entidad_id: confirm.id, descripcion: `Venta cancelada: ${confirm.numero_venta} — ${formatCurrency(confirm.total)}`, sesion })
          toast(`Venta ${confirm.numero_venta} cancelada`, 'warning')
        }}
        title="¿Cancelar venta?"
        message={`Se cancelará la venta ${confirm?.numero_venta}. El stock será restituido automáticamente.`}
        confirmText="Cancelar venta"
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
