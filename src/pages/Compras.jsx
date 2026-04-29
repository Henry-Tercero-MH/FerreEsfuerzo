import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, FileText, CheckCircle } from 'lucide-react'
import { useCompras } from '../contexts/ComprasContext'
import { useProveedores } from '../contexts/ProveedoresContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate } from '../utils/formatters'
import { validateCompra } from '../utils/validators'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'

const FORM_VACÍO = {
  proveedor_id: '',
  numero_documento: '',
  serie_documento: '',
  fecha_documento: new Date().toISOString().split('T')[0],
  subtotal: 0,
  descuento: 0,
  impuesto: 0,
  total: 0,
  notas: '',
}

export default function Compras() {
  const { compras, crearCompra, aplicarCompra } = useCompras()
  const { proveedores } = useProveedores()
  const navigate = useNavigate()
  const { sesion } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ open: false })
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const comprasFiltradas = useMemo(() =>
    compras.filter(c => !termino ||
      c.numero_documento?.toLowerCase().includes(termino.toLowerCase()) ||
      c.proveedor_nombre?.toLowerCase().includes(termino.toLowerCase())
    ), [compras, termino])

  const abrirCrear = () => {
    setForm(FORM_VACÍO)
    setErrors({})
    setModal({ open: true })
  }

  const cerrar = () => setModal({ open: false })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
  }

  const calcularTotales = () => {
    const subtotal = Number(form.subtotal) || 0
    const descuento = Number(form.descuento) || 0
    const baseImponible = subtotal - descuento
    const impuesto = baseImponible * 0.12
    const total = baseImponible + impuesto

    setForm(prev => ({
      ...prev,
      impuesto: impuesto.toFixed(2),
      total: total.toFixed(2),
    }))
  }

  const handleGuardar = async () => {
    const errs = validateCompra(form, compras)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))

    const proveedor = proveedores.find(p => p.id === form.proveedor_id)
    const compra = await crearCompra({
      ...form,
      proveedor_nombre: proveedor?.nombre || 'Desconocido',
      subtotal: Number(form.subtotal) || 0,
      descuento: Number(form.descuento) || 0,
      impuesto: Number(form.impuesto) || 0,
      total: Number(form.total) || 0,
    })
    if (compra === null) { setLoading(false); alert('No autorizado para crear compras'); return }

    auditar({ accion: 'compra_registrada', entidad: 'compras', entidad_id: compra?.id, descripcion: `Compra ${form.numero_documento} — ${proveedor?.nombre} — Q${form.total}`, detalle: { numero: form.numero_documento, proveedor: proveedor?.nombre, total: form.total }, sesion })
    setLoading(false)
    cerrar()
  }

  const estadoBadge = (estado) => {
    const map = {
      REGISTRADA: { label: 'Registrada', variant: 'blue' },
      APLICADA: { label: 'Aplicada', variant: 'green' },
      ANULADA: { label: 'Anulada', variant: 'red' },
    }
    return map[estado] || { label: estado, variant: 'gray' }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">{compras.length} compras registradas</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={abrirCrear}>
          Nueva compra
        </Button>
      </div>

      <SearchBar
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por número de documento o proveedor..."
        className="max-w-md"
      />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>N° Documento</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {comprasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  {compras.length === 0 ? 'Aún no hay compras registradas. ¡Crea la primera!' : 'No se encontraron compras'}
                </td>
              </tr>
            ) : (
              comprasFiltradas.map(c => {
                const { label, variant } = estadoBadge(c.estado)
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-gray-900">{c.numero_documento}</td>
                    <td className="font-medium">{c.proveedor_nombre}</td>
                    <td className="text-sm text-gray-500">{formatDate(c.fecha_documento)}</td>
                    <td className="font-semibold">{formatCurrency(c.total)}</td>
                    <td>
                      <Badge variant={variant}>{label}</Badge>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button className="btn-icon btn-ghost text-gray-400 hover:text-primary-600" title="Ver detalle">
                          <FileText size={15} />
                        </button>
                        {c.estado === 'REGISTRADA' && (
                          <button
                            title="Marcar como aplicada al inventario"
                            onClick={async () => { const r = await aplicarCompra(c.id); if (r === null) { alert('No autorizado para aplicar compra'); return } navigate('/inventario') }}
                            className="btn-icon btn-ghost text-gray-400 hover:text-green-600"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal.open}
        onClose={cerrar}
        title="Nueva compra"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button variant="primary" loading={loading} onClick={handleGuardar}>
              Registrar compra
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Proveedor *"
            name="proveedor_id"
            value={form.proveedor_id}
            onChange={handleChange}
            error={errors.proveedor_id}
            className="sm:col-span-2"
          >
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>

          <Input
            label="N° Documento *"
            name="numero_documento"
            value={form.numero_documento}
            onChange={handleChange}
            error={errors.numero_documento}
            placeholder="Ej: FAC-12345"
          />

          <Input
            label="Serie"
            name="serie_documento"
            value={form.serie_documento}
            onChange={handleChange}
            placeholder="Ej: A"
          />

          <Input
            label="Fecha del documento *"
            name="fecha_documento"
            type="date"
            value={form.fecha_documento}
            onChange={handleChange}
            className="sm:col-span-2"
          />

          <Input
            label="Subtotal (Q) *"
            name="subtotal"
            type="number"
            min="0"
            step="0.01"
            value={form.subtotal}
            error={errors.subtotal}
            onChange={(e) => {
              handleChange(e)
              setTimeout(calcularTotales, 0)
            }}
          />

          <Input
            label="Descuento (Q)"
            name="descuento"
            type="number"
            min="0"
            step="0.01"
            value={form.descuento}
            error={errors.descuento}
            onChange={(e) => {
              handleChange(e)
              setTimeout(calcularTotales, 0)
            }}
          />

          <Input
            label="IVA (12%)"
            name="impuesto"
            type="number"
            value={form.impuesto}
            readOnly
            className="bg-gray-50"
          />

          <Input
            label="Total (Q)"
            name="total"
            type="number"
            value={form.total}
            readOnly
            error={errors.total}
            className="bg-gray-50 font-bold"
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
    </div>
  )
}
