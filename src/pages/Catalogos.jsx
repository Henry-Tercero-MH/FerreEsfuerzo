import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Tag, Ruler, CreditCard } from 'lucide-react'
import { useCatalogos } from '../contexts/CatalogosContext'
import Button from '../components/ui/Button'

const TABS = [
  { key: 'categorias',   label: 'Categorías',       icon: Tag },
  { key: 'unidades',     label: 'Unidades de medida', icon: Ruler },
  { key: 'metodos_pago', label: 'Métodos de pago',   icon: CreditCard },
]

// ── Fila editable genérica ────────────────────────────────────────────────────
function FilaEditable({ valor, onGuardar, onEliminar }) {
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState(valor)

  const confirmar = () => {
    if (!draft.trim()) return
    onGuardar(draft.trim())
    setEditando(false)
  }
  const cancelar = () => { setDraft(valor); setEditando(false) }

  if (editando) {
    return (
      <li className="flex items-center gap-2 py-2">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar() }}
          className="input flex-1 py-1.5 text-sm"
        />
        <button onClick={confirmar} className="btn-icon btn-ghost text-green-600 hover:text-green-700"><Check size={15} /></button>
        <button onClick={cancelar}  className="btn-icon btn-ghost text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-800">{valor}</span>
      <div className="flex gap-1">
        <button onClick={() => { setDraft(valor); setEditando(true) }} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
        <button onClick={onEliminar} className="btn-icon btn-ghost text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
      </div>
    </li>
  )
}

// ── Fila editable para métodos de pago (value + label) ───────────────────────
function FilaMetodoPago({ item, onGuardar, onEliminar }) {
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState(item)

  const confirmar = () => {
    if (!draft.value.trim() || !draft.label.trim()) return
    onGuardar({ value: draft.value.trim(), label: draft.label.trim() })
    setEditando(false)
  }
  const cancelar = () => { setDraft(item); setEditando(false) }

  if (editando) {
    return (
      <li className="flex items-center gap-2 py-2">
        <input
          autoFocus
          value={draft.label}
          onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
          placeholder="Nombre visible"
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar() }}
          className="input flex-1 py-1.5 text-sm"
        />
        <input
          value={draft.value}
          onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
          placeholder="Clave (ej: efectivo)"
          className="input w-36 py-1.5 text-sm font-mono"
        />
        <button onClick={confirmar} className="btn-icon btn-ghost text-green-600 hover:text-green-700"><Check size={15} /></button>
        <button onClick={cancelar}  className="btn-icon btn-ghost text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <span className="text-sm text-gray-800">{item.label}</span>
        <span className="ml-2 text-xs font-mono text-gray-400">{item.value}</span>
      </div>
      <div className="flex gap-1">
        <button onClick={() => { setDraft(item); setEditando(true) }} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
        <button onClick={onEliminar} className="btn-icon btn-ghost text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
      </div>
    </li>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Catalogos() {
  const {
    categorias, unidades, metodos_pago,
    agregarCategoria, editarCategoria, eliminarCategoria,
    agregarUnidad,    editarUnidad,    eliminarUnidad,
    agregarMetodoPago, editarMetodoPago, eliminarMetodoPago,
  } = useCatalogos()

  const [tab, setTab] = useState('categorias')
  const [nuevo, setNuevo] = useState('')
  const [nuevoMetodo, setNuevoMetodo] = useState({ value: '', label: '' })

  const handleAgregarSimple = (agregarFn) => {
    if (!nuevo.trim()) return
    agregarFn(nuevo.trim())
    setNuevo('')
  }

  const handleAgregarMetodo = () => {
    if (!nuevoMetodo.value.trim() || !nuevoMetodo.label.trim()) return
    agregarMetodoPago(nuevoMetodo)
    setNuevoMetodo({ value: '', label: '' })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogos</h1>
          <p className="page-subtitle">Administra los valores disponibles en formularios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setNuevo(''); setNuevoMetodo({ value: '', label: '' }) }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="card">
        {tab !== 'metodos_pago' ? (
          <>
            {/* Lista simple */}
            <ul className="mb-4 divide-y divide-gray-50">
              {(tab === 'categorias' ? categorias : unidades).map((item, i) => (
                <FilaEditable
                  key={i}
                  valor={item}
                  onGuardar={v => tab === 'categorias' ? editarCategoria(i, v) : editarUnidad(i, v)}
                  onEliminar={() => tab === 'categorias' ? eliminarCategoria(i) : eliminarUnidad(i)}
                />
              ))}
            </ul>
            {/* Agregar */}
            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <input
                value={nuevo}
                onChange={e => setNuevo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAgregarSimple(tab === 'categorias' ? agregarCategoria : agregarUnidad)}
                placeholder={tab === 'categorias' ? 'Nueva categoría...' : 'Nueva unidad...'}
                className="input flex-1 text-sm"
              />
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => handleAgregarSimple(tab === 'categorias' ? agregarCategoria : agregarUnidad)}
              >
                Agregar
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Lista métodos de pago */}
            <ul className="mb-4 divide-y divide-gray-50">
              {metodos_pago.map((item, i) => (
                <FilaMetodoPago
                  key={i}
                  item={item}
                  onGuardar={v => editarMetodoPago(i, v)}
                  onEliminar={() => eliminarMetodoPago(i)}
                />
              ))}
            </ul>
            {/* Agregar método */}
            <div className="flex gap-2 border-t border-gray-100 pt-4 flex-wrap">
              <input
                value={nuevoMetodo.label}
                onChange={e => setNuevoMetodo(d => ({ ...d, label: e.target.value }))}
                placeholder="Nombre visible (ej: Cheque)"
                className="input flex-1 min-w-40 text-sm"
              />
              <input
                value={nuevoMetodo.value}
                onChange={e => setNuevoMetodo(d => ({ ...d, value: e.target.value }))}
                placeholder="Clave (ej: cheque)"
                className="input w-36 text-sm font-mono"
              />
              <Button variant="primary" icon={Plus} onClick={handleAgregarMetodo}>
                Agregar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
