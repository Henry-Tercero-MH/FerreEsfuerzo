import { useState, useMemo } from 'react'
import { Warehouse, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { TIPOS_MOVIMIENTO } from '../utils/constants'
import Badge from '../components/ui/Badge'
import SearchBar from '../components/shared/SearchBar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'

export default function Inventario() {
  const { productos, movimientos, ajustarStock } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ producto_id: '', tipo: 'entrada', cantidad: 1, motivo: '' })
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const productosFiltrados = useMemo(() =>
    productos.filter(p => !termino || p.nombre.toLowerCase().includes(termino.toLowerCase()) || p.codigo?.toLowerCase().includes(termino.toLowerCase()))
  , [productos, termino])

  const handleAjuste = async () => {
    if (!form.producto_id || !form.cantidad) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    ajustarStock(form.producto_id, Number(form.cantidad), form.tipo, form.motivo)
    setLoading(false)
    setModal(false)
    setForm({ producto_id: '', tipo: 'entrada', cantidad: 1, motivo: '' })
  }

  const stockBadge = (p) => {
    if (p.stock === 0) return { label: 'Sin stock', variant: 'red' }
    if (p.stock <= p.stock_minimo) return { label: 'Stock bajo', variant: 'yellow' }
    return { label: 'OK', variant: 'green' }
  }

  const ultimosMovimientos = movimientos.slice(0, 15)
  const productoMap = Object.fromEntries(productos.map(p => [p.id, p.nombre]))

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Control de stock y movimientos</p>
        </div>
        <Button variant="primary" icon={RotateCcw} onClick={() => setModal(true)}>Ajustar stock</Button>
      </div>

      {/* Búsqueda */}
      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar producto..." className="max-w-sm" />

      {/* Tabla inventario */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mín.</th><th>P. Compra</th><th>Valor total</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400"><Warehouse size={32} className="mx-auto mb-2 opacity-30" />Sin productos</td></tr>
            ) : productosFiltrados.map(p => {
              const { label, variant } = stockBadge(p)
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="font-medium text-gray-900">{p.nombre}</td>
                  <td><Badge variant="gray">{p.categoria}</Badge></td>
                  <td className={`font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= p.stock_minimo ? 'text-yellow-600' : 'text-green-700'}`}>
                    {p.stock} {p.unidad}
                  </td>
                  <td className="text-gray-400">{p.stock_minimo}</td>
                  <td>{formatCurrency(p.precio_compra || 0)}</td>
                  <td className="font-semibold">{formatCurrency((p.precio_compra || 0) * p.stock)}</td>
                  <td><Badge variant={variant}>{label}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Últimos movimientos */}
      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Últimos movimientos</h2>
        {ultimosMovimientos.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Sin movimientos registrados</p>
        ) : (
          <div className="space-y-2">
            {ultimosMovimientos.map(m => {
              const cfg = TIPOS_MOVIMIENTO[m.tipo]
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3">
                  {m.tipo === 'entrada'
                    ? <ArrowUpCircle size={18} className="text-green-500 flex-shrink-0" />
                    : <ArrowDownCircle size={18} className="text-red-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{productoMap[m.producto_id] ?? m.producto_id}</p>
                    <p className="text-xs text-gray-400">{m.motivo || '—'} · {formatDateTime(m.fecha)}</p>
                  </div>
                  <span className={`text-sm font-bold ${cfg?.color}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal ajuste */}
      <Modal open={modal} onClose={() => setModal(false)} title="Ajustar stock"
        footer={<>
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleAjuste}>Aplicar ajuste</Button>
        </>}>
        <div className="space-y-4">
          <Select label="Producto *" value={form.producto_id} onChange={e => setForm(p => ({ ...p, producto_id: e.target.value }))}>
            <option value="">Seleccionar producto...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock})</option>)}
          </Select>
          <Select label="Tipo de movimiento" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
            <option value="entrada">Entrada (agregar stock)</option>
            <option value="salida">Salida (restar stock)</option>
            <option value="ajuste">Ajuste manual</option>
          </Select>
          <Input label="Cantidad" type="number" min="1" value={form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} />
          <Input label="Motivo" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Compra a proveedor, daño, robo..." />
        </div>
      </Modal>
    </div>
  )
}
