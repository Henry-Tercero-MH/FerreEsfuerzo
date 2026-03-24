import { ShoppingCart, Package, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { StatCard } from '../components/ui/Card'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import { ESTADOS_VENTA } from '../utils/constants'

export default function Dashboard() {
  const { sesion } = useAuth()
  const {
    totalVentasHoy, totalProductos, totalClientes, totalVentas,
    productosStockBajo, ventas,
  } = useApp()

  const ultimasVentas = ventas.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="page-title">Bienvenido, {sesion?.nombre.split(' ')[0]}</h1>
        <p className="page-subtitle">Resumen del día de hoy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={formatCurrency(totalVentasHoy)}
          icon={TrendingUp}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          label="Total ventas"
          value={totalVentas.toLocaleString()}
          icon={ShoppingCart}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Productos activos"
          value={totalProductos.toLocaleString()}
          icon={Package}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Clientes"
          value={totalClientes.toLocaleString()}
          icon={Users}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimas ventas */}
        <div className="lg:col-span-2 card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Últimas ventas</h2>
            <Link to="/ventas" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {ultimasVentas.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No hay ventas registradas aún</p>
          ) : (
            <div className="space-y-2">
              {ultimasVentas.map(venta => {
                const estado = ESTADOS_VENTA[venta.estado]
                return (
                  <div key={venta.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{venta.numero_venta}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(venta.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(venta.total)}</p>
                      <Badge variant={estado?.badge?.replace('badge-', '')}>{estado?.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stock bajo */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Stock bajo</h2>
            {productosStockBajo.length > 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {productosStockBajo.length}
              </span>
            )}
          </div>
          {productosStockBajo.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Todo el stock está bien</p>
          ) : (
            <div className="space-y-2">
              {productosStockBajo.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2">
                  <p className="text-xs font-medium text-gray-700 truncate pr-2">{p.nombre}</p>
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {p.stock} {p.unidad}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/inventario" className="mt-4 flex items-center justify-center gap-1 text-xs text-primary-600 hover:underline">
            Ver inventario <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
