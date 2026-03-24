import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { StatCard } from '../components/ui/Card'
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react'

function agruparPorDia(ventas, dias = 14) {
  const mapa = {}
  const hoy = new Date()
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() - i)
    const key = d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })
    mapa[key] = { fecha: key, ventas: 0, total: 0 }
  }
  ventas.forEach(v => {
    if (v.estado !== 'completada') return
    const key = new Date(v.fecha).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })
    if (mapa[key]) { mapa[key].ventas += 1; mapa[key].total += v.total }
  })
  return Object.values(mapa)
}

function topProductos(ventas) {
  const mapa = {}
  ventas.filter(v => v.estado === 'completada').forEach(v => {
    v.items?.forEach(item => {
      if (!mapa[item.nombre]) mapa[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0 }
      mapa[item.nombre].cantidad += item.cantidad
      mapa[item.nombre].total += item.subtotal
    })
  })
  return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 5)
}

export default function Reportes() {
  const { ventas, totalProductos, totalClientes, productosStockBajo } = useApp()
  const completadas = ventas.filter(v => v.estado === 'completada')
  const totalIngresos = completadas.reduce((acc, v) => acc + v.total, 0)
  const promedioVenta = completadas.length ? totalIngresos / completadas.length : 0

  const dataDias = useMemo(() => agruparPorDia(ventas), [ventas])
  const dataTop = useMemo(() => topProductos(ventas), [ventas])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl bg-white border border-gray-100 shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name === 'total' ? formatCurrency(p.value) : `${p.value} ventas`}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Análisis de ventas e inventario</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos totales" value={formatCurrency(totalIngresos)} icon={DollarSign} iconBg="bg-green-100" iconColor="text-green-600" />
        <StatCard label="Total ventas" value={completadas.length} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard label="Ticket promedio" value={formatCurrency(promedioVenta)} icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Alertas de stock" value={productosStockBajo.length} icon={Package} iconBg="bg-red-100" iconColor="text-red-600" />
      </div>

      {/* Gráfica ventas por día */}
      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Ventas — últimos 14 días</h2>
        {completadas.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Sin datos suficientes para graficar</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataDias} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `Q${v}`} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top productos */}
      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Productos más vendidos</h2>
        {dataTop.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin ventas registradas</p>
        ) : (
          <div className="space-y-3">
            {dataTop.map((p, i) => (
              <div key={p.nombre} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-800">{p.nombre}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(p.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${(p.total / dataTop[0].total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{p.cantidad} unidades vendidas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
