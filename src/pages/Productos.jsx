import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useCatalogos } from '../contexts/CatalogosContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { validateProducto } from '../utils/validators'
import { formatCurrency } from '../utils/formatters'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'

const FORM_VACÍO = {
  nombre: '', codigo: '', categoria: '', descripcion: '',
  precio_compra: '', precio_venta: '', stock: 0, stock_minimo: 5, unidad: 'unidad',
  ubicacion: '',
  ubi_pasillo: '', ubi_estante: '', ubi_bandeja: '',
}

// Convierte P1-E3-B2 → { ubi_pasillo:'1', ubi_estante:'3', ubi_bandeja:'2' }
function parsearUbicacion(str) {
  if (!str) return { ubi_pasillo: '', ubi_estante: '', ubi_bandeja: '' }
  const p = str.match(/P(\d+)/i)
  const e = str.match(/E(\d+)/i)
  const b = str.match(/B(\d+)/i)
  return {
    ubi_pasillo: p ? p[1] : '',
    ubi_estante: e ? e[1] : '',
    ubi_bandeja:  b ? b[1] : '',
  }
}

// Convierte los 3 campos → 'P1-E3-B2' (solo incluye los que tienen valor)
function armarUbicacion(pasillo, estante, bandeja) {
  const partes = []
  if (pasillo) partes.push(`P${pasillo}`)
  if (estante) partes.push(`E${estante}`)
  if (bandeja)  partes.push(`B${bandeja}`)
  return partes.join('-')
}

export default function Productos() {
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useApp()
  const { sesion } = useAuth()
  const { categorias, unidades } = useCatalogos()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [modal, setModal] = useState({ open: false, modo: 'crear', producto: null })
  const [confirm, setConfirm] = useState(null)
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
    setForm({ ...producto, ...parsearUbicacion(producto.ubicacion) })
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
    const errs = validateProducto(form, productos, modal.modo === 'editar')
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const ubicacion = armarUbicacion(form.ubi_pasillo, form.ubi_estante, form.ubi_bandeja)
    const datos = {
      ...form,
      ubicacion,
      precio_compra: Number(form.precio_compra),
      precio_venta: Number(form.precio_venta),
      stock: Number(form.stock),
      stock_minimo: Number(form.stock_minimo),
    }
    if (modal.modo === 'crear') {
      const nuevo = agregarProducto(datos)
      if (!nuevo) { setLoading(false); return }
      auditar({ accion: 'producto_creado', entidad: 'productos', entidad_id: nuevo.id, descripcion: `Producto creado: ${form.nombre}`, detalle: { nombre: form.nombre, codigo: form.codigo, precio_venta: form.precio_venta }, sesion })
    } else {
      const actualizado = editarProducto(modal.producto.id, datos)
      if (actualizado === null) { setLoading(false); return }
      auditar({ accion: 'producto_editado', entidad: 'productos', entidad_id: modal.producto.id, descripcion: `Producto editado: ${form.nombre}`, sesion })
    }
    setLoading(false)
    cerrarModal()
    toast(modal.modo === 'crear' ? 'Producto creado correctamente' : 'Producto actualizado', 'success')
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
        {sesion?.rol === 'admin' && (
          <Button variant="primary" icon={Plus} onClick={abrirCrear}>Nuevo producto</Button>
        )}
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
              <th>Ubicación</th><th>P. Venta</th><th>Stock</th><th>Estado</th>
              {sesion?.rol === 'admin' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                {productos.length === 0 ? 'Aún no hay productos registrados. ¡Agrega el primero!' : 'No se encontraron productos'}
              </td></tr>
            ) : productosFiltrados.map(p => {
              const { label, variant } = stockBadge(p)
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="font-medium text-gray-900">{p.nombre}</td>
                  <td><Badge variant="gray">{p.categoria}</Badge></td>
                  <td className="text-sm text-gray-500">{p.ubicacion || '—'}</td>
                  <td className="font-semibold">{formatCurrency(p.precio_venta)}</td>
                  <td>{p.stock} {p.unidad}</td>
                  <td><Badge variant={variant}>{label}</Badge></td>
                  {sesion?.rol === 'admin' && (
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => abrirEditar(p)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                        <button onClick={() => setConfirm(p)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
              {(form.ubi_pasillo || form.ubi_estante || form.ubi_bandeja) && (
                <span className="ml-2 font-mono text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {armarUbicacion(form.ubi_pasillo, form.ubi_estante, form.ubi_bandeja)}
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pasillo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">P</span>
                  <input
                    type="number" min="1" name="ubi_pasillo"
                    value={form.ubi_pasillo}
                    onChange={handleChange}
                    placeholder="1"
                    className="input pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estante</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">E</span>
                  <input
                    type="number" min="1" name="ubi_estante"
                    value={form.ubi_estante}
                    onChange={handleChange}
                    placeholder="1"
                    className="input pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bandeja</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">B</span>
                  <input
                    type="number" min="1" name="ubi_bandeja"
                    value={form.ubi_bandeja}
                    onChange={handleChange}
                    placeholder="1"
                    className="input pl-7"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const resultado = eliminarProducto(confirm.id)
          if (resultado === null) return
          auditar({ accion: 'producto_eliminado', entidad: 'productos', entidad_id: confirm.id, descripcion: `Producto eliminado: ${confirm.nombre}`, sesion })
          toast(`"${confirm.nombre}" eliminado`, 'warning')
        }}
        title="¿Eliminar producto?"
        message={`Se eliminará "${confirm?.nombre}". Esta acción no se puede deshacer.`}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
