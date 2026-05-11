import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, MapPin, Barcode, Printer } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCatalogos } from '../contexts/CatalogosContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useCaja } from '../contexts/CajaContext'
import { useAuth } from '../contexts/AuthContext'
import { useEmpresa } from '../contexts/EmpresaContext'
import { auditar } from '../services/auditoria'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import ClienteSelector from '../components/shared/ClienteSelector'
import { useToast } from '../hooks/useToast'
import { imprimirTicket } from '../components/TicketVenta'
import { useUI } from '../contexts/UIContext'

function ModalExitoVenta({ exito, clienteExito, onNuevaVenta, onVerHistorial }) {
  const { empresa } = useEmpresa()
  const [cuenta, setCuenta] = useState(8)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (exito.es_pedido || pausado) return
    const t = setInterval(() => setCuenta(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [exito.es_pedido, pausado])

  useEffect(() => {
    if (cuenta <= 0 && !pausado) onNuevaVenta()
  }, [cuenta, pausado, onNuevaVenta])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F12') { e.preventDefault(); setPausado(true); imprimirTicket(exito, clienteExito, empresa) }
      if (e.key === 'F1')  { e.preventDefault(); onNuevaVenta() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [exito, clienteExito, empresa, onNuevaVenta])

  const handleImprimir = () => {
    setPausado(true)
    setTimeout(() => imprimirTicket(exito, clienteExito, empresa), 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Banda superior verde */}
        <div className="bg-green-500 px-6 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <CheckCircle size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {exito.es_pedido ? '¡Pedido registrado!' : '¡Venta registrada!'}
            </h2>
            <p className="text-green-100 text-sm">{exito.numero_venta}</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Total */}
          <div className="flex justify-between items-center rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500 font-medium">Total de la venta</span>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(exito.total)}</span>
          </div>

          {/* Recibido / Cambio */}
          {exito.pago_recibido > 0 && (
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-center">
                <p className="text-xs text-blue-500 font-medium mb-0.5">Recibido</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(exito.pago_recibido)}</p>
              </div>
              <div className="flex-1 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-center">
                <p className="text-xs text-green-500 font-medium mb-0.5">Cambio</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(exito.cambio || 0)}</p>
              </div>
            </div>
          )}

          {/* Dirección pedido */}
          {exito.es_pedido && (
            <p className="text-sm text-primary-600 flex items-center gap-1.5 bg-primary-50 rounded-lg px-3 py-2">
              <MapPin size={14} className="shrink-0" /> {exito.direccion_entrega}
            </p>
          )}

          {/* Contador */}
          {!exito.es_pedido && (
            <p className="text-xs text-center text-gray-400">
              {pausado
                ? 'Listo para imprimir — presiona Nueva venta cuando quieras continuar'
                : `Nueva venta automáticamente en ${cuenta}s...`}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-5 flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
          <button
            onClick={handleImprimir}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            <Printer size={14} /> Imprimir <span className="text-gray-400 text-xs">F12</span>
          </button>
          <Button variant="secondary" onClick={onNuevaVenta}>
            Nueva venta <span className="text-gray-400 text-xs ml-1">F1</span>
          </Button>
          <Button variant="primary" onClick={onVerHistorial}>
            {exito.es_pedido ? 'Ver pedidos' : 'Ver ventas'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NuevaVenta() {
  const { productos, clientes, crearVenta } = useApp()
  const { metodos_pago = [] } = useCatalogos()
  const { crearCuenta } = useCuentasPorCobrar()
  const { registrarVentaEnCaja, cajaAbierta } = useCaja()
  const { sesion } = useAuth()
  const { facturaExpandida, setFacturaExpandida } = useUI()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [busqueda, setBusqueda] = useState('')
  const [scanError, setScanError] = useState(false)
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [clienteId, setClienteId] = useState('cf')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [notas, setNotas] = useState('')
  const [esPedido, setEsPedido] = useState(() => searchParams.get('pedido') === '1')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [diasCredito, setDiasCredito] = useState(30)
  const [comprobante, setComprobante] = useState('')
  const [pagoRecibido, setPagoRecibido] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [tipoDescuento, setTipoDescuento] = useState('ninguno')
  const [tabMovil, setTabMovil] = useState('productos') // 'productos' | 'carrito'

  useEffect(() => {
    setFacturaExpandida(true)
    return () => setFacturaExpandida(false)
  }, [])

  const [horaActual, setHoraActual] = useState(() =>
    new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  )
  useEffect(() => {
    const t = setInterval(() =>
      setHoraActual(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    , 1000)
    return () => clearInterval(t)
  }, [])

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
    if (window.innerWidth < 1024) setTabMovil('carrito')
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
  const impuesto = 0
  const total = subtotal - descuento

  const esCredito = metodoPago === 'credito'
  const confirmarDeshabilitado = !cajaAbierta || items.length === 0
    || (esPedido && (clienteId === 'cf' || !direccionEntrega.trim()))
    || (esCredito && clienteId === 'cf')
    || (metodoPago === 'transferencia' && !comprobante.trim())
  const pagoNum = parseFloat(pagoRecibido) || 0
  const cambio  = metodoPago === 'efectivo' && pagoNum >= total ? pagoNum - total : 0

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
    if (metodoPago === 'transferencia' && !comprobante.trim()) { toast('Ingresa el número de comprobante de transferencia', 'error'); return }
    if (Number(descuentoGlobal) < 0) { toast('El descuento no puede ser negativo', 'error'); return }
    if (esCredito && (!diasCredito || Number(diasCredito) < 1)) { toast('Ingresa días de crédito válidos', 'error'); return }
    
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 400))
      const notasFinales = metodoPago === 'transferencia' && comprobante.trim()
        ? `Comprobante: ${comprobante.trim()}${notas.trim() ? ` | ${notas.trim()}` : ''}`
        : notas
      const venta = await crearVenta({
        items, cliente_id: clienteId, metodo_pago: metodoPago,
        subtotal, descuento, impuesto, total, notas: notasFinales,
        es_pedido: esPedido,
        direccion_entrega: esPedido ? direccionEntrega.trim() : '',
        usuario_id: sesion?.id || '',
        usuario_nombre: sesion?.nombre || '',
        ...(metodoPago === 'efectivo' && pagoNum > 0 && {
          pago_recibido: pagoNum,
          cambio: Math.max(0, pagoNum - total),
        }),
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

  const resetVenta = useCallback(() => {
    setItems([])
    setEsPedido(false)
    setDireccionEntrega('')
    setClienteId('cf')
    setMetodoPago('efectivo')
    setDescuentoGlobal(0)
    setTipoDescuento('ninguno')
    setNotas('')
    setComprobante('')
    setPagoRecibido('')
    setExito(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ── Atajos de teclado ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // No activar si el foco está en un input/textarea/select (excepto F2)
      const enInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)

      if (e.key === 'F1') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }

      if (e.key === 'F2') {
        e.preventDefault()
        if (!loading && !confirmarDeshabilitado) handleConfirmar()
      }

      if (e.key === 'F3') {
        e.preventDefault()
        if (items.length > 0) setItems([])
      }

      if (e.key === 'Escape' && !enInput) {
        setBusqueda('')
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, items, confirmarDeshabilitado, handleConfirmar])

  const clienteExito = exito ? (clientes.find(c => c.id === exito.cliente_id) || null) : null

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* ── Barra superior — mismos estilos que Navbar ── */}
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 border-b border-blue-100 shadow-sm shrink-0" style={{ backgroundColor: '#f5f8fe' }}>
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setScanError(false) }}
            onKeyDown={handleBusquedaKeyDown}
            placeholder="Buscar por código o nombre del producto/servicio..."
            className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary-400 transition-colors ${scanError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
            autoFocus
          />
          {scanError && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-medium">No encontrado</span>}
        </div>
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
        >
          <option value="">Categoría</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Barcode size={13} /> Escáner listo
        </span>
        <span className="hidden lg:flex items-center gap-2 text-xs text-gray-400 shrink-0 border-l border-blue-100 pl-3">
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-500 shadow-sm">F1</kbd> Buscar
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-500 shadow-sm">F2</kbd> Cobrar
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-500 shadow-sm">F3</kbd> Limpiar
        </span>
        {!cajaAbierta && (
          <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 shrink-0">
            🔒 Caja cerrada
            {sesion?.rol === 'admin' && <a href="/caja" className="underline ml-1">Abrir caja</a>}
          </span>
        )}
        <div className="hidden lg:block ml-auto text-right shrink-0">
          <p className="text-xs text-gray-400">Cajero: <span className="font-semibold text-gray-700">{sesion?.nombre}</span></p>
        </div>
      </div>

      {/* ── Tabs móvil/tablet (solo < lg) ── */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setTabMovil('productos')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tabMovil === 'productos' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'}`}
        >
          Productos
        </button>
        <button
          onClick={() => setTabMovil('carrito')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${tabMovil === 'carrito' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'}`}
        >
          Carrito
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold">{items.length}</span>
          )}
        </button>
      </div>

      {/* ── Cuerpo principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Tabla de productos — siempre visible en lg, tab en móvil */}
        <div className={`flex-1 flex flex-col overflow-hidden bg-white ${tabMovil === 'carrito' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Contenedor con scroll, thead sticky */}
          <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6">
            {/* Vista tarjetas en móvil */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 py-3">
              {productosFiltradosCat.length === 0 ? (
                <p className="col-span-2 py-10 text-center text-gray-400">Sin productos disponibles</p>
              ) : productosFiltradosCat.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.codigo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-primary-700 font-bold">{formatCurrency(p.precio_venta)}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.stock <= (p.stock_minimo || 5) ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                      {p.ubicacion && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p.ubicacion}</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); agregarItem(p) }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </div>
            {/* Vista tabla en desktop */}
            <table className="hidden lg:table w-full text-xs border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '9%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead className="bg-slate-100 border-b-2 border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Código</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Descripción</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Categoría</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Ubicación</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Precio</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltradosCat.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">Sin productos disponibles</td></tr>
                ) : (
                  productosFiltradosCat.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-primary-50 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-gray-500 truncate">{p.codigo}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-900 truncate">{p.nombre}</td>
                      <td className="px-3 py-1.5 text-gray-500 truncate">{p.categoria || '—'}</td>
                      <td className="px-3 py-1.5">
                        {p.ubicacion
                          ? <span className="inline-flex items-center bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded truncate max-w-full">{p.ubicacion}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-primary-700">{formatCurrency(p.precio_venta)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`font-semibold px-1.5 py-0.5 rounded-full ${
                          p.stock <= (p.stock_minimo || 5) ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>{p.stock}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
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
        </div>

        {/* Panel derecho: factura en tiempo real + cobro — fixed solo en lg+ */}
        <div className={`lg:fixed lg:top-0 lg:right-0 lg:bottom-0 lg:z-20 lg:w-[480px] lg:shadow-2xl lg:border-l lg:border-gray-200 bg-white flex flex-col overflow-hidden ${tabMovil === 'productos' ? 'hidden lg:flex' : 'flex flex-1'}`}>

          {/* ── Header — solo visible en desktop ── */}
          <div className="hidden lg:flex h-16 flex-col justify-center px-3 border-b border-blue-100 shrink-0" style={{ backgroundColor: '#f5f8fe' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingCart size={13} className="text-primary-600" />
                <span className="font-bold text-gray-800 text-xs tracking-wide">COMPROBANTE EN CURSO</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <span>{new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="text-gray-300">|</span>
                <span className="text-primary-600 font-semibold">{horaActual}</span>
              </div>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              Cliente: <span className="font-semibold text-gray-800">
                {clienteId === 'cf' ? 'Consumidor Final' : (clientes.find(c => c.id === clienteId)?.nombre || '—')}
              </span>
            </div>
          </div>

          {/* ── Tabla de ítems ── */}
          <div className="flex-1 overflow-y-auto scrollbar-cart bg-white">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <ShoppingCart size={36} className="opacity-30" />
                <p className="text-sm font-medium text-gray-400">Agrega productos para ver la factura</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '38%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '4%' }}  />
                </colgroup>
                <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left   px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide" style={{fontSize:'10px'}}>Producto</th>
                    <th className="text-center px-1 py-2 font-semibold text-gray-500 uppercase tracking-wide" style={{fontSize:'10px'}}>Cant.</th>
                    <th className="text-right  px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide" style={{fontSize:'10px'}}>P.Unit</th>
                    <th className="text-right  px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide" style={{fontSize:'10px'}}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.producto_id} className={`border-b border-gray-100 hover:bg-primary-50 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-gray-900 leading-tight truncate">{item.nombre}</p>
                        <p className="text-gray-400 font-mono text-xs leading-tight">{item.codigo}</p>
                      </td>
                      <td className="px-1 py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-red-100 hover:text-red-600 shrink-0 transition-colors"><Minus size={8} /></button>
                          <input
                            type="number" min="1" max={item.stock_disponible} inputMode="numeric"
                            value={item.cantidad}
                            onChange={e => setCantidadDirecta(item.producto_id, e.target.value)}
                            className="w-8 text-center text-xs font-bold border border-gray-200 rounded focus:outline-none focus:border-primary-400 py-0.5"
                          />
                          <button onClick={() => cambiarCantidad(item.producto_id, +1)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-green-100 hover:text-green-600 shrink-0 transition-colors"><Plus size={8} /></button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{formatCurrency(item.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums">{formatCurrency(item.subtotal)}</td>
                      <td className="pr-2 text-center">
                        <button onClick={() => eliminarItem(item.producto_id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Sección inferior fija ── */}
          <div className="shrink-0 border-t border-gray-200">

            {/* Descuento */}
            <div className="px-3 py-1.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-1">Descuento</p>
              <div className="flex gap-1">
                {['ninguno', 'porcentaje', 'fijo'].map(t => (
                  <button key={t} onClick={() => { setTipoDescuento(t); setDescuentoGlobal(0) }}
                    className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${tipoDescuento === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {t === 'ninguno' ? 'Ninguno' : t === 'porcentaje' ? '%' : 'Q fijo'}
                  </button>
                ))}
              </div>
              {tipoDescuento !== 'ninguno' && (
                <input type="number" min="0" inputMode="decimal" value={descuentoGlobal}
                  onChange={e => setDescuentoGlobal(e.target.value)}
                  placeholder={tipoDescuento === 'porcentaje' ? '% descuento' : 'Q descuento'}
                  className="input text-xs mt-1 py-1" />
              )}
            </div>

            {/* Subtotal + TOTAL */}
            <div className="px-3 py-1.5 border-b border-gray-100 space-y-0.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Descuento</span><span className="tabular-nums">-{formatCurrency(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
                <span>TOTAL</span><span className="text-primary-700 tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Pago / Cambio */}
            {metodoPago === 'efectivo' && (
              <div className="px-3 py-1.5 border-b border-gray-100 space-y-1">
                <p className="text-xs font-semibold text-gray-600">Pago recibido</p>
                <input
                  type="number" min="0" step="0.01" inputMode="decimal"
                  value={pagoRecibido}
                  onChange={e => setPagoRecibido(e.target.value)}
                  placeholder={`Mín. ${formatCurrency(total)}`}
                  className={`input text-xs py-1 font-semibold ${pagoNum > 0 && pagoNum < total ? 'border-red-400' : pagoNum >= total ? 'border-green-400' : ''}`}
                />
                {pagoNum > 0 && pagoNum < total && (
                  <p className="text-xs text-red-500">⚠ Pago insuficiente — faltan {formatCurrency(total - pagoNum)}</p>
                )}
                {pagoNum >= total && (
                  <div className="flex justify-between items-center rounded-lg bg-green-50 border border-green-200 px-2 py-1.5">
                    <span className="text-xs font-semibold text-green-700">Cambio</span>
                    <span className="text-sm font-bold text-green-700 tabular-nums">{formatCurrency(cambio)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cliente */}
            <div className="px-3 py-1.5 border-b border-gray-100">
              <ClienteSelector clientes={clientes} value={clienteId} onChange={setClienteId} label={null} />
            </div>

            {/* Método de pago */}
            <div className="px-3 py-1.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-1">Método de pago</p>
              <div className="flex gap-1 flex-wrap">
                {metodos_pago.map(m => (
                  <button key={m.value} onClick={() => { setMetodoPago(m.value); if (m.value !== 'transferencia') setComprobante('') }}
                    className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${metodoPago === m.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {metodoPago === 'transferencia' && (
                <div className="mt-1">
                  <input type="text" value={comprobante} onChange={e => setComprobante(e.target.value)}
                    placeholder="N° comprobante (obligatorio)"
                    className={`input text-xs py-1 ${!comprobante.trim() ? 'border-orange-400' : 'border-green-400'}`} />
                  {!comprobante.trim() && <p className="text-xs text-orange-500 mt-0.5">⚠ Requerido para transferencia</p>}
                </div>
              )}
              {esCredito && (
                <div className="mt-1 space-y-0.5">
                  <input type="number" min="1" inputMode="numeric" value={diasCredito}
                    onChange={e => setDiasCredito(e.target.value)}
                    placeholder="Días de crédito" className="input text-xs py-1" />
                  {clienteId === 'cf' && <p className="text-xs text-red-500">⚠ Requiere cliente identificado</p>}
                </div>
              )}
            </div>

            {/* Tipo de cliente / pedido + notas */}
            <div className="px-3 py-1.5 border-b border-gray-100">
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
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={1}
                className="input resize-none text-xs py-1 mt-1" placeholder="Notas opcionales..." />
            </div>

            {/* Botón confirmar */}
            <div className="px-4 py-3">
              <Button variant="success" className="w-full py-2.5 text-sm font-bold"
                disabled={confirmarDeshabilitado} loading={loading} onClick={handleConfirmar}>
                {esPedido ? 'Registrar pedido' : 'Confirmar venta'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal éxito — se muestra encima del layout sin romperlo */}
      {exito && (
        <ModalExitoVenta
          exito={exito}
          clienteExito={clienteExito}
          onNuevaVenta={resetVenta}
          onVerHistorial={() => navigate(exito.es_pedido ? '/pedidos' : '/ventas')}
        />
      )}
    </div>
  )
}
