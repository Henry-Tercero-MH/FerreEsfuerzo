import { useState, useEffect } from 'react'

/**
 * Detecta cuando el Service Worker tiene una nueva versión esperando.
 * Expone `updateAvailable` y `applyUpdate()`.
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleSWUpdate = (reg) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting)
        setUpdateAvailable(true)
      }
    }

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return

      // Ya hay uno esperando al cargar
      if (reg.waiting) handleSWUpdate(reg)

      // Detecta nuevas instalaciones mientras la app está abierta
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setUpdateAvailable(true)
          }
        })
      })
    })

    // Recarga la página cuando el nuevo SW toma control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return { updateAvailable, applyUpdate }
}
