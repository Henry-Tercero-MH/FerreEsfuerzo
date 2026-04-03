/**
 * FerreApp — Google Apps Script
 * ============================================================
 * Las hojas se crean automáticamente la primera vez que se usan.
 * No es necesario correr ninguna función de configuración manual.
 *
 * Despliegue:
 * 1. Abre Google Sheets → Extensiones → Apps Script
 * 2. Pega este código y guarda
 * 3. Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 4. Copia la URL y pégala en FerreApp → Ajustes
 *
 * Opcional: en Proyecto → Propiedades del script, agrega
 *   API_SECRET = tu_clave_secreta
 * ============================================================
 */

// ── Mapa entidad → nombre de hoja ─────────────────────────────
const HOJAS = {
  productos:         'Productos',
  clientes:          'Clientes',
  proveedores:       'Proveedores',
  ventas:            'Ventas',
  ventaItems:        'VentaItems',
  pedidos:           'Pedidos',
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

    const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')
    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'No autorizado' })
    }

    const action = body.action || body.accion
    let result

    switch (action) {
      case 'ping':
        result = { ok: true, message: 'Conexión exitosa', timestamp: new Date().toISOString() }
        break
      case 'getAll':
        result = getAllRecords(body.entity)
        break
      case 'insert':
        result = insertRecord(body.entity, body.data)
        break
      case 'update':
        result = updateRecord(body.entity, body.id, body.data)
        break
      case 'remove':
        result = removeRecord(body.entity, body.id)
        break
      case 'backup':
      case 'BACKUP_COMPLETO':
        result = backupCompleto(body)
        break
      // Acciones legadas — mantener compatibilidad
      case 'syncProductos':
      case 'SYNC_PRODUCTOS':
        result = syncEntidad('productos', body.productos || body.datos?.productos)
        break
      case 'syncCatalogos':
        result = syncEntidad('catalogos', body.catalogos || body.datos?.catalogos)
        break
      case 'syncVentas': {
        const ventas = body.ventas || body.datos?.ventas || []
        syncEntidad('ventas', ventas)
        const items = ventas.flatMap(v => (v.items || []).map(i => ({ ...i, venta_id: v.id })))
        result = syncEntidad('ventaItems', items)
        break
      }
      case 'reporte':
      case 'GET_RESUMEN':
        result = getResumen(body.periodo || body.datos?.periodo)
        break
      default:
        throw new Error('Acción desconocida: ' + action)
    }

    return json({ ok: true, ...result })
  } catch (err) {
    return json({ ok: false, error: err.message })
  }
}

function doGet(e) {
  const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')
  const secretParam = e && e.parameter && e.parameter.secret
  if (SECRET && secretParam !== SECRET) {
    return json({ ok: false, error: 'No autorizado' })
  }
  return json({ ok: true, message: 'FerreApp API activa', version: '2.0', timestamp: new Date().toISOString() })
}

// ── Resuelve nombre de hoja (conocida o dinámica) ─────────────

function _sheetName(entity) {
  return HOJAS[entity] || (entity.charAt(0).toUpperCase() + entity.slice(1))
}

// ── CRUD genérico ─────────────────────────────────────────────

function getAllRecords(entity) {
  const sheetName = _sheetName(entity)
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) return { ok: true, data: [] }

  const valores = hoja.getDataRange().getValues()
  if (valores.length < 2) return { ok: true, data: [] }

  const headers = valores[0]
  const data = valores.slice(1).map(fila => {
    const obj = {}
    headers.forEach((key, i) => { if (key) obj[key] = fila[i] })
    return obj
  })

  return { ok: true, data }
}

function insertRecord(entity, data) {
  if (!data) throw new Error('Sin datos para insertar')
  const sheetName = _sheetName(entity)
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const headers = _headers()[entity] || Object.keys(data)
  const hoja    = _getOrCreateSheet(ss, sheetName, headers)
  const mapFn   = _mappers()[entity]

  if (mapFn) {
    hoja.appendRow(mapFn(data))
  } else {
    const existingHeaders = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    hoja.appendRow(existingHeaders.map(h => (data[h] !== undefined ? data[h] : '')))
  }

  return { ok: true, id: data.id }
}

function updateRecord(entity, id, data) {
  if (!id || !data) throw new Error('id y data son requeridos')
  const sheetName = _sheetName(entity)
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) return { ok: false, error: 'Hoja no encontrada: ' + sheetName }

  const valores = hoja.getDataRange().getValues()
  const headers = valores[0]

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      headers.forEach((key, col) => {
        if (key && key in data) hoja.getRange(i + 1, col + 1).setValue(data[key])
      })
      return { ok: true, updated: 1 }
    }
  }

  return { ok: false, error: 'Registro no encontrado: ' + id }
}

function removeRecord(entity, id) {
  if (!id) throw new Error('id es requerido')
  const sheetName = _sheetName(entity)

  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName)
  if (!hoja) return { ok: false, error: 'Hoja no encontrada: ' + sheetName }

  const valores    = hoja.getDataRange().getValues()
  const headers    = valores[0]
  const activoCol  = headers.indexOf('activo')

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      if (activoCol !== -1) {
        hoja.getRange(i + 1, activoCol + 1).setValue(false) // soft-delete
      } else {
        hoja.deleteRow(i + 1) // hard-delete (tablas sin campo activo)
      }
      return { ok: true, removed: 1 }
    }
  }

  return { ok: false, error: 'Registro no encontrado: ' + id }
}

// ── Backup completo ────────────────────────────────────────────

function backupCompleto(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  _escribirHoja(ss, 'productos',       data.productos    || [])
  _escribirHoja(ss, 'clientes',        data.clientes     || [])
  _escribirHoja(ss, 'proveedores',     data.proveedores  || [])
  _escribirHoja(ss, 'movimientos',     (data.movimientos || []).map(m => {
    const prod = (data.productos || []).find(p => p.id === m.producto_id)
    return { ...m, producto_nombre: prod ? prod.nombre : '' }
  }))
  _escribirHoja(ss, 'ventas',          data.ventas || [])
  _escribirHoja(ss, 'ventaItems',      (data.ventas || []).flatMap(v => (v.items || []).map(i => ({ ...i, venta_id: v.id }))))
  _escribirHoja(ss, 'compras',         data.compras || [])
  _escribirHoja(ss, 'compraItems',     (data.compras || []).flatMap(c => (c.items || []).map(i => ({ ...i, compra_id: c.id }))))
  _escribirHoja(ss, 'cotizaciones',    data.cotizaciones || [])
  _escribirHoja(ss, 'cotizacionItems', (data.cotizaciones || []).flatMap(c => (c.items || []).map(i => ({ ...i, cotizacion_id: c.id }))))
  _escribirHoja(ss, 'cuentasCobrar',   data.cuentas_cobrar || [])
  _escribirHoja(ss, 'abonos',          data.abonos || [])
  _escribirHoja(ss, 'cajaAperturas',   data.caja_aperturas || [])
  _escribirHoja(ss, 'cajaMovimientos', data.caja_movimientos || [])
  _escribirHoja(ss, 'catalogos',       data.catalogos || [])

  if (data.empresa) {
    const hoja = _getOrCreateSheet(ss, HOJAS.empresa, _headers().empresa)
    hoja.clearContents()
    hoja.appendRow(_headers().empresa)
    hoja.appendRow(_mappers().empresa(data.empresa))
  }
  if (data.usuarios?.length) _escribirHoja(ss, 'usuarios', data.usuarios)

  return {
    mensaje: `Backup completado: ${(data.productos||[]).length} productos, `
           + `${(data.ventas||[]).length} ventas, ${(data.clientes||[]).length} clientes`,
  }
}

// ── Sync de entidad completa ───────────────────────────────────

function syncEntidad(entity, datos) {
  if (!Array.isArray(datos)) return { ok: false, error: 'datos debe ser un array' }
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  _escribirHoja(ss, entity, datos)
  return { mensaje: `${datos.length} registros sincronizados en ${entity}` }
}

// ── Reporte resumen ────────────────────────────────────────────

function getResumen(periodo) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(HOJAS.ventas)
  if (!hoja) return { total: 0, cantidad: 0, periodo: periodo || 'todos' }

  const datos  = hoja.getDataRange().getValues().slice(1)
  const hoy    = new Date()
  let filtrado = datos

  if (periodo === 'hoy' || periodo === 'dia') {
    const dStr = hoy.toDateString()
    filtrado = datos.filter(f => new Date(f[4]).toDateString() === dStr)
  } else if (periodo === 'mes') {
    filtrado = datos.filter(f => {
      const d = new Date(f[4])
      return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
    })
  }

  const total = filtrado.reduce((acc, f) => acc + (parseFloat(f[8]) || 0), 0)
  return { total, cantidad: filtrado.length, periodo: periodo || 'todos' }
}

// ── Helpers internos ──────────────────────────────────────────

/**
 * Obtiene la hoja por nombre. Si no existe, la crea con los encabezados dados.
 * Esto es lo que hace innecesario correr configurarHojas() manualmente.
 */
function _getOrCreateSheet(ss, nombre, encabezados) {
  let hoja = ss.getSheetByName(nombre)
  if (!hoja) {
    hoja = ss.insertSheet(nombre)
    if (encabezados && encabezados.length) {
      hoja.appendRow(encabezados)
      hoja.getRange(1, 1, 1, encabezados.length)
          .setBackground('#1e40af')
          .setFontColor('#ffffff')
          .setFontWeight('bold')
      hoja.setFrozenRows(1)
    }
  }
  return hoja
}

/** Sobreescribe una hoja completa con los datos dados */
function _escribirHoja(ss, entity, datos) {
  const sheetName  = HOJAS[entity]
  if (!sheetName) return
  const encabezados = _headers()[entity] || []
  const mapFn       = _mappers()[entity]
  const hoja        = _getOrCreateSheet(ss, sheetName, encabezados)

  hoja.clearContents()
  if (encabezados.length) hoja.appendRow(encabezados)
  if (datos.length && mapFn) {
    const filas = datos.map(mapFn)
    hoja.getRange(2, 1, filas.length, filas[0].length).setValues(filas)
  }
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Encabezados ───────────────────────────────────────────────
function _headers() {
  return {
    productos:         ['id','codigo','nombre','categoria','precio_compra','precio_venta','stock','stock_minimo','unidad','ubicacion','activo','creado_en'],
    clientes:          ['id','nombre','telefono','email','direccion','nit','tipo','activo','creado_en'],
    proveedores:       ['id','nit','nombre','nombre_contacto','telefono','correo','direccion','dias_credito','porcentaje_descuento','activo','creado_en'],
    ventas:            ['id','numero_venta','cliente_id','cliente_nombre','fecha','subtotal','descuento','impuesto','total','metodo_pago','estado','notas'],
    ventaItems:        ['venta_id','producto_id','nombre','cantidad','precio_unitario','subtotal'],
    pedidos:           ['id','numero_venta','cliente_id','cliente_nombre','fecha','total','estado_despacho','direccion_entrega','notas','metodo_pago'],
    compras:           ['id','numero_documento','proveedor_id','proveedor_nombre','fecha_documento','fecha_recepcion','subtotal','descuento','impuesto','total','estado'],
    compraItems:       ['compra_id','producto_id','nombre','cantidad','costo_unitario','subtotal'],
    cotizaciones:      ['id','numero_cotizacion','cliente_id','cliente_nombre','fecha','fecha_vencimiento','subtotal','descuento','impuesto','total','estado'],
    cotizacionItems:   ['cotizacion_id','producto_id','nombre','cantidad','precio_unitario','subtotal'],
    cuentasCobrar:     ['id','numero_documento','cliente_id','cliente_nombre','fecha_emision','fecha_vencimiento','monto_original','monto_pagado','saldo','estado'],
    abonos:            ['id','cuenta_por_cobrar_id','usuario_id','monto','metodo_pago','referencia','fecha','notas'],
    cajaAperturas:     ['id','usuario_id','usuario_nombre','fecha_apertura','fecha_cierre','monto_apertura','monto_esperado','monto_real','diferencia','estado'],
    cajaMovimientos:   ['id','apertura_caja_id','usuario_id','tipo','monto','concepto','referencia','fecha'],
    movimientos:       ['id','producto_id','producto_nombre','tipo','cantidad','motivo','referencia','fecha'],
    empresa:           ['nit','nombre_comercial','razon_social','direccion_fiscal','telefono','correo_electronico','regimen_tributario','moneda_codigo','iva_porcentaje'],
    usuarios:          ['id','nombre','email','password_hash','rol','activo','creado_en'],
    catalogos:         ['tipo','codigo','valor','descripcion','orden'],
  }
}

// ── Mappers (objeto → fila de Sheet) ──────────────────────────
function _mappers() {
  return {
    productos:       p => [p.id,p.codigo,p.nombre,p.categoria,p.precio_compra,p.precio_venta,p.stock,p.stock_minimo,p.unidad,p.ubicacion||'',p.activo,p.creado_en],
    clientes:        c => [c.id,c.nombre,c.telefono,c.email,c.direccion,c.nit,c.tipo,c.activo,c.creado_en],
    proveedores:     p => [p.id,p.nit,p.nombre,p.nombre_contacto,p.telefono,p.correo,p.direccion,p.dias_credito,p.porcentaje_descuento,p.activo,p.creado_en],
    ventas:          v => [v.id,v.numero_venta,v.cliente_id,v.cliente_nombre||'',v.fecha,v.subtotal,v.descuento,v.impuesto,v.total,v.metodo_pago,v.estado,v.notas||''],
    ventaItems:      i => [i.venta_id,i.producto_id,i.nombre,i.cantidad,i.precio_unitario,i.subtotal],
    pedidos:         p => [p.id,p.numero_venta,p.cliente_id,p.cliente_nombre||'',p.fecha,p.total,p.estado_despacho||'pendiente',p.direccion_entrega||'',p.notas||'',p.metodo_pago||''],
    compras:         c => [c.id,c.numero_documento,c.proveedor_id,c.proveedor_nombre||'',c.fecha_documento,c.fecha_recepcion,c.subtotal,c.descuento,c.impuesto,c.total,c.estado],
    compraItems:     i => [i.compra_id,i.producto_id,i.nombre,i.cantidad,i.costo_unitario,i.subtotal],
    cotizaciones:    c => [c.id,c.numero_cotizacion,c.cliente_id,c.cliente_nombre||'',c.fecha,c.fecha_vencimiento,c.subtotal,c.descuento,c.impuesto,c.total,c.estado],
    cotizacionItems: i => [i.cotizacion_id,i.producto_id,i.nombre,i.cantidad,i.precio_unitario,i.subtotal],
    cuentasCobrar:   c => [c.id,c.numero_documento,c.cliente_id,c.cliente_nombre||'',c.fecha_emision,c.fecha_vencimiento,c.monto_original,c.monto_pagado,c.saldo,c.estado],
    abonos:          a => [a.id,a.cuenta_por_cobrar_id,a.usuario_id,a.monto,a.metodo_pago,a.referencia||'',a.fecha,a.notas||''],
    cajaAperturas:   c => [c.id,c.usuario_id,c.usuario_nombre||'',c.fecha_apertura,c.fecha_cierre||'',c.monto_apertura,c.monto_esperado,c.monto_real,c.diferencia,c.estado],
    cajaMovimientos: m => [m.id,m.apertura_caja_id,m.usuario_id,m.tipo,m.monto,m.concepto,m.referencia||'',m.fecha],
    movimientos:     m => [m.id,m.producto_id,m.producto_nombre||'',m.tipo,m.cantidad,m.motivo,m.referencia||'',m.fecha],
    empresa:         e => [e.nit,e.nombre_comercial,e.razon_social,e.direccion_fiscal,e.telefono,e.correo_electronico,e.regimen_tributario,e.moneda_codigo,e.iva_porcentaje],
    usuarios:        u => [u.id,u.nombre,u.email,u.password_hash||'',u.rol,u.activo,u.creado_en],
    catalogos:       c => [c.tipo||'',c.codigo||'',c.valor||'',c.descripcion||'',c.orden||0],
  }
}
