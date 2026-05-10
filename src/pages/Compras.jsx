import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, FileText, CheckCircle, Printer, X } from 'lucide-react'
import { useCompras } from '../contexts/ComprasContext'
import { useProveedores } from '../contexts/ProveedoresContext'
import { useEmpresa } from '../contexts/EmpresaContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { formatCurrency, formatDate, abrirVentanaImpresion } from '../utils/formatters'
import { validateCompra } from '../utils/validators'
import { useAuth } from '../contexts/AuthContext'
import { auditar } from '../services/auditoria'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import ToastContainer from '../components/ui/Toast'

const FORM_VACÍO = {
  proveedor_id: '',
  numero_documento: '',
  serie_documento: '',
  fecha_documento: new Date().toISOString().split('T')[0],
  subtotal: 0,
  descuento: 0,
  total: 0,
  notas: '',
}

function imprimirCompra(compra, empresa) {
  const nombreEmpresa = empresa?.nombre_comercial || 'Ferretería El Esfuerzo'
  const estadoLabel = { REGISTRADA: 'Registrada', APLICADA: 'Aplicada', ANULADA: 'Anulada' }
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Compra ${compra.numero_documento}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#000;padding:32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #000;padding-bottom:16px}
  .empresa h1{font-size:20px;font-weight:700}
  .empresa p{font-size:12px;margin-top:2px}
  .doc-info{text-align:right}
  .doc-info .num{font-size:18px;font-weight:700}
  .doc-info p{font-size:12px;margin-top:2px}
  .badge{display:inline-block;padding:2px 10px;border:1px solid #000;border-radius:4px;font-size:11px;font-weight:600}
  .section{margin-bottom:20px}
  .section h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:10px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .field p:first-child{font-size:11px;margin-bottom:2px}
  .field p:last-child{font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{padding:7px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #ccc;background:#e5e5e5}
  th:not(:first-child){text-align:right}
  td{padding:7px 10px;border:1px solid #ccc;font-size:13px}
  td:not(:first-child){text-align:right}
  .totales{margin-left:auto;width:240px;border:1px solid #ccc;padding:12px}
  .totales .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .totales .total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:700;border-top:2px solid #000;margin-top:8px;padding-top:8px}
  .notas-box{border:1px solid #ccc;padding:10px 12px;font-size:12px}
  .footer{margin-top:32px;text-align:center;font-size:11px;border-top:1px solid #ccc;padding-top:8px}
  @media print{body{padding:16px}}
</style></head><body>
<div class="header">
  <div class="empresa">
    <h1>${nombreEmpresa}</h1>
    ${empresa?.nit ? `<p>NIT: ${empresa.nit}</p>` : ''}
    ${empresa?.telefono ? `<p>Tel: ${empresa.telefono}</p>` : ''}
    ${empresa?.direccion_fiscal ? `<p>${empresa.direccion_fiscal}</p>` : ''}
  </div>
  <div class="doc-info">
    <p class="num">${compra.numero_documento}</p>
    ${compra.serie_documento ? `<p>Serie: ${compra.serie_documento}</p>` : ''}
    <p>Fecha: ${formatDate(compra.fecha_documento)}</p>
    <p style="margin-top:6px"><span class="badge">${estadoLabel[compra.estado] || compra.estado}</span></p>
  </div>
</div>

<div class="section">
  <h2>Proveedor</h2>
  <div class="grid2">
    <div class="field"><p>Nombre</p><p>${compra.proveedor_nombre || '—'}</p></div>
    <div class="field"><p>Fecha recepción</p><p>${compra.fecha_recepcion ? formatDate(compra.fecha_recepcion) : '—'}</p></div>
  </div>
</div>

${(compra.items || []).length > 0 ? `
<div class="section">
  <h2>Productos</h2>
  <table>
    <thead><tr><th>Descripción</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th></tr></thead>
    <tbody>
      ${compra.items.map(i => `
      <tr>
        <td>${i.nombre}</td>
        <td>${i.cantidad}</td>
        <td>${formatCurrency(i.costo_unitario)}</td>
        <td>${formatCurrency(i.subtotal)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="totales">
  <div class="row"><span>Subtotal</span><span>${formatCurrency(compra.subtotal || 0)}</span></div>
  ${(compra.descuento || 0) > 0 ? `<div class="row"><span>Descuento</span><span>-${formatCurrency(compra.descuento)}</span></div>` : ''}
  <div class="total-row"><span>Total</span><span>${formatCurrency(compra.total || 0)}</span></div>
</div>

${compra.notas ? `<div class="section" style="margin-top:20px"><h2>Notas</h2><div class="notas-box">${compra.notas}</div></div>` : ''}

<div class="footer">
  <p>${nombreEmpresa} — Generado el ${formatDate(new Date().toISOString())}</p>
  <p>Documento de compra — uso interno</p>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`
  abrirVentanaImpresion(html)
}

export default function Compras() {
  const { compras, crearCompra, aplicarCompra } = useCompras()
  const { proveedores } = useProveedores()
  const { empresa } = useEmpresa()
  const navigate = useNavigate()
  const { sesion } = useAuth()
  const { toasts, toast, remove } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [modalCrear, setModalCrear] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const termino = useDebounce(busqueda)

  const comprasFiltradas = useMemo(() =>
    [...compras]
      .sort((a, b) => new Date(b.fecha_documento) - new Date(a.fecha_documento))
      .filter(c => !termino ||
        c.numero_documento?.toLowerCase().includes(termino.toLowerCase()) ||
        c.proveedor_nombre?.toLowerCase().includes(termino.toLowerCase())
      ), [compras, termino])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(p => {
      const next = { ...p, [name]: value }
      const sub = Number(name === 'subtotal' ? value : next.subtotal) || 0
      const desc = Number(name === 'descuento' ? value : next.descuento) || 0
      next.total = Math.max(0, sub - desc).toFixed(2)
      return next
    })
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
  }

  const handleGuardar = async () => {
    const errs = validateCompra(form, compras)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const proveedor = proveedores.find(p => p.id === form.proveedor_id)
      const compra = await crearCompra({
        ...form,
        proveedor_nombre: proveedor?.nombre || 'Desconocido',
        subtotal: Number(form.subtotal) || 0,
        descuento: Number(form.descuento) || 0,
        impuesto: 0,
        total: Number(form.total) || 0,
      })
      if (compra === null) { toast('No autorizado para crear compras', 'error'); return }
      auditar({ accion: 'compra_registrada', entidad: 'compras', entidad_id: compra?.id, descripcion: `Compra ${form.numero_documento} — ${proveedor?.nombre} — ${formatCurrency(form.total)}`, sesion })
      toast(`Compra ${form.numero_documento} creada exitosamente`, 'success')
      setModalCrear(false)
      setForm(FORM_VACÍO)
    } catch (err) {
      toast(err.message || 'Error al crear compra', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAplicar = async (c) => {
    const r = await aplicarCompra(c.id)
    if (r === null) { toast('No autorizado para aplicar compra', 'error'); return }
    toast(`Compra ${c.numero_documento} aplicada al inventario`, 'success')
    navigate('/inventario')
  }

  const estadoBadge = (estado) => ({
    REGISTRADA: { label: 'Registrada', variant: 'blue' },
    APLICADA:   { label: 'Aplicada',   variant: 'green' },
    ANULADA:    { label: 'Anulada',    variant: 'red' },
  }[estado] || { label: estado, variant: 'gray' })

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">{compras.length} compras registradas</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { setForm(FORM_VACÍO); setErrors({}); setModalCrear(true) }}>
          Nueva compra
        </Button>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por número de documento o proveedor..." className="max-w-md" />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>N° Documento</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Subtotal</th>
              <th>Descuento</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {comprasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  {compras.length === 0 ? 'Aún no hay compras registradas. ¡Crea la primera!' : 'No se encontraron compras'}
                </td>
              </tr>
            ) : comprasFiltradas.map(c => {
              const { label, variant } = estadoBadge(c.estado)
              return (
                <tr key={c.id}>
                  <td className="font-mono text-xs text-gray-900">{c.numero_documento}</td>
                  <td className="font-medium">{c.proveedor_nombre}</td>
                  <td className="text-sm text-gray-500">{formatDate(c.fecha_documento)}</td>
                  <td className="text-sm text-gray-500">{formatCurrency(c.subtotal || 0)}</td>
                  <td className="text-sm text-red-500">{c.descuento > 0 ? `-${formatCurrency(c.descuento)}` : '—'}</td>
                  <td className="font-semibold">{formatCurrency(c.total)}</td>
                  <td><Badge variant={variant}>{label}</Badge></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setDetalle(c)} className="btn-icon btn-ghost text-gray-400 hover:text-primary-600" title="Ver detalle">
                        <FileText size={15} />
                      </button>
                      <button onClick={() => setTimeout(() => imprimirCompra(c, empresa), 0)} className="btn-icon btn-ghost text-gray-400 hover:text-gray-700" title="Imprimir">
                        <Printer size={15} />
                      </button>
                      {c.estado === 'REGISTRADA' && (
                        <button onClick={() => handleAplicar(c)} className="btn-icon btn-ghost text-gray-400 hover:text-green-600" title="Aplicar al inventario">
                          <CheckCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Compra — ${detalle?.numero_documento}`} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Proveedor</p><p className="font-medium">{detalle.proveedor_nombre}</p></div>
              <div><p className="text-xs text-gray-400">Fecha documento</p><p className="font-medium">{formatDate(detalle.fecha_documento)}</p></div>
              <div><p className="text-xs text-gray-400">Serie</p><p className="font-medium">{detalle.serie_documento || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><Badge variant={estadoBadge(detalle.estado).variant}>{estadoBadge(detalle.estado).label}</Badge></div>
              {detalle.notas && <div className="col-span-2"><p className="text-xs text-gray-400">Notas</p><p className="font-medium">{detalle.notas}</p></div>}
            </div>

            <div className="space-y-1 text-sm text-right border-t border-gray-100 pt-3">
              <p className="text-gray-500">Subtotal: <span className="font-medium text-gray-800">{formatCurrency(detalle.subtotal || 0)}</span></p>
              {(detalle.descuento || 0) > 0 && <p className="text-red-500">Descuento: <span>-{formatCurrency(detalle.descuento)}</span></p>}
              <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(detalle.total)}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setTimeout(() => imprimirCompra(detalle, empresa), 0)}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                <Printer size={14} /> Imprimir
              </button>
              {detalle.estado === 'REGISTRADA' && (
                <button
                  onClick={() => { handleAplicar(detalle); setDetalle(null) }}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <CheckCircle size={14} /> Aplicar al inventario
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nueva compra */}
      <Modal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        title="Nueva compra"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCrear(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleGuardar}>Registrar compra</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Proveedor *" name="proveedor_id" value={form.proveedor_id} onChange={handleChange} error={errors.proveedor_id} className="sm:col-span-2">
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
          <Input label="N° Documento *" name="numero_documento" value={form.numero_documento} onChange={handleChange} error={errors.numero_documento} placeholder="Ej: FAC-12345" />
          <Input label="Serie" name="serie_documento" value={form.serie_documento} onChange={handleChange} placeholder="Ej: A" />
          <Input label="Fecha del documento *" name="fecha_documento" type="date" value={form.fecha_documento} onChange={handleChange} className="sm:col-span-2" />
          <Input label="Subtotal (Q) *" name="subtotal" type="number" min="0" step="0.01" value={form.subtotal} error={errors.subtotal} onChange={handleChange} />
          <Input label="Descuento (Q)" name="descuento" type="number" min="0" step="0.01" value={form.descuento} onChange={handleChange} />
          <Input label="Total (Q)" name="total" type="number" value={form.total} readOnly error={errors.total} className="sm:col-span-2 bg-gray-50 font-bold" />
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} rows={2} className="input resize-none" placeholder="Notas adicionales..." />
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}
