import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { validateCliente } from '../utils/validators'
import { TIPOS_CLIENTE } from '../utils/constants'
import { formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ToastContainer from '../components/ui/Toast'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'

const FORM_VACÍO = { nombre: '', telefono: '', email: '', nit: '', direccion: '', tipo: 'natural' }

export default function Clientes() {
  const { clientes, agregarCliente, editarCliente, eliminarCliente } = useApp()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ open: false, modo: 'crear', cliente: null })
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const clientesFiltrados = useMemo(() =>
    clientes.filter(c => !termino ||
      c.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      c.nit?.toLowerCase().includes(termino.toLowerCase()) ||
      c.telefono?.includes(termino)
    ), [clientes, termino])

  const abrirCrear = () => { setForm(FORM_VACÍO); setErrors({}); setModal({ open: true, modo: 'crear', cliente: null }) }
  const abrirEditar = (c) => { setForm({ ...c }); setErrors({}); setModal({ open: true, modo: 'editar', cliente: c }) }
  const cerrar = () => setModal(m => ({ ...m, open: false }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
  }

  const handleGuardar = async () => {
    const errs = validateCliente(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    if (modal.modo === 'crear') { agregarCliente(form); toast('Cliente creado correctamente', 'success') }
    else { editarCliente(modal.cliente.id, form); toast('Cliente actualizado', 'success') }
    setLoading(false)
    cerrar()
  }

  const tipoLabel = (tipo) => TIPOS_CLIENTE.find(t => t.value === tipo)?.label ?? tipo

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={abrirCrear}>Nuevo cliente</Button>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, NIT o teléfono..." className="max-w-sm" />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th>NIT</th><th>Teléfono</th><th>Email</th><th>Tipo</th><th>Desde</th><th></th></tr>
          </thead>
          <tbody>
            {clientesFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                {clientes.length === 0 ? 'Aún no hay clientes registrados. ¡Agrega el primero!' : 'No se encontraron clientes'}
              </td></tr>
            ) : clientesFiltrados.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-gray-900">{c.nombre}</td>
                <td className="font-mono text-xs text-gray-500">{c.nit || '—'}</td>
                <td className="text-sm">{c.telefono || '—'}</td>
                <td className="text-sm text-gray-500">{c.email || '—'}</td>
                <td><Badge variant="blue">{tipoLabel(c.tipo)}</Badge></td>
                <td className="text-xs text-gray-400">{formatDate(c.creado_en)}</td>
                <td>
                  {c.id !== 'c1' && (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => abrirEditar(c)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      <button onClick={() => setConfirm(c)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={cerrar} title={modal.modo === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}
        footer={<>
          <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleGuardar}>
            {modal.modo === 'crear' ? 'Crear cliente' : 'Guardar cambios'}
          </Button>
        </>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} className="sm:col-span-2" />
          <Input label="NIT" name="nit" value={form.nit} onChange={handleChange} placeholder="Ej: 12345678 o CF" />
          <Select label="Tipo" name="tipo" value={form.tipo} onChange={handleChange}>
            {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} error={errors.telefono} placeholder="Ej: 5555-1234" />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
          <Input label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} className="sm:col-span-2" />
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { eliminarCliente(confirm.id); toast(`"${confirm.nombre}" eliminado`, 'warning') }}
        title="¿Eliminar cliente?"
        message={`Se eliminará "${confirm?.nombre}". Esta acción no se puede deshacer.`}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
