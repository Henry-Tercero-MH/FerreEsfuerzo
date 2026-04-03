import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { useProveedores } from '../contexts/ProveedoresContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'

const FORM_VACÍO = {
  nit: '',
  nombre: '',
  nombre_contacto: '',
  direccion: '',
  telefono: '',
  correo: '',
  sitio_web: '',
  dias_credito: 0,
  porcentaje_descuento: 0,
  notas: '',
}

export default function Proveedores() {
  const { proveedores, agregarProveedor, editarProveedor, eliminarProveedor } = useProveedores()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ open: false, modo: 'crear', proveedor: null })
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const proveedoresFiltrados = useMemo(() =>
    proveedores.filter(p => !termino ||
      p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      p.nit?.toLowerCase().includes(termino.toLowerCase()) ||
      p.telefono?.includes(termino)
    ), [proveedores, termino])

  const abrirCrear = () => {
    setForm(FORM_VACÍO)
    setErrors({})
    setModal({ open: true, modo: 'crear', proveedor: null })
  }

  const abrirEditar = (proveedor) => {
    setForm({ ...proveedor })
    setErrors({})
    setModal({ open: true, modo: 'editar', proveedor })
  }

  const cerrar = () => setModal(m => ({ ...m, open: false }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
  }

  const handleGuardar = async () => {
    const errs = {}
    if (!form.nombre?.trim()) errs.nombre = 'Nombre requerido'
    if (!form.nit?.trim()) errs.nit = 'NIT requerido'

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))

    if (modal.modo === 'crear') {
      agregarProveedor({
        ...form,
        dias_credito: Number(form.dias_credito) || 0,
        porcentaje_descuento: Number(form.porcentaje_descuento) || 0,
      })
      toast('Proveedor creado correctamente', 'success')
    } else {
      editarProveedor(modal.proveedor.id, {
        ...form,
        dias_credito: Number(form.dias_credito) || 0,
        porcentaje_descuento: Number(form.porcentaje_descuento) || 0,
      })
      toast('Proveedor actualizado', 'success')
    }

    setLoading(false)
    cerrar()
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">{proveedores.length} proveedores registrados</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={abrirCrear}>
          Nuevo proveedor
        </Button>
      </div>

      <SearchBar
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, NIT o teléfono..."
        className="max-w-sm"
      />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Crédito</th>
              <th>Desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <Truck size={32} className="mx-auto mb-2 opacity-30" />
                  {proveedores.length === 0 ? 'Aún no hay proveedores registrados. ¡Agrega el primero!' : 'No se encontraron proveedores'}
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-900">{p.nombre}</td>
                  <td className="font-mono text-xs text-gray-500">{p.nit}</td>
                  <td className="text-sm">{p.nombre_contacto || '—'}</td>
                  <td className="text-sm">{p.telefono || '—'}</td>
                  <td>
                    {p.dias_credito > 0 ? (
                      <Badge variant="blue">{p.dias_credito} días</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">Sin crédito</span>
                    )}
                  </td>
                  <td className="text-xs text-gray-400">{formatDate(p.creado_en)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirm(p)}
                        className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal.open}
        onClose={cerrar}
        title={modal.modo === 'crear' ? 'Nuevo proveedor' : 'Editar proveedor'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button variant="primary" loading={loading} onClick={handleGuardar}>
              {modal.modo === 'crear' ? 'Crear proveedor' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre comercial *"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            className="sm:col-span-2"
          />
          <Input
            label="NIT *"
            name="nit"
            value={form.nit}
            onChange={handleChange}
            error={errors.nit}
            placeholder="12345678-9"
          />
          <Input
            label="Nombre de contacto"
            name="nombre_contacto"
            value={form.nombre_contacto}
            onChange={handleChange}
          />
          <Input
            label="Teléfono"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
          />
          <Input
            label="Correo electrónico"
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleChange}
          />
          <Input
            label="Dirección"
            name="direccion"
            value={form.direccion}
            onChange={handleChange}
            className="sm:col-span-2"
          />
          <Input
            label="Sitio web"
            name="sitio_web"
            value={form.sitio_web}
            onChange={handleChange}
            className="sm:col-span-2"
            placeholder="https://..."
          />
          <Input
            label="Días de crédito"
            name="dias_credito"
            type="number"
            min="0"
            value={form.dias_credito}
            onChange={handleChange}
          />
          <Input
            label="% Descuento"
            name="porcentaje_descuento"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.porcentaje_descuento}
            onChange={handleChange}
          />
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { eliminarProveedor(confirm.id); toast(`"${confirm.nombre}" eliminado`, 'warning') }}
        title="¿Eliminar proveedor?"
        message={`Se eliminará "${confirm?.nombre}". Esta acción no se puede deshacer.`}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
