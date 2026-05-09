import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, MapPin, Barcode } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCatalogos } from '../contexts/CatalogosContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useCaja } from '../contexts/CajaContext'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import { formatCurrency } from '../utils/formatters'
import { IMPUESTO_DEFAULT } from '../utils/constants'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import ClienteSelector from '../components/shared/ClienteSelector'
import { useToast } from '../hooks/useToast'
import TicketVenta from '../components/TicketVenta'

export default function NuevaVenta() {
  const { productos, clientes, crearVenta } = useApp()
  const { metodos_pago = [] } = useCatalogos()
  const { crearCuenta } = useCuentasPorCobrar()
  const { registrarVentaEnCaja, cajaAbierta } = useCaja()
  const { sesion } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

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
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [tipoDescuento, setTipoDescuento] = useState('ninguno')

  const productosFiltrados = useMemo(() => {
    const disponibles = productos.filter(p => p.stock > 0)
    if (!busqueda) return disponibles.slice(0, 12)
    return disponibles.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 12)
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
    const exacto = productos.find(p => p.stock > 0 && String(p.codigo ?? '').toLowerCase() === termino.toLowerCase())
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
  const descuento = (() => {
    if (tipoDescuento === 'porcentaje') return Math.min((Number(descuentoGlobal) || 0) / 100 * subtotal, subtotal)
    if (tipoDescuento === 'fijo') return Math.min(Math.max(Number(descuentoGlobal) || 0, 0), subtotal)
    return 0
  })()
  const baseImponible = subtotal - descuento
  const impuesto = baseImponible * IMPUESTO_DEFAULT
  const total = baseImponible + impuesto

  const esCredito = metodoPago === 'credito'

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort()

  const productosFiltradosCat = useMemo(() => {
    const disponibles = productos.filter(p => p.stock > 0)
    return disponibles.filter(p => {
      const codigoStr = p.codigo != null ? String(p.codigo) : ''
      const matchBusq = !busqueda ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        codigoStr.toLowerCase().includes(busqueda.toLowerCase())
      const matchCat = !categoriaFiltro || p.categoria === categoriaFiltro
      return matchBusq && matchCat
    })
  }, [productos, busqueda, categoriaFiltro])

  const handleConfirmar = async () => {
    if (items.length === 0) { toast('Agrega al menos un producto', 'error'); return }
    if (esPedido && clienteId === 'cf') { toast('Selecciona un cliente para pedidos', 'error'); return }
    if (esPedido && !direccionEntrega.trim()) { toast('Ingresa dirección de entrega para pedidos', 'error'); return }
    if (esCredito && clienteId === 'cf') { toast('El consumidor final no puede comprar a crédito', 'error'); return }
    if (Number(descuentoGlobal) < 0) { toast('El descuento no puede ser negativo', 'error'); return }
    if (esCredito && (!diasCredito || Number(diasCredito) < 1)) { toast('Ingresa días de crédito válidos', 'error'); return }
    
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 400))
      const venta = crearVenta({
        items, cliente_id: clienteId, metodo_pago: metodoPago,
        subtotal, descuento, impuesto, total, notas,
        es_pedido: esPedido,
        direccion_entrega: esPedido ? direccionEntrega.trim() : '',
        usuario_id: sesion?.id || '',
        usuario_nombre: sesion?.nombre || '',
      })
      if (!venta) { toast('No autorizado para crear ventas', 'error'); return }
      
      registrarVentaEnCaja(metodoPago, total)
      auditar({
        accion: esPedido ? 'pedido_creado' : 'venta_creada',
        entidad: 'ventas', entidad_id: venta.id,
        descripcion: `${esPedido ? 'Pedido' : 'Venta'} ${venta.numero_venta} — ${formatCurrency(total)} — ${metodoPago}`,
        detalle: { numero: venta.numero_venta, total, items: items.length, cliente_id: clienteId, metodo_pago: metodoPago },
        sesion,
      })
      
      if (esCredito) {
        try {
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
        } catch (errCuenta) {
          console.error('[CuentaPorCobrarError]', errCuenta)
          toast(`${esPedido ? 'Pedido' : 'Venta'} creado pero error al registrar crédito: ${errCuenta.message}`, 'warning')
        }
      }
      
      toast(`${esPedido ? 'Pedido' : 'Venta'} ${venta.numero_venta} creado exitosamente`, 'success')
      setExito(venta)
    } catch (err) {
      const mensaje = err.message || `Error al crear ${esPedido ? 'pedido' : 'venta'}`
      toast(mensaje, 'error')
      console.error('[NuevaVentaError]', err)
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    const clienteExito = clientes.find(c => c.id === exito.cliente_id) || null
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
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          <TicketVenta venta={exito} cliente={clienteExito} />
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
    <div className="flex flex-col h-screen overflow-hidden -m-4 md:-m-6">
      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setScanError(false) }}
              onKeyDown={handleBusquedaKeyDown}
              placeholder="Buscar por código o nombre del producto/servicio..."
              className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary-400 transition-colors ${scanError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              autoFocus
            />
            {scanError && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-medium">No encontrado</span>}
          </div>
          <select
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="">Categoría</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Barcode size={13} /> Escáner listo
          </span>
        </div>
        {!cajaAbierta && (
          <span className="ml-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            🔒 Caja cerrada
            {sesion?.rol === 'admin' && <a href="/caja" className="underline ml-1">Abrir caja</a>}
          </span>
        )}
        <div className="ml-4 text-right shrink-0">
          <p className="text-xs text-gray-400">Cajero: <span className="font-semibold text-gray-700">{sesion?.nombre}</span></p>
        </div>
      </div>

      {/* ── Cuerpo principal ── */}
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
              {productosFiltradosCat.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin productos disponibles</td></tr>
              ) : (
                productosFiltradosCat.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-primary-50 transition-colors cursor-pointer" onClick={() => agregarItem(p)}>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{p.codigo}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-3 py-1.5 text-gray-500">{p.categoria || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-primary-700">{formatCurrency(p.precio_venta)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`font-semibold px-1.5 py-0.5 rounded-full ${
                        p.stock <= (p.stock_minimo || 5) ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); agregarItem(p) }}
                        className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus size={11} /> Agregar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Panel derecho: carrito + cobro */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">

          {/* Encabezado carrito */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <ShoppingCart size={14} className="text-gray-500" />
            <span className="font-semibold text-gray-700 text-xs">Detalle de Factura</span>
            {items.length > 0 && <span className="ml-auto text-xs text-gray-400">{items.length} ítem(s)</span>}
          </div>

          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-gray-300 gap-1">
                <ShoppingCart size={22} className="opacity-50" />
                <p className="text-xs">Carrito vacío</p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.producto_id} className="flex items-center gap-1.5 rounded border border-gray-100 px-2 py-1 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate leading-tight">{item.nombre}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.precio_unitario)} c/u</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"><Minus size={9} /></button>
                    <input
                      type="number" min="1" max={item.stock_disponible}
                      value={item.cantidad}
                      onChange={e => setCantidadDirecta(item.producto_id, e.target.value)}
                      className="w-8 text-center text-xs font-semibold border border-gray-200 rounded focus:outline-none focus:border-primary-400"
                    />
                    <button onClick={() => cambiarCantidad(item.producto_id, +1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"><Plus size={9} /></button>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 w-12 text-right shrink-0">{formatCurrency(item.subtotal)}</p>
                  <button onClick={() => eliminarItem(item.producto_id)} className="text-gray-300 hover:text-red-500"><Trash2 size={11} /></button>
                </div>
              ))
            )}
          </div>

          {/* Descuento */}
          <div className="px-2 py-1.5 border-t border-gray-100">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs font-semibold text-gray-600">Descuento</p>
            </div>
            <div className="flex gap-1">
              {['ninguno', 'porcentaje', 'fijo'].map(t => (
                <button key={t} onClick={() => { setTipoDescuento(t); setDescuentoGlobal(0) }}
                  className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${tipoDescuento === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t === 'ninguno' ? 'Ninguno' : t === 'porcentaje' ? '%' : 'Q fijo'}
                </button>
              ))}
            </div>
            {tipoDescuento !== 'ninguno' && (
              <input type="number" min="0" value={descuentoGlobal}
                onChange={e => setDescuentoGlobal(e.target.value)}
                placeholder={tipoDescuento === 'porcentaje' ? '% descuento' : 'Q descuento'}
                className="input text-xs mt-1 py-1" />
            )}
          </div>

          {/* Totales */}
          <div className="px-3 py-1.5 border-t border-gray-100 space-y-0.5 text-xs">
            <div className="flex justify-between text-gray-500"><span>Bruto</span><span>{formatCurrency(subtotal)}</span></div>
            {descuento > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-{formatCurrency(descuento)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal - descuento)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200 mt-1">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Cliente */}
          <div className="px-2 py-1.5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">Cliente</p>
            <ClienteSelector clientes={clientes} value={clienteId} onChange={setClienteId} />
          </div>

          {/* Método de pago */}
          <div className="px-2 py-1.5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">Método de pago</p>
            <div className="flex gap-1 flex-wrap">
              {metodos_pago.map(m => (
                <button key={m.value} onClick={() => setMetodoPago(m.value)}
                  className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${metodoPago === m.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            {esCredito && (
              <div className="mt-1 space-y-0.5">
                <input type="number" min="1" value={diasCredito} onChange={e => setDiasCredito(e.target.value)}
                  placeholder="Días de crédito" className="input text-xs py-1" />
                {clienteId === 'cf' && <p className="text-xs text-red-500">⚠ Requiere cliente identificado</p>}
              </div>
            )}
          </div>

          {/* Tipo de cliente / pedido */}
          <div className="px-2 py-1.5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">Tipo de cliente</p>
            <div className="flex gap-1">
              <button onClick={() => { setClienteId('cf'); setEsPedido(false) }}
                className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${clienteId === 'cf' && !esPedido ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                C/F
              </button>
              <button onClick={() => setEsPedido(false)}
                className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${clienteId !== 'cf' && !esPedido ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Registrado
              </button>
              <button onClick={() => setEsPedido(true)}
                className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${esPedido ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Pedido
              </button>
            </div>
            {esPedido && (
              <div className="mt-1 space-y-0.5">
                {clienteId === 'cf' && <p className="text-xs text-red-500">⚠ Selecciona un cliente</p>}
                <textarea value={direccionEntrega} onChange={e => setDireccionEntrega(e.target.value)}
                  rows={2} className={`input resize-none text-xs py-1 ${esPedido && !direccionEntrega.trim() ? 'border-red-300' : ''}`}
                  placeholder="Dirección de entrega..." />
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="px-2 py-1 border-t border-gray-100">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={1}
              className="input resize-none text-xs py-1" placeholder="Notas opcionales..." />
          </div>

          {/* Botón confirmar */}
          <div className="px-2 pb-2 pt-1.5 border-t border-gray-200">
            <Button
              variant="success"
              className="w-full"
              disabled={!cajaAbierta || items.length === 0 || (esPedido && (clienteId === 'cf' || !direccionEntrega.trim())) || (esCredito && clienteId === 'cf')}
              loading={loading}
              onClick={handleConfirmar}
            >
              {esPedido ? 'Registrar pedido' : 'Confirmar venta'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
