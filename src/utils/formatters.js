import { MONEDA } from './constants'

export const formatCurrency = (amount = 0) =>
  `${MONEDA} ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const formatNumber = (n = 0) =>
  Number(n).toLocaleString('es-GT')

export const shortId = () =>
  Math.random().toString(36).slice(2, 9).toUpperCase()

export const generateNumeroVenta = (count) =>
  `VTA-${String(count).padStart(6, '0')}`

export const generateNumeroDocumento = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${shortId().slice(0, 4)}`

export const generateCodigoProducto = () =>
  `PROD-${Date.now().toString(36).toUpperCase()}`
