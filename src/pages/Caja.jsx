import { useState } from 'react'
import { Lock, Unlock, TrendingUp, TrendingDown, Eye, Printer } from 'lucide-react'
import IconQ from '../components/ui/IconQ'
import { useCaja } from '../contexts/CajaContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { auditar } from '../services/auditoria'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function Caja() {
  const { sesion } = useAuth()
  const { ventas } = useApp()
  const { aperturas, cajaAbierta, abrirCaja, cerrarCaja, registrarMovimiento, movimientos, refrescarCaja } = useCaja()
  const [modalApertura, setModalApertura] = useState(false)
  const [modalCierre, setModalCierre] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [montoApertura, setMontoApertura] = useState('100.00')
  const [formCierre, setFormCierre] = useState({ monto_real: '', notas: '' })
  const [formMovimiento, setFormMovimiento] = useState({ tipo: 'INGRESO', monto: '', concepto: '', referencia: '' })
  const [loading, setLoading] = useState(false)
  const [loadingCierre, setLoadingCierre] = useState(false)
  const [errCierre, setErrCierre] = useState('')
  const [errMovimiento, setErrMovimiento] = useState('')

  const handleAbrirCaja = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const apertura = await abrirCaja({
      usuario_id: sesion.id,
      usuario_nombre: sesion.nombre,
      monto_apertura: Math.max(Number(montoApertura) || 0, 0),
    })
    auditar({ accion: 'caja_abierta', entidad: 'cajaAperturas', entidad_id: apertura?.id, descripcion: `Caja abierta con ${formatCurrency(Number(montoApertura) || 0)} de monto inicial`, detalle: { monto_apertura: montoApertura }, sesion })
    setLoading(false)
    setModalApertura(false)
    setMontoApertura('100.00')
  }

  const handleCerrarCaja = async () => {
    if (!cajaAbierta) return
    if (formCierre.monto_real === '' || Number(formCierre.monto_real) < 0) {
      setErrCierre('Ingresa el monto real en caja')
      return
    }
    setErrCierre('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const montoEsperado = (Number(cajaAbierta.monto_apertura) || 0) + (Number(cajaAbierta.total_ventas_efectivo) || 0) + (Number(cajaAbierta.total_ingresos) || 0) - (Number(cajaAbierta.total_egresos) || 0)
    const montoReal = Number(formCierre.monto_real) || 0
    cerrarCaja(cajaAbierta.id, {
      monto_real: montoReal,
      notas_cierre: formCierre.notas,
      monto_esperado: montoEsperado,
    })
    auditar({ accion: 'caja_cerrada', entidad: 'cajaAperturas', entidad_id: cajaAbierta.id, descripcion: `Caja cerrada — Esperado: ${formatCurrency(montoEsperado)} / Real: ${formatCurrency(montoReal)} / Diferencia: ${formatCurrency(montoReal - montoEsperado)}`, detalle: { monto_esperado: montoEsperado, monto_real: montoReal, diferencia: montoReal - montoEsperado }, sesion })
    setLoading(false)
    setModalCierre(false)
    setFormCierre({ monto_real: '', notas: '' })
  }

  const handleMovimiento = async () => {
    if (!cajaAbierta) return
    if (!formMovimiento.concepto.trim()) { setErrMovimiento('El concepto es requerido'); return }
    if (!formMovimiento.monto || Number(formMovimiento.monto) <= 0) { setErrMovimiento('El monto debe ser mayor a 0'); return }
    setErrMovimiento('')

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    registrarMovimiento({
      apertura_caja_id: cajaAbierta.id,
      usuario_id: sesion.id,
      tipo: formMovimiento.tipo,
      monto: Number(formMovimiento.monto),
      concepto: formMovimiento.concepto,
      referencia: formMovimiento.referencia,
    })
    auditar({ accion: 'caja_movimiento', entidad: 'cajaMovimientos', entidad_id: cajaAbierta.id, descripcion: `${formMovimiento.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} de ${formatCurrency(Number(formMovimiento.monto))}: ${formMovimiento.concepto}`, detalle: { tipo: formMovimiento.tipo, monto: formMovimiento.monto, concepto: formMovimiento.concepto }, sesion })
    setLoading(false)
    setModalMovimiento(false)
    setFormMovimiento({ tipo: 'INGRESO', monto: '', concepto: '', referencia: '' })
  }

  const [detalleCierre, setDetalleCierre] = useState(null)

  const movimientosCajaActual = cajaAbierta
    ? movimientos.filter(m => m.apertura_caja_id === cajaAbierta.id)
    : []

  const movimientosDetalle = detalleCierre
    ? movimientos.filter(m => m.apertura_caja_id === detalleCierre.id)
    : []

  const ventasDetalle = detalleCierre
    ? ventas.filter(v => {
        const f = new Date(v.fecha).getTime()
        return f >= new Date(detalleCierre.fecha_apertura).getTime() &&
               f <= new Date(detalleCierre.fecha_cierre).getTime() &&
               v.estado !== 'cancelada'
      })
    : []

  const imprimirCierre = (a, movs, vtas) => {
    const diff = Number(a.monto_real) - Number(a.monto_esperado)
    const filasMov = movs.length
      ? movs.map(m => `
        <tr>
          <td>${m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}</td>
          <td>${m.concepto}</td>
          <td style="text-align:right;color:${m.tipo === 'INGRESO' ? '#16a34a' : '#dc2626'}">${m.tipo === 'INGRESO' ? '+' : '-'}Q${Number(m.monto).toFixed(2)}</td>
        </tr>`).join('')
      : '<tr><td colspan="3" style="text-align:center;color:#9ca3af">Sin movimientos</td></tr>'

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Cierre de Caja — ${formatDateTime(a.fecha_cierre)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; max-width: 700px; margin: 40px auto; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .row.total { font-weight: 700; font-size: 15px; border-top: 2px solid #111; padding-top: 6px; margin-top: 4px; }
  .pos { color: #16a34a; } .neg { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; color: #6b7280; padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
  td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; }
  @media print { body { margin: 10px; } }
</style></head><body>
<h1>Arqueo de Caja</h1>
<p class="sub">Ferretería · ${formatDateTime(a.fecha_cierre)}</p>

<div class="section">
  <h2>Turno</h2>
  <div class="row"><span>Usuario</span><span>${a.usuario_nombre}</span></div>
  <div class="row"><span>Apertura</span><span>${formatDateTime(a.fecha_apertura)}</span></div>
  <div class="row"><span>Cierre</span><span>${formatDateTime(a.fecha_cierre)}</span></div>
</div>

<div class="section">
  <h2>Resumen de efectivo</h2>
  <div class="row"><span>Monto inicial</span><span>Q${Number(a.monto_apertura).toFixed(2)}</span></div>
  <div class="row pos"><span>+ Ventas efectivo</span><span>Q${Number(a.total_ventas_efectivo || 0).toFixed(2)}</span></div>
  <div class="row"><span>Ventas tarjeta</span><span>Q${Number(a.total_ventas_tarjeta || 0).toFixed(2)}</span></div>
  <div class="row"><span>Ventas crédito</span><span>Q${Number(a.total_ventas_credito || 0).toFixed(2)}</span></div>
  <div class="row pos"><span>+ Ingresos</span><span>Q${Number(a.total_ingresos || 0).toFixed(2)}</span></div>
  <div class="row neg"><span>- Egresos</span><span>Q${Number(a.total_egresos || 0).toFixed(2)}</span></div>
  <div class="row total"><span>Esperado en caja</span><span>Q${Number(a.monto_esperado).toFixed(2)}</span></div>
  <div class="row total"><span>Real contado</span><span>Q${Number(a.monto_real).toFixed(2)}</span></div>
  <div class="row total ${diff >= 0 ? 'pos' : 'neg'}"><span>Diferencia</span><span>${diff >= 0 ? '+' : ''}Q${diff.toFixed(2)}</span></div>
</div>

${vtas.length ? `<div class="section">
  <h2>Ventas del turno (${vtas.length})</h2>
  <table><thead><tr><th>N° Venta</th><th>Cliente</th><th>Facturó</th><th>Método</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${vtas.map(v => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${v.numero_venta}</td>
      <td>${v.cliente_nombre || 'Consumidor Final'}</td>
      <td style="color:#6b7280">${v.usuario_nombre || '—'}</td>
      <td>${v.metodo_pago === 'efectivo' ? 'Efectivo' : v.metodo_pago === 'tarjeta' ? 'Tarjeta' : v.metodo_pago === 'credito' ? 'Crédito' : v.metodo_pago}</td>
      <td style="text-align:right;font-weight:600">Q${Number(v.total).toFixed(2)}</td>
    </tr>
    ${(v.items || []).map(i => `<tr style="background:#f9fafb"><td></td><td style="color:#6b7280;font-size:11px;padding-left:16px">↳ ${i.nombre}</td><td></td><td style="color:#6b7280;font-size:11px">${i.cantidad} × Q${Number(i.precio_unitario).toFixed(2)}</td><td style="text-align:right;color:#6b7280;font-size:11px">Q${Number(i.subtotal).toFixed(2)}</td></tr>`).join('')}
  `).join('')}</tbody>
  <tfoot><tr style="font-weight:700;border-top:2px solid #111"><td colspan="4">Total ventas</td><td style="text-align:right">Q${vtas.reduce((s, v) => s + Number(v.total), 0).toFixed(2)}</td></tr></tfoot>
  </table>
</div>` : ''}

${movs.length ? `<div class="section">
  <h2>Movimientos del turno</h2>
  <table><thead><tr><th>Tipo</th><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${filasMov}</tbody></table>
</div>` : ''}

${a.notas_cierre ? `<div class="section"><h2>Notas</h2><p>${a.notas_cierre}</p></div>` : ''}

<p style="margin-top:32px;font-size:11px;color:#9ca3af;text-align:center">Generado por FerreApp · ${new Date().toLocaleString('es-GT')}</p>
</body></html>`

    const w = window.open('', '_blank', 'width=800,height=700')
    w.document.documentElement.innerHTML = html
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Caja</h1>
          <p className="page-subtitle">Control de efectivo y turnos</p>
        </div>
        {!cajaAbierta ? (
          <Button variant="success" icon={Unlock} onClick={() => setModalApertura(true)}>
            Abrir caja
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" icon={IconQ} onClick={() => setModalMovimiento(true)}>
              Registrar movimiento
            </Button>
            <Button variant="danger" icon={Lock} loading={loadingCierre} onClick={async () => {
              setLoadingCierre(true)
              await refrescarCaja()
              setLoadingCierre(false)
              setModalCierre(true)
            }}>
              Cerrar caja
            </Button>
          </div>
        )}
      </div>

      {cajaAbierta ? (
        <>
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
                <Unlock size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Caja Abierta</h3>
                <p className="text-xs text-gray-500">
                  {sesion.nombre} • {formatDateTime(cajaAbierta.fecha_apertura)}
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(cajaAbierta.monto_apertura)}
              <span className="text-sm font-normal text-gray-500 ml-2">monto inicial</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ventas efectivo"
              value={formatCurrency(Number(cajaAbierta.total_ventas_efectivo) || 0)}
              icon={IconQ}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              label="Ventas tarjeta"
              value={formatCurrency(Number(cajaAbierta.total_ventas_tarjeta) || 0)}
              icon={IconQ}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Ingresos"
              value={formatCurrency(Number(cajaAbierta.total_ingresos) || 0)}
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              label="Egresos"
              value={formatCurrency(Number(cajaAbierta.total_egresos) || 0)}
              icon={TrendingDown}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
          </div>

          {movimientosCajaActual.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Movimientos del turno</h3>
              <div className="space-y-2">
                {movimientosCajaActual.map(m => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.concepto}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(m.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(m.monto)}
                      </p>
                      <Badge variant={m.tipo === 'INGRESO' ? 'green' : 'red'}>
                        {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card bg-gray-50 text-center py-12">
          <Lock size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Caja cerrada</h3>
          <p className="text-sm text-gray-500 mb-4">Abre la caja para empezar a operar</p>
          <Button variant="primary" icon={Unlock} onClick={() => setModalApertura(true)}>
            Abrir caja ahora
          </Button>
        </div>
      )}

      {aperturas.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Historial de cierres</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th>Esperado</th>
                  <th>Real</th>
                  <th>Diferencia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {aperturas.filter(a => a.estado === 'CERRADA').map(a => (
                  <tr key={a.id}>
                    <td className="text-sm">{a.usuario_nombre}</td>
                    <td className="text-xs text-gray-500">{formatDateTime(a.fecha_apertura)}</td>
                    <td className="text-xs text-gray-500">{formatDateTime(a.fecha_cierre)}</td>
                    <td className="font-semibold">{formatCurrency(a.monto_esperado)}</td>
                    <td className="font-semibold">{formatCurrency(a.monto_real)}</td>
                    <td>
                      <span className={`font-semibold ${a.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {a.diferencia >= 0 ? '+' : ''}{formatCurrency(a.diferencia)}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setDetalleCierre(a)}
                        className="btn-icon btn-ghost text-gray-400 hover:text-primary-600"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Apertura */}
      <Modal
        open={modalApertura}
        onClose={() => setModalApertura(false)}
        title="Abrir Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalApertura(false)}>
              Cancelar
            </Button>
            <Button variant="success" loading={loading} onClick={handleAbrirCaja}>
              Abrir caja
            </Button>
          </>
        }
      >
        <Input
          label="Monto inicial (Q)"
          type="number"
          min="0"
          step="0.01"
          value={montoApertura}
          onChange={e => setMontoApertura(e.target.value)}
          placeholder="100.00"
        />
        <p className="text-xs text-gray-500 mt-2">
          Usuario: <strong>{sesion.nombre}</strong>
        </p>
      </Modal>

      {/* Modal Cierre */}
      <Modal
        open={modalCierre}
        onClose={() => { setModalCierre(false); setErrCierre('') }}
        title="Cerrar Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCierre(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={loading} onClick={handleCerrarCaja}>
              Cerrar caja
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monto inicial:</span>
              <span className="font-semibold">{formatCurrency(cajaAbierta?.monto_apertura || 0)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>+ Ventas efectivo:</span>
              <span className="font-semibold">{formatCurrency(cajaAbierta?.total_ventas_efectivo || 0)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>+ Ingresos:</span>
              <span className="font-semibold">{formatCurrency(cajaAbierta?.total_ingresos || 0)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- Egresos:</span>
              <span className="font-semibold">{formatCurrency(cajaAbierta?.total_egresos || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span>Esperado:</span>
              <span>{formatCurrency((cajaAbierta?.monto_apertura || 0) + (cajaAbierta?.total_ventas_efectivo || 0) + (cajaAbierta?.total_ingresos || 0) - (cajaAbierta?.total_egresos || 0))}</span>
            </div>
          </div>

          <Input
            label="Monto real en caja (Q) *"
            type="number"
            min="0"
            step="0.01"
            value={formCierre.monto_real}
            onChange={e => { setErrCierre(''); setFormCierre(p => ({ ...p, monto_real: e.target.value })) }}
            placeholder="0.00"
            error={errCierre}
          />

          <div>
            <label className="label">Notas de cierre</label>
            <textarea
              value={formCierre.notas}
              onChange={e => setFormCierre(p => ({ ...p, notas: e.target.value }))}
              rows={3}
              className="input resize-none"
              placeholder="Observaciones..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal Detalle Cierre */}
      <Modal
        open={!!detalleCierre}
        onClose={() => setDetalleCierre(null)}
        title={`Arqueo — ${formatDateTime(detalleCierre?.fecha_cierre)}`}
        size="lg"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="secondary" onClick={() => setDetalleCierre(null)}>Cerrar</Button>
            <Button variant="primary" icon={Printer} onClick={() => imprimirCierre(detalleCierre, movimientosDetalle, ventasDetalle)}>
              Imprimir
            </Button>
          </div>
        }
      >
        {detalleCierre && (() => {
          const a = detalleCierre
          const diff = Number(a.monto_real) - Number(a.monto_esperado)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-gray-400">Usuario</p><p className="font-medium">{a.usuario_nombre}</p></div>
                <div><p className="text-gray-400">Apertura</p><p className="font-medium">{formatDateTime(a.fecha_apertura)}</p></div>
                <div><p className="text-gray-400">Cierre</p><p className="font-medium">{formatDateTime(a.fecha_cierre)}</p></div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 space-y-1 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Resumen de efectivo</p>
                <div className="flex justify-between text-gray-600"><span>Monto inicial</span><span>{formatCurrency(a.monto_apertura)}</span></div>
                <div className="flex justify-between text-green-600"><span>+ Ventas efectivo</span><span>{formatCurrency(a.total_ventas_efectivo || 0)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Ventas tarjeta</span><span>{formatCurrency(a.total_ventas_tarjeta || 0)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Ventas crédito</span><span>{formatCurrency(a.total_ventas_credito || 0)}</span></div>
                <div className="flex justify-between text-purple-600"><span>+ Ingresos</span><span>{formatCurrency(a.total_ingresos || 0)}</span></div>
                <div className="flex justify-between text-red-600"><span>- Egresos</span><span>{formatCurrency(a.total_egresos || 0)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-base"><span>Esperado</span><span>{formatCurrency(a.monto_esperado)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base"><span>Real contado</span><span>{formatCurrency(a.monto_real)}</span></div>
                <div className={`flex justify-between font-bold text-base border-t border-gray-200 pt-2 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Diferencia</span>
                  <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                </div>
              </div>

              {ventasDetalle.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Ventas del turno ({ventasDetalle.length})</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">N° Venta</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Cliente</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Facturó</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Método</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasDetalle.map(v => (
                          <>
                            <tr key={v.id} className="border-t border-gray-50">
                              <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.numero_venta}</td>
                              <td className="px-3 py-2 text-gray-700">{v.cliente_nombre || 'Consumidor Final'}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{v.usuario_nombre || '—'}</td>
                              <td className="px-3 py-2 text-gray-500 capitalize">{v.metodo_pago}</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(v.total)}</td>
                            </tr>
                            {(v.items || []).map((item, i) => (
                              <tr key={`${v.id}-${i}`} className="bg-gray-50/60">
                                <td className="px-3 py-1"></td>
                                <td className="px-3 py-1 text-xs text-gray-400 pl-6">↳ {item.nombre}</td>
                                <td className="px-3 py-1 text-xs text-gray-400" colSpan={2}>{item.cantidad} × {formatCurrency(item.precio_unitario)}</td>
                                <td className="px-3 py-1 text-right text-xs text-gray-400">{formatCurrency(item.subtotal)}</td>
                              </tr>
                            ))}
                          </>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 font-semibold text-gray-700">Total ventas</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {formatCurrency(ventasDetalle.reduce((s, v) => s + Number(v.total), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {movimientosDetalle.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Movimientos del turno ({movimientosDetalle.length})</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Concepto</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosDetalle.map(m => (
                          <tr key={m.id} className="border-t border-gray-50">
                            <td className="px-3 py-2">
                              <Badge variant={m.tipo === 'INGRESO' ? 'green' : 'red'}>{m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}</Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{m.concepto}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              {m.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(m.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {a.notas_cierre && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{a.notas_cierre}</p>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Modal Movimiento */}
      <Modal
        open={modalMovimiento}
        onClose={() => { setModalMovimiento(false); setErrMovimiento('') }}
        title="Registrar Movimiento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMovimiento(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={loading} onClick={handleMovimiento}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFormMovimiento(p => ({ ...p, tipo: 'INGRESO' }))}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                formMovimiento.tipo === 'INGRESO'
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
            >
              Ingreso
            </button>
            <button
              onClick={() => setFormMovimiento(p => ({ ...p, tipo: 'EGRESO' }))}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                formMovimiento.tipo === 'EGRESO'
                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
            >
              Egreso
            </button>
          </div>

          <Input
            label="Monto (Q) *"
            type="number"
            min="0"
            step="0.01"
            value={formMovimiento.monto}
            onChange={e => { setErrMovimiento(''); setFormMovimiento(p => ({ ...p, monto: e.target.value })) }}
            placeholder="0.00"
            error={errMovimiento}
          />

          <Input
            label="Concepto *"
            value={formMovimiento.concepto}
            onChange={e => { setErrMovimiento(''); setFormMovimiento(p => ({ ...p, concepto: e.target.value })) }}
            placeholder="Ej: Pago a proveedor, Compra de suministros..."
          />

          <Input
            label="Referencia"
            value={formMovimiento.referencia}
            onChange={e => setFormMovimiento(p => ({ ...p, referencia: e.target.value }))}
            placeholder="Número de documento, recibo, etc."
          />
        </div>
      </Modal>
    </div>
  )
}
