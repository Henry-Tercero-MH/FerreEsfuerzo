export const isRequired = (val) => val !== undefined && val !== null && String(val).trim() !== ''

export const isPositiveNumber = (val) => !isNaN(val) && Number(val) > 0

export const isNonNegative = (val) => !isNaN(val) && Number(val) >= 0

export const isEmail = (val) =>
  !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())

export const isPhone = (val) =>
  !val || /^[\d\s\-+()]{7,15}$/.test(String(val).trim())

export const isURL = (val) =>
  !val || /^https?:\/\/.+\..+/.test(String(val).trim())

export const isNIT = (val) =>
  !val || /^[\dA-Za-z][\d]{3,9}[-]?[\dKk]$/.test(String(val).trim().replace(/\s/g, ''))

export const isFutureDate = (val) =>
  !val || new Date(val) >= new Date(new Date().toISOString().split('T')[0])

export const isPercentage = (val) =>
  !isNaN(val) && Number(val) >= 0 && Number(val) <= 100

// ── Producto ───────────────────────────────────────────────────
export const validateProducto = (data, productos = [], modoEditar = false) => {
  const errors = {}
  if (!isRequired(data.nombre))              errors.nombre       = 'El nombre es requerido'
  if (!isRequired(data.categoria))           errors.categoria    = 'La categoría es requerida'
  if (!isPositiveNumber(data.precio_venta))  errors.precio_venta = 'El precio de venta debe ser mayor a 0'
  if (!isNonNegative(data.stock))            errors.stock        = 'El stock no puede ser negativo'
  if (!isNonNegative(data.stock_minimo))     errors.stock_minimo = 'El stock mínimo no puede ser negativo'

  const pc = Number(data.precio_compra)
  const pv = Number(data.precio_venta)
  if (data.precio_compra !== '' && data.precio_compra !== undefined) {
    if (!isNonNegative(data.precio_compra))  errors.precio_compra = 'El precio de compra no puede ser negativo'
    else if (pc > 0 && pv > 0 && pv < pc)   errors.precio_venta  = 'El precio de venta no puede ser menor al costo'
  }

  // Código duplicado
  if (data.codigo?.trim()) {
    const duplicado = productos.find(p =>
      p.codigo?.toLowerCase() === data.codigo.trim().toLowerCase() &&
      (!modoEditar || p.id !== data.id)
    )
    if (duplicado) errors.codigo = 'Ya existe un producto con este código'
  }

  return errors
}

// ── Cliente ────────────────────────────────────────────────────
export const validateCliente = (data, clientes = [], modoEditar = false) => {
  const errors = {}
  if (!isRequired(data.nombre))  errors.nombre   = 'El nombre es requerido'
  if (!isPhone(data.telefono))   errors.telefono = 'Teléfono inválido'
  if (!isEmail(data.email))      errors.email    = 'Email inválido'

  // Nombre duplicado
  if (data.nombre?.trim()) {
    const nombreDup = clientes.find(c =>
      c.nombre?.trim().toLowerCase() === data.nombre.trim().toLowerCase() &&
      (!modoEditar || c.id !== data.id)
    )
    if (nombreDup) errors.nombre = 'Ya existe un cliente con ese nombre'
  }

  // NIT duplicado
  const nitCliente = String(data.nit ?? '').trim()
  if (nitCliente && nitCliente.toUpperCase() !== 'CF') {
    const duplicado = clientes.find(c =>
      String(c.nit ?? '').toLowerCase() === nitCliente.toLowerCase() &&
      (!modoEditar || c.id !== data.id)
    )
    if (duplicado) errors.nit = 'Ya existe un cliente con este NIT'
  }

  return errors
}

// ── Proveedor ──────────────────────────────────────────────────
export const validateProveedor = (data, proveedores = [], modoEditar = false) => {
  const errors = {}
  if (!isRequired(data.nombre))  errors.nombre = 'El nombre es requerido'
  if (!isRequired(data.nit))     errors.nit    = 'El NIT es requerido'
  if (!isEmail(data.correo))     errors.correo = 'Correo inválido'
  if (!isPhone(data.telefono))   errors.telefono = 'Teléfono inválido'
  if (!isURL(data.sitio_web))    errors.sitio_web = 'URL inválida (debe iniciar con http://)'

  const dc = Number(data.dias_credito)
  if (isNaN(dc) || dc < 0)       errors.dias_credito = 'Los días de crédito no pueden ser negativos'

  const pd = Number(data.porcentaje_descuento)
  if (isNaN(pd) || pd < 0 || pd > 100) errors.porcentaje_descuento = 'El descuento debe estar entre 0 y 100'

  // NIT duplicado
  const nitStr = String(data.nit ?? '').trim()
  if (nitStr) {
    const duplicado = proveedores.find(p =>
      String(p.nit ?? '').toLowerCase() === nitStr.toLowerCase() &&
      (!modoEditar || p.id !== data.id)
    )
    if (duplicado) errors.nit = 'Ya existe un proveedor con este NIT'
  }

  return errors
}

// ── Compra ─────────────────────────────────────────────────────
export const validateCompra = (data, comprasExistentes = []) => {
  const errors = {}
  if (!isRequired(data.proveedor_id))        errors.proveedor_id      = 'Proveedor requerido'
  if (!isRequired(data.numero_documento))    errors.numero_documento  = 'Número de documento requerido'
  else {
    const duplicado = comprasExistentes.some(c =>
      String(c.numero_documento).trim().toLowerCase() === String(data.numero_documento).trim().toLowerCase()
    )
    if (duplicado) errors.numero_documento = 'Ya existe una compra con ese número de documento'
  }
  if (!isPositiveNumber(data.subtotal))      errors.subtotal          = 'El subtotal debe ser mayor a 0'

  const sub = Number(data.subtotal) || 0
  const desc = Number(data.descuento) || 0
  if (desc < 0)                              errors.descuento         = 'El descuento no puede ser negativo'
  if (desc > sub)                            errors.descuento         = 'El descuento no puede superar el subtotal'

  return errors
}

// ── Configuración empresa ──────────────────────────────────────
export const validateEmpresa = (data) => {
  const errors = {}
  if (!isRequired(data.nit))               errors.nit              = 'El NIT es requerido'
  if (!isRequired(data.nombre_comercial))  errors.nombre_comercial = 'El nombre comercial es requerido'
  if (!isRequired(data.razon_social))      errors.razon_social     = 'La razón social es requerida'
  if (!isRequired(data.direccion_fiscal))  errors.direccion_fiscal = 'La dirección fiscal es requerida'
  if (!isEmail(data.correo_electronico))   errors.correo_electronico = 'Correo inválido'
  if (!isPhone(data.telefono))             errors.telefono         = 'Teléfono inválido'
  if (!isURL(data.sitio_web))              errors.sitio_web        = 'URL inválida'

  const iva = Number(data.iva_porcentaje)
  if (isNaN(iva) || iva < 0 || iva > 100) errors.iva_porcentaje   = 'El IVA debe estar entre 0 y 100'

  return errors
}
