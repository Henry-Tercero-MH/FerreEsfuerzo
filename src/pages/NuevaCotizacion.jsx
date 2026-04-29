import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, FileText, CheckCircle, UserPlus } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import { formatCurrency } from '../utils/formatters'
import { IMPUESTO_DEFAULT } from '../utils/constants'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import ClienteSelector from '../components/shared/ClienteSelector'

export default function NuevaCotizacion() {
  const { productos, clientes, agregarCliente } = useApp()
  const { crearCotizacion } = useCotizaciones()
  const { sesion } = useAuth()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [notas, setNotas] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', nit: '' })
  const [errCliente, setErrCliente] = useState('')

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return []
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 8)
  }, [productos, busqueda])

  const agregarItem = (producto) => {
    setBusqueda('')
    setItems(prev => {
      const existente = prev.find(i => i.producto_id === producto.id)
      if (existente) {
        return prev.map(i => i.producto_id === producto.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i)
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        precio_unitario: producto.precio_venta,
        cantidad: 1,
        subtotal: producto.precio_venta,
      }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const nueva = Math.max(1, i.cantidad + delta)
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }
    }))
  }

  const setCantidadDirecta = (id, valor) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const nueva = Math.max(1, parseInt(valor) || 1)
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }
    }))
  }

  const cambiarPrecio = (id, precio) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const p = Math.max(parseFloat(precio) || 0.01, 0.01)
      return { ...i, precio_unitario: p, subtotal: i.cantidad * p }
    }))
  }

  const eliminarItem = (id) => setItems(prev => prev.filter(i => i.producto_id !== id))

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
  const descuento = Math.min(Math.max(Number(descuentoGlobal) || 0, 0), subtotal)
  const baseImponible = subtotal - descuento
  const impuesto = baseImponible * IMPUESTO_DEFAULT
  const total = baseImponible + impuesto

  const clienteNombre = clientes.find(c => c.id === clienteId)?.nombre || ''

  const handleCrearCliente = () => {
    if (!nuevoCliente.nombre.trim()) { setErrCliente('El nombre es requerido'); return }
    const nuevo = agregarCliente({ ...nuevoCliente, tipo: 'natural', activo: true })
    if (!nuevo) { setErrCliente('No autorizado para crear clientes'); return }
    setClienteId(nuevo.id)
    setModalCliente(false)
    setNuevoCliente({ nombre: '', telefono: '', nit: '' })
    setErrCliente('')
  }

  const handleConfirmar = async () => {
    if (items.length === 0) return
    if (!clienteId) return
    if (Number(descuentoGlobal) < 0) return
    const hoy = new Date().toISOString().split('T')[0]
    if (fechaVencimiento && fechaVencimiento < hoy) return
    setLoading(true)
    const cot = await crearCotizacion({
      items,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      subtotal,
      descuento,
      impuesto,
      total,
      notas,
      fecha_vencimiento: fechaVencimiento || null,
    })
    if (!cot) { setLoading(false); return }
    auditar({ accion: 'cotizacion_creada', entidad: 'cotizaciones', entidad_id: cot?.id, descripcion: `Cotización ${cot?.numero_cotizacion} — ${formatCurrency(total)}`, detalle: { total, items: items.length, cliente_id: clienteId }, sesion })
    setLoading(false)
    setExito(cot)
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Cotización creada!</h2>
        <p className="text-gray-500">{exito.numero_cotizacion} — Total: {formatCurrency(exito.total)}</p>
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setItems([]); setExito(null) }}>
            Nueva cotización
          </Button>
          <Button variant="primary" onClick={() => navigate('/cotizaciones')}>
            Ver cotizaciones
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Cotización</h1>
          <p className="page-subtitle">Agrega productos y genera la cotización</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/cotizaciones')}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Izquierda — buscador + items */}
        <div className="lg:col-span-2 space-y-4">

          {/* Buscador */}
          <div className="card">
            <p className="label mb-2">Buscar producto</p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre o código del producto..."
                className="input pl-9"
                autoFocus
              />
            </div>
            {productosFiltrados.length > 0 && (
              <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                {productosFiltrados.map(p => (
                  <button key={p.id} onClick={() => agregarItem(p)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.codigo} · Stock: {p.stock}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary-700">{formatCurrency(p.precio_venta)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={16} /> Productos ({items.length})
            </h3>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Agrega productos buscando arriba</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.producto_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-400">{item.codigo}</p>
                    </div>
                    {/* Precio editable — en cotizaciones se puede ajustar */}
                    <input
                      type="number"
                      min="0"
                      value={item.precio_unitario}
                      onChange={e => cambiarPrecio(item.producto_id, e.target.value)}
                      className="input w-24 text-right text-sm py-1"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="btn-icon btn-ghost w-7 h-7"><Minus size={12} /></button>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={e => setCantidadDirecta(item.producto_id, e.target.value)}
                        className="w-12 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-primary-400"
                      />
                      <button onClick={() => cambiarCantidad(item.producto_id, +1)} className="btn-icon btn-ghost w-7 h-7"><Plus size={12} /></button>
                    </div>
                    <p className="w-20 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                    <button onClick={() => eliminarItem(item.producto_id)} className="btn-icon btn-ghost text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derecha — datos + totales */}
        <div className="card h-fit space-y-4 lg:sticky lg:top-24">
          <h3 className="font-semibold text-gray-900">Datos de la cotización</h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="label">Cliente *</p>
              <button
                type="button"
                onClick={() => setModalCliente(true)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <UserPlus size={12} /> Nuevo cliente
              </button>
            </div>
            <ClienteSelector clientes={clientes} value={clienteId} onChange={setClienteId} label={null} showCF={false} />
            {!clienteId && (
              <p className="text-xs text-red-500 mt-1">Selecciona o crea un cliente para continuar</p>
            )}
          </div>

          <div>
            <label className="label">Fecha de vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={e => setFechaVencimiento(e.target.value)}
              className="input"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="label">Descuento global (Q)</label>
            <input
              type="number"
              min="0"
              value={descuentoGlobal}
              onChange={e => setDescuentoGlobal(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Condiciones, vigencia, observaciones..."
            />
          </div>

          {/* Totales */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {descuento > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-{formatCurrency(descuento)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>IVA (12%)</span><span>{formatCurrency(impuesto)}</span></div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full btn-lg"
            disabled={items.length === 0 || !clienteId}
            loading={loading}
            onClick={handleConfirmar}
          >
            Crear cotización
          </Button>
        </div>
      </div>

      {/* Modal nuevo cliente rápido */}
      <Modal
        open={modalCliente}
        onClose={() => { setModalCliente(false); setErrCliente('') }}
        title="Nuevo cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalCliente(false); setErrCliente('') }}>Cancelar</Button>
            <Button variant="primary" onClick={handleCrearCliente}>Crear y seleccionar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre *"
            value={nuevoCliente.nombre}
            onChange={e => { setNuevoCliente(p => ({ ...p, nombre: e.target.value })); setErrCliente('') }}
            error={errCliente}
            placeholder="Nombre completo o razón social"
          />
          <Input
            label="NIT"
            value={nuevoCliente.nit}
            onChange={e => setNuevoCliente(p => ({ ...p, nit: e.target.value }))}
            placeholder="000-0"
          />
          <Input
            label="Teléfono"
            value={nuevoCliente.telefono}
            onChange={e => setNuevoCliente(p => ({ ...p, telefono: e.target.value }))}
            placeholder="Opcional"
          />
        </div>
      </Modal>
    </div>
  )
}
