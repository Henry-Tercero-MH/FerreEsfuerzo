import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Modal de confirmación reutilizable.
 * Props:
 *   open        — boolean
 *   onClose     — fn()
 *   onConfirm   — fn()
 *   title       — string  (default: "¿Estás seguro?")
 *   message     — string
 *   confirmText — string  (default: "Eliminar")
 *   variant     — 'danger' | 'primary'  (default: 'danger')
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  variant = 'danger',
}) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={variant} onClick={handleConfirm}>{confirmText}</Button>
        </div>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed pt-1">{message}</p>
      </div>
    </Modal>
  )
}
