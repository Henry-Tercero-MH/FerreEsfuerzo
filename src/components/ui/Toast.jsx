import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const VARIANTS = {
  success: { icon: CheckCircle, bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800', icon_cls: 'text-green-500' },
  error:   { icon: XCircle,     bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',   icon_cls: 'text-red-500' },
  warning: { icon: AlertTriangle,bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-800',icon_cls: 'text-yellow-500' },
  info:    { icon: Info,         bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',  icon_cls: 'text-blue-500' },
}

// ── Toast individual ──────────────────────────────────────────────────────────
function ToastItem({ id, message, variant = 'success', onRemove }) {
  const cfg = VARIANTS[variant] || VARIANTS.success
  const Icon = cfg.icon

  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 3500)
    return () => clearTimeout(t)
  }, [id, onRemove])

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-fade-in w-full max-w-sm ${cfg.bg} ${cfg.border}`}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.icon_cls}`} />
      <p className={`flex-1 text-sm font-medium ${cfg.text}`}>{message}</p>
      <button onClick={() => onRemove(id)} className={`shrink-0 opacity-60 hover:opacity-100 ${cfg.text}`}>
        <X size={15} />
      </button>
    </div>
  )
}

// ── Contenedor de toasts ──────────────────────────────────────────────────────
export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
