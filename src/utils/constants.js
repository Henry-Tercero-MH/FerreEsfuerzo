export const CATEGORIAS = [
  'Herramientas Manuales',
  'Herramientas Eléctricas',
  'Accesorios para Herramientas',
  'Materiales de Construcción',
  'Materiales Estructurales',
  'Materiales para Techos',
  'Tornillería y Fijaciones',
  'Plomería',
  'Electricidad',
  'Pintura y Acabados',
  'Acabados de Construcción',
  'Seguridad y Cerrajería',
  'Seguridad Industrial',
  'Jardinería',
  'Herramientas Agrícolas',
  'Adhesivos y Químicos',
  'Limpieza y Mantenimiento',
  'Carpintería y Madera',
  'Equipos Especiales',
  'Consumibles',
]

export const METODOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'tarjeta',      label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito',      label: 'Crédito' },
]

export const ESTADOS_VENTA = {
  completada: { label: 'Completada', badge: 'badge-green' },
  pendiente:  { label: 'Pendiente',  badge: 'badge-yellow' },
  cancelada:  { label: 'Cancelada',  badge: 'badge-red' },
  credito:    { label: 'Crédito',    badge: 'badge-blue' },
}

export const TIPOS_MOVIMIENTO = {
  entrada:  { label: 'Entrada',  color: 'text-green-600' },
  salida:   { label: 'Salida',   color: 'text-red-600' },
  ajuste:   { label: 'Ajuste',   color: 'text-yellow-600' },
}

export const TIPOS_CLIENTE = [
  { value: 'natural',  label: 'Persona Natural' },
  { value: 'empresa',  label: 'Empresa' },
  { value: 'frecuente', label: 'Cliente Frecuente' },
]

export const UNIDADES_SEED = [
  'unidad', 'par', 'caja', 'bolsa', 'saco',
  'metro', 'litro', 'galón', 'kg', 'rollo',
]

export const ESTADOS_DESPACHO = {
  pendiente:       { label: 'Pendiente',       badge: 'badge-yellow', next: 'en_preparacion' },
  en_preparacion:  { label: 'En preparación',  badge: 'badge-blue',   next: 'listo' },
  listo:           { label: 'Listo',           badge: 'badge-purple', next: 'entregado' },
  entregado:       { label: 'Entregado',       badge: 'badge-green',  next: null },
}

export const IMPUESTO_DEFAULT = 0.12 // 12% IVA
export const MONEDA = 'Q'            // Quetzal guatemalteco

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''
