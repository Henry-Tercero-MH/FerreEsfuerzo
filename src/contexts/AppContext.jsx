import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { db } from '../services/db'
import { shortId, generateNumeroVenta, generateCodigoProducto } from '../utils/formatters'

const AppContext = createContext(null)

// ── Datos iniciales ───────────────────────────────────────────────────────────
// Vacíos — los datos reales vienen de Google Sheets al iniciar.
// Solo CLIENTES_SEED tiene el CF que se necesita para facturar sin internet.

const PRODUCTOS_SEED   = []
const VENTAS_SEED      = []
const MOVIMIENTOS_SEED = []
const CLIENTES_SEED    = [
  { id: 'cf', nombre: 'Consumidor Final', telefono: '', email: '', nit: 'CF', tipo: 'natural', activo: true, creado_en: new Date().toISOString() },
]

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [productos, setProductos]           = useLocalStorage('ferreapp_productos', PRODUCTOS_SEED)
  const [ventas, setVentas]                 = useLocalStorage('ferreapp_ventas', VENTAS_SEED)
  const [clientes, setClientes]             = useLocalStorage('ferreapp_clientes', CLIENTES_SEED)
  const [movimientos, setMovimientos]       = useLocalStorage('ferreapp_movimientos', MOVIMIENTOS_SEED)

  const [loadingApp, setLoadingApp] = useState(true)

  // Al iniciar la app: cargar desde Google Sheets y actualizar el cache
  useEffect(() => {
    Promise.allSettled([
      db.forceRefresh('productos').then(data => { if (data.length) setProductos(data) }),
      Promise.all([
        db.forceRefresh('ventas'),
        db.forceRefresh('ventaItems'),
      ]).then(([ventas, items]) => {
        if (ventas.length) {
          setVentas(ventas.map(v => ({
            ...v,
            items: items.filter(i => String(i.venta_id) === String(v.id)),
          })))
        }
      }),
      db.forceRefresh('clientes').then(data => { if (data.length) setClientes(data) }),
      db.forceRefresh('movimientos').then(data => { if (data.length) setMovimientos(data) }),
    ]).finally(() => setLoadingApp(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PRODUCTOS ──────────────────────────────────────────────────────────────
  const agregarProducto = useCallback((data) => {
    const nuevo = {
      ...data,
      id: `p-${shortId()}`,
      codigo: data.codigo || generateCodigoProducto(),
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setProductos(prev => [...prev, nuevo])
    db.insert('productos', nuevo)
    return nuevo
  }, [setProductos])

  const editarProducto = useCallback((id, data) => {
    const cambios = { ...data, actualizado_en: new Date().toISOString() }
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p))
    db.update('productos', id, cambios)
  }, [setProductos])

  const eliminarProducto = useCallback((id) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    db.remove('productos', id)
  }, [setProductos])

  const ajustarStock = useCallback((productoId, cantidad, tipo, motivo = '', referencia = '') => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p
      const delta = tipo === 'entrada' ? cantidad : -cantidad
      const actualizado = { ...p, stock: Math.max(0, p.stock + delta) }
      db.update('productos', productoId, { stock: actualizado.stock })
      return actualizado
    }))
    const mov = {
      id: `mov-${shortId()}`,
      producto_id: productoId,
      tipo,
      cantidad,
      motivo,
      referencia,
      fecha: new Date().toISOString(),
    }
    setMovimientos(prev => [mov, ...prev])
    db.insert('movimientos', mov)
  }, [setProductos, setMovimientos])

  // ── VENTAS ─────────────────────────────────────────────────────────────────
  const crearVenta = useCallback((data) => {
    const nums = ventas.map(v => parseInt(v.numero_venta?.replace('VTA-', '') || '0')).filter(n => !isNaN(n))
    const numero = generateNumeroVenta((nums.length ? Math.max(...nums) : 0) + 1)
    const esPedido = !!data.es_pedido
    const nueva = {
      ...data,
      id: `v-${shortId()}`,
      numero_venta: numero,
      fecha: new Date().toISOString(),
      estado: 'completada',
      // campos de despacho — solo presentes si es pedido
      ...(esPedido && {
        es_pedido: true,
        estado_despacho: 'pendiente',
        direccion_entrega: data.direccion_entrega || '',
        notas_despacho: data.notas_despacho || '',
      }),
    }
    setVentas(prev => [nueva, ...prev])
    db.insert('ventas', nueva)
    if (esPedido) {
      db.insert('pedidos', {
        id: nueva.id,
        numero_venta: nueva.numero_venta,
        cliente_id: nueva.cliente_id,
        cliente_nombre: nueva.cliente_nombre || '',
        fecha: nueva.fecha,
        total: nueva.total,
        estado_despacho: 'pendiente',
        direccion_entrega: nueva.direccion_entrega || '',
        notas: nueva.notas || '',
        metodo_pago: nueva.metodo_pago || '',
      })
    }
    nueva.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'salida', esPedido ? 'pedido' : 'venta', numero)
    })
    return nueva
  }, [ventas, setVentas, ajustarStock])

  const cancelarVenta = useCallback((id) => {
    const venta = ventas.find(v => v.id === id)
    if (!venta || venta.estado === 'cancelada') return
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'cancelada' } : v))
    db.update('ventas', id, { estado: 'cancelada' })
    venta.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'entrada', 'cancelacion', venta.numero_venta)
    })
  }, [ventas, setVentas, ajustarStock])

  const actualizarDespacho = useCallback((id, updates) => {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    db.update('ventas', id, updates)
    db.update('pedidos', id, updates)
  }, [setVentas])

  // ── CLIENTES ───────────────────────────────────────────────────────────────
  const agregarCliente = useCallback((data) => {
    const nuevo = {
      ...data,
      id: `c-${shortId()}`,
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setClientes(prev => [...prev, nuevo])
    db.insert('clientes', nuevo)
    return nuevo
  }, [setClientes])

  const editarCliente = useCallback((id, data) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    db.update('clientes', id, data)
  }, [setClientes])

  const eliminarCliente = useCallback((id) => {
    if (id === 'cf') return // CF no se elimina
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
    db.remove('clientes', id)
  }, [setClientes])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const productosActivos    = productos.filter(p => p.activo)
  const productosStockBajo  = productosActivos.filter(p => p.stock <= p.stock_minimo)
  const clientesActivos     = clientes.filter(c => c.activo)
  const ventasCompletadas   = ventas.filter(v => v.estado === 'completada')
  const totalVentasHoy      = (() => {
    const hoy = new Date().toDateString()
    return ventasCompletadas
      .filter(v => new Date(v.fecha).toDateString() === hoy)
      .reduce((acc, v) => acc + v.total, 0)
  })()

  return (
    <AppContext.Provider value={{
      // Data
      productos: productosActivos,
      ventas,
      clientes: clientesActivos,
      movimientos,
      // Acciones productos
      agregarProducto, editarProducto, eliminarProducto, ajustarStock,
      // Acciones ventas
      crearVenta, cancelarVenta, actualizarDespacho,
      // Acciones clientes
      agregarCliente, editarCliente, eliminarCliente,
      // Loading
      loadingApp,
      // Stats
      productosStockBajo,
      totalVentasHoy,
      totalProductos: productosActivos.length,
      totalClientes: clientesActivos.length,
      totalVentas: ventasCompletadas.length,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
