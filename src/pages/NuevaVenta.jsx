import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, MapPin, Barcode } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCatalogos } from '../contexts/CatalogosContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useCaja } from '../contexts/CajaContext'
import { formatCurrency } from '../utils/formatters'
import { IMPUESTO_DEFAULT } from '../utils/constants'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import ClienteSelector from '../components/shared/ClienteSelector'

export default function NuevaVenta() {
  const { productos, clientes, crearVenta } = useApp()
  const { metodos_pago = [] } = useCatalogos()
  const { crearCuenta } = useCuentasPorCobrar()
  const { registrarVentaEnCaja } = useCaja()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [scanError, setScanError] = useState(false)
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [clienteId, setClienteId] = useState('cf')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [notas, setNotas] = useState('')
  const [esPedido, setEsPedido] = useState(false)
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [diasCredito, setDiasCredito] = useState(30)
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

  const agregarItem = useCallback((producto) => {
    setBusqueda('')
    setTimeout(() => inputRef.current?.focus(), 0)
    setItems(prev => {
      const existente = prev.find(i => i.producto_id === producto.id)
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev
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
        stock_disponible: producto.stock,
      }]
    })
  }, [])

  const handleBusquedaKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const termino = busqueda.trim()
    if (!termino) return
    // Buscar coincidencia exacta por código primero
    const exacto = productos.find(p => p.stock > 0 && p.codigo?.toLowerCase() === termino.toLowerCase())
    if (exacto) {
      agregarItem(exacto)
      setScanError(false)
      return
    }
    // Si hay exactamente 1 resultado en la lista filtrada, agregar directo
    if (productosFiltrados.length === 1) {
      agregarItem(productosFiltrados[0])
      setScanError(false)
      return
    }
    // Sin resultados — feedback visual
    if (productosFiltrados.length === 0) {
      setScanError(true)
      setTimeout(() => setScanError(false), 1500)
    }
    // Si hay más de 1, la lista ya está visible para elegir
  }, [busqueda, productos, productosFiltrados, agregarItem])

  const cambiarCantidad = (id, delta) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const nueva = Math.max(1, Math.min(i.stock_disponible, i.cantidad + delta))
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }
    }))
  }

  const setCantidadDirecta = (id, valor) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== id) return i
      const nueva = Math.max(1, Math.min(i.stock_disponible, parseInt(valor) || 1))
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }
    }))
  }

  const eliminarItem = (id) => setItems(prev => prev.filter(i => i.producto_id !== id))

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
  const descuento = Math.min(Math.max(Number(descuentoGlobal) || 0, 0), subtotal)
  const baseImponible = subtotal - descuento
  const impuesto = baseImponible * IMPUESTO_DEFAULT
  const total = baseImponible + impuesto

  const esCredito = metodoPago === 'credito'

  const handleConfirmar = async () => {
    if (items.length === 0) return
    if (esPedido && clienteId === 'cf') return
    if (esPedido && !direccionEntrega.trim()) return
    if (esCredito && clienteId === 'cf') return
    if (Number(descuentoGlobal) < 0) return
    if (esCredito && (!diasCredito || Number(diasCredito) < 1)) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const venta = crearVenta({
      items, cliente_id: clienteId, metodo_pago: metodoPago,
      subtotal, descuento, impuesto, total, notas,
      es_pedido: esPedido,
      direccion_entrega: esPedido ? direccionEntrega.trim() : '',
    })
    registrarVentaEnCaja(metodoPago, total)
    if (esCredito) {
      const fechaVenc = new Date()
      fechaVenc.setDate(fechaVenc.getDate() + Number(diasCredito))
      const clienteNombre = clientes.find(c => c.id === clienteId)?.nombre || ''
      await crearCuenta({
        numero_documento: venta.numero_venta,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        monto_original: total,
        fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
        referencia_venta: venta.id,
      })
    }
    setLoading(false)
    setExito(venta)
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {exito.es_pedido ? '¡Pedido registrado!' : '¡Venta registrada!'}
        </h2>
        <p className="text-gray-500">{exito.numero_venta} — Total: {formatCurrency(exito.total)}</p>
        {exito.es_pedido && (
          <p className="text-sm text-primary-600 flex items-center gap-1">
            <MapPin size={14} /> {exito.direccion_entrega}
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setItems([]); setEsPedido(false); setDireccionEntrega(''); setExito(null) }}>
            Nueva venta
          </Button>
          {exito.es_pedido
            ? <Button variant="primary" onClick={() => navigate('/pedidos')}>Ver pedidos</Button>
            : <Button variant="primary" onClick={() => navigate('/ventas')}>Ver ventas</Button>
          }
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
            <div className="flex items-center justify-between mb-2">
              <p className="label">Buscar producto</p>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Barcode size={13} /> Escáner listo
              </span>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setScanError(false) }}
                onKeyDown={handleBusquedaKeyDown}
                placeholder="Nombre, código o escanea código de barras..."
                className={`input pl-9 transition-colors ${scanError ? 'border-red-400 bg-red-50 placeholder-red-300' : ''}`}
                autoFocus
              />
              {scanError && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-medium">
                  No encontrado
                </span>
              )}
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
                      <input
                        type="number"
                        min="1"
                        max={item.stock_disponible}
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

        {/* Panel de cobro */}
        <div className="card h-fit space-y-4 sticky top-24">
          <h3 className="font-semibold text-gray-900">Datos de la venta</h3>

          <ClienteSelector clientes={clientes} value={clienteId} onChange={setClienteId} />

          <Select label="Método de pago" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
            {metodos_pago.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>

          {esCredito && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700">Venta a crédito</p>
              <div>
                <label className="label">Días de crédito</label>
                <input
                  type="number"
                  min="1"
                  value={diasCredito}
                  onChange={e => setDiasCredito(e.target.value)}
                  className="input"
                />
              </div>
              {clienteId === 'cf' && (
                <p className="text-xs text-red-500">⚠ Crédito requiere un cliente identificado</p>
              )}
            </div>
          )}

          <div>
            <label className="label">Descuento global (Q)</label>
            <input type="number" min="0" value={descuentoGlobal} onChange={e => setDescuentoGlobal(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="input resize-none" placeholder="Opcional..." />
          </div>

          {/* Toggle pedido */}
          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setEsPedido(v => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${esPedido ? 'bg-primary-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${esPedido ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Es un pedido</p>
                <p className="text-xs text-gray-400">Requiere preparación y envío</p>
              </div>
            </label>
            {esPedido && clienteId === 'cf' && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                ⚠ Un pedido requiere un cliente identificado, no Consumidor Final.
              </p>
            )}
            {esPedido && (
              <div>
                <label className="label flex items-center gap-1">
                  <MapPin size={12} /> Dirección de entrega *
                </label>
                <textarea
                  value={direccionEntrega}
                  onChange={e => setDireccionEntrega(e.target.value)}
                  rows={2}
                  className={`input resize-none ${esPedido && !direccionEntrega.trim() ? 'border-red-300' : ''}`}
                  placeholder="Zona, calle, número de casa..."
                />
              </div>
            )}
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
            disabled={items.length === 0 || (esPedido && (clienteId === 'cf' || !direccionEntrega.trim())) || (esCredito && clienteId === 'cf')}
            loading={loading}
            onClick={handleConfirmar}
          >
            {esPedido ? 'Registrar pedido' : 'Confirmar venta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
