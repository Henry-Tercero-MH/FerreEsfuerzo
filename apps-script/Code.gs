/**
 * FerreApp — Google Apps Script
 * ============================================================
 * Instrucciones de instalación:
 * 1. Abre Google Sheets → Extensiones → Apps Script
 * 2. Pega este código
 * 3. Ejecuta "configurarHojas()" una vez para crear las hojas
 * 4. Despliega como Web App:
 *    - Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 5. Copia la URL generada y pégala en FerreApp → Ajustes
 * ============================================================
 */

const HOJAS = {
  productos:   'Productos',
  clientes:    'Clientes',
  ventas:      'Ventas',
  ventaItems:  'VentaItems',
  movimientos: 'Movimientos',
}

// ── Punto de entrada POST ──────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const { accion, datos } = body
    let resultado

    switch (accion) {
      case 'BACKUP_COMPLETO':
        resultado = backupCompleto(datos)
        break
      case 'SYNC_PRODUCTOS':
        resultado = syncProductos(datos.productos)
        break
      case 'NUEVA_VENTA':
        resultado = nuevaVenta(datos.venta)
        break
      case 'GET_RESUMEN':
        resultado = getResumen()
        break
      default:
        throw new Error(`Acción desconocida: ${accion}`)
    }

    return respuesta({ ok: true, ...resultado })
  } catch (err) {
    return respuesta({ ok: false, error: err.message }, 500)
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, mensaje: 'FerreApp API activa' })
  ).setMimeType(ContentService.MimeType.JSON)
}

// ── Acciones ──────────────────────────────────────────────────
function backupCompleto({ productos, clientes, ventas, movimientos }) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  escribirHoja(ss, HOJAS.productos,   encabezadosProductos(),   productos,   filaProducto)
  escribirHoja(ss, HOJAS.clientes,    encabezadosClientes(),    clientes,    filaCliente)
  escribirHoja(ss, HOJAS.ventas,      encabezadosVentas(),      ventas,      filaVenta)
  escribirHoja(ss, HOJAS.movimientos, encabezadosMovimientos(), movimientos, filaMovimiento)

  // Items de ventas (aplanar)
  const items = ventas.flatMap(v => (v.items || []).map(i => ({ ...i, venta_id: v.id })))
  escribirHoja(ss, HOJAS.ventaItems, encabezadosVentaItems(), items, filaVentaItem)

  return { mensaje: `Backup completado: ${productos.length} prods, ${ventas.length} ventas` }
}

function syncProductos(productos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  escribirHoja(ss, HOJAS.productos, encabezadosProductos(), productos, filaProducto)
  return { mensaje: `${productos.length} productos sincronizados` }
}

function nuevaVenta(venta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const hVentas = obtenerHoja(ss, HOJAS.ventas, encabezadosVentas())
  hVentas.appendRow(filaVenta(venta))

  const hItems = obtenerHoja(ss, HOJAS.ventaItems, encabezadosVentaItems())
  ;(venta.items || []).forEach(i => hItems.appendRow(filaVentaItem({ ...i, venta_id: venta.id })))

  return { numero_venta: venta.numero_venta }
}

function getResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(HOJAS.ventas)
  if (!hoja) return { total: 0, cantidad: 0 }
  const datos = hoja.getDataRange().getValues().slice(1)
  const total = datos.reduce((acc, fila) => acc + (parseFloat(fila[8]) || 0), 0)
  return { total, cantidad: datos.length }
}

// ── Helpers ───────────────────────────────────────────────────
function escribirHoja(ss, nombre, encabezados, datos, maperFn) {
  const hoja = obtenerHoja(ss, nombre, encabezados)
  hoja.clearContents()
  hoja.appendRow(encabezados)
  if (datos && datos.length) {
    const filas = datos.map(maperFn)
    hoja.getRange(2, 1, filas.length, filas[0].length).setValues(filas)
  }
}

function obtenerHoja(ss, nombre, encabezados) {
  let hoja = ss.getSheetByName(nombre)
  if (!hoja) {
    hoja = ss.insertSheet(nombre)
    hoja.appendRow(encabezados)
  }
  return hoja
}

function respuesta(datos, codigo = 200) {
  return ContentService.createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Encabezados & mappers ─────────────────────────────────────
function encabezadosProductos()   { return ['id','codigo','nombre','categoria','precio_compra','precio_venta','stock','stock_minimo','unidad','activo','creado_en'] }
function encabezadosClientes()    { return ['id','nombre','telefono','email','direccion','nit','tipo','activo','creado_en'] }
function encabezadosVentas()      { return ['id','numero_venta','cliente_id','cliente_nombre','fecha','subtotal','descuento','impuesto','total','metodo_pago','estado','notas'] }
function encabezadosVentaItems()  { return ['venta_id','producto_id','nombre','cantidad','precio_unitario','subtotal'] }
function encabezadosMovimientos() { return ['id','producto_id','producto_nombre','tipo','cantidad','motivo','referencia','fecha'] }

function filaProducto(p)   { return [p.id,p.codigo,p.nombre,p.categoria,p.precio_compra,p.precio_venta,p.stock,p.stock_minimo,p.unidad,p.activo,p.creado_en] }
function filaCliente(c)    { return [c.id,c.nombre,c.telefono,c.email,c.direccion,c.nit,c.tipo,c.activo,c.creado_en] }
function filaVenta(v)      { return [v.id,v.numero_venta,v.cliente_id,v.cliente_nombre,v.fecha,v.subtotal,v.descuento,v.impuesto,v.total,v.metodo_pago,v.estado,v.notas] }
function filaVentaItem(i)  { return [i.venta_id,i.producto_id,i.nombre,i.cantidad,i.precio_unitario,i.subtotal] }
function filaMovimiento(m) { return [m.id,m.producto_id,m.producto_nombre,m.tipo,m.cantidad,m.motivo,m.referencia,m.fecha] }

// ── Setup inicial ─────────────────────────────────────────────
function configurarHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  Object.entries(HOJAS).forEach(([key, nombre]) => {
    if (!ss.getSheetByName(nombre)) {
      const h = ss.insertSheet(nombre)
      const enc = {
        productos:   encabezadosProductos(),
        clientes:    encabezadosClientes(),
        ventas:      encabezadosVentas(),
        ventaItems:  encabezadosVentaItems(),
        movimientos: encabezadosMovimientos(),
      }[key]
      h.appendRow(enc)
      h.getRange(1, 1, 1, enc.length).setBackground('#1e40af').setFontColor('#ffffff').setFontWeight('bold')
    }
  })
  SpreadsheetApp.getUi().alert('¡Hojas creadas exitosamente! Ya puedes desplegar como Web App.')
}
