import { useState, useMemo } from 'react'
import { Plus, Eye, XCircle, ShoppingCart, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { ESTADOS_VENTA, METODOS_PAGO } from '../utils/constants'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import SearchBar from '../components/shared/SearchBar'

export default function Ventas() {
  const { ventas, cancelarVenta, clientes } = useApp()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const termino = useDebounce(busqueda)

  const ventasFiltradas = useMemo(() => ventas.filter(v => {
    const coincide = !termino || v.numero_venta.includes(termino.toUpperCase())
    const estado   = !filtroEstado || v.estado === filtroEstado
    return coincide && estado
  }), [ventas, termino, filtroEstado])

  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.nombre ?? 'Consumidor Final'
  const getMetodoPago = (val) => METODOS_PAGO.find(m => m.value === val)?.label ?? val

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">{ventas.length} ventas registradas</p>
        </div>
        <Link to="/ventas/nueva">
          <Button variant="primary" icon={Plus}>Nueva venta</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por número de venta..." className="flex-1" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input sm:w-44">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_VENTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>N° Venta</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {ventasFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                No hay ventas registradas
              </td></tr>
            ) : ventasFiltradas.map(v => {
              const estado = ESTADOS_VENTA[v.estado]
              return (
                <tr key={v.id}>
                  <td className="font-mono text-xs font-semibold text-primary-700">{v.numero_venta}</td>
                  <td className="text-xs text-gray-500">{formatDateTime(v.fecha)}</td>
                  <td className="text-sm">{getClienteNombre(v.cliente_id)}</td>
                  <td><Badge variant="gray">{getMetodoPago(v.metodo_pago)}</Badge></td>
                  <td className="font-semibold text-gray-900">{formatCurrency(v.total)}</td>
                  <td><Badge variant={estado?.badge?.replace('badge-', '')}>{estado?.label}</Badge></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setVentaDetalle(v)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600" title="Ver detalle"><Eye size={15} /></button>
                      {v.estado !== 'cancelada' && (
                        <button onClick={() => setConfirm(v)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500" title="Cancelar venta"><XCircle size={15} /></button>
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
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="table">
                <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {ventaDetalle.items?.map((item, i) => (
                    <tr key={i}>
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
              <p className="text-gray-500">IVA (12%): <span className="font-medium text-gray-800">{formatCurrency(ventaDetalle.impuesto)}</span></p>
              <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(ventaDetalle.total)}</p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { cancelarVenta(confirm.id); toast(`Venta ${confirm.numero_venta} cancelada`, 'warning') }}
        title="¿Cancelar venta?"
        message={`Se cancelará la venta ${confirm?.numero_venta}. El stock será restituido automáticamente.`}
        confirmText="Cancelar venta"
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
