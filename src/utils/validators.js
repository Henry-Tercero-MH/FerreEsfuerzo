export const isRequired = (val) => val !== undefined && val !== null && String(val).trim() !== ''

export const isPositiveNumber = (val) => !isNaN(val) && Number(val) > 0

export const isNonNegative = (val) => !isNaN(val) && Number(val) >= 0

export const isEmail = (val) =>
  !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

export const isPhone = (val) =>
  !val || /^[\d\s\-+()]{7,15}$/.test(val)

export const validateProducto = (data) => {
  const errors = {}
  if (!isRequired(data.nombre))        errors.nombre       = 'El nombre es requerido'
  if (!isPositiveNumber(data.precio_venta)) errors.precio_venta = 'Precio de venta inválido'
  if (!isNonNegative(data.stock))      errors.stock        = 'Stock no puede ser negativo'
  if (!isRequired(data.categoria))     errors.categoria    = 'La categoría es requerida'
  return errors
}

export const validateCliente = (data) => {
  const errors = {}
  if (!isRequired(data.nombre))        errors.nombre = 'El nombre es requerido'
  if (!isPhone(data.telefono))         errors.telefono = 'Teléfono inválido'
  if (!isEmail(data.email))            errors.email = 'Email inválido'
  return errors
}
