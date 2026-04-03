import { useState, useRef, useEffect } from 'react'
import { User, Check } from 'lucide-react'

const CF = { id: 'cf', nombre: 'Consumidor Final', nit: 'CF' }

export default function ClienteSelector({ clientes = [], value, onChange, label = 'Cliente', showCF = true }) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const lista = [
    ...(showCF ? [CF] : []),
    ...clientes.filter(c => c.id !== 'cf' && c.nombre !== 'Consumidor Final'),
  ]
  const seleccionado = lista.find(c => c.id === value) ?? CF

  const filtrados = busqueda.trim()
    ? lista.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nit?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : lista

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const seleccionar = (cliente) => {
    onChange(cliente.id)
    setOpen(false)
    setBusqueda('')
  }

  const handleFocus = () => {
    setBusqueda('')
    setOpen(true)
  }

  const handleChange = (e) => {
    setBusqueda(e.target.value)
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      {label !== null && label && <p className="label mb-1">{label}</p>}

      <div className="relative">
        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={open ? busqueda : seleccionado.nombre}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Buscar cliente o NIT..."
          className="input pl-8 w-full"
        />
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtrados.length === 0 ? (
            <li className="py-4 text-center text-sm text-gray-400">Sin resultados</li>
          ) : filtrados.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => seleccionar(c)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors
                  ${c.id === value
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <span className="flex-1 truncate font-medium">{c.nombre}</span>
                {c.nit && c.id !== 'cf' && (
                  <span className="text-xs text-gray-400 shrink-0">{c.nit}</span>
                )}
                {c.id === value && <Check size={13} className="text-primary-600 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
