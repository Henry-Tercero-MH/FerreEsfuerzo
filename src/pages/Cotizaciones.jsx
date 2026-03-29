import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Eye, CheckCircle, XCircle } from 'lucide-react'
import { useCotizaciones } from '../contexts/CotizacionesContext'

import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/shared/EmptyState'
import Modal from '../components/ui/Modal'

export default function Cotizaciones() {
  const { cotizaciones, cambiarEstado } = useCotizaciones()

  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [detalle, setDetalle] = useState(null)

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
      CONVERTIDA: { label: 'Convertida', variant: 'blue' },
      VENCIDA:    { label: 'Vencida',    variant: 'yellow' },
      CANCELADA:  { label: 'Cancelada',  variant: 'red' },
    }
    return map[estado] || { label: estado, variant: 'gray' }
  }

  const handleConvertir = (id) => {
    if (confirm('¿Convertir esta cotización en venta?')) {
      cambiarEstado(id, 'CONVERTIDA')
      if (detalle?.id === id) setDetalle(prev => ({ ...prev, estado: 'CONVERTIDA' }))
    }
  }

  const handleCancelar = (id) => {
    if (confirm('¿Cancelar esta cotización?')) {
      cambiarEstado(id, 'CANCELADA')
      if (detalle?.id === id) setDetalle(prev => ({ ...prev, estado: 'CANCELADA' }))
    }
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
                    <td>
                      <Badge variant={variant}>{label}</Badge>
                    </td>
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
                              onClick={() => handleConvertir(c.id)}
                              className="btn-icon btn-ghost text-gray-400 hover:text-green-600"
                              title="Convertir a venta"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleCancelar(c.id)}
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
            <div className="flex gap-2 w-full justify-end">
              <Button variant="ghost" onClick={() => handleCancelar(detalle.id)}>Cancelar cotización</Button>
              <Button variant="primary" onClick={() => handleConvertir(detalle.id)}>Convertir a venta</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button>
          )
        }
      >
        {detalle && (
          <div className="space-y-4">
            {/* Encabezado */}
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

            {/* Items */}
            {detalle.items && detalle.items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Productos</p>
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

            {/* Totales */}
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

            {/* Notas */}
            {detalle.notas && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detalle.notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
