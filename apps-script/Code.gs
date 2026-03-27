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
  productos:         'Productos',
  clientes:          'Clientes',
  proveedores:       'Proveedores',
  ventas:            'Ventas',
  ventaItems:        'VentaItems',
  compras:           'Compras',
  compraItems:       'CompraItems',
  cotizaciones:      'Cotizaciones',
  cotizacionItems:   'CotizacionItems',
  cuentasCobrar:     'CuentasPorCobrar',
  abonos:            'Abonos',
  cajaAperturas:     'CajaAperturas',
  cajaMovimientos:   'CajaMovimientos',
  movimientos:       'MovimientosStock',
  empresa:           'Empresa',
  usuarios:          'Usuarios',
  catalogos:         'Catalogos',
}

// ── Punto de entrada POST ──────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const { action, accion, datos } = body
    const actionName = action || accion
    let resultado

    switch (actionName) {
      // Acciones de backup
      case 'backup':
      case 'BACKUP_COMPLETO':
        resultado = backupCompleto(body)
        break

      // Sincronizaciones
      case 'syncProductos':
      case 'SYNC_PRODUCTOS':
        resultado = syncProductos(body.productos || datos?.productos)
        break
      case 'syncCatalogos':
        resultado = syncCatalogos(body.catalogos || datos?.catalogos)
        break
      case 'syncVentas':
        resultado = syncVentas(body.ventas || datos?.ventas)
        break

      // Operaciones individuales
      case 'NUEVA_VENTA':
        resultado = nuevaVenta(datos.venta)
        break

      // Reportes
      case 'reporte':
      case 'GET_RESUMEN':
        resultado = getResumen(body.periodo || datos?.periodo)
        break

      // CRUD genérico (offline-first)
      case 'getAll':
        resultado = getAllRecords(body.entity)
        break
      case 'insert':
        resultado = insertRecord(body.entity, body.data)
        break
      case 'update':
        resultado = updateRecord(body.entity, body.id, body.data)
        break
      case 'remove':
        resultado = removeRecord(body.entity, body.id)
        break

      default:
        throw new Error(`Acción desconocida: ${actionName}`)
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
function backupCompleto(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  // Datos base
  escribirHoja(ss, HOJAS.productos,    encabezadosProductos(),    data.productos || [],    filaProducto)
  escribirHoja(ss, HOJAS.clientes,     encabezadosClientes(),     data.clientes || [],     filaCliente)
  escribirHoja(ss, HOJAS.proveedores,  encabezadosProveedores(),  data.proveedores || [],  filaProveedor)

  // Movimientos de stock (necesita productos para obtener nombres)
  const movimientos = (data.movimientos || []).map(m => {
    const producto = (data.productos || []).find(p => p.id === m.producto_id)
    return { ...m, producto_nombre: producto ? producto.nombre : '' }
  })
  escribirHoja(ss, HOJAS.movimientos, encabezadosMovimientos(), movimientos, filaMovimiento)

  // Ventas
  escribirHoja(ss, HOJAS.ventas, encabezadosVentas(), data.ventas || [], filaVenta)
  const ventaItems = (data.ventas || []).flatMap(v => (v.items || []).map(i => ({ ...i, venta_id: v.id })))
  escribirHoja(ss, HOJAS.ventaItems, encabezadosVentaItems(), ventaItems, filaVentaItem)

  // Compras
  escribirHoja(ss, HOJAS.compras, encabezadosCompras(), data.compras || [], filaCompra)
  const compraItems = (data.compras || []).flatMap(c => (c.items || []).map(i => ({ ...i, compra_id: c.id })))
  escribirHoja(ss, HOJAS.compraItems, encabezadosCompraItems(), compraItems, filaCompraItem)

  // Cotizaciones
  escribirHoja(ss, HOJAS.cotizaciones, encabezadosCotizaciones(), data.cotizaciones || [], filaCotizacion)
  const cotizacionItems = (data.cotizaciones || []).flatMap(c => (c.items || []).map(i => ({ ...i, cotizacion_id: c.id })))
  escribirHoja(ss, HOJAS.cotizacionItems, encabezadosCotizacionItems(), cotizacionItems, filaCotizacionItem)

  // Cuentas por cobrar y abonos
  escribirHoja(ss, HOJAS.cuentasCobrar, encabezadosCuentasCobrar(), data.cuentas_cobrar || [], filaCuentaCobrar)
  escribirHoja(ss, HOJAS.abonos, encabezadosAbonos(), data.abonos || [], filaAbono)

  // Caja
  escribirHoja(ss, HOJAS.cajaAperturas, encabezadosCajaAperturas(), data.caja_aperturas || [], filaCajaApertura)
  escribirHoja(ss, HOJAS.cajaMovimientos, encabezadosCajaMovimientos(), data.caja_movimientos || [], filaCajaMovimiento)

  // Empresa
  if (data.empresa) {
    const hEmpresa = obtenerHoja(ss, HOJAS.empresa, encabezadosEmpresa())
    hEmpresa.clearContents()
    hEmpresa.appendRow(encabezadosEmpresa())
    hEmpresa.appendRow(filaEmpresa(data.empresa))
  }

  // Usuarios (si existen)
  if (data.usuarios) {
    escribirHoja(ss, HOJAS.usuarios, encabezadosUsuarios(), data.usuarios || [], filaUsuario)
  }

  // Catálogos (si existen)
  if (data.catalogos) {
    escribirHoja(ss, HOJAS.catalogos, encabezadosCatalogos(), data.catalogos || [], filaCatalogo)
  }

  return { mensaje: `Backup completado: ${(data.productos || []).length} productos, ${(data.ventas || []).length} ventas, ${(data.clientes || []).length} clientes` }
}

function syncProductos(productos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  escribirHoja(ss, HOJAS.productos, encabezadosProductos(), productos, filaProducto)
  return { mensaje: `${productos.length} productos sincronizados` }
}

function syncCatalogos(catalogos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  escribirHoja(ss, HOJAS.catalogos, encabezadosCatalogos(), catalogos, filaCatalogo)
  return { mensaje: `Catálogos sincronizados` }
}

function syncVentas(ventas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  escribirHoja(ss, HOJAS.ventas, encabezadosVentas(), ventas, filaVenta)
  const ventaItems = ventas.flatMap(v => (v.items || []).map(i => ({ ...i, venta_id: v.id })))
  escribirHoja(ss, HOJAS.ventaItems, encabezadosVentaItems(), ventaItems, filaVentaItem)
  return { mensaje: `${ventas.length} ventas sincronizadas` }
}

function nuevaVenta(venta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const hVentas = obtenerHoja(ss, HOJAS.ventas, encabezadosVentas())
  hVentas.appendRow(filaVenta(venta))

  const hItems = obtenerHoja(ss, HOJAS.ventaItems, encabezadosVentaItems())
  ;(venta.items || []).forEach(i => hItems.appendRow(filaVentaItem({ ...i, venta_id: venta.id })))

  return { numero_venta: venta.numero_venta }
}

function getResumen(periodo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(HOJAS.ventas)
  if (!hoja) return { total: 0, cantidad: 0, periodo: periodo || 'todos' }

  const datos = hoja.getDataRange().getValues().slice(1)

  // Filtrar por periodo si se especifica
  let datosFiltrados = datos
  if (periodo === 'hoy' || periodo === 'dia') {
    const hoy = new Date().toDateString()
    datosFiltrados = datos.filter(fila => {
      const fecha = new Date(fila[4])
      return fecha.toDateString() === hoy
    })
  } else if (periodo === 'mes') {
    const hoy = new Date()
    const mesActual = hoy.getMonth()
    const añoActual = hoy.getFullYear()
    datosFiltrados = datos.filter(fila => {
      const fecha = new Date(fila[4])
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual
    })
  }

  const total = datosFiltrados.reduce((acc, fila) => acc + (parseFloat(fila[8]) || 0), 0)
  return { total, cantidad: datosFiltrados.length, periodo: periodo || 'todos' }
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
function encabezadosProveedores() { return ['id','nit','nombre','nombre_contacto','telefono','correo','direccion','dias_credito','porcentaje_descuento','activo','creado_en'] }
function encabezadosVentas()      { return ['id','numero_venta','cliente_id','cliente_nombre','fecha','subtotal','descuento','impuesto','total','metodo_pago','estado','notas'] }
function encabezadosVentaItems()  { return ['venta_id','producto_id','nombre','cantidad','precio_unitario','subtotal'] }
function encabezadosCompras()     { return ['id','numero_documento','proveedor_id','proveedor_nombre','fecha_documento','fecha_recepcion','subtotal','descuento','impuesto','total','estado'] }
function encabezadosCompraItems() { return ['compra_id','producto_id','nombre','cantidad','costo_unitario','subtotal'] }
function encabezadosCotizaciones()     { return ['id','numero_cotizacion','cliente_id','cliente_nombre','fecha','fecha_vencimiento','subtotal','descuento','impuesto','total','estado'] }
function encabezadosCotizacionItems()  { return ['cotizacion_id','producto_id','nombre','cantidad','precio_unitario','subtotal'] }
function encabezadosCuentasCobrar()    { return ['id','numero_documento','cliente_id','cliente_nombre','fecha_emision','fecha_vencimiento','monto_original','monto_pagado','saldo','estado'] }
function encabezadosAbonos()           { return ['id','cuenta_por_cobrar_id','usuario_id','monto','metodo_pago','referencia','fecha','notas'] }
function encabezadosCajaAperturas()    { return ['id','usuario_id','usuario_nombre','fecha_apertura','fecha_cierre','monto_apertura','monto_esperado','monto_real','diferencia','estado'] }
function encabezadosCajaMovimientos()  { return ['id','apertura_caja_id','usuario_id','tipo','monto','concepto','referencia','fecha'] }
function encabezadosMovimientos()      { return ['id','producto_id','producto_nombre','tipo','cantidad','motivo','referencia','fecha'] }
function encabezadosEmpresa()          { return ['nit','nombre_comercial','razon_social','direccion_fiscal','telefono','correo_electronico','regimen_tributario','moneda_codigo','iva_porcentaje'] }
function encabezadosUsuarios()         { return ['id','nombre','email','rol','activo','creado_en'] }
function encabezadosCatalogos()        { return ['tipo','codigo','valor','descripcion','orden'] }

function filaProducto(p)        { return [p.id,p.codigo,p.nombre,p.categoria,p.precio_compra,p.precio_venta,p.stock,p.stock_minimo,p.unidad,p.activo,p.creado_en] }
function filaCliente(c)         { return [c.id,c.nombre,c.telefono,c.email,c.direccion,c.nit,c.tipo,c.activo,c.creado_en] }
function filaProveedor(p)       { return [p.id,p.nit,p.nombre,p.nombre_contacto,p.telefono,p.correo,p.direccion,p.dias_credito,p.porcentaje_descuento,p.activo,p.creado_en] }
function filaVenta(v)           { return [v.id,v.numero_venta,v.cliente_id,v.cliente_nombre || '',v.fecha,v.subtotal,v.descuento,v.impuesto,v.total,v.metodo_pago,v.estado,v.notas || ''] }
function filaVentaItem(i)       { return [i.venta_id,i.producto_id,i.nombre,i.cantidad,i.precio_unitario,i.subtotal] }
function filaCompra(c)          { return [c.id,c.numero_documento,c.proveedor_id,c.proveedor_nombre || '',c.fecha_documento,c.fecha_recepcion,c.subtotal,c.descuento,c.impuesto,c.total,c.estado] }
function filaCompraItem(i)      { return [i.compra_id,i.producto_id,i.nombre,i.cantidad,i.costo_unitario,i.subtotal] }
function filaCotizacion(c)      { return [c.id,c.numero_cotizacion,c.cliente_id,c.cliente_nombre || '',c.fecha,c.fecha_vencimiento,c.subtotal,c.descuento,c.impuesto,c.total,c.estado] }
function filaCotizacionItem(i)  { return [i.cotizacion_id,i.producto_id,i.nombre,i.cantidad,i.precio_unitario,i.subtotal] }
function filaCuentaCobrar(c)    { return [c.id,c.numero_documento,c.cliente_id,c.cliente_nombre || '',c.fecha_emision,c.fecha_vencimiento,c.monto_original,c.monto_pagado,c.saldo,c.estado] }
function filaAbono(a)           { return [a.id,a.cuenta_por_cobrar_id,a.usuario_id,a.monto,a.metodo_pago,a.referencia || '',a.fecha,a.notas || ''] }
function filaCajaApertura(c)    { return [c.id,c.usuario_id,c.usuario_nombre || '',c.fecha_apertura,c.fecha_cierre || '',c.monto_apertura,c.monto_esperado,c.monto_real,c.diferencia,c.estado] }
function filaCajaMovimiento(m)  { return [m.id,m.apertura_caja_id,m.usuario_id,m.tipo,m.monto,m.concepto,m.referencia || '',m.fecha] }
function filaMovimiento(m)      { return [m.id,m.producto_id,m.producto_nombre || '',m.tipo,m.cantidad,m.motivo,m.referencia || '',m.fecha] }
function filaEmpresa(e)         { return [e.nit,e.nombre_comercial,e.razon_social,e.direccion_fiscal,e.telefono,e.correo_electronico,e.regimen_tributario,e.moneda_codigo,e.iva_porcentaje] }
function filaUsuario(u)         { return [u.id,u.nombre,u.email,u.rol,u.activo,u.creado_en] }
function filaCatalogo(c)        { return [c.tipo || '',c.codigo || '',c.valor || '',c.descripcion || '',c.orden || 0] }

// ── CRUD genérico (offline-first) ────────────────────────────

/**
 * Devuelve todos los registros de una hoja como array de objetos,
 * usando la fila 1 como encabezados/claves.
 */
function getAllRecords(entity) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheetName = HOJAS[entity]
  if (!sheetName) throw new Error('Entidad desconocida: ' + entity)

  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) return { ok: true, data: [] }

  const valores = hoja.getDataRange().getValues()
  if (valores.length < 2) return { ok: true, data: [] }

  const headers = valores[0]
  const data = valores.slice(1).map(fila => {
    const obj = {}
    headers.forEach((key, i) => { obj[key] = fila[i] })
    return obj
  })

  return { ok: true, data }
}

/**
 * Agrega un nuevo registro al final de la hoja.
 * Utiliza la función mapper correspondiente a la entidad.
 */
function insertRecord(entity, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheetName = HOJAS[entity]
  if (!sheetName) throw new Error('Entidad desconocida: ' + entity)

  const mappers = _getMappers()
  const headers = _getHeaders()

  const hoja = obtenerHoja(ss, sheetName, headers[entity] || [])
  const mapFn = mappers[entity]
  if (mapFn) {
    hoja.appendRow(mapFn(data))
  } else {
    // Fallback: usar los encabezados actuales para armar la fila
    const existingHeaders = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    hoja.appendRow(existingHeaders.map(h => (data[h] !== undefined ? data[h] : '')))
  }

  return { ok: true, id: data.id }
}

/**
 * Actualiza el registro cuya primera columna (id) coincida con el id dado.
 */
function updateRecord(entity, id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheetName = HOJAS[entity]
  if (!sheetName) throw new Error('Entidad desconocida: ' + entity)

  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) throw new Error('Hoja no encontrada: ' + sheetName)

  const valores = hoja.getDataRange().getValues()
  const headers = valores[0]

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      headers.forEach((key, col) => {
        if (key in data) {
          hoja.getRange(i + 1, col + 1).setValue(data[key])
        }
      })
      return { ok: true, updated: 1 }
    }
  }

  return { ok: false, error: 'Registro no encontrado: ' + id }
}

/**
 * Elimina (soft-delete) el registro cuya primera columna coincida con el id.
 * Si la hoja tiene columna "activo", la pone en false.
 * De lo contrario, elimina la fila físicamente.
 */
function removeRecord(entity, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheetName = HOJAS[entity]
  if (!sheetName) throw new Error('Entidad desconocida: ' + entity)

  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) throw new Error('Hoja no encontrada: ' + sheetName)

  const valores = hoja.getDataRange().getValues()
  const headers = valores[0]
  const activoCol = headers.indexOf('activo')

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      if (activoCol !== -1) {
        // Soft delete
        hoja.getRange(i + 1, activoCol + 1).setValue(false)
      } else {
        // Hard delete
        hoja.deleteRow(i + 1)
      }
      return { ok: true, removed: 1 }
    }
  }

  return { ok: false, error: 'Registro no encontrado: ' + id }
}

/** Mapea nombres de entidad a sus funciones mapper */
function _getMappers() {
  return {
    productos:         filaProducto,
    clientes:          filaCliente,
    proveedores:       filaProveedor,
    ventas:            filaVenta,
    ventaItems:        filaVentaItem,
    compras:           filaCompra,
    compraItems:       filaCompraItem,
    cotizaciones:      filaCotizacion,
    cotizacionItems:   filaCotizacionItem,
    cuentasCobrar:     filaCuentaCobrar,
    abonos:            filaAbono,
    cajaAperturas:     filaCajaApertura,
    cajaMovimientos:   filaCajaMovimiento,
    movimientos:       filaMovimiento,
    empresa:           filaEmpresa,
    usuarios:          filaUsuario,
    catalogos:         filaCatalogo,
  }
}

/** Mapea nombres de entidad a sus encabezados */
function _getHeaders() {
  return {
    productos:         encabezadosProductos(),
    clientes:          encabezadosClientes(),
    proveedores:       encabezadosProveedores(),
    ventas:            encabezadosVentas(),
    ventaItems:        encabezadosVentaItems(),
    compras:           encabezadosCompras(),
    compraItems:       encabezadosCompraItems(),
    cotizaciones:      encabezadosCotizaciones(),
    cotizacionItems:   encabezadosCotizacionItems(),
    cuentasCobrar:     encabezadosCuentasCobrar(),
    abonos:            encabezadosAbonos(),
    cajaAperturas:     encabezadosCajaAperturas(),
    cajaMovimientos:   encabezadosCajaMovimientos(),
    movimientos:       encabezadosMovimientos(),
    empresa:           encabezadosEmpresa(),
    usuarios:          encabezadosUsuarios(),
    catalogos:         encabezadosCatalogos(),
  }
}

// ── Setup inicial ─────────────────────────────────────────────
function configurarHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const encabezadosMap = {
    productos:         encabezadosProductos(),
    clientes:          encabezadosClientes(),
    proveedores:       encabezadosProveedores(),
    ventas:            encabezadosVentas(),
    ventaItems:        encabezadosVentaItems(),
    compras:           encabezadosCompras(),
    compraItems:       encabezadosCompraItems(),
    cotizaciones:      encabezadosCotizaciones(),
    cotizacionItems:   encabezadosCotizacionItems(),
    cuentasCobrar:     encabezadosCuentasCobrar(),
    abonos:            encabezadosAbonos(),
    cajaAperturas:     encabezadosCajaAperturas(),
    cajaMovimientos:   encabezadosCajaMovimientos(),
    movimientos:       encabezadosMovimientos(),
    empresa:           encabezadosEmpresa(),
  }

  Object.entries(HOJAS).forEach(([key, nombre]) => {
    if (!ss.getSheetByName(nombre)) {
      const h = ss.insertSheet(nombre)
      const enc = encabezadosMap[key]
      if (enc) {
        h.appendRow(enc)
        h.getRange(1, 1, 1, enc.length).setBackground('#1e40af').setFontColor('#ffffff').setFontWeight('bold')
      }
    }
  })
  SpreadsheetApp.getUi().alert('¡Hojas creadas exitosamente! Ya puedes desplegar como Web App.')
}
