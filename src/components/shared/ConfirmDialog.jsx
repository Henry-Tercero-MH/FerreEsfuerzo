import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-600' : 'text-yellow-600'} />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={() => { onConfirm(); onClose() }}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
