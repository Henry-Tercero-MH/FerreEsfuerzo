/**
 * db.js — Servicio central de datos (Google Sheets como fuente de verdad)
 * ========================================================================
 * - Al iniciar:   carga desde Google Sheets y guarda en localStorage como cache.
 * - CRUD:         escribe en localStorage primero (UI instantánea), luego sube al Sheet.
 * - Offline:      opera sobre el cache local y encola operaciones pendientes.
 * - Reconexión:   procesa la cola y refresca el cache desde el Sheet.
 *
 * Claves de localStorage:
 *   ferreapp_<entity>          → cache de datos
 *   ferreapp_<entity>_ts       → timestamp de última carga desde Sheet
 *   ferreapp_pending_queue     → cola de operaciones pendientes
 */

import { gasGetAll, gasInsert, gasUpdate, gasRemove } from './googleAppsScript'
import { shortId } from '../utils/formatters'

// ── Estado interno ────────────────────────────────────────────
export let _online  = typeof navigator !== 'undefined' ? navigator.onLine : true
export let _syncing = false
export const _listeners = new Set()

export function _notify() {
  _listeners.forEach(fn => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    _online = true
    _notify()
    syncPending().then(() => refreshAll())
  })
  window.addEventListener('offline', () => {
    _online = false
    _notify()
  })
}

// ── Cache local ───────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos: refresca desde Sheet si el cache es más viejo

function lsKey(entity)   { return `ferreapp_${entity}` }
function lsTsKey(entity) { return `ferreapp_${entity}_ts` }

function lsGet(entity) {
  try { return JSON.parse(localStorage.getItem(lsKey(entity)) || '[]') } catch { return [] }
}

function lsSet(entity, data) {
  localStorage.setItem(lsKey(entity), JSON.stringify(data))
  localStorage.setItem(lsTsKey(entity), Date.now().toString())
}

function lsIsStale(entity) {
  const ts = parseInt(localStorage.getItem(lsTsKey(entity)) || '0', 10)
  return Date.now() - ts > CACHE_TTL_MS
}

// ── Cola pendiente ────────────────────────────────────────────
const QUEUE_KEY = 'ferreapp_pending_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

function enqueue(action, entity, data, recordId = null) {
  const q = getQueue()
  q.push({ id: shortId(), action, entity, data, recordId, timestamp: Date.now() })
  saveQueue(q)
  _notify()
}

// ── Operaciones CRUD ──────────────────────────────────────────

/**
 * Obtiene todos los registros de una entidad.
 * - Si hay internet y el cache es viejo (> 5 min), recarga desde Sheet.
 * - Si no hay internet o la carga falla, sirve desde cache.
 */
async function getAll(entity) {
  if (_online && lsIsStale(entity)) {
    try {
      const res = await gasGetAll(entity)
      if (res.ok && Array.isArray(res.data)) {
        lsSet(entity, res.data)
        return res.data
      }
    } catch {
      // caída silenciosa: servir desde cache
    }
  }
  return lsGet(entity)
}

/**
 * Fuerza recarga desde Sheet sin importar el TTL.
 * Usado al abrir la app o al reconectar.
 */
async function forceRefresh(entity) {
  if (!_online) return lsGet(entity)
  try {
    const res = await gasGetAll(entity)
    if (res.ok && Array.isArray(res.data)) {
      lsSet(entity, res.data)
      _notify()
      return res.data
    }
  } catch {
    // servir desde cache
  }
  return lsGet(entity)
}

async function insert(entity, data) {
  const record = { ...data, id: data.id || shortId() }

  // 1. Cache local primero (UI instantánea)
  const list = lsGet(entity)
  list.push(record)
  lsSet(entity, list)

  if (_online) {
    try {
      await gasInsert(entity, record)
      // Items relacionados en hojas separadas
      if (entity === 'ventas' && record.items?.length) {
        await Promise.all(record.items.map(item =>
          gasInsert('ventaItems', { ...item, venta_id: record.id })
        ))
      }
      if (entity === 'cotizaciones' && record.items?.length) {
        await Promise.all(record.items.map(item =>
          gasInsert('cotizacionItems', { ...item, cotizacion_id: record.id })
        ))
      }
      if (entity === 'compras' && record.items?.length) {
        await Promise.all(record.items.map(item =>
          gasInsert('compraItems', { ...item, compra_id: record.id })
        ))
      }
      _notify()
      return record
    } catch {
      // offline o error — encolar
    }
  }

  enqueue('insert', entity, record, record.id)
  return record
}

async function update(entity, id, data) {
  // 1. Cache local
  const list = lsGet(entity).map(item =>
    item.id === id ? { ...item, ...data } : item
  )
  lsSet(entity, list)

  if (_online) {
    try {
      await gasUpdate(entity, id, data)
      _notify()
      return
    } catch {
      // encolar
    }
  }

  enqueue('update', entity, data, id)
}

async function remove(entity, id) {
  // Soft-delete en cache local
  const list = lsGet(entity).map(item =>
    item.id === id ? { ...item, activo: false } : item
  )
  lsSet(entity, list)

  if (_online) {
    try {
      await gasRemove(entity, id)
      _notify()
      return
    } catch {
      // encolar
    }
  }

  enqueue('remove', entity, null, id)
}

// ── Sincronización de cola ────────────────────────────────────
export async function syncPending() {
  if (_syncing || !_online) return
  const queue = getQueue()
  if (!queue.length) return

  _syncing = true
  _notify()

  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp)

  for (const item of sorted) {
    try {
      if (item.action === 'insert')      await gasInsert(item.entity, item.data)
      else if (item.action === 'update') await gasUpdate(item.entity, item.recordId, item.data)
      else if (item.action === 'remove') await gasRemove(item.entity, item.recordId)

      const current = getQueue()
      saveQueue(current.filter(q => q.id !== item.id))
    } catch {
      break // si falla, reintenta la próxima vez
    }
  }

  _syncing = false
  _notify()
}

// ── Refresh masivo al abrir/reconectar ───────────────────────
const ENTIDADES_PRINCIPALES = [
  'productos', 'clientes', 'proveedores', 'ventas',
  'compras', 'cotizaciones', 'movimientos', 'catalogos',
  'cuentasCobrar', 'abonos', 'cajaAperturas', 'cajaMovimientos',
  'empresa', 'usuarios',
]

/**
 * Recarga todas las entidades desde Google Sheets.
 * Se llama al iniciar la app (si hay internet) y al reconectar.
 */
export async function refreshAll() {
  if (!_online) return
  // Forzar stale para que forceRefresh recargue todo
  await Promise.allSettled(
    ENTIDADES_PRINCIPALES.map(entity => forceRefresh(entity))
  )
  _notify()
}

// ── Objeto db exportado ───────────────────────────────────────
export const db = {
  getAll,
  forceRefresh,
  insert,
  update,
  remove,
  refreshAll,
}
