import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, classes: 'bg-green-50 border-green-200 text-green-800' },
  warning: { icon: AlertTriangle, classes: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  error:   { icon: XCircle,      classes: 'bg-red-50 border-red-200 text-red-800' },
  info:    { icon: Info,         classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

export default function Alert({ type = 'info', title, message, onClose }) {
  const { icon: Icon, classes } = CONFIG[type]
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${classes}`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className={title ? 'mt-0.5 opacity-90' : ''}>{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
