import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/shared/EmptyState'
import Modal from '../components/ui/Modal'

export default function Cotizaciones() {
  const { cotizaciones, cambiarEstado } = useCotizaciones()
  const { crearVenta } = useApp()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [detalle, setDetalle] = useState(null)
  // confirm: { tipo: 'pedido'|'venta'|'cancelar', cot }
  const [confirm, setConfirm] = useState(null)

  const termino = useDebounce(busqueda)

  const cotizacionesFiltradas = useMemo(() => {
    return cotizaciones.filter(c => {
      const coincideBusqueda = !termino ||
        c.numero_cotizacion?.toLowerCase().includes(termino.toLowerCase()) ||
        c.cliente_nombre?.toLowerCase().includes(termino.toLowerCase())
      const coincideEstado = !filtroEstado || c.estado === filtroEstado
      return coincideBusqueda && coincideEstado
    })
  }, [cotizaciones, termino, filtroEstado])

  const estadoBadge = (estado) => {
    const map = {
      VIGENTE:    { label: 'Vigente',    variant: 'green' },
      PEDIDO:     { label: 'Pedido',     variant: 'blue' },
      CONVERTIDA: { label: 'Convertida', variant: 'purple' },
      VENCIDA:    { label: 'Vencida',    variant: 'yellow' },
      CANCELADA:  { label: 'Cancelada',  variant: 'red' },
    }
    return map[estado] || { label: estado, variant: 'gray' }
  }

  // Ejecuta la acción confirmada
  const ejecutarConfirm = () => {
    if (!confirm) return
    const { tipo, cot } = confirm
    if (tipo === 'pedido') {
      crearVenta({
        cliente_id: cot.cliente_id,
        cliente_nombre: cot.cliente_nombre,
        items: cot.items || [],
        subtotal: cot.subtotal,
        descuento: cot.descuento || 0,
        impuesto: cot.impuesto,
        total: cot.total,
        metodo_pago: 'credito',
        notas: cot.notas || '',
        es_pedido: true,
        direccion_entrega: '',
        notas_despacho: `Generado desde cotización ${cot.numero_cotizacion}`,
        cotizacion_id: cot.id,
      })
      cambiarEstado(cot.id, 'PEDIDO')
      if (detalle?.id === cot.id) setDetalle(prev => ({ ...prev, estado: 'PEDIDO' }))
    } else if (tipo === 'venta') {
      crearVenta({
        cliente_id: cot.cliente_id,
        cliente_nombre: cot.cliente_nombre,
        items: cot.items || [],
        subtotal: cot.subtotal,
        descuento: cot.descuento || 0,
        impuesto: cot.impuesto,
        total: cot.total,
        metodo_pago: 'efectivo',
        notas: cot.notas || '',
        cotizacion_id: cot.id,
      })
      cambiarEstado(cot.id, 'CONVERTIDA')
      if (detalle?.id === cot.id) setDetalle(prev => ({ ...prev, estado: 'CONVERTIDA' }))
    } else if (tipo === 'cancelar') {
      cambiarEstado(cot.id, 'CANCELADA')
      if (detalle?.id === cot.id) setDetalle(prev => ({ ...prev, estado: 'CANCELADA' }))
    }
    setConfirm(null)
  }

  const CONFIRM_CONFIG = {
    pedido: {
      titulo: 'Aprobar como Pedido',
      mensaje: (cot) => `Se creará un pedido para ${cot.cliente_nombre} con ${(cot.items||[]).length} producto(s) por ${formatCurrency(cot.total)}. El bodeguero podrá verlo en Pedidos para preparar el despacho.`,
      boton: 'Aprobar como Pedido',
      variante: 'primary',
    },
    venta: {
      titulo: 'Convertir a Venta',
      mensaje: (cot) => `Se registrará una venta directa para ${cot.cliente_nombre} por ${formatCurrency(cot.total)}. La cotización quedará como Convertida.`,
      boton: 'Convertir a Venta',
      variante: 'primary',
    },
    cancelar: {
      titulo: 'Cancelar Cotización',
      mensaje: (cot) => `¿Estás seguro de cancelar la cotización ${cot.numero_cotizacion}? Esta acción no se puede deshacer.`,
      boton: 'Cancelar cotización',
      variante: 'danger',
    },
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle">{cotizaciones.length} cotizaciones registradas</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/cotizaciones/nueva')}>
          Nueva cotización
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por número o cliente..."
          className="flex-1"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="input sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="VIGENTE">Vigente</option>
          <option value="PEDIDO">Pedido</option>
          <option value="CONVERTIDA">Convertida</option>
          <option value="VENCIDA">Vencida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {cotizacionesFiltradas.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay cotizaciones"
          description={busqueda || filtroEstado ? 'Intenta con otros filtros' : 'Crea tu primera cotización'}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>N° Cotización</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cotizacionesFiltradas.map(c => {
                const { label, variant } = estadoBadge(c.estado)
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-gray-900">{c.numero_cotizacion}</td>
                    <td className="font-medium">{c.cliente_nombre || 'Sin cliente'}</td>
                    <td className="text-sm text-gray-500">{formatDate(c.fecha)}</td>
                    <td className="text-sm text-gray-500">
                      {c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}
                    </td>
                    <td className="font-semibold">{formatCurrency(c.total)}</td>
                    <td><Badge variant={variant}>{label}</Badge></td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setDetalle(c)}
                          className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </button>
                        {c.estado === 'VIGENTE' && (
                          <>
                            <button
                              onClick={() => setConfirm({ tipo: 'pedido', cot: c })}
                              className="btn-icon btn-ghost text-gray-400 hover:text-green-600"
                              title="Aprobar como pedido"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => setConfirm({ tipo: 'cancelar', cot: c })}
                              className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
                              title="Cancelar cotización"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle?.numero_cotizacion || 'Detalle de cotización'}
        size="lg"
        footer={
          detalle?.estado === 'VIGENTE' ? (
            <div className="flex flex-wrap gap-2 w-full justify-end">
              <Button variant="ghost" onClick={() => setConfirm({ tipo: 'cancelar', cot: detalle })}>Cancelar cot.</Button>
              <Button variant="secondary" onClick={() => setConfirm({ tipo: 'venta', cot: detalle })}>Venta directa</Button>
              <Button variant="primary" onClick={() => setConfirm({ tipo: 'pedido', cot: detalle })}>Aprobar como Pedido</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button>
          )
        }
      >
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-gray-400">Cliente</p>
                <p className="font-medium text-gray-900">{detalle.cliente_nombre || 'Sin cliente'}</p>
              </div>
              <div>
                <p className="text-gray-400">Fecha</p>
                <p className="font-medium text-gray-900">{formatDate(detalle.fecha)}</p>
              </div>
              <div>
                <p className="text-gray-400">Vencimiento</p>
                <p className="font-medium text-gray-900">
                  {detalle.fecha_vencimiento ? formatDate(detalle.fecha_vencimiento) : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Estado</p>
                <Badge variant={estadoBadge(detalle.estado).variant}>
                  {estadoBadge(detalle.estado).label}
                </Badge>
              </div>
            </div>

            {detalle.items && detalle.items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Productos ({detalle.items.length})
                </p>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-900">{item.nombre}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.precio_unitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-gray-50 p-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(detalle.subtotal)}</span>
              </div>
              {detalle.descuento > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Descuento</span><span>-{formatCurrency(detalle.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>IVA (12%)</span><span>{formatCurrency(detalle.impuesto)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total</span><span>{formatCurrency(detalle.total)}</span>
              </div>
            </div>

            {detalle.notas && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detalle.notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal confirmación */}
      {confirm && (() => {
        const cfg = CONFIRM_CONFIG[confirm.tipo]
        return (
          <Modal
            open
            onClose={() => setConfirm(null)}
            title={cfg.titulo}
            size="sm"
            footer={
              <div className="flex gap-2 w-full justify-end">
                <Button variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button>
                <Button
                  variant={cfg.variante === 'danger' ? 'danger' : 'primary'}
                  onClick={ejecutarConfirm}
                >
                  {cfg.boton}
                </Button>
              </div>
            }
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50">
                <AlertTriangle size={20} className="text-yellow-500" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {cfg.mensaje(confirm.cot)}
              </p>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
