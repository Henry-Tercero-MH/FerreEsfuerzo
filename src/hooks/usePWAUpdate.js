import { useState, useEffect } from 'react'

/**
 * Detecta cuando hay un nuevo Service Worker esperando (actualización disponible).
 * Devuelve { updateAvailable, applyUpdate }.
 * Al llamar applyUpdate(), el SW toma el control y recarga la página.
 */
export function usePWAUpdate() {
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const detectUpdate = (reg) => {
      // Ya hay un SW esperando al cargar la página
      if (reg.waiting) {
        setWaitingWorker(reg.waiting)
        return
      }
      // Escucha futuras actualizaciones
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
          }
        })
      })
    }

    navigator.serviceWorker.ready.then(detectUpdate)

    // Cuando el SW activa (tras skipWaiting), recarga la página
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  return { updateAvailable: !!waitingWorker, applyUpdate }
}
