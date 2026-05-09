import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, FileText, CheckCircle, UserPlus, Barcode, Printer } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useAuth } from '../contexts/AuthContext'
import { useEmpresa } from '../contexts/EmpresaContext'
import { auditar } from '../services/auditoria'
import { formatCurrency } from '../utils/formatters'
import { IMPUESTO_DEFAULT } from '../utils/constants'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import ClienteSelector from '../components/shared/ClienteSelector'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import { imprimirCotizacion } from '../components/ImprimirCotizacion'

export default function NuevaCotizacion() {
  const { productos, clientes, agregarCliente } = useApp()
  const { crearCotizacion } = useCotizaciones()
  const { sesion } = useAuth()
  const { empresa } = useEmpresa()
  const navigate = useNavigate()
  const { toasts, toast, remove } = useToast()

  const inputRef = useRef(null)
  const [busqueda, setBusqueda] = useState('')
  const [scanError, setScanError] = useState(false)
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
    const activos = productos.filter(p => p.activo !== false && p.stock > 0)
    if (!busqueda) return activos.slice(0, 12)
    const q = busqueda.toLowerCase()
    return activos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      String(p.codigo ?? '').toLowerCase().includes(q)
    ).slice(0, 12)
  }, [productos, busqueda])

  const agregarItem = (producto) => {
    setBusqueda('')
    setScanError(false)
    setTimeout(() => inputRef.current?.focus(), 0)
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
  const impuesto = 0
  const total = subtotal - descuento

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
    if (items.length === 0) { toast('Agrega al menos un producto', 'error'); return }
    if (!clienteId) { toast('Selecciona un cliente', 'error'); return }
    if (Number(descuentoGlobal) < 0) { toast('El descuento no puede ser negativo', 'error'); return }
    const hoy = new Date().toISOString().split('T')[0]
    if (fechaVencimiento && fechaVencimiento < hoy) { toast('La fecha de vencimiento no puede estar en el pasado', 'error'); return }
    
    setLoading(true)
    try {
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
      if (!cot) { toast('No autorizado para crear cotizaciones', 'error'); return }
      auditar({ accion: 'cotizacion_creada', entidad: 'cotizaciones', entidad_id: cot?.id, descripcion: `Cotización ${cot?.numero_cotizacion} — ${formatCurrency(total)}`, detalle: { total, items: items.length, cliente_id: clienteId }, sesion })
      toast(`Cotización ${cot?.numero_cotizacion} creada exitosamente`, 'success')
      setExito(cot)
    } catch (err) {
      const mensaje = err.message || 'Error al crear cotización'
      toast(mensaje, 'error')
      console.error('[CotizacionError]', err)
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Cotización creada!</h2>
        <p className="text-gray-500">{exito.numero_cotizacion} — Total: {formatCurrency(exito.total)}</p>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          <button
            onClick={() => imprimirCotizacion(exito, empresa)}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            <Printer size={14} /> Imprimir cotización
          </button>
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
    <div className="flex flex-col h-screen overflow-hidden -m-4 md:-m-6">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setScanError(false) }}
            placeholder="Filtrar o escanear código de producto..."
            className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary-400 transition-colors ${scanError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            autoFocus
          />
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Barcode size={13} /> Escáner listo
        </span>
        <div className="ml-auto flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => navigate('/cotizaciones')}>Cancelar</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tabla de productos */}
        <div className="flex-1 overflow-y-auto bg-white">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-600 w-36">Código</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Descripción</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 w-24">Categoría</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600 w-20">Precio</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600 w-16">Stock</th>
                <th className="w-24 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin productos disponibles</td></tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id} onClick={() => agregarItem(p)}
                    className="border-b border-gray-100 hover:bg-primary-50 transition-colors cursor-pointer">
                    <td className="px-3 py-1.5 font-mono text-gray-500">{p.codigo}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-3 py-1.5 text-gray-500">{p.categoria || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-primary-700">{formatCurrency(p.precio_venta)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`font-semibold px-1.5 py-0.5 rounded-full ${p.stock <= (p.stock_minimo || 5) ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={e => { e.stopPropagation(); agregarItem(p) }}
                        className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-2.5 py-1 rounded-lg transition-colors">
                        <Plus size={11} /> Agregar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Panel derecho */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <FileText size={14} className="text-gray-500" />
            <span className="font-semibold text-gray-700 text-xs">Cotización</span>
            {items.length > 0 && <span className="ml-auto text-xs text-gray-400">{items.length} ítem(s)</span>}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-gray-300 gap-1">
                <FileText size={22} className="opacity-50" />
                <p className="text-xs">Sin productos</p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.producto_id} className="rounded border border-gray-100 px-2 py-1.5 hover:bg-gray-50">
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs font-medium text-gray-900 flex-1 truncate">{item.nombre}</p>
                    <button onClick={() => eliminarItem(item.producto_id)} className="text-gray-300 hover:text-red-500"><Trash2 size={11} /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Precio editable */}
                    <input type="number" min="0" value={item.precio_unitario}
                      onChange={e => cambiarPrecio(item.producto_id, e.target.value)}
                      className="w-16 text-right text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-primary-400" />
                    <span className="text-xs text-gray-400">×</span>
                    <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"><Minus size={9} /></button>
                    <input type="number" min="1" value={item.cantidad}
                      onChange={e => setCantidadDirecta(item.producto_id, e.target.value)}
                      className="w-8 text-center text-xs font-semibold border border-gray-200 rounded focus:outline-none focus:border-primary-400" />
                    <button onClick={() => cambiarCantidad(item.producto_id, +1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"><Plus size={9} /></button>
                    <p className="ml-auto text-xs font-semibold text-gray-900 shrink-0">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totales */}
          <div className="px-3 py-1.5 border-t border-gray-100 space-y-0.5 text-xs">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {descuento > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-{formatCurrency(descuento)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200 mt-1">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Datos cotización */}
          <div className="px-2 py-1.5 border-t border-gray-100 space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-600">Cliente *</p>
                <button onClick={() => setModalCliente(true)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <UserPlus size={11} /> Nuevo
                </button>
              </div>
              <ClienteSelector clientes={clientes} value={clienteId} onChange={setClienteId} label={null} showCF={false} />
              {!clienteId && <p className="text-xs text-red-500 mt-0.5">Requerido</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Vencimiento</p>
              <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)}
                className="input text-xs py-1" min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Descuento (Q)</p>
              <input type="number" min="0" value={descuentoGlobal} onChange={e => setDescuentoGlobal(e.target.value)} className="input text-xs py-1" />
            </div>
            <div>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                className="input resize-none text-xs py-1" placeholder="Notas, condiciones..." />
            </div>
          </div>

          <div className="px-2 pb-2 pt-1 border-t border-gray-200">
            <Button variant="primary" className="w-full" disabled={items.length === 0 || !clienteId} loading={loading} onClick={handleConfirmar}>
              Crear cotización
            </Button>
          </div>
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

        {/* Toasts de notificación */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map(t => (
            <Toast key={t.id} variant={t.variant} onClose={() => remove(t.id)}>
              {t.message}
            </Toast>
          ))}
        </div>
    </div>
  )
}
