import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Eye, CheckCircle, XCircle, AlertTriangle, Printer } from 'lucide-react'
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
  const { crearVenta, productos } = useApp()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [stockError, setStockError] = useState('')
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

    // Validar stock antes de convertir
    if (tipo === 'venta' || tipo === 'pedido') {
      const sinStock = (cot.items || []).filter(item => {
        const p = productos.find(p => p.id === item.producto_id)
        return !p || p.stock < item.cantidad
      })
      if (sinStock.length > 0) {
        setStockError(`Stock insuficiente: ${sinStock.map(i => i.nombre).join(', ')}`)
        setConfirm(null)
        return
      }
    }
    setStockError('')

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

  const imprimirCotizacion = (cot) => {
    const { label } = estadoBadge(cot.estado)
    const ventana = window.open('', '_blank', 'width=800,height=600')
    ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${cot.numero_cotizacion}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .empresa h1 { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .empresa p { color: #555; font-size: 12px; }
    .cot-info { text-align: right; }
    .cot-info .num { font-size: 18px; font-weight: 700; color: #111; }
    .cot-info p { font-size: 12px; color: #555; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1d4ed8; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-grid div p:first-child { font-size: 11px; color: #9ca3af; margin-bottom: 2px; }
    .info-grid div p:last-child { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead { background: #f3f4f6; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; }
    th:not(:first-child) { text-align: right; }
    td { padding: 8px 10px; border-top: 1px solid #f3f4f6; font-size: 13px; }
    td:not(:first-child) { text-align: right; }
    .totales { margin-left: auto; width: 260px; background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
    .totales .row { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 3px 0; }
    .totales .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: #111; border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; }
    .descuento { color: #ef4444; }
    .notas-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #555; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="empresa">
      <h1>Ferretería El Esfuerzo</h1>
      <p>Ferretería y suministros industriales</p>
    </div>
    <div class="cot-info">
      <p class="num">${cot.numero_cotizacion}</p>
      <p>Fecha: ${formatDate(cot.fecha)}</p>
      ${cot.fecha_vencimiento ? `<p>Vence: ${formatDate(cot.fecha_vencimiento)}</p>` : ''}
      <p style="margin-top:6px"><span class="badge">${label}</span></p>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div><p>Cliente</p><p>${cot.cliente_nombre || 'Sin cliente'}</p></div>
    <div><p>Fecha emisión</p><p>${formatDate(cot.fecha)}</p></div>
    <div><p>Vencimiento</p><p>${cot.fecha_vencimiento ? formatDate(cot.fecha_vencimiento) : '—'}</p></div>
  </div>
  <p class="section-title">Productos</p>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio unitario</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${(cot.items || []).map(item => `
      <tr>
        <td>${item.nombre}</td>
        <td>${item.cantidad}</td>
        <td>${formatCurrency(item.precio_unitario)}</td>
        <td>${formatCurrency(item.subtotal)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totales">
    <div class="row"><span>Subtotal</span><span>${formatCurrency(cot.subtotal)}</span></div>
    ${cot.descuento > 0 ? `<div class="row descuento"><span>Descuento</span><span>-${formatCurrency(cot.descuento)}</span></div>` : ''}
    <div class="row"><span>IVA (12%)</span><span>${formatCurrency(cot.impuesto)}</span></div>
    <div class="total-row"><span>Total</span><span>${formatCurrency(cot.total)}</span></div>
  </div>
  ${cot.notas ? `<div style="margin-top:20px"><p class="section-title">Notas</p><div class="notas-box">${cot.notas}</div></div>` : ''}
  <div class="footer">
    <p>Documento generado por Ferretería El Esfuerzo &mdash; ${formatDate(new Date().toISOString())}</p>
    <p>Este documento es una cotización y no constituye una factura.</p>
  </div>
</body>
</html>`)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print() }, 400)
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

      {stockError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span><span className="font-semibold">Stock insuficiente:</span> {stockError.replace('Stock insuficiente: ', '')}</span>
          <button onClick={() => setStockError('')} className="text-red-400 hover:text-red-600 font-bold ml-4">✕</button>
        </div>
      )}

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
                        <button
                          onClick={() => imprimirCotizacion(c)}
                          className="btn-icon btn-ghost text-gray-400 hover:text-blue-600"
                          title="Imprimir cotización"
                        >
                          <Printer size={15} />
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
            <div className="flex flex-wrap gap-2 w-full justify-between">
              <Button variant="ghost" icon={Printer} onClick={() => imprimirCotizacion(detalle)}>Imprimir</Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setConfirm({ tipo: 'cancelar', cot: detalle })}>Cancelar cot.</Button>
                <Button variant="secondary" onClick={() => setConfirm({ tipo: 'venta', cot: detalle })}>Venta directa</Button>
                <Button variant="primary" onClick={() => setConfirm({ tipo: 'pedido', cot: detalle })}>Aprobar como Pedido</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="ghost" icon={Printer} onClick={() => imprimirCotizacion(detalle)}>Imprimir</Button>
              <Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button>
            </div>
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
