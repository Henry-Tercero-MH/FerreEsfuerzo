import { db } from '../services/db'
import { CATEGORIAS, METODOS_PAGO, UNIDADES_SEED, TIPOS_CLIENTE } from './constants'

const pad = (n, len = 3) => String(n).padStart(len, '0')
const isoDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
const dateOnly = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const runId = () => {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${t}${r}`
}
const mkRef = (prefix, run, index) => `${prefix}-${run}-${pad(index, 4)}`

const tipoClienteValues = TIPOS_CLIENTE.map(t => t.value)

function num(val, digits = 2) {
  return Number(Number(val).toFixed(digits))
}

export function buildDemoPayload(qty = 20, usuario = { id: 'usr-admin', nombre: 'Administrador' }) {
  const run = runId()

  const productos = Array.from({ length: qty }, (_, i) => {
    const precioCompra = 18 + i * 1.75
    const precioVenta = precioCompra * 1.35
    return {
      id: `prd-${run}-${pad(i + 1)}`,
      codigo: `PROD-${run}-${pad(i + 1, 4)}`,
      nombre: `Producto Demo ${pad(i + 1)}`,
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      descripcion: `Dato masivo de prueba ${pad(i + 1)}`,
      precio_compra: num(precioCompra),
      precio_venta: num(precioVenta),
      stock: 25 + i,
      stock_minimo: 5 + (i % 4),
      unidad: UNIDADES_SEED[i % UNIDADES_SEED.length],
      ubicacion: `P${(i % 5) + 1}-E${(i % 4) + 1}-B${(i % 3) + 1}`,
      activo: true,
      creado_en: isoDays(-(qty - i)),
    }
  })

  const clientes = Array.from({ length: qty }, (_, i) => ({
    id: `cli-${run}-${pad(i + 1)}`,
    nombre: `Cliente Demo ${pad(i + 1)}`,
    telefono: `555${pad(1000 + i, 4)}`,
    email: `cliente${pad(i + 1)}@demo.com`,
    nit: `NIT-${run}-${pad(5000 + i, 4)}`,
    direccion: `Zona ${((i % 6) + 1)}, Calle ${i + 1}`,
    tipo: tipoClienteValues[i % tipoClienteValues.length],
    activo: true,
    creado_en: isoDays(-(qty - i)),
  }))

  const proveedores = Array.from({ length: qty }, (_, i) => ({
    id: `prv-${run}-${pad(i + 1)}`,
    nombre: `Proveedor Demo ${pad(i + 1)}`,
    nit: `PRV-${run}-${pad(7000 + i, 4)}`,
    nombre_contacto: `Contacto ${pad(i + 1)}`,
    telefono: `444${pad(2000 + i, 4)}`,
    correo: `proveedor${pad(i + 1)}@demo.com`,
    sitio_web: `https://proveedor${pad(i + 1)}.demo`,
    direccion: `Bodega ${pad(i + 1)}`,
    dias_credito: i % 2 === 0 ? 15 : 30,
    porcentaje_descuento: i % 3 === 0 ? 5 : 0,
    notas: `Proveedor de prueba ${pad(i + 1)}`,
    activo: true,
    creado_en: isoDays(-(qty - i)),
    actualizado_en: isoDays(-(qty - i)),
  }))

  const movimientos = productos.map((producto, i) => ({
    id: `mov-${run}-${pad(i + 1)}`,
    producto_id: producto.id,
    tipo: i % 3 === 0 ? 'entrada' : i % 3 === 1 ? 'salida' : 'ajuste',
    cantidad: i + 1,
    motivo: `Movimiento demo ${pad(i + 1)}`,
    referencia: `REF-${run}-${pad(i + 1, 4)}`,
    fecha: isoDays(-(qty - i)),
  }))

  const compras = []
  const cotizaciones = []
  const ventas = []
  const cuentasCobrar = []
  const abonos = []
  const pedidos = []
  const cajaAperturas = []
  const cajaMovimientos = []

  for (let i = 0; i < qty; i += 1) {
    const producto = productos[i]
    const cliente = clientes[(i + 2) % clientes.length]
    const proveedor = proveedores[i]
    const metodoPago = METODOS_PAGO[i % METODOS_PAGO.length].value
    const cantidad = (i % 4) + 1

    const compraSubtotal = num(producto.precio_compra * cantidad)
    const compraDescuento = num((i % 2) * 3)
    const compraImpuesto = num((compraSubtotal - compraDescuento) * 0.12)
    const compraTotal = num(compraSubtotal - compraDescuento + compraImpuesto)

    compras.push({
      id: `com-${run}-${pad(i + 1)}`,
      proveedor_id: proveedor.id,
      proveedor_nombre: proveedor.nombre,
      numero_documento: mkRef('COM', run, i + 1),
      fecha_documento: dateOnly(-(i + 1)),
      fecha_recepcion: isoDays(-(i + 1)),
      subtotal: compraSubtotal,
      descuento: compraDescuento,
      impuesto: compraImpuesto,
      total: compraTotal,
      estado: i % 4 === 0 ? 'APLICADA' : 'REGISTRADA',
      observaciones: `Compra demo ${pad(i + 1)}`,
      creado_en: isoDays(-(qty - i)),
      items: [
        {
          id: `comi-${run}-${pad(i + 1)}`,
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad,
          costo_unitario: producto.precio_compra,
          subtotal: compraSubtotal,
        },
      ],
    })

    const cotSubtotal = num(producto.precio_venta * cantidad)
    const cotDesc = num((i % 2) * 4)
    const cotImp = num((cotSubtotal - cotDesc) * 0.12)
    const cotTotal = num(cotSubtotal - cotDesc + cotImp)

    cotizaciones.push({
      id: `cot-${run}-${pad(i + 1)}`,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      numero_cotizacion: mkRef('COT', run, i + 1),
      fecha: isoDays(-(i + 1)),
      fecha_vencimiento: dateOnly(10 + i),
      subtotal: cotSubtotal,
      descuento: cotDesc,
      impuesto: cotImp,
      total: cotTotal,
      estado: i % 3 === 0 ? 'APROBADA' : 'VIGENTE',
      notas: `Cotización demo ${pad(i + 1)}`,
      creado_en: isoDays(-(qty - i)),
      items: [
        {
          id: `coti-${run}-${pad(i + 1)}`,
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad,
          precio_unitario: producto.precio_venta,
          subtotal: cotSubtotal,
        },
      ],
    })

    const esPedido = i % 2 === 0
    const ventaSubtotal = num(producto.precio_venta * cantidad)
    const ventaDescuento = num((i % 3) * 5)
    const ventaImpuesto = num((ventaSubtotal - ventaDescuento) * 0.12)
    const ventaTotal = num(ventaSubtotal - ventaDescuento + ventaImpuesto)
    const ventaId = `vta-${run}-${pad(i + 1)}`
    const numeroVenta = mkRef('VTA', run, i + 1)

    ventas.push({
      id: ventaId,
      numero_venta: numeroVenta,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      fecha: isoDays(-(i + 1)),
      estado: 'completada',
      metodo_pago: metodoPago,
      subtotal: ventaSubtotal,
      descuento: ventaDescuento,
      impuesto: ventaImpuesto,
      total: ventaTotal,
      notas: `Venta demo ${pad(i + 1)}`,
      es_pedido: esPedido,
      estado_despacho: 'pendiente',
      direccion_entrega: `Entrega demo ${pad(i + 1)}`,
      notas_despacho: `Pedido demo ${pad(i + 1)}`,
      creador_id: usuario.id,
      creador_nombre: usuario.nombre,
      items: [
        {
          id: `vi-${run}-${pad(i + 1)}`,
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad,
          precio_unitario: producto.precio_venta,
          subtotal: ventaSubtotal,
        },
      ],
    })

    if (esPedido) {
      pedidos.push({
        id: ventaId,
        numero_venta: numeroVenta,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        fecha: isoDays(-(i + 1)),
        total: ventaTotal,
        estado_despacho: 'pendiente',
        direccion_entrega: `Entrega demo ${pad(i + 1)}`,
        notas: `Pedido demo ${pad(i + 1)}`,
        metodo_pago: metodoPago,
      })
    }

    const montoOriginal = ventaTotal
    const montoPagado = i % 2 === 0 ? ventaTotal : num(ventaTotal * 0.5)
    const saldo = num(montoOriginal - montoPagado)
    const estadoCuenta = saldo <= 0 ? 'PAGADA' : montoPagado > 0 ? 'PARCIAL' : 'PENDIENTE'
    const cuentaId = `cxc-${run}-${pad(i + 1)}`

    cuentasCobrar.push({
      id: cuentaId,
      numero_documento: mkRef('CXC', run, i + 1),
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      referencia_venta: ventaId,
      fecha_emision: dateOnly(-(i + 1)),
      fecha_vencimiento: dateOnly(10 + i),
      monto_original: montoOriginal,
      monto_pagado: montoPagado,
      saldo,
      estado: estadoCuenta,
      notas: `Cuenta demo ${pad(i + 1)}`,
      creado_en: isoDays(-(qty - i)),
    })

    if (montoPagado > 0) {
      abonos.push({
        id: `abo-${run}-${pad(i + 1)}`,
        cuenta_por_cobrar_id: cuentaId,
        usuario_id: usuario.id,
        monto: montoPagado,
        metodo_pago: metodoPago,
        referencia: numeroVenta,
        fecha: isoDays(-(i + 1)),
        notas: `Abono demo ${pad(i + 1)}`,
      })
    }

    cajaAperturas.push({
      id: `caja-${run}-${pad(i + 1)}`,
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      fecha_apertura: isoDays(-(qty - i)),
      fecha_cierre: i === qty - 1 ? null : isoDays(-(qty - i - 1)),
      monto_apertura: 1000 + i * 25,
      total_ventas_efectivo: i * 100,
      total_ventas_tarjeta: i * 80,
      total_ventas_otros: i * 20,
      total_ingresos: i * 35,
      total_egresos: i * 15,
      monto_esperado: 1000 + i * 25 + i * 100 + i * 80 + i * 20 + i * 35 - i * 15,
      monto_real: 1000 + i * 25 + i * 100 + i * 80 + i * 20 + i * 35 - i * 15,
      diferencia: 0,
      estado: i === qty - 1 ? 'ABIERTA' : 'CERRADA',
      notas_cierre: i === qty - 1 ? '' : `Cierre demo ${pad(i + 1)}`,
    })

    cajaMovimientos.push({
      id: `cm-${run}-${pad(i + 1)}`,
      apertura_caja_id: `caja-${run}-${pad(i + 1)}`,
      usuario_id: usuario.id,
      tipo: i % 2 === 0 ? 'INGRESO' : 'EGRESO',
      monto: num(25 + i * 2),
      concepto: `Movimiento caja demo ${pad(i + 1)}`,
      referencia: numeroVenta,
      fecha: isoDays(-(i + 1)),
    })
  }

  return {
    run,
    productos,
    clientes,
    proveedores,
    movimientos,
    compras,
    cotizaciones,
    ventas,
    pedidos,
    cuentasCobrar,
    abonos,
    cajaAperturas,
    cajaMovimientos,
  }
}

async function insertMany(entity, records) {
  for (const record of records) {
    await db.insert(entity, record)
  }
}

export async function seedDemoData({ qty = 20, usuario = { id: 'usr-admin', nombre: 'Administrador' } } = {}) {
  const payload = buildDemoPayload(qty, usuario)

  await insertMany('productos', payload.productos)
  await insertMany('clientes', payload.clientes)
  await insertMany('proveedores', payload.proveedores)
  await insertMany('compras', payload.compras)
  await insertMany('cotizaciones', payload.cotizaciones)
  await insertMany('ventas', payload.ventas)
  await insertMany('pedidos', payload.pedidos)
  await insertMany('cuentasCobrar', payload.cuentasCobrar)
  await insertMany('abonos', payload.abonos)
  await insertMany('movimientos', payload.movimientos)
  await insertMany('cajaAperturas', payload.cajaAperturas)
  await insertMany('cajaMovimientos', payload.cajaMovimientos)

  return {
    run: payload.run,
    productos: payload.productos.length,
    clientes: payload.clientes.length,
    proveedores: payload.proveedores.length,
    compras: payload.compras.length,
    cotizaciones: payload.cotizaciones.length,
    ventas: payload.ventas.length,
    pedidos: payload.pedidos.length,
    cuentasCobrar: payload.cuentasCobrar.length,
    abonos: payload.abonos.length,
    movimientos: payload.movimientos.length,
    cajaAperturas: payload.cajaAperturas.length,
    cajaMovimientos: payload.cajaMovimientos.length,
  }
}
