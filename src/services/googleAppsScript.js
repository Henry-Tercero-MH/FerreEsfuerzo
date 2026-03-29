/**
 * googleAppsScript.js — Cliente HTTP para Google Apps Script
 * ===========================================================
 * Todas las llamadas pasan por este módulo.
 * La URL del Web App se configura en .env → VITE_APPS_SCRIPT_URL
 */

const GAS_URL    = import.meta.env.VITE_APPS_SCRIPT_URL || ''
const GAS_SECRET = import.meta.env.VITE_GAS_SECRET      || ''

// ── Utilidad de hash ──────────────────────────────────────────

/**
 * Devuelve el hash SHA-256 (hex) de un string usando la Web Crypto API.
 * Se usa para contraseñas antes de guardarlas o compararlas.
 */
export async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Transporte genérico ───────────────────────────────────────

/**
 * Realiza una solicitud POST al Apps Script.
 * @param {string} action  — nombre de la acción (campo "action" en el body)
 * @param {object} payload — datos adicionales mezclados en el body
 */
async function post(action, payload = {}) {
  if (!GAS_URL) throw new Error('VITE_APPS_SCRIPT_URL no está configurada')
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, secret: GAS_SECRET, ...payload }),
  })
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

// ── CRUD genérico ─────────────────────────────────────────────

/**
 * Obtiene todos los registros de una entidad.
 * Respuesta esperada: { ok: true, data: [...] }
 */
export async function gasGetAll(entity) {
  return post('getAll', { entity })
}

/**
 * Inserta un nuevo registro.
 * @param {string} entity
 * @param {object} data — objeto completo con id ya generado
 */
export async function gasInsert(entity, data) {
  return post('insert', { entity, data })
}

/**
 * Actualiza un registro existente.
 * @param {string} entity
 * @param {string} id    — id del registro a actualizar
 * @param {object} data  — campos a actualizar (puede ser parcial)
 */
export async function gasUpdate(entity, id, data) {
  return post('update', { entity, id, data })
}

/**
 * Elimina (soft-delete) un registro.
 * @param {string} entity
 * @param {string} id
 */
export async function gasRemove(entity, id) {
  return post('remove', { entity, id })
}

/**
 * Envía un backup completo de todos los datos al Google Sheet.
 * El Apps Script crea/sobreescribe una hoja por cada colección.
 */
export async function gasBackupCompleto({ productos, ventas, clientes, movimientos, catalogos, ...rest }) {
  return post('backup', {
    productos,
    ventas,
    clientes,
    movimientos,
    catalogos,
    ...rest,
    fecha: new Date().toISOString(),
  })
}

// ── Funciones de sincronización legadas ──────────────────────

/**
 * Sincroniza solo los catálogos (categorías, unidades, métodos de pago).
 */
export async function sincronizarCatalogos(catalogos) {
  return post('syncCatalogos', { catalogos, fecha: new Date().toISOString() })
}

/**
 * Sincroniza las ventas del día actual.
 */
export async function sincronizarVentasHoy(ventas) {
  const hoy = new Date().toDateString()
  const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy)
  return post('syncVentas', { ventas: ventasHoy })
}

/**
 * Obtiene un reporte resumido desde el sheet.
 */
export async function obtenerReporteSheet(periodo = 'mes') {
  return post('reporte', { periodo })
}

// ── Test de conexión ─────────────────────────────────────────

/**
 * Verifica que la URL esté configurada y que el secret sea válido.
 * Hace un GET simple — no escribe nada en el Sheet.
 * Retorna { ok: true } o { ok: false, error: '...' }
 */
export async function testConexion() {
  if (!GAS_URL) return { ok: false, error: 'VITE_APPS_SCRIPT_URL no está configurada' }
  try {
    const url = GAS_SECRET ? `${GAS_URL}?secret=${encodeURIComponent(GAS_SECRET)}` : GAS_URL
    const res = await fetch(url, { method: 'GET' })
    const data = await res.json()
    return data
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar: ' + err.message }
  }
}

// ── Alias de compatibilidad ───────────────────────────────────
export const backupCompleto = gasBackupCompleto

export const appsScript = {
  gasGetAll,
  gasInsert,
  gasUpdate,
  gasRemove,
  gasBackupCompleto,
  backupCompleto,
  sincronizarCatalogos,
  sincronizarVentasHoy,
  obtenerReporteSheet,
}
