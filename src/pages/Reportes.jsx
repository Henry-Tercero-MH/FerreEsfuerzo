import { useMemo, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useCompras } from '../contexts/ComprasContext'
import { useProveedores } from '../contexts/ProveedoresContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { StatCard } from '../components/ui/Card'
import {
  TrendingUp, Package, ShoppingCart, Users, FileText,
  AlertCircle, ArrowDownCircle, Truck, Printer,
  LayoutDashboard, ClipboardList, Boxes, CreditCard, Receipt
} from 'lucide-react'
import IconQ from '../components/ui/IconQ'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaLocal(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function generarMeses(ventas) {
  const hoy = new Date()
  let inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
  ventas.forEach(v => {
    const d = new Date(fechaLocal(v.fecha))
    if (d < inicio) inicio = new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const meses = []
  const cursor = new Date(inicio)
  while (cursor <= hoy) {
    meses.push({
      value: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      label: cursor.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' }),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return meses.reverse()
}

function agruparPorDia(ventas, anio, mes) {
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const mapa = {}
  for (let d = 1; d <= diasEnMes; d++) {
    const key = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    mapa[key] = { fecha: String(d).padStart(2, '0'), ventas: 0, total: 0 }
  }
  ventas.forEach(v => {
    if (v.estado !== 'completada') return
    const key = fechaLocal(v.fecha)
    if (mapa[key]) { mapa[key].ventas += 1; mapa[key].total += Number(v.total) || 0 }
  })
  return Object.values(mapa)
}

function topProductos(ventas) {
  const mapa = {}
  ventas.filter(v => v.estado === 'completada').forEach(v => {
    ;(v.items || []).forEach(item => {
      const nombre = item.nombre || item.producto_nombre || 'Sin nombre'
      if (!mapa[nombre]) mapa[nombre] = { nombre, cantidad: 0, total: 0 }
      mapa[nombre].cantidad += Number(item.cantidad) || 0
      mapa[nombre].total += Number(item.subtotal) || 0
    })
  })
  return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 5)
}

// ── Función de impresión genérica ─────────────────────────────────────────────

function imprimir(titulo, mesLabel, htmlTabla) {
  const ventana = window.open('', '_blank', 'width=900,height=700')
  ventana.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>${titulo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
  .empresa h1{font-size:18px;font-weight:700;color:#1d4ed8}
  .empresa p{font-size:11px;color:#555}
  .rep-info{text-align:right}
  .rep-info h2{font-size:15px;font-weight:700}
  .rep-info p{font-size:11px;color:#555;margin-top:2px}
  hr{border:none;border-top:1px solid #e5e7eb;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  thead{background:#f3f4f6}
  th{padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb}
  td{padding:6px 10px;font-size:12px;border-bottom:1px solid #f3f4f6}
  tr:last-child td{border-bottom:none}
  .text-right{text-align:right}
  .text-center{text-align:center}
  .total-row td{font-weight:700;border-top:2px solid #e5e7eb;background:#f9fafb}
  .badge{display:inline-block;padding:1px 8px;border-radius:20px;font-size:10px;font-weight:600}
  .badge-green{background:#dcfce7;color:#16a34a}
  .badge-yellow{background:#fef9c3;color:#ca8a04}
  .badge-red{background:#fee2e2;color:#dc2626}
  .badge-blue{background:#dbeafe;color:#2563eb}
  .badge-gray{background:#f3f4f6;color:#6b7280}
  .footer{margin-top:28px;text-align:center;font-size:10px;color:#9ca3af}
  @media print{body{padding:12px}}
</style></head><body>
<div class="header">
  <div class="empresa">
    <h1>Ferretería El Esfuerzo</h1>
    <p>Ferretería y suministros industriales</p>
  </div>
  <div class="rep-info">
    <h2>${titulo}</h2>
    <p>Período: ${mesLabel}</p>
    <p>Generado: ${new Date().toLocaleDateString('es-GT', { day:'2-digit', month:'2-digit', year:'numeric' })}</p>
  </div>
</div>
<hr/>
${htmlTabla}
<div class="footer">Ferretería El Esfuerzo &mdash; Documento generado automáticamente</div>
</body></html>`)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 400)
}

// ── TABS ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'resumen',    label: 'Resumen',          icon: LayoutDashboard },
  { id: 'ventas',     label: 'Ventas',            icon: ShoppingCart },
  { id: 'inventario', label: 'Inventario',        icon: Boxes },
  { id: 'cobrar',     label: 'Cuentas x Cobrar',  icon: CreditCard },
  { id: 'compras',    label: 'Compras',           icon: Receipt },
  { id: 'cotizaciones', label: 'Cotizaciones',    icon: FileText },
]

// ── Componente principal ──────────────────────────────────────────────────────

export default function Reportes() {
  const { ventas, productos, clientes, productosStockBajo } = useApp()
  const { cotizaciones } = useCotizaciones()
  const { cuentas, totalPorCobrar, cuentasVencidas, abonos } = useCuentasPorCobrar()
  const { compras } = useCompras()
  const { proveedores } = useProveedores()

  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const [tab, setTab] = useState('resumen')
  const [mesFiltro, setMesFiltro] = useState(mesActual)

  // Paginación por tab
  const [pags, setPags] = useState({ ventas: 1, inventario: 1, cobrar: 1, compras: 1, cotizaciones: 1 })
  const [porPag, setPorPag] = useState({ ventas: 25, inventario: 25, cobrar: 25, compras: 25, cotizaciones: 25 })
  const setPagina  = useCallback((t, p) => setPags(prev => ({ ...prev, [t]: p })), [])
  const setPorPagina = useCallback((t, n) => setPorPag(prev => ({ ...prev, [t]: n })), [])
  const paginar = (lista, t) => lista.slice((pags[t] - 1) * porPag[t], pags[t] * porPag[t])

  const mesesDisponibles = useMemo(() => generarMeses(ventas), [ventas])
  const [anio, mes] = mesFiltro.split('-').map(Number)
  const mesLabel = mesesDisponibles.find(m => m.value === mesFiltro)?.label || mesFiltro

  const ventasFiltradas = useMemo(() =>
    ventas.filter(v => fechaLocal(v.fecha).startsWith(mesFiltro))
  , [ventas, mesFiltro])

  const completadas   = ventasFiltradas.filter(v => v.estado === 'completada')
  const totalIngresos = completadas.reduce((acc, v) => acc + (Number(v.total) || 0), 0)
  const promedioVenta = completadas.length ? totalIngresos / completadas.length : 0
  const dataDias      = useMemo(() => agruparPorDia(ventasFiltradas, anio, mes), [ventasFiltradas, anio, mes])
  const dataTop       = useMemo(() => topProductos(ventasFiltradas), [ventasFiltradas])

  const comprasFiltradas = useMemo(() =>
    compras.filter(c => {
      const f = c.fecha_documento || c.fecha_recepcion || ''
      return f.startsWith(mesFiltro)
    })
  , [compras, mesFiltro])
  const totalComprasMes = comprasFiltradas.reduce((acc, c) => acc + (Number(c.total) || 0), 0)

  const cotizacionesFiltradas = useMemo(() =>
    cotizaciones.filter(c => fechaLocal(c.fecha).startsWith(mesFiltro))
  , [cotizaciones, mesFiltro])

  const topClientes = useMemo(() => {
    const mapa = {}
    completadas.forEach(v => {
      const nombre = v.cliente_nombre || 'Sin cliente'
      if (!mapa[nombre]) mapa[nombre] = { nombre, total: 0, ventas: 0 }
      mapa[nombre].total += Number(v.total) || 0
      mapa[nombre].ventas += 1
    })
    return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [completadas])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl bg-white border border-gray-100 shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">Día {label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name === 'total' ? formatCurrency(p.value) : `${p.value} ventas`}
          </p>
        ))}
      </div>
    )
  }

  // ── Funciones de impresión por reporte ──────────────────────────────────────

  const imprimirVentas = () => {
    const filas = completadas.map(v => `
      <tr>
        <td>${formatDate(v.fecha)}</td>
        <td class="text-right">${v.numero_venta}</td>
        <td>${v.cliente_nombre || 'Sin cliente'}</td>
        <td>${v.metodo_pago || '—'}</td>
        <td class="text-right">${(v.items || []).length} producto(s)</td>
        <td class="text-right">${formatCurrency(v.descuento || 0)}</td>
        <td class="text-right">${formatCurrency(v.total)}</td>
      </tr>`).join('')
    const html = `
      <table>
        <thead><tr>
          <th>Fecha</th><th class="text-right">N° Venta</th><th>Cliente</th>
          <th>Método pago</th><th class="text-right">Items</th>
          <th class="text-right">Descuento</th><th class="text-right">Total</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="6">Total del mes (${completadas.length} ventas)</td>
          <td class="text-right">${formatCurrency(totalIngresos)}</td>
        </tr></tfoot>
      </table>`
    imprimir('Reporte de Ventas', mesLabel, html)
  }

  const imprimirInventario = () => {
    const filas = productos.map(p => {
      const estado = p.stock === 0 ? `<span class="badge badge-red">Sin stock</span>`
        : p.stock <= p.stock_minimo ? `<span class="badge badge-yellow">Stock bajo</span>`
        : `<span class="badge badge-green">OK</span>`
      return `<tr>
        <td>${p.codigo || '—'}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria || '—'}</td>
        <td class="text-right">${p.stock} ${p.unidad}</td>
        <td class="text-right">${p.stock_minimo}</td>
        <td>${p.ubicacion || '—'}</td>
        <td class="text-right">${formatCurrency(p.precio_venta)}</td>
        <td class="text-center">${estado}</td>
      </tr>`
    }).join('')
    const html = `
      <table>
        <thead><tr>
          <th>Código</th><th>Nombre</th><th>Categoría</th>
          <th class="text-right">Stock</th><th class="text-right">Mín.</th>
          <th>Ubicación</th><th class="text-right">P. Venta</th><th class="text-center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="8">${productos.length} productos activos &mdash; ${productosStockBajo.length} con stock bajo</td>
        </tr></tfoot>
      </table>`
    imprimir('Reporte de Inventario', 'General', html)
  }

  const imprimirCobrar = () => {
    const filas = cuentas.map(c => {
      const vencida = c.fecha_vencimiento < hoy.toISOString().split('T')[0]
        && (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL')
      const badgeMap = { PENDIENTE:'badge-yellow', PARCIAL:'badge-blue', PAGADA:'badge-green', CANCELADA:'badge-gray', VENCIDA:'badge-red' }
      const estadoReal = vencida ? 'VENCIDA' : c.estado
      const labMap = { PENDIENTE:'Pendiente', PARCIAL:'Parcial', PAGADA:'Pagada', CANCELADA:'Cancelada', VENCIDA:'Vencida' }
      return `<tr>
        <td>${c.numero_documento}</td>
        <td>${c.cliente_nombre}</td>
        <td>${formatDate(c.fecha_emision)}</td>
        <td>${formatDate(c.fecha_vencimiento)}</td>
        <td class="text-right">${formatCurrency(c.monto_original)}</td>
        <td class="text-right">${formatCurrency(c.monto_pagado)}</td>
        <td class="text-right">${formatCurrency(c.saldo)}</td>
        <td class="text-center"><span class="badge ${badgeMap[estadoReal]}">${labMap[estadoReal]}</span></td>
      </tr>`
    }).join('')
    const html = `
      <table>
        <thead><tr>
          <th>N° Documento</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th>
          <th class="text-right">Original</th><th class="text-right">Pagado</th>
          <th class="text-right">Saldo</th><th class="text-center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="6">Total pendiente por cobrar</td>
          <td class="text-right">${formatCurrency(totalPorCobrar)}</td>
          <td></td>
        </tr></tfoot>
      </table>`
    imprimir('Reporte de Cuentas por Cobrar', 'General', html)
  }

  const imprimirCompras = () => {
    const filas = comprasFiltradas.map(c => `
      <tr>
        <td>${formatDate(c.fecha_documento || c.fecha_recepcion)}</td>
        <td>${c.numero_documento}</td>
        <td>${c.proveedor_nombre || '—'}</td>
        <td class="text-right">${formatCurrency(c.subtotal)}</td>
        <td class="text-right">${formatCurrency(c.descuento || 0)}</td>
        <td class="text-right">${formatCurrency(c.impuesto || 0)}</td>
        <td class="text-right">${formatCurrency(c.total)}</td>
        <td class="text-center"><span class="badge badge-green">${c.estado || '—'}</span></td>
      </tr>`).join('')
    const html = `
      <table>
        <thead><tr>
          <th>Fecha</th><th>N° Documento</th><th>Proveedor</th>
          <th class="text-right">Subtotal</th><th class="text-right">Descuento</th>
          <th class="text-right">IVA</th><th class="text-right">Total</th><th class="text-center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="6">Total compras del mes (${comprasFiltradas.length})</td>
          <td class="text-right">${formatCurrency(totalComprasMes)}</td>
          <td></td>
        </tr></tfoot>
      </table>`
    imprimir('Reporte de Compras', mesLabel, html)
  }

  const imprimirCotizaciones = () => {
    const filas = cotizacionesFiltradas.map(c => {
      const badgeMap = { VIGENTE:'badge-green', PEDIDO:'badge-blue', CONVERTIDA:'badge-gray', VENCIDA:'badge-yellow', CANCELADA:'badge-red' }
      const labMap   = { VIGENTE:'Vigente', PEDIDO:'Pedido', CONVERTIDA:'Convertida', VENCIDA:'Vencida', CANCELADA:'Cancelada' }
      return `<tr>
        <td>${c.numero_cotizacion}</td>
        <td>${c.cliente_nombre || 'Sin cliente'}</td>
        <td>${formatDate(c.fecha)}</td>
        <td>${c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}</td>
        <td class="text-right">${(c.items || []).length}</td>
        <td class="text-right">${formatCurrency(c.total)}</td>
        <td class="text-center"><span class="badge ${badgeMap[c.estado]||'badge-gray'}">${labMap[c.estado]||c.estado}</span></td>
      </tr>`
    }).join('')
    const total = cotizacionesFiltradas.reduce((a, c) => a + (Number(c.total) || 0), 0)
    const html = `
      <table>
        <thead><tr>
          <th>N° Cotización</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th>
          <th class="text-right">Items</th><th class="text-right">Total</th><th class="text-center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="5">Total (${cotizacionesFiltradas.length} cotizaciones)</td>
          <td class="text-right">${formatCurrency(total)}</td><td></td>
        </tr></tfoot>
      </table>`
    imprimir('Reporte de Cotizaciones', mesLabel, html)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Selecciona un reporte para visualizarlo e imprimirlo</p>
        </div>
        <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className="input sm:w-52">
          {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Navbar de tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {TABS.map(t => {
          const Icon = t.icon
          const activo = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activo
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: Resumen ── */}
      {tab === 'resumen' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">General</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Productos" value={productos.length} icon={Package} iconBg="bg-blue-50" iconColor="text-blue-500" />
              <StatCard label="Clientes" value={clientes.filter(c => c.id !== 'cf').length} icon={Users} iconBg="bg-purple-50" iconColor="text-purple-500" />
              <StatCard label="Proveedores" value={proveedores.length} icon={Truck} iconBg="bg-gray-100" iconColor="text-gray-500" />
              <StatCard label="Cotiz. vigentes" value={cotizaciones.filter(c => c.estado === 'VIGENTE').length} icon={FileText} iconBg="bg-yellow-50" iconColor="text-yellow-500" />
              <StatCard label="Por cobrar" value={formatCurrency(totalPorCobrar)} icon={IconQ} iconBg="bg-orange-50" iconColor="text-orange-500" />
              <StatCard label="Stock bajo" value={productosStockBajo.length} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-500" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Ventas — {mesLabel}</p>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard label="Ingresos del mes" value={formatCurrency(totalIngresos)} icon={IconQ} iconBg="bg-green-100" iconColor="text-green-600" />
              <StatCard label="N° de ventas" value={completadas.length} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
              <StatCard label="Ticket promedio" value={formatCurrency(promedioVenta)} icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" />
              <StatCard label="Total compras" value={formatCurrency(totalComprasMes)} icon={ArrowDownCircle} iconBg="bg-orange-100" iconColor="text-orange-600" />
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Ventas por día — {mesLabel}</h2>
            {completadas.length === 0
              ? <p className="py-12 text-center text-sm text-gray-400">Sin ventas en este mes</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataDias} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tickFormatter={v => `Q${v}`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Productos más vendidos</h2>
              {dataTop.length === 0
                ? <p className="py-6 text-center text-sm text-gray-400">Sin ventas en este mes</p>
                : <div className="space-y-3">
                    {dataTop.map((p, i) => (
                      <div key={p.nombre} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-800">{p.nombre}</span>
                            <span className="font-semibold">{formatCurrency(p.total)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-primary-500" style={{ width: `${(p.total / dataTop[0].total) * 100}%` }} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">{p.cantidad} unidades</p>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div className="card">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Clientes frecuentes</h2>
              {topClientes.length === 0
                ? <p className="py-6 text-center text-sm text-gray-400">Sin ventas en este mes</p>
                : <div className="space-y-3">
                    {topClientes.map((c, i) => (
                      <div key={c.nombre} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-800">{c.nombre}</span>
                            <span className="font-semibold">{formatCurrency(c.total)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-purple-400" style={{ width: `${(c.total / topClientes[0].total) * 100}%` }} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">{c.ventas} {c.ventas === 1 ? 'compra' : 'compras'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Ventas ── */}
      {tab === 'ventas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{completadas.length} ventas &mdash; Total: <span className="font-semibold text-gray-900">{formatCurrency(totalIngresos)}</span></p>
            <button onClick={imprimirVentas} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              <Printer size={14} /> Imprimir reporte
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th><th>N° Venta</th><th>Cliente</th>
                  <th>Método pago</th><th className="text-right">Items</th>
                  <th className="text-right">Descuento</th><th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {completadas.length === 0
                  ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Sin ventas en este mes</td></tr>
                  : paginar(completadas, 'ventas').map(v => (
                    <tr key={v.id}>
                      <td className="text-sm text-gray-500">{formatDate(v.fecha)}</td>
                      <td className="font-mono text-xs">{v.numero_venta}</td>
                      <td className="font-medium">{v.cliente_nombre || 'Sin cliente'}</td>
                      <td className="text-sm text-gray-500 capitalize">{v.metodo_pago || '—'}</td>
                      <td className="text-right text-sm text-gray-500">{(v.items || []).length}</td>
                      <td className="text-right text-sm text-red-500">{formatCurrency(v.descuento || 0)}</td>
                      <td className="text-right font-semibold">{formatCurrency(v.total)}</td>
                    </tr>
                  ))
                }
              </tbody>
              {completadas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="px-4 py-2 text-sm">Total ({completadas.length} ventas)</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(totalIngresos)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination total={completadas.length} pagina={pags.ventas} porPagina={porPag.ventas}
            onCambiar={p => setPagina('ventas', p)} onCambiarPorPagina={n => setPorPagina('ventas', n)} />
        </div>
      )}

      {/* ── TAB: Inventario ── */}
      {tab === 'inventario' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{productos.length} productos &mdash; <span className="text-red-500">{productosStockBajo.length} con stock bajo</span></p>
            <button onClick={imprimirInventario} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              <Printer size={14} /> Imprimir reporte
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Categoría</th>
                  <th className="text-right">Stock</th><th className="text-right">Mín.</th>
                  <th>Ubicación</th><th className="text-right">P. Venta</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginar(productos, 'inventario').map(p => {
                  const { label, variant } = p.stock === 0
                    ? { label: 'Sin stock', variant: 'red' }
                    : p.stock <= p.stock_minimo
                      ? { label: 'Stock bajo', variant: 'yellow' }
                      : { label: 'OK', variant: 'green' }
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-gray-500">{p.codigo || '—'}</td>
                      <td className="font-medium">{p.nombre}</td>
                      <td><Badge variant="gray">{p.categoria}</Badge></td>
                      <td className="text-right">{p.stock} {p.unidad}</td>
                      <td className="text-right text-gray-500">{p.stock_minimo}</td>
                      <td className="text-sm text-gray-500">{p.ubicacion || '—'}</td>
                      <td className="text-right font-semibold">{formatCurrency(p.precio_venta)}</td>
                      <td><Badge variant={variant}>{label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={productos.length} pagina={pags.inventario} porPagina={porPag.inventario}
            onCambiar={p => setPagina('inventario', p)} onCambiarPorPagina={n => setPorPagina('inventario', n)} />
        </div>
      )}

      {/* ── TAB: Cuentas por Cobrar ── */}
      {tab === 'cobrar' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{cuentas.length} cuentas &mdash; Por cobrar: <span className="font-semibold text-orange-600">{formatCurrency(totalPorCobrar)}</span></p>
            <button onClick={imprimirCobrar} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              <Printer size={14} /> Imprimir reporte
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Documento</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th>
                  <th className="text-right">Original</th><th className="text-right">Pagado</th>
                  <th className="text-right">Saldo</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.length === 0
                  ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Sin cuentas registradas</td></tr>
                  : paginar(cuentas, 'cobrar').map(c => {
                      const vencida = c.fecha_vencimiento < hoy.toISOString().split('T')[0]
                        && (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL')
                      const estadoReal = vencida ? 'VENCIDA' : c.estado
                      const variantMap = { PENDIENTE:'yellow', PARCIAL:'blue', PAGADA:'green', CANCELADA:'gray', VENCIDA:'red' }
                      const labMap = { PENDIENTE:'Pendiente', PARCIAL:'Parcial', PAGADA:'Pagada', CANCELADA:'Cancelada', VENCIDA:'Vencida' }
                      return (
                        <tr key={c.id} className={vencida ? 'bg-red-50' : ''}>
                          <td className="font-mono text-xs">{c.numero_documento}</td>
                          <td className="font-medium">{c.cliente_nombre}</td>
                          <td className="text-sm text-gray-500">{formatDate(c.fecha_emision)}</td>
                          <td className="text-sm text-gray-500">{formatDate(c.fecha_vencimiento)}</td>
                          <td className="text-right font-semibold">{formatCurrency(c.monto_original)}</td>
                          <td className="text-right text-green-600">{formatCurrency(c.monto_pagado)}</td>
                          <td className="text-right font-bold text-orange-600">{formatCurrency(c.saldo)}</td>
                          <td><Badge variant={variantMap[estadoReal]}>{labMap[estadoReal]}</Badge></td>
                        </tr>
                      )
                    })
                }
              </tbody>
              {cuentas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="px-4 py-2 text-sm">Total por cobrar</td>
                    <td className="px-4 py-2 text-right text-orange-600">{formatCurrency(totalPorCobrar)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination total={cuentas.length} pagina={pags.cobrar} porPagina={porPag.cobrar}
            onCambiar={p => setPagina('cobrar', p)} onCambiarPorPagina={n => setPorPagina('cobrar', n)} />
        </div>
      )}

      {/* ── TAB: Compras ── */}
      {tab === 'compras' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{comprasFiltradas.length} compras &mdash; Total: <span className="font-semibold text-gray-900">{formatCurrency(totalComprasMes)}</span></p>
            <button onClick={imprimirCompras} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              <Printer size={14} /> Imprimir reporte
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th><th>N° Documento</th><th>Proveedor</th>
                  <th className="text-right">Subtotal</th><th className="text-right">Descuento</th>
                  <th className="text-right">IVA</th><th className="text-right">Total</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.length === 0
                  ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Sin compras en este mes</td></tr>
                  : paginar(comprasFiltradas, 'compras').map(c => (
                    <tr key={c.id}>
                      <td className="text-sm text-gray-500">{formatDate(c.fecha_documento || c.fecha_recepcion)}</td>
                      <td className="font-mono text-xs">{c.numero_documento}</td>
                      <td className="font-medium">{c.proveedor_nombre || '—'}</td>
                      <td className="text-right">{formatCurrency(c.subtotal)}</td>
                      <td className="text-right text-red-500">{formatCurrency(c.descuento || 0)}</td>
                      <td className="text-right text-gray-500">{formatCurrency(c.impuesto || 0)}</td>
                      <td className="text-right font-semibold">{formatCurrency(c.total)}</td>
                      <td><Badge variant="green">{c.estado || '—'}</Badge></td>
                    </tr>
                  ))
                }
              </tbody>
              {comprasFiltradas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="px-4 py-2 text-sm">Total ({comprasFiltradas.length} compras)</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(totalComprasMes)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination total={comprasFiltradas.length} pagina={pags.compras} porPagina={porPag.compras}
            onCambiar={p => setPagina('compras', p)} onCambiarPorPagina={n => setPorPagina('compras', n)} />
        </div>
      )}

      {/* ── TAB: Cotizaciones ── */}
      {tab === 'cotizaciones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{cotizacionesFiltradas.length} cotizaciones en {mesLabel}</p>
            <button onClick={imprimirCotizaciones} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              <Printer size={14} /> Imprimir reporte
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Cotización</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th>
                  <th className="text-right">Items</th><th className="text-right">Total</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.length === 0
                  ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Sin cotizaciones en este mes</td></tr>
                  : paginar(cotizacionesFiltradas, 'cotizaciones').map(c => {
                      const variantMap = { VIGENTE:'green', PEDIDO:'blue', CONVERTIDA:'purple', VENCIDA:'yellow', CANCELADA:'red' }
                      const labMap = { VIGENTE:'Vigente', PEDIDO:'Pedido', CONVERTIDA:'Convertida', VENCIDA:'Vencida', CANCELADA:'Cancelada' }
                      return (
                        <tr key={c.id}>
                          <td className="font-mono text-xs">{c.numero_cotizacion}</td>
                          <td className="font-medium">{c.cliente_nombre || 'Sin cliente'}</td>
                          <td className="text-sm text-gray-500">{formatDate(c.fecha)}</td>
                          <td className="text-sm text-gray-500">{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}</td>
                          <td className="text-right text-gray-500">{(c.items || []).length}</td>
                          <td className="text-right font-semibold">{formatCurrency(c.total)}</td>
                          <td><Badge variant={variantMap[c.estado] || 'gray'}>{labMap[c.estado] || c.estado}</Badge></td>
                        </tr>
                      )
                    })
                }
              </tbody>
              {cotizacionesFiltradas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={5} className="px-4 py-2 text-sm">Total ({cotizacionesFiltradas.length} cotizaciones)</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(cotizacionesFiltradas.reduce((a, c) => a + (Number(c.total) || 0), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination total={cotizacionesFiltradas.length} pagina={pags.cotizaciones} porPagina={porPag.cotizaciones}
            onCambiar={p => setPagina('cotizaciones', p)} onCambiarPorPagina={n => setPorPagina('cotizaciones', n)} />
        </div>
      )}

    </div>
  )
}
