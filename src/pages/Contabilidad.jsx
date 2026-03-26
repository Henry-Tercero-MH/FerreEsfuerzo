import { useState, useMemo, useRef } from 'react'
import { Printer, FileText, TrendingUp, Receipt } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useEmpresa } from '../contexts/EmpresaContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import IconQ from '../components/ui/IconQ'
import Button from '../components/ui/Button'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const METODO_LABEL = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta',
  transferencia: 'Transferencia', credito: 'Crédito',
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function Contabilidad() {
  const { ventas, clientes } = useApp()
  const { empresa } = useEmpresa()
  const tableRef = useRef(null)

  const hoy = new Date()
  const [mes, setMes]   = useState(hoy.getMonth())      // 0-11
  const [anio, setAnio] = useState(hoy.getFullYear())

  // Años disponibles (desde el primer registro)
  const aniosDisponibles = useMemo(() => {
    const primero = ventas.length
      ? Math.min(...ventas.map(v => new Date(v.fecha).getFullYear()))
      : hoy.getFullYear()
    const ultimo = hoy.getFullYear()
    const arr = []
    for (let y = ultimo; y >= primero; y--) arr.push(y)
    return arr
  }, [ventas])

  // Ventas del período seleccionado (excluye canceladas)
  const ventasPeriodo = useMemo(() =>
    ventas.filter(v => {
      if (v.estado === 'cancelada') return false
      const d = new Date(v.fecha)
      return d.getMonth() === mes && d.getFullYear() === anio
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  , [ventas, mes, anio])

  // Totales
  const resumen = useMemo(() => {
    const totalFacturado  = ventasPeriodo.reduce((s, v) => s + v.total, 0)
    const totalIVA        = ventasPeriodo.reduce((s, v) => s + (v.impuesto || 0), 0)
    const baseImponible   = totalFacturado - totalIVA
    const totalDescuentos = ventasPeriodo.reduce((s, v) => s + (v.descuento || 0), 0)
    return { totalFacturado, totalIVA, baseImponible, totalDescuentos, count: ventasPeriodo.length }
  }, [ventasPeriodo])

  const getNombreCliente = (id) => clientes.find(c => c.id === id)?.nombre ?? 'Consumidor Final'
  const getNitCliente    = (id) => clientes.find(c => c.id === id)?.nit    ?? 'CF'

  // ── Imprimir ─────────────────────────────────────────────────────────────
  const imprimir = () => {
    const nombreEmpresa = empresa?.nombre_comercial || 'Ferretería El Esfuerzo'
    const nitEmpresa    = empresa?.nit               || '—'
    const direccion     = empresa?.direccion_fiscal   || ''
    const periodo       = `${MESES[mes]} ${anio}`

    const filas = ventasPeriodo.map((v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(v.fecha)}</td>
        <td class="mono">${v.numero_venta}</td>
        <td>${getNombreCliente(v.cliente_id)}</td>
        <td class="mono">${getNitCliente(v.cliente_id)}</td>
        <td class="num">${formatCurrency(v.subtotal ?? v.total)}</td>
        <td class="num">${formatCurrency(v.descuento || 0)}</td>
        <td class="num">${formatCurrency(v.impuesto || 0)}</td>
        <td class="num bold">${formatCurrency(v.total)}</td>
        <td>${METODO_LABEL[v.metodo_pago] ?? v.metodo_pago}</td>
        <td class="estado">${v.estado === 'credito' ? 'Crédito' : 'Contado'}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Libro de Ventas — ${periodo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:16px}
    .header{text-align:center;margin-bottom:14px;border-bottom:2px solid #1d4285;padding-bottom:10px}
    .header h1{font-size:15px;font-weight:bold;color:#1d4285}
    .header p{font-size:9px;color:#555;margin-top:2px}
    .titulo{font-size:12px;font-weight:bold;text-transform:uppercase;text-align:center;
            letter-spacing:1px;margin:10px 0 4px;color:#1d4285}
    .periodo{text-align:center;font-size:10px;color:#666;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    th{background:#1d4285;color:#fff;padding:5px 4px;text-align:left;font-size:8px;text-transform:uppercase;white-space:nowrap}
    td{padding:4px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    tr:nth-child(even) td{background:#f8fafc}
    .num{text-align:right;white-space:nowrap}
    .mono{font-family:monospace;font-size:8px}
    .bold{font-weight:bold}
    .estado{font-size:8px;text-align:center}
    .totales{margin-top:12px;display:flex;justify-content:flex-end}
    .totales table{width:280px;border:1px solid #d1d5db}
    .totales td{padding:5px 8px;font-size:10px}
    .totales td:last-child{text-align:right;font-weight:bold}
    .totales tr.gran-total td{background:#1d4285;color:#fff;font-size:11px}
    .firma{display:flex;gap:40px;margin-top:32px}
    .firma-linea{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:9px;color:#666}
    .pie{margin-top:20px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px}
    @page{margin:12mm;size:letter landscape}
  </style>
</head>
<body>
  <div class="header">
    <h1>${nombreEmpresa}</h1>
    <p>NIT: ${nitEmpresa} ${direccion ? '· ' + direccion : ''}</p>
    <p>Régimen: ${empresa?.regimen_tributario || 'GENERAL'}</p>
  </div>
  <p class="titulo">Libro de Ventas</p>
  <p class="periodo">Período: ${periodo} &nbsp;|&nbsp; ${resumen.count} registros</p>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Fecha</th><th>No. Documento</th><th>Cliente</th><th>NIT</th>
        <th class="num">Subtotal</th><th class="num">Descuento</th>
        <th class="num">IVA 12%</th><th class="num">Total</th>
        <th>Método</th><th>Tipo</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="totales">
    <table>
      <tr><td>Subtotal bruto</td><td>${formatCurrency(ventasPeriodo.reduce((s,v)=>s+(v.subtotal??v.total),0))}</td></tr>
      <tr><td>(-) Descuentos</td><td>${formatCurrency(resumen.totalDescuentos)}</td></tr>
      <tr><td>Base imponible</td><td>${formatCurrency(resumen.baseImponible)}</td></tr>
      <tr><td>IVA cobrado (12%)</td><td>${formatCurrency(resumen.totalIVA)}</td></tr>
      <tr class="gran-total"><td>TOTAL FACTURADO</td><td>${formatCurrency(resumen.totalFacturado)}</td></tr>
    </table>
  </div>

  <div class="firma">
    <div class="firma-linea">Elaborado por</div>
    <div class="firma-linea">Revisado por</div>
    <div class="firma-linea">Contador</div>
  </div>
  <p class="pie">Generado por Ferretería El Esfuerzo · ${new Date().toLocaleString('es-GT')}</p>
</body>
</html>`

    const w = window.open('', '_blank', 'width=1100,height=700')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contabilidad</h1>
          <p className="page-subtitle">Libro de ventas e información para el contador</p>
        </div>
        <Button variant="primary" icon={Printer} onClick={imprimir} disabled={ventasPeriodo.length === 0}>
          Imprimir período
        </Button>
      </div>

      {/* Selector de período */}
      <div className="card flex flex-wrap items-center gap-4">
        <p className="text-sm font-medium text-gray-700">Período:</p>
        <select
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
          className="input w-40"
        >
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={anio}
          onChange={e => setAnio(Number(e.target.value))}
          className="input w-28"
        >
          {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-400">
          {ventasPeriodo.length} registros en el período
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total facturado"  value={formatCurrency(resumen.totalFacturado)} icon={IconQ}     color="bg-primary-700" />
        <StatCard label="Base imponible"   value={formatCurrency(resumen.baseImponible)}  icon={FileText}  color="bg-secondary-600" />
        <StatCard label="IVA cobrado 12%"  value={formatCurrency(resumen.totalIVA)}       icon={TrendingUp} color="bg-green-600" />
        <StatCard label="No. transacciones" value={resumen.count}  sub={resumen.totalDescuentos > 0 ? `Desc: ${formatCurrency(resumen.totalDescuentos)}` : undefined} icon={Receipt} color="bg-blue-600" />
      </div>

      {/* Tabla libro de ventas */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Libro de Ventas — {MESES[mes]} {anio}
          </h2>
        </div>

        {ventasPeriodo.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">No hay ventas en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>No. Documento</th>
                  <th>Cliente</th>
                  <th>NIT</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">Descuento</th>
                  <th className="text-right">IVA 12%</th>
                  <th className="text-right">Total</th>
                  <th>Método</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {ventasPeriodo.map((v, i) => (
                  <tr key={v.id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="whitespace-nowrap">{formatDate(v.fecha)}</td>
                    <td className="font-mono text-gray-700">{v.numero_venta}</td>
                    <td className="max-w-[160px] truncate">{getNombreCliente(v.cliente_id)}</td>
                    <td className="font-mono text-gray-500">{getNitCliente(v.cliente_id)}</td>
                    <td className="text-right">{formatCurrency(v.subtotal ?? v.total)}</td>
                    <td className="text-right text-red-500">{v.descuento > 0 ? `-${formatCurrency(v.descuento)}` : '—'}</td>
                    <td className="text-right text-green-700">{formatCurrency(v.impuesto || 0)}</td>
                    <td className="text-right font-semibold">{formatCurrency(v.total)}</td>
                    <td className="capitalize">{METODO_LABEL[v.metodo_pago] ?? v.metodo_pago}</td>
                    <td>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.estado === 'credito' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {v.estado === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totales */}
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-sm border-t-2 border-gray-200">
                  <td colSpan={5} className="px-4 py-3 text-right text-gray-600">Totales del período:</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(ventasPeriodo.reduce((s,v)=>s+(v.subtotal??v.total),0))}</td>
                  <td className="px-4 py-3 text-right text-red-500">{resumen.totalDescuentos > 0 ? `-${formatCurrency(resumen.totalDescuentos)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(resumen.totalIVA)}</td>
                  <td className="px-4 py-3 text-right text-primary-700">{formatCurrency(resumen.totalFacturado)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Resumen de IVA */}
      {ventasPeriodo.length > 0 && (
        <div className="card max-w-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Resumen IVA — {MESES[mes]} {anio}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal bruto</span>
              <span>{formatCurrency(ventasPeriodo.reduce((s,v)=>s+(v.subtotal??v.total),0))}</span>
            </div>
            {resumen.totalDescuentos > 0 && (
              <div className="flex justify-between text-red-500">
                <span>(-) Descuentos</span>
                <span>-{formatCurrency(resumen.totalDescuentos)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Base imponible</span>
              <span>{formatCurrency(resumen.baseImponible)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>IVA cobrado (12%)</span>
              <span>+{formatCurrency(resumen.totalIVA)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-base">
              <span>Total facturado</span>
              <span>{formatCurrency(resumen.totalFacturado)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
