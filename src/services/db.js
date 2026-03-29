/**
 * db.js — Servicio central de datos (offline-first)
 * ===================================================
 * - Online:  lee/escribe en Google Sheets via Apps Script Y actualiza localStorage.
 * - Offline: lee/escribe solo en localStorage y encola la operación pendiente.
 * - Reconexión: procesa automáticamente la cola pendiente.
 *
 * Claves de localStorage:
 *   ferreapp_<entity>          → caché de datos
 *   ferreapp_pending_queue     → cola de operaciones pendientes
 */

import { gasGetAll, gasInsert, gasUpdate, gasRemove } from './googleAppsScript'
import { shortId } from '../utils/formatters'

// ── Estado interno ────────────────────────────────────────────
export let _online = typeof navigator !== 'undefined' ? navigator.onLine : true
export let _syncing = false
export const _listeners = new Set()

export function _notify() {
  _listeners.forEach(fn => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    _online = true
    _notify()
    syncPending()
  })
  window.addEventListener('offline', () => {
    _online = false
    _notify()
  })
}

// ── Cola pendiente ────────────────────────────────────────────
const QUEUE_KEY = 'ferreapp_pending_queue'

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function enqueue(action, entity, data, recordId = null) {
  const queue = getQueue()
  queue.push({
    id: shortId(),
    action,     // 'insert' | 'update' | 'remove'
    entity,
    data,
    recordId,
    timestamp: Date.now(),
  })
  saveQueue(queue)
  _notify()
}

// ── localStorage cache ────────────────────────────────────────
function lsKey(entity) {
  return `ferreapp_${entity}`
}

function lsGet(entity) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(entity)) || '[]')
  } catch {
    return []
  }
}

function lsSet(entity, data) {
  localStorage.setItem(lsKey(entity), JSON.stringify(data))
}

// ── Operaciones CRUD ─────────────────────────────────────────
async function getAll(entity) {
  if (_online) {
    try {
      const res = await gasGetAll(entity)
      if (res.ok && Array.isArray(res.data)) {
        lsSet(entity, res.data)
        return res.data
      }
    } catch {
      // caída silenciosa: servir desde caché
    }
  }
  return lsGet(entity)
}

async function insert(entity, data) {
  const record = { ...data, id: data.id || shortId() }

  // Actualizar caché local primero
  const list = lsGet(entity)
  list.push(record)
  lsSet(entity, list)

  if (_online) {
    try {
      await gasInsert(entity, record)
      // Si es una venta, insertar también los items en VentaItems
      if (entity === 'ventas' && record.items && record.items.length) {
        await Promise.all(record.items.map(item =>
          gasInsert('ventaItems', { ...item, venta_id: record.id })
        ))
      }
      _notify()
      return record  // éxito — no encolar
    } catch {
      // offline o error — encolar
    }
  }

  // Solo llega aquí si offline o si falló el request
  enqueue('insert', entity, record, record.id)
  return record
}

async function update(entity, id, data) {
  // Actualizar caché local
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
  // Soft-delete en caché local
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

  // Ordenar por timestamp (más antiguo primero)
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp)

  for (const item of sorted) {
    try {
      if (item.action === 'insert') {
        await gasInsert(item.entity, item.data)
      } else if (item.action === 'update') {
        await gasUpdate(item.entity, item.recordId, item.data)
      } else if (item.action === 'remove') {
        await gasRemove(item.entity, item.recordId)
      }

      // Eliminar de la cola al tener éxito
      const current = getQueue()
      saveQueue(current.filter(q => q.id !== item.id))
    } catch {
      // Si falla, detener y reintentar la próxima vez
      break
    }
  }

  _syncing = false
  _notify()
}

// ── Objeto db exportado ───────────────────────────────────────
export const db = {
  getAll,
  insert,
  update,
  remove,
}
