/**
 * SyncStatusBar — Barra de estado de sincronización
 * ===================================================
 * Muestra el estado de conexión y cambios pendientes de sync.
 *
 * Estados posibles:
 *   🟢 En línea y sincronizado
 *   🟡 En línea con cambios pendientes
 *   🔴 Sin conexión (trabajando localmente)
 */

import { useState } from 'react'
import { useSyncStatus } from '../hooks/useSyncStatus'
import Modal from './ui/Modal'
import Button from './ui/Button'

export default function SyncStatusBar() {
  const { online, pendingCount, syncing, syncNow, errorCount, getErrorList } = useSyncStatus()
  const [open, setOpen] = useState(false)

  // Determinar estado visual
  let dotColor, message

  if (!online) {
    dotColor = 'bg-red-500'
    message = 'Sin conexión — trabajando localmente'
  } else if (pendingCount > 0) {
    dotColor = 'bg-yellow-400'
    message = `${pendingCount} ${pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}`
  } else {
    dotColor = 'bg-green-500'
    message = 'En línea'
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm select-none">
      {/* Indicador de estado */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {/* Pulso animado cuando hay pendientes o se está sincronizando */}
        {(pendingCount > 0 || syncing) && online && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
      </span>

      {/* Texto de estado */}
      <span className={`${!online ? 'text-red-600' : pendingCount > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
        {syncing ? 'Sincronizando…' : message}
      </span>

      {/* Botón de sincronizar manual */}
      {online && pendingCount > 0 && !syncing && (
        <button
          onClick={syncNow}
          className="ml-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 active:bg-yellow-300 transition-colors border border-yellow-300"
        >
          Sincronizar
        </button>
      )}

      {/* Mostrar errores de sync (reintentos agotados) */}
      {errorCount > 0 && (
        <>
          <button
            onClick={() => setOpen(true)}
            className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 border border-red-300"
            title="Ver errores de sincronización"
          >
            {errorCount} {errorCount === 1 ? 'error' : 'errores'}
          </button>

          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title={`Errores de sincronización (${errorCount})`}
            size="md"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
                <Button variant="primary" onClick={() => { syncNow(); setOpen(false) }}>Reintentar</Button>
              </>
            )}
          >
            <div className="space-y-3">
              {getErrorList().length === 0 ? (
                <p className="text-sm text-gray-600">No hay detalles disponibles.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {getErrorList().map((it, idx) => (
                    <li key={idx} className="py-2">
                      <div className="text-sm font-medium text-gray-900">{it.entity} {it.recordId || it.data?.id || ''}</div>
                      <div className="text-xs text-gray-500">{it.error}</div>
                      {it.fechaError && <div className="text-xs text-gray-400">{it.fechaError}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Modal>
        </>
      )}

      {/* Spinner mientras sincroniza */}
      {syncing && (
        <svg
          className="animate-spin h-3.5 w-3.5 text-blue-500 ml-1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
    </div>
  )
}
