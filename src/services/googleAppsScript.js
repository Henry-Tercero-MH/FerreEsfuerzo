/**
 * Servicio de integración con Google Apps Script
 * El script de Google Sheets debe estar desplegado como Web App (ejecutar como: yo, acceso: cualquiera)
 * URL se configura en .env → VITE_APPS_SCRIPT_URL
 */

const URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''

async function post(action, payload) {
  if (!URL) throw new Error('VITE_APPS_SCRIPT_URL no configurada')
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

/**
 * Envía un backup completo de todos los datos al Google Sheet.
 * El Apps Script crea/sobreescribe una hoja por cada colección.
 */
export async function backupCompleto({ productos, ventas, clientes, movimientos, catalogos }) {
  return post('backup', { productos, ventas, clientes, movimientos, catalogos, fecha: new Date().toISOString() })
}

/**
 * Sincroniza solo los catálogos (categorías, unidades, métodos de pago).
 */
export async function sincronizarCatalogos(catalogos) {
  return post('syncCatalogos', { catalogos, fecha: new Date().toISOString() })
}

/**
 * Sincroniza solo las ventas del día actual.
 */
export async function sincronizarVentasHoy(ventas) {
  const hoy = new Date().toDateString()
  const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy)
  return post('syncVentas', { ventas: ventasHoy })
}

/**
 * Obtiene el último reporte desde el sheet (opcional, si el script lo expone).
 */
export async function obtenerReporteSheet(periodo = 'mes') {
  return post('reporte', { periodo })
}

export const appsScript = { backupCompleto, sincronizarVentasHoy, sincronizarCatalogos, obtenerReporteSheet }
