/**
 * auditoria.js — Servicio de auditoría
 * =====================================
 * Registra eventos importantes del sistema en la hoja "Auditoria" de Google Sheets
 * y en localStorage como respaldo.
 *
 * Uso:
 *   import { auditar } from '../services/auditoria'
 *   auditar({ accion: 'venta_creada', entidad: 'ventas', entidad_id: venta.id, descripcion: '...', sesion })
 */

import { gasInsert } from './googleAppsScript'
import { shortId } from '../utils/formatters'

const LS_KEY = 'ferreapp_auditoria'

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function lsSet(data) {
  // Guardar solo los últimos 500 registros en local para no saturar
  const recortado = data.slice(-500)
  localStorage.setItem(LS_KEY, JSON.stringify(recortado))
}

/**
 * Registra un evento de auditoría.
 * @param {object} opts
 * @param {string} opts.accion        — Identificador de la acción (ej: 'venta_creada')
 * @param {string} opts.entidad       — Entidad afectada (ej: 'ventas')
 * @param {string} [opts.entidad_id]  — ID del registro afectado
 * @param {string} opts.descripcion   — Texto legible del evento
 * @param {object} [opts.detalle]     — Datos extra (totales, cambios, etc.)
 * @param {object} [opts.sesion]      — Objeto de sesión { id, nombre, rol }
 */
export function auditar({ accion, entidad, entidad_id = '', descripcion, detalle = null, sesion = null }) {
  const registro = {
    id:             `aud-${shortId()}`,
    fecha:          new Date().toISOString(),
    usuario_id:     sesion?.id     || 'sistema',
    usuario_nombre: sesion?.nombre || 'Sistema',
    usuario_rol:    sesion?.rol    || '',
    accion,
    entidad,
    entidad_id:     String(entidad_id),
    descripcion,
    detalle:        detalle ? JSON.stringify(detalle) : '',
  }

  // 1. Guardar en localStorage
  const lista = lsGet()
  lista.push(registro)
  lsSet(lista)

  // 2. Enviar al Sheet en background (sin bloquear UI)
  gasInsert('auditoria', registro).catch(() => {})

  return registro
}

/**
 * Obtiene el log local de auditoría (para la pantalla de auditoría).
 */
export function getAuditoriaLocal() {
  return lsGet().reverse() // más recientes primero
}
