import { useMemo, useState } from 'react'
import { TrendingUp, Package, Users, Clock, Calendar, BarChart2, UserCheck } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../utils/formatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

const DIAS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const METODO_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', credito: 'Crédito', transferencia: 'Transferencia' }
const METODO_COLOR = {
  efectivo:      'bg-green-100 text-green-700',
  tarjeta:       'bg-blue-100 text-blue-700',
  credito:       'bg-yellow-100 text-yellow-700',
  transferencia: 'bg-purple-100 text-purple-700',
}

export default function Bi() {
  const { ventas, clientes } = useApp()
  const [periodo, setPeriodo] = useState('30')

  const ventasCompletadas = useMemo(() =>
    ventas.filter(v => v.estado === 'completada'), [ventas])

  const ventasFiltradas = useMemo(() => {
    if (periodo === 'todo') return ventasCompletadas
    const desde = new Date()
    desde.setDate(desde.getDate() - Number(periodo))
    return ventasCompletadas.filter(v => new Date(v.fecha) >= desde)
  }, [ventasCompletadas, periodo])

  // Ventas por día de la semana
  const porDiaSemana = useMemo(() => {
    const acum = Array(7).fill(null).map((_, i) => ({ dia: DIAS[i], total: 0, cantidad: 0 }))
    ventasFiltradas.forEach(v => {
      const d = new Date(v.fecha).getDay()
      acum[d].total    += Number(v.total) || 0
      acum[d].cantidad += 1
    })
    return acum
  }, [ventasFiltradas])

  // Ventas por hora (rango laboral 6-21)
  const porHora = useMemo(() => {
    const acum = Array(24).fill(null).map((_, i) => ({ hora: `${i}:00`, total: 0, cantidad: 0 }))
    ventasFiltradas.forEach(v => {
      const h = new Date(v.fecha).getHours()
      acum[h].total    += Number(v.total) || 0
      acum[h].cantidad += 1
    })
    return acum.filter((_, i) => i >= 6 && i <= 21)
  }, [ventasFiltradas])

  // Tendencia mensual (últimos 12 meses del historial completo)
  const porMes = useMemo(() => {
    const acum = {}
    ventasCompletadas.forEach(v => {
      const d   = new Date(v.fecha)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
      if (!acum[key]) acum[key] = { mes: `${MESES[d.getMonth()]} ${d.getFullYear()}`, total: 0, cantidad: 0 }
      acum[key].total    += Number(v.total) || 0
      acum[key].cantidad += 1
    })
    return Object.entries(acum).sort(([a],[b]) => a.localeCompare(b)).slice(-12).map(([,v]) => v)
  }, [ventasCompletadas])

  // Productos más vendidos
  const productosTop = useMemo(() => {
    const acum = {}
    ventasFiltradas.forEach(v => {
      ;(v.items || []).forEach(item => {
        if (!acum[item.producto_id]) acum[item.producto_id] = { nombre: item.nombre, cantidad: 0, total: 0 }
        acum[item.producto_id].cantidad += Number(item.cantidad) || 0
        acum[item.producto_id].total    += Number(item.subtotal) || 0
      })
    })
    return Object.values(acum).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
  }, [ventasFiltradas])

  // Clientes frecuentes (excluye CF)
  const clientesTop = useMemo(() => {
    const acum = {}
    ventasFiltradas.forEach(v => {
      if (!v.cliente_id || v.cliente_id === 'cf') return
      if (!acum[v.cliente_id]) {
        const cli = clientes.find(c => c.id === v.cliente_id)
        acum[v.cliente_id] = { nombre: cli?.nombre || v.cliente_nombre || '—', compras: 0, total: 0 }
      }
      acum[v.cliente_id].compras += 1
      acum[v.cliente_id].total   += Number(v.total) || 0
    })
    return Object.values(acum).sort((a, b) => b.compras - a.compras).slice(0, 8)
  }, [ventasFiltradas, clientes])

  // Ventas por vendedor
  const porVendedor = useMemo(() => {
    const acum = {}
    ventasFiltradas.forEach(v => {
      const uid    = v.usuario_id    || 'desconocido'
      const nombre = v.usuario_nombre || 'Sin asignar'
      if (!acum[uid]) acum[uid] = { nombre, ventas: 0, total: 0 }
      acum[uid].ventas += 1
      acum[uid].total  += Number(v.total) || 0
    })
    return Object.values(acum).sort((a, b) => b.total - a.total)
  }, [ventasFiltradas])

  // Métodos de pago
  const porMetodoPago = useMemo(() => {
    const acum = {}
    ventasFiltradas.forEach(v => {
      const m = v.metodo_pago || 'otro'
      if (!acum[m]) acum[m] = { metodo: m, total: 0, cantidad: 0 }
      acum[m].total    += Number(v.total) || 0
      acum[m].cantidad += 1
    })
    return Object.values(acum).sort((a, b) => b.total - a.total)
  }, [ventasFiltradas])

  const totalPeriodo   = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total) || 0), 0)
  const ticketPromedio = ventasFiltradas.length ? totalPeriodo / ventasFiltradas.length : 0
  const clientesUnicos = new Set(ventasFiltradas.filter(v => v.cliente_id !== 'cf').map(v => v.cliente_id)).size

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inteligencia de Negocios</h1>
          <p className="page-subtitle">Análisis de ventas y comportamiento del negocio</p>
        </div>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="input w-44">
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="todo">Todo el historial</option>
        </select>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total del periodo', value: formatCurrency(totalPeriodo) },
          { label: 'Número de ventas',  value: ventasFiltradas.length },
          { label: 'Ticket promedio',   value: formatCurrency(ticketPromedio) },
          { label: 'Clientes únicos',   value: clientesUnicos },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tendencia mensual */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary-600" />
          <h2 className="font-semibold text-gray-900">Tendencia mensual</h2>
        </div>
        {porMes.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Sin datos</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={v => [formatCurrency(v), 'Ventas']} />
              <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Días de más ventas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Días de más ventas</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porDiaSemana}>
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={v => [formatCurrency(v), 'Total']} />
              <Bar dataKey="total" fill="#4f46e5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horarios de más ventas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Horarios de más ventas</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porHora}>
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={v => [formatCurrency(v), 'Total']} />
              <Bar dataKey="total" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Productos más vendidos */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Productos más vendidos</h2>
          </div>
          {productosTop.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Sin datos</p> : (
            <div className="space-y-3">
              {productosTop.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${Math.round((p.cantidad / productosTop[0].cantidad) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-900">{p.cantidad} uds</p>
                    <p className="text-xs text-gray-400">{formatCurrency(p.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes frecuentes */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Clientes frecuentes</h2>
          </div>
          {clientesTop.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Sin ventas con clientes registrados</p> : (
            <div className="space-y-3">
              {clientesTop.map((c, i) => (
                <div key={c.nombre} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.nombre}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round((c.compras / clientesTop[0].compras) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-900">{c.compras} compras</p>
                    <p className="text-xs text-gray-400">{formatCurrency(c.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} className="text-primary-600" />
          <h2 className="font-semibold text-gray-900">Métodos de pago</h2>
        </div>
        {porMetodoPago.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Sin datos</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {porMetodoPago.map(m => (
              <div key={m.metodo} className={`rounded-xl p-4 ${METODO_COLOR[m.metodo] || 'bg-gray-100 text-gray-700'}`}>
                <p className="text-xs font-medium capitalize mb-1">{METODO_LABEL[m.metodo] || m.metodo}</p>
                <p className="text-lg font-bold">{formatCurrency(m.total)}</p>
                <p className="text-xs opacity-70">{m.cantidad} ventas</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Ventas por vendedor */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck size={18} className="text-primary-600" />
          <h2 className="font-semibold text-gray-900">Rendimiento por vendedor</h2>
        </div>
        {porVendedor.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin datos — las ventas nuevas ya registran el vendedor</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vendedor</th>
                  <th>Nº ventas</th>
                  <th>Total facturado</th>
                  <th>Ticket promedio</th>
                  <th>Participación</th>
                </tr>
              </thead>
              <tbody>
                {porVendedor.map((v, i) => {
                  const participacion = totalPeriodo ? Math.round((v.total / totalPeriodo) * 100) : 0
                  return (
                    <tr key={v.nombre}>
                      <td className="text-gray-400 font-bold">{i + 1}</td>
                      <td className="font-medium text-gray-900">{v.nombre}</td>
                      <td>{v.ventas}</td>
                      <td className="font-semibold">{formatCurrency(v.total)}</td>
                      <td>{formatCurrency(v.ventas ? v.total / v.ventas : 0)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${participacion}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{participacion}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
