export const CATEGORIAS = [
  'Herramientas Manuales',
  'Herramientas Eléctricas',
  'Fijaciones y Tornillería',
  'Plomería',
  'Electricidad',
  'Pintura y Acabados',
  'Construcción',
  'Seguridad',
  'Jardinería',
  'Otros',
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

export const IMPUESTO_DEFAULT = 0.12 // 12% IVA
export const MONEDA = 'Q'            // Quetzal guatemalteco

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''
