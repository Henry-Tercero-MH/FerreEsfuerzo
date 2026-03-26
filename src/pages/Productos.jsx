import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCatalogos } from '../contexts/CatalogosContext'
import { useDebounce } from '../hooks/useDebounce'
import { validateProducto } from '../utils/validators'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'

const FORM_VACÍO = {
  nombre: '', codigo: '', categoria: '', descripcion: '',
  precio_compra: '', precio_venta: '', stock: 0, stock_minimo: 5, unidad: 'unidad',
}

export default function Productos() {
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useApp()
  const { categorias, unidades } = useCatalogos()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [modal, setModal] = useState({ open: false, modo: 'crear', producto: null })
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const coincideBusqueda = !termino ||
        p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(termino.toLowerCase())
      const coincideCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
      return coincideBusqueda && coincideCategoria
    })
  }, [productos, termino, categoriaFiltro])

  const abrirCrear = () => {
    setForm(FORM_VACÍO)
    setErrors({})
    setModal({ open: true, modo: 'crear', producto: null })
  }

  const abrirEditar = (producto) => {
    setForm({ ...producto })
    setErrors({})
    setModal({ open: true, modo: 'editar', producto })
  }

  const cerrarModal = () => setModal(m => ({ ...m, open: false }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleGuardar = async () => {
    const errs = validateProducto(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    if (modal.modo === 'crear') {
      agregarProducto({ ...form, precio_compra: Number(form.precio_compra), precio_venta: Number(form.precio_venta), stock: Number(form.stock), stock_minimo: Number(form.stock_minimo) })
    } else {
      editarProducto(modal.producto.id, { ...form, precio_compra: Number(form.precio_compra), precio_venta: Number(form.precio_venta), stock: Number(form.stock), stock_minimo: Number(form.stock_minimo) })
    }
    setLoading(false)
    cerrarModal()
  }

  const stockBadge = (p) => {
    if (p.stock === 0) return { label: 'Sin stock', variant: 'red' }
    if (p.stock <= p.stock_minimo) return { label: 'Stock bajo', variant: 'yellow' }
    return { label: 'Disponible', variant: 'green' }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">{productos.length} productos registrados</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={abrirCrear}>Nuevo producto</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o código..." className="flex-1" />
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="input sm:w-52"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Categoría</th>
              <th>P. Venta</th><th>Stock</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                No se encontraron productos
              </td></tr>
            ) : productosFiltrados.map(p => {
              const { label, variant } = stockBadge(p)
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="font-medium text-gray-900">{p.nombre}</td>
                  <td><Badge variant="gray">{p.categoria}</Badge></td>
                  <td className="font-semibold">{formatCurrency(p.precio_venta)}</td>
                  <td>{p.stock} {p.unidad}</td>
                  <td><Badge variant={variant}>{label}</Badge></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => abrirEditar(p)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      <button onClick={() => eliminarProducto(p.id)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={cerrarModal}
        title={modal.modo === 'crear' ? 'Nuevo producto' : 'Editar producto'}
        size="lg"
        footer={<>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleGuardar}>
            {modal.modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} placeholder="Ej: Martillo 16oz" className="sm:col-span-2" />
          <Input label="Código" name="codigo" value={form.codigo} onChange={handleChange} placeholder="Auto-generado" />
          <Select label="Categoría *" name="categoria" value={form.categoria} onChange={handleChange} error={errors.categoria}>
            <option value="">Seleccionar...</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Precio compra (Q)" name="precio_compra" type="number" value={form.precio_compra} onChange={handleChange} placeholder="0.00" />
          <Input label="Precio venta (Q) *" name="precio_venta" type="number" value={form.precio_venta} onChange={handleChange} error={errors.precio_venta} placeholder="0.00" />
          <Input label="Stock actual" name="stock" type="number" value={form.stock} onChange={handleChange} error={errors.stock} />
          <Input label="Stock mínimo" name="stock_minimo" type="number" value={form.stock_minimo} onChange={handleChange} />
          <Select label="Unidad" name="unidad" value={form.unidad} onChange={handleChange}>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
      </Modal>
    </div>
  )
}
