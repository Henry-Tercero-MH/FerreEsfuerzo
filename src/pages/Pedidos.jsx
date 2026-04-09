import { useState, useMemo } from 'react'
import { MapPin, ChevronRight, Printer, Package } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import { ESTADOS_DESPACHO } from '../utils/constants'
import { formatDateTime, formatCurrency } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import BoletaDespacho from '../components/BoletaDespacho'

const TABS = [
  { key: 'todos',          label: 'Todos' },
  { key: 'pendiente',      label: 'Pendiente' },
  { key: 'en_preparacion', label: 'En preparación' },
  { key: 'listo',          label: 'Listo' },
  { key: 'entregado',      label: 'Entregado' },
]

const BADGE_MAP = {
  pendiente:      'yellow',
  en_preparacion: 'blue',
  listo:          'purple',
  entregado:      'green',
}

export default function Pedidos() {
  const { ventas, clientes, actualizarDespacho } = useApp()
  const { sesion } = useAuth()
  const [tab, setTab] = useState('todos')
  const [boleta, setBoleta] = useState(null)

  const pedidos = useMemo(() => {
    const base = ventas.filter(v => v.es_pedido)
    if (tab === 'todos') return base
    return base.filter(v => v.estado_despacho === tab)
  }, [ventas, tab])

  const conteo = useMemo(() => {
    const base = ventas.filter(v => v.es_pedido)
    return {
      todos:          base.length,
      pendiente:      base.filter(v => v.estado_despacho === 'pendiente').length,
      en_preparacion: base.filter(v => v.estado_despacho === 'en_preparacion').length,
      listo:          base.filter(v => v.estado_despacho === 'listo').length,
      entregado:      base.filter(v => v.estado_despacho === 'entregado').length,
    }
  }, [ventas])

  const avanzarEstado = (pedido) => {
    const siguiente = ESTADOS_DESPACHO[pedido.estado_despacho]?.next
    if (!siguiente) return
    actualizarDespacho(pedido.id, { estado_despacho: siguiente })
    auditar({ accion: 'despacho_actualizado', entidad: 'pedidos', entidad_id: pedido.id, descripcion: `Pedido ${pedido.numero_venta} → ${ESTADOS_DESPACHO[siguiente]?.label || siguiente}`, detalle: { estado_anterior: pedido.estado_despacho, estado_nuevo: siguiente }, sesion })
  }

  const getNombreCliente = (id) =>
    clientes.find(c => c.id === id)?.nombre ?? 'Cliente eliminado'

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">{conteo.todos} pedidos · {conteo.pendiente} pendientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap rounded-xl bg-gray-100 p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {conteo[key] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                tab === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {conteo[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {pedidos.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-3 text-center">
          <Package size={40} className="text-gray-200" />
          <p className="text-gray-400 text-sm">No hay pedidos en este estado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(pedido => {
            const estado = ESTADOS_DESPACHO[pedido.estado_despacho]
            const siguiente = estado?.next ? ESTADOS_DESPACHO[estado.next]?.label : null

            return (
              <div key={pedido.id} className="card space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm font-semibold text-gray-900">{pedido.numero_venta}</span>
                      <Badge variant={BADGE_MAP[pedido.estado_despacho]}>{estado?.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(pedido.fecha)}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(pedido.total)}</p>
                </div>

                {/* Cliente y dirección */}
                <div className="rounded-lg bg-gray-50 px-3 py-2 space-y-1">
                  <p className="text-sm font-medium text-gray-800">{getNombreCliente(pedido.cliente_id)}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={12} />{pedido.direccion_entrega}
                  </p>
                </div>

                {/* Items */}
                <ul className="space-y-1">
                  {pedido.items.map((item, i) => (
                    <li key={i} className="flex justify-between text-sm text-gray-700">
                      <span>{item.cantidad}× {item.nombre}</span>
                      <span className="text-gray-500">{formatCurrency(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                {/* Acciones */}
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <Button
                    variant="secondary"
                    icon={Printer}
                    onClick={() => setBoleta(pedido)}
                  >
                    Boleta
                  </Button>
                  {siguiente && (
                    <Button
                      variant="primary"
                      onClick={() => avanzarEstado(pedido)}
                    >
                      Marcar como {siguiente} <ChevronRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal boleta */}
      {boleta && (
        <BoletaDespacho
          pedido={boleta}
          cliente={clientes.find(c => c.id === boleta.cliente_id)}
          onClose={() => setBoleta(null)}
        />
      )}
    </div>
  )
}
