import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../utils/formatters'
import { METODOS_PAGO, IMPUESTO_DEFAULT } from '../utils/constants'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'

export default function NuevaVenta() {
  const { productos, clientes, crearVenta } = useApp()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState([])
  const [clienteId, setClienteId] = useState('c1')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(null)

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return []
    return productos.filter(p =>
      p.stock > 0 &&
      (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
       p.codigo?.toLowerCase().includes(busqueda.toLowerCase()))
    ).slice(0, 8)
  }, [productos, busqueda])

  const agregarItem = (producto) => {
    setBusqueda('')
    setItems(prev => {
      const existente = prev.find(i => i.producto_id === producto.id)
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev
        return prev.map(i => i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i)
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: producto.precio_venta,
        cantidad: 1,
        subtotal: producto.precio_venta,
        stock_disponible: producto.stock,
      }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const nueva = Math.max(1, Math.min(i.stock_disponible, i.cantidad + delta))
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }
    }))
  }

  const eliminarItem = (id) => setItems(prev => prev.filter(i => i.producto_id !== id))

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
  const descuento = Math.min(Number(descuentoGlobal) || 0, subtotal)
  const baseImponible = subtotal - descuento
  const impuesto = baseImponible * IMPUESTO_DEFAULT
  const total = baseImponible + impuesto

  const handleConfirmar = async () => {
    if (items.length === 0) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const venta = crearVenta({ items, cliente_id: clienteId, metodo_pago: metodoPago, subtotal, descuento, impuesto, total, notas })
    setLoading(false)
    setExito(venta)
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Venta registrada!</h2>
        <p className="text-gray-500">{exito.numero_venta} — Total: {formatCurrency(exito.total)}</p>
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setItems([]); setExito(null) }}>Nueva venta</Button>
          <Button variant="primary" onClick={() => navigate('/ventas')}>Ver ventas</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Venta</h1>
          <p className="page-subtitle">Busca productos y agrega al carrito</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Buscador de productos */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Carrito */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingCart size={16} /> Carrito ({items.length} productos)
            </h3>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Agrega productos buscando arriba</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.producto_id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.precio_unitario)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="btn-icon btn-ghost w-7 h-7"><Minus size={12} /></button>
                      <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
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

        {/* Panel de cobro */}
        <div className="card h-fit space-y-4 sticky top-24">
          <h3 className="font-semibold text-gray-900">Datos de la venta</h3>

          <Select label="Cliente" value={clienteId} onChange={e => setClienteId(e.target.value)}>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>

          <Select label="Método de pago" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
            {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>

          <div>
            <label className="label">Descuento global (Q)</label>
            <input type="number" min="0" value={descuentoGlobal} onChange={e => setDescuentoGlobal(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="input resize-none" placeholder="Opcional..." />
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
            variant="success"
            className="w-full btn-lg"
            disabled={items.length === 0}
            loading={loading}
            onClick={handleConfirmar}
          >
            Confirmar venta
          </Button>
        </div>
      </div>
    </div>
  )
}
