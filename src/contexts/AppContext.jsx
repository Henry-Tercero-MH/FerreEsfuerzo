import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateNumeroVenta, generateCodigoProducto } from '../utils/formatters'

const AppContext = createContext(null)

// ── Datos semilla ────────────────────────────────────────────────────────────
const PRODUCTOS_SEED = [
  { id: 'p1', codigo: 'PROD-001', nombre: 'Martillo de Carpintero 16oz', categoria: 'Herramientas Manuales', precio_compra: 45, precio_venta: 75, stock: 25, stock_minimo: 5, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: 'p2', codigo: 'PROD-002', nombre: 'Taladro Percutor 1/2"', categoria: 'Herramientas Eléctricas', precio_compra: 350, precio_venta: 550, stock: 8, stock_minimo: 2, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: 'p3', codigo: 'PROD-003', nombre: 'Tornillos Galvanizados 2" x100', categoria: 'Fijaciones y Tornillería', precio_compra: 15, precio_venta: 28, stock: 3, stock_minimo: 10, unidad: 'caja', activo: true, creado_en: new Date().toISOString() },
  { id: 'p4', codigo: 'PROD-004', nombre: 'Cinta Métrica 5m', categoria: 'Herramientas Manuales', precio_compra: 20, precio_venta: 38, stock: 40, stock_minimo: 5, unidad: 'unidad', activo: true, creado_en: new Date().toISOString() },
  { id: 'p5', codigo: 'PROD-005', nombre: 'Pintura Blanca 1 galón', categoria: 'Pintura y Acabados', precio_compra: 80, precio_venta: 130, stock: 12, stock_minimo: 3, unidad: 'galón', activo: true, creado_en: new Date().toISOString() },
]

const CLIENTES_SEED = [
  { id: 'c1', nombre: 'Consumidor Final', telefono: '', email: '', nit: 'CF', tipo: 'natural', activo: true, creado_en: new Date().toISOString() },
  { id: 'c2', nombre: 'Constructora Los Pinos S.A.', telefono: '2345-6789', email: 'compras@lospinos.gt', nit: '12345678', tipo: 'empresa', activo: true, creado_en: new Date().toISOString() },
]

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [productos, setProductos]           = useLocalStorage('ferreapp_productos', PRODUCTOS_SEED)
  const [ventas, setVentas]                 = useLocalStorage('ferreapp_ventas', [])
  const [clientes, setClientes]             = useLocalStorage('ferreapp_clientes', CLIENTES_SEED)
  const [movimientos, setMovimientos]       = useLocalStorage('ferreapp_movimientos', [])

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
    return nuevo
  }, [setProductos])

  const editarProducto = useCallback((id, data) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...data, actualizado_en: new Date().toISOString() } : p))
  }, [setProductos])

  const eliminarProducto = useCallback((id) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
  }, [setProductos])

  const ajustarStock = useCallback((productoId, cantidad, tipo, motivo = '', referencia = '') => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p
      const delta = tipo === 'entrada' ? cantidad : -cantidad
      return { ...p, stock: Math.max(0, p.stock + delta) }
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
  }, [setProductos, setMovimientos])

  // ── VENTAS ─────────────────────────────────────────────────────────────────
  const crearVenta = useCallback((data) => {
    const numero = generateNumeroVenta(ventas.length + 1)
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
    nueva.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'salida', esPedido ? 'pedido' : 'venta', numero)
    })
    return nueva
  }, [ventas.length, setVentas, ajustarStock])

  const cancelarVenta = useCallback((id) => {
    const venta = ventas.find(v => v.id === id)
    if (!venta || venta.estado === 'cancelada') return
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'cancelada' } : v))
    venta.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'entrada', 'cancelacion', venta.numero_venta)
    })
  }, [ventas, setVentas, ajustarStock])

  const actualizarDespacho = useCallback((id, updates) => {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
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
    return nuevo
  }, [setClientes])

  const editarCliente = useCallback((id, data) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }, [setClientes])

  const eliminarCliente = useCallback((id) => {
    if (id === 'c1') return // CF no se elimina
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
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
