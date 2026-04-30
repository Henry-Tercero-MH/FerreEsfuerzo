/**
 * useSyncStatus — Hook de estado de sincronización offline/online
 * ================================================================
 * Escucha los eventos online/offline del navegador y el estado
 * interno de la cola pendiente de db.js.
 *
 * Retorna: { online, pendingCount, syncing, syncNow }
 */

import { useState, useEffect, useCallback } from 'react'
import { _online, _syncing, _listeners, getQueue, syncPending } from '../services/db'

export function useSyncStatus() {
  const [state, setState] = useState(() => ({
    online: _online,
    pendingCount: getQueue().length,
    syncing: _syncing,
  }))

  const refresh = useCallback(() => {
    const queue = getQueue()
    const errors = queue.filter(i => i.error)
    setState({
      online: _online,
      pendingCount: queue.length,
      syncing: _syncing,
      errorCount: errors.length,
      errorList: errors,
    })
  }, [])

  useEffect(() => {
    _listeners.add(refresh)

    // También escuchar directamente los eventos del navegador
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)

    return () => {
      _listeners.delete(refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [refresh])

  return {
    online: state.online,
    pendingCount: state.pendingCount,
    syncing: state.syncing,
    errorCount: state.errorCount || 0,
    getErrorList: () => state.errorList || [],
    syncNow: syncPending,
  }
}
