import { test, expect } from '@playwright/test'

const QTY = Number(process.env.MASSIVE_QTY || 100)
const CATEGORIAS = [
  'Herramientas Manuales', 'Herramientas Eléctricas', 'Accesorios para Herramientas',
  'Materiales de Construcción', 'Materiales Estructurales', 'Materiales para Techos',
  'Tornillería y Fijaciones', 'Plomería', 'Electricidad', 'Pintura y Acabados',
  'Acabados de Construcción', 'Seguridad y Cerrajería', 'Seguridad Industrial',
  'Jardinería', 'Herramientas Agrícolas', 'Adhesivos y Químicos',
  'Limpieza y Mantenimiento', 'Carpintería y Madera', 'Equipos Especiales', 'Consumibles',
]
const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito', label: 'Crédito' },
]
const UNIDADES_SEED = ['unidad', 'par', 'caja', 'bolsa', 'saco', 'metro', 'litro', 'galón', 'lb', 'rollo']

const pad = (n, len = 3) => String(n).padStart(len, '0')
const isoDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
const dateOnly = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const sum = (items) => items.reduce((acc, item) => acc + item.subtotal, 0)

function buildSeed() {
  const usuarios = [
    {
      id: 'usr-admin',
      nombre: 'Administrador',
      email: 'admin@ferreapp.com',
      password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      rol: 'admin',
      activo: true,
      creado_en: isoDays(-30),
    },
    ...Array.from({ length: QTY - 1 }, (_, i) => {
      const roles = ['vendedor', 'bodeguero', 'cotizador']
      return {
        id: `usr-seed-${pad(i + 1)}`,
        nombre: `Usuario ${pad(i + 1)}`,
        email: `usuario${pad(i + 1)}@ferreapp.com`,
        password_hash: `hash-${pad(i + 1)}`,
        rol: roles[i % roles.length],
        activo: true,
        creado_en: isoDays(-(29 - i)),
      }
    }),
  ]

  const productos = Array.from({ length: QTY }, (_, i) => {
    const precioCompra = 18 + i * 2
    const precioVenta = precioCompra * 1.35
    return {
      id: `p-seed-${pad(i + 1)}`,
      codigo: `PROD-${pad(i + 1, 4)}`,
      nombre: `Producto Masivo ${pad(i + 1)}`,
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      descripcion: `Carga masiva de prueba ${pad(i + 1)}`,
      precio_compra: Number(precioCompra.toFixed(2)),
      precio_venta: Number(precioVenta.toFixed(2)),
      stock: 40 + i,
      stock_minimo: 5 + (i % 3),
      unidad: UNIDADES_SEED[i % UNIDADES_SEED.length],
      ubicacion: `Estante ${String.fromCharCode(65 + (i % 4))}`,
      activo: true,
      creado_en: isoDays(-(20 - i)),
    }
  })

  const clientes = [
    {
      id: 'cf',
      nombre: 'Consumidor Final',
      telefono: '',
      email: '',
      nit: 'CF',
      direccion: '',
      tipo: 'natural',
      activo: true,
      creado_en: isoDays(-60),
    },
    ...Array.from({ length: QTY - 1 }, (_, i) => ({
      id: `c-seed-${pad(i + 1)}`,
      nombre: `Cliente Masivo ${pad(i + 1)}`,
      telefono: `555-${pad(1000 + i, 4)}`,
      email: `cliente${pad(i + 1)}@correo.com`,
      nit: `NIT-${pad(3000 + i, 4)}`,
      direccion: `Zona ${((i % 6) + 1)}, Calle ${i + 1}`,
      tipo: ['natural', 'empresa', 'frecuente'][i % 3],
      activo: true,
      creado_en: isoDays(-(25 - i)),
    })),
  ]

  const proveedores = Array.from({ length: QTY }, (_, i) => ({
    id: `pr-seed-${pad(i + 1)}`,
    nombre: `Proveedor Masivo ${pad(i + 1)}`,
    nit: `PRV-${pad(7000 + i, 4)}`,
    telefono: `444-${pad(2000 + i, 4)}`,
    email: `proveedor${pad(i + 1)}@correo.com`,
    direccion: `Bodega ${pad(i + 1)}`,
    activo: true,
    creado_en: isoDays(-(18 - i)),
    actualizado_en: isoDays(-(18 - i)),
  }))

  const ventas = []
  const ventaItems = []
  const pedidos = []
  const cuentasCobrar = []
  const abonos = []
  const movimientos = []
  const cajaAperturas = []
  const cajaMovimientos = []

  for (let i = 0; i < QTY; i += 1) {
    const cliente = clientes[(i + 1) % clientes.length] // evita CF la mayor parte del tiempo
    const producto = productos[i]
    const metodoPago = METODOS_PAGO[i % METODOS_PAGO.length].value
    const cantidad = (i % 4) + 1
    const subtotal = Number((producto.precio_venta * cantidad).toFixed(2))
    const descuento = Number((i % 3) * 5)
    const impuesto = Number(((subtotal - descuento) * 0.12).toFixed(2))
    const total = Number((subtotal - descuento + impuesto).toFixed(2))
    const ventaId = `v-seed-${pad(i + 1)}`
    const numeroVenta = `VTA-${pad(i + 1, 6)}`

    ventas.push({
      id: ventaId,
      numero_venta: numeroVenta,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      fecha: isoDays(-i),
      estado: 'completada',
      metodo_pago: metodoPago,
      subtotal,
      descuento,
      impuesto,
      total,
      notas: `Venta masiva ${pad(i + 1)}`,
      es_pedido: true,
      estado_despacho: 'pendiente',
      direccion_entrega: `Entrega masiva ${pad(i + 1)}`,
      notas_despacho: `Pedido masivo ${pad(i + 1)}`,
      creado_en: isoDays(-i),
    })

    ventaItems.push({
      id: `vi-seed-${pad(i + 1)}`,
      venta_id: ventaId,
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad,
      precio_unitario: producto.precio_venta,
      subtotal,
    })

    pedidos.push({
      id: ventaId,
      numero_venta: numeroVenta,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      fecha: isoDays(-i),
      total,
      estado_despacho: 'pendiente',
      direccion_entrega: `Entrega masiva ${pad(i + 1)}`,
      notas: `Pedido masivo ${pad(i + 1)}`,
      metodo_pago: metodoPago,
    })

    const montoOriginal = total
    const montoPagado = i % 2 === 0 ? total : Number((total * 0.5).toFixed(2))
    const saldo = Number((montoOriginal - montoPagado).toFixed(2))
    const estadoCuenta = saldo <= 0 ? 'PAGADA' : montoPagado > 0 ? 'PARCIAL' : 'PENDIENTE'
    const cuentaId = `cxc-seed-${pad(i + 1)}`

    cuentasCobrar.push({
      id: cuentaId,
      numero_documento: `CXC-${pad(i + 1, 6)}`,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      referencia_venta: ventaId,
      fecha_emision: dateOnly(-i),
      fecha_vencimiento: dateOnly(10 + i),
      monto_original: montoOriginal,
      monto_pagado: montoPagado,
      saldo,
      estado: estadoCuenta,
      notas: `Cuenta masiva ${pad(i + 1)}`,
      creado_en: isoDays(-i),
    })

    if (montoPagado > 0) {
      abonos.push({
        id: `ab-seed-${pad(i + 1)}`,
        cuenta_por_cobrar_id: cuentaId,
        fecha: isoDays(-i),
        monto: montoPagado,
        metodo_pago: metodoPago,
        notas: `Abono masivo ${pad(i + 1)}`,
      })
    }

    movimientos.push({
      id: `mov-seed-${pad(i + 1)}`,
      producto_id: producto.id,
      tipo: i % 3 === 0 ? 'entrada' : i % 3 === 1 ? 'salida' : 'ajuste',
      cantidad: i + 1,
      motivo: `Movimiento masivo ${pad(i + 1)}`,
      referencia: numeroVenta,
      fecha: isoDays(-i),
    })

    cajaAperturas.push({
      id: `caja-seed-${pad(i + 1)}`,
      usuario_id: usuarios[i % usuarios.length].id,
      fecha_apertura: isoDays(-(QTY - i)),
      fecha_cierre: i === QTY - 1 ? null : isoDays(-(QTY - i - 1)),
      estado: i === QTY - 1 ? 'ABIERTA' : 'CERRADA',
      monto_apertura: 1000 + i * 10,
      total_ventas_efectivo: i * 100,
      total_ventas_tarjeta: i * 80,
      total_ventas_credito: i * 60,
      total_ventas_otros: i * 20,
      total_ingresos: i * 35,
      total_egresos: i * 15,
      monto_esperado: 1000 + i * 10 + i * 100 + i * 80 + i * 60 + i * 20 + i * 35 - i * 15,
      monto_real: 1000 + i * 10 + i * 100 + i * 80 + i * 60 + i * 20 + i * 35 - i * 15,
      diferencia: 0,
    })

    cajaMovimientos.push({
      id: `cm-seed-${pad(i + 1)}`,
      tipo: i % 2 === 0 ? 'INGRESO' : 'EGRESO',
      monto: Number((25 + i * 2).toFixed(2)),
      descripcion: `Movimiento de caja masivo ${pad(i + 1)}`,
      fecha: isoDays(-i),
      referencia: numeroVenta,
    })
  }

  const compras = []
  const compraItems = []
  const cotizaciones = []
  const cotizacionItems = []

  for (let i = 0; i < QTY; i += 1) {
    const proveedor = proveedores[i]
    const cliente = clientes[(i + 2) % clientes.length]
    const producto = productos[(i + 5) % productos.length]
    const cantidad = (i % 5) + 1

    const compraSubtotal = Number((producto.precio_compra * cantidad).toFixed(2))
    const compraDesc = Number((i % 2) * 3)
    const compraImp = Number(((compraSubtotal - compraDesc) * 0.12).toFixed(2))
    const compraTotal = Number((compraSubtotal - compraDesc + compraImp).toFixed(2))
    const compraId = `com-seed-${pad(i + 1)}`

    compras.push({
      id: compraId,
      proveedor_id: proveedor.id,
      proveedor_nombre: proveedor.nombre,
      numero_documento: `COM-${pad(i + 1, 6)}`,
      fecha_recepcion: isoDays(-i),
      estado: i % 4 === 0 ? 'APLICADA' : 'REGISTRADA',
      subtotal: compraSubtotal,
      descuento: compraDesc,
      impuesto: compraImp,
      total: compraTotal,
      observaciones: `Compra masiva ${pad(i + 1)}`,
      creado_en: isoDays(-i),
    })

    compraItems.push({
      id: `ci-seed-${pad(i + 1)}`,
      compra_id: compraId,
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad,
      costo_unitario: producto.precio_compra,
      subtotal: compraSubtotal,
    })

    const cotSubtotal = Number((producto.precio_venta * cantidad).toFixed(2))
    const cotDesc = Number((i % 2) * 4)
    const cotImp = Number(((cotSubtotal - cotDesc) * 0.12).toFixed(2))
    const cotTotal = Number((cotSubtotal - cotDesc + cotImp).toFixed(2))
    const cotId = `cot-seed-${pad(i + 1)}`

    cotizaciones.push({
      id: cotId,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      numero_cotizacion: `COT-${pad(i + 1, 6)}`,
      fecha: isoDays(-i),
      estado: i % 3 === 0 ? 'APROBADA' : 'VIGENTE',
      subtotal: cotSubtotal,
      descuento: cotDesc,
      impuesto: cotImp,
      total: cotTotal,
      notas: `Cotización masiva ${pad(i + 1)}`,
      creado_en: isoDays(-i),
    })

    cotizacionItems.push({
      id: `coi-seed-${pad(i + 1)}`,
      cotizacion_id: cotId,
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad,
      precio_unitario: producto.precio_venta,
      subtotal: cotSubtotal,
    })
  }

  return {
    session: {
      id: 'usr-admin',
      nombre: 'Administrador',
      email: 'admin@ferreapp.com',
      rol: 'admin',
      activo: true,
      creado_en: isoDays(-30),
    },
    catalogos: {
      categorias: CATEGORIAS,
      unidades: UNIDADES_SEED,
      metodos_pago: METODOS_PAGO,
      ubicaciones: ['Pasillo 1', 'Pasillo 2', 'Pasillo 3', 'Bodega', 'Estante A', 'Estante B'],
      tipos_cliente: ['natural', 'empresa', 'frecuente'],
    },
    usuarios,
    productos,
    clientes,
    proveedores,
    ventas,
    ventaItems,
    pedidos,
    cuentasCobrar,
    abonos,
    movimientos,
    cajaAperturas,
    cajaMovimientos,
    compras,
    compraItems,
    cotizaciones,
    cotizacionItems,
    auditoria: [],
  }
}

function persistSeed(payload) {
  const put = (key, value) => localStorage.setItem(key, JSON.stringify(value))

  localStorage.clear()
  sessionStorage.clear()
  sessionStorage.setItem('ferreapp_sesion', JSON.stringify(payload.session))

  put('ferreapp_catalogos', payload.catalogos)
  put('ferreapp_usuarios', payload.usuarios)
  put('ferreapp_productos', payload.productos)
  put('ferreapp_clientes', payload.clientes)
  put('ferreapp_proveedores', payload.proveedores)
  put('ferreapp_ventas', payload.ventas)
  put('ferreapp_ventaItems', payload.ventaItems)
  put('ferreapp_pedidos', payload.pedidos)
  put('ferreapp_cuentas_cobrar', payload.cuentasCobrar)
  put('ferreapp_cuentasCobrar', payload.cuentasCobrar)
  put('ferreapp_abonos', payload.abonos)
  put('ferreapp_movimientos', payload.movimientos)
  put('ferreapp_caja_aperturas', payload.cajaAperturas)
  put('ferreapp_cajaAperturas', payload.cajaAperturas)
  put('ferreapp_caja_movimientos', payload.cajaMovimientos)
  put('ferreapp_cajaMovimientos', payload.cajaMovimientos)
  put('ferreapp_compras', payload.compras)
  put('ferreapp_compraItems', payload.compraItems)
  put('ferreapp_cotizaciones', payload.cotizaciones)
  put('ferreapp_cotizacionItems', payload.cotizacionItems)
  put('ferreapp_auditoria', payload.auditoria)
}

test.describe('Carga masiva de datos', () => {
  test('MASSIVE-01: 100 registros por módulo sin corrupción', async ({ page }) => {
    test.setTimeout(120000)

    const pageErrors = []
    page.on('pageerror', err => pageErrors.push(err.message))

    const seed = buildSeed()
    const startedAt = Date.now()

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(persistSeed, seed)
    await page.reload({ waitUntil: 'networkidle' })

    const counts = await page.evaluate(() => {
      const read = (key) => {
        try {
          const value = JSON.parse(localStorage.getItem(key) || '[]')
          return Array.isArray(value) ? value.length : 0
        } catch {
          return 0
        }
      }

      return {
        usuarios: read('ferreapp_usuarios'),
        productos: read('ferreapp_productos'),
        clientes: read('ferreapp_clientes'),
        proveedores: read('ferreapp_proveedores'),
        ventas: read('ferreapp_ventas'),
        ventaItems: read('ferreapp_ventaItems'),
        pedidos: read('ferreapp_pedidos'),
        cuentasCobrar: read('ferreapp_cuentasCobrar'),
        abonos: read('ferreapp_abonos'),
        movimientos: read('ferreapp_movimientos'),
        cajaAperturas: read('ferreapp_cajaAperturas'),
        cajaMovimientos: read('ferreapp_cajaMovimientos'),
        compras: read('ferreapp_compras'),
        compraItems: read('ferreapp_compraItems'),
        cotizaciones: read('ferreapp_cotizaciones'),
        cotizacionItems: read('ferreapp_cotizacionItems'),
      }
    })

    const elapsedMs = Date.now() - startedAt
    console.log('Conteos masivos:', JSON.stringify(counts, null, 2))
    console.log(`Tiempo total carga masiva: ${elapsedMs} ms`)

    for (const value of Object.values(counts)) {
      expect(value).toBe(QTY)
    }
    expect(pageErrors).toHaveLength(0)

    const routes = ['/productos', '/clientes', '/proveedores', '/compras', '/cotizaciones', '/ventas', '/caja', '/cuentas-por-cobrar']
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      expect(page.url()).not.toContain('/login')
    }

    expect(elapsedMs).toBeLessThan(120000)
  })
})
