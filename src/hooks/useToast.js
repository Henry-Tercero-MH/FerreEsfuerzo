import { useState, useCallback } from 'react'
import { shortId } from '../utils/formatters'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, variant = 'success') => {
    const id = shortId()
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, remove }
}
