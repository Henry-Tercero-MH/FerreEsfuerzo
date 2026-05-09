import { useMemo } from 'react'
import { ShoppingCart, Package, Users, TrendingUp, AlertTriangle, ArrowRight, ClipboardList, Tag, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { StatCard } from '../components/ui/Card'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import { ESTADOS_VENTA } from '../utils/constants'

// ── Admin: ve todo ─────────────────────────────────────────────
function DashboardAdmin({ sesion, datos }) {
  const { totalVentasHoy, totalProductos, totalClientes, totalVentas, productosStockBajo, ultimasVentas } = datos
  const { totalPorCobrar, cuentasVencidas } = useCuentasPorCobrar()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Bienvenido, {sesion?.nombre.split(' ')[0]}</h1>
        <p className="page-subtitle">Resumen general del negocio</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ventas de hoy" value={formatCurrency(totalVentasHoy)} icon={TrendingUp} iconBg="bg-green-100" iconColor="text-green-600" />
        <StatCard label="Total ventas" value={totalVentas.toLocaleString()} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard label="Productos activos" value={totalProductos.toLocaleString()} icon={Package} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Clientes" value={totalClientes.toLocaleString()} icon={Users} iconBg="bg-orange-100" iconColor="text-orange-600" />
        <Link to="/cuentas-por-cobrar" className="block">
          <StatCard
            label="Cuentas por cobrar"
            value={formatCurrency(totalPorCobrar)}
            icon={Wallet}
            iconBg={cuentasVencidas.length > 0 ? 'bg-red-100' : 'bg-teal-100'}
            iconColor={cuentasVencidas.length > 0 ? 'text-red-600' : 'text-teal-600'}
            sub={cuentasVencidas.length > 0 ? `${cuentasVencidas.length} vencida(s)` : undefined}
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Últimas ventas</h2>
            <Link to="/ventas" className="text-xs text-primary-600 hover:underline flex items-center gap-1">Ver todas <ArrowRight size={12} /></Link>
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
                      <p className="text-xs text-gray-400">{formatDateTime(venta.fecha)} — {venta.usuario_nombre || '—'}</p>
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

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Stock bajo</h2>
            {productosStockBajo.length > 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{productosStockBajo.length}</span>
            )}
          </div>
          {productosStockBajo.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Todo el stock está bien</p>
          ) : (
            <div className="space-y-2">
              {productosStockBajo.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2">
                  <p className="text-xs font-medium text-gray-700 truncate pr-2">{p.nombre}</p>
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{p.stock} {p.unidad}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/inventario" className="mt-4 flex items-center justify-center gap-1 text-xs text-primary-600 hover:underline">Ver inventario <ArrowRight size={12} /></Link>
        </div>
      </div>
    </div>
  )
}

// ── Vendedor: sus ventas del día + acceso rápido ───────────────
function DashboardVendedor({ sesion, datos }) {
  const { ventas, totalProductos } = datos

  const hoy = new Date().toDateString()

  // Coincide por ID o por nombre (fallback cuando Sheets devuelve usuario_id vacío)
  const esMiVenta = (v) =>
    (sesion?.id && v.usuario_id && v.usuario_id === sesion.id) ||
    (sesion?.nombre && v.usuario_nombre && v.usuario_nombre === sesion.nombre)

  const misVentas = useMemo(() => ventas.filter(esMiVenta), [ventas, sesion])
  const misVentasHoy = useMemo(() =>
    misVentas.filter(v => new Date(v.fecha).toDateString() === hoy),
    [misVentas, hoy]
  )
  const totalHoy = misVentasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Hola, {sesion?.nombre.split(' ')[0]}</h1>
        <p className="page-subtitle">Tu resumen de hoy</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Mis ventas hoy" value={misVentasHoy.length.toLocaleString()} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard label="Total facturado hoy" value={formatCurrency(totalHoy)} icon={TrendingUp} iconBg="bg-green-100" iconColor="text-green-600" />
        <StatCard label="Productos disponibles" value={totalProductos.toLocaleString()} icon={Package} iconBg="bg-purple-100" iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis últimas ventas */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Mis ventas de hoy</h2>
            <Link to="/ventas" className="text-xs text-primary-600 hover:underline flex items-center gap-1">Ver todas <ArrowRight size={12} /></Link>
          </div>
          {misVentasHoy.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Aún no has registrado ventas hoy</p>
          ) : (
            <div className="space-y-2">
              {misVentasHoy.slice(0, 6).map((venta, i) => {
                const estado = ESTADOS_VENTA[venta.estado]
                return (
                  <div key={venta.id ?? i} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
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

        {/* Accesos rápidos */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
          <div className="space-y-3">
            <Link to="/ventas/nueva" className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 hover:bg-primary-100 transition-colors">
              <ShoppingCart size={18} className="text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Nueva venta</span>
              <ArrowRight size={14} className="ml-auto text-primary-400" />
            </Link>
            <Link to="/cotizaciones/nueva" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
              <ClipboardList size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Nueva cotización</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link to="/clientes" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
              <Users size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Clientes</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bodeguero: stock y movimientos ────────────────────────────
function DashboardBodeguero({ sesion, datos }) {
  const { productosStockBajo, totalProductos } = datos
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Bienvenido, {sesion?.nombre.split(' ')[0]}</h1>
        <p className="page-subtitle">Panel de bodega</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Productos activos" value={totalProductos.toLocaleString()} icon={Package} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Stock bajo" value={productosStockBajo.length.toLocaleString()} icon={AlertTriangle} iconBg="bg-yellow-100" iconColor="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Productos con stock bajo</h2>
            {productosStockBajo.length > 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{productosStockBajo.length}</span>
            )}
          </div>
          {productosStockBajo.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Todo el stock está bien</p>
          ) : (
            <div className="space-y-2">
              {productosStockBajo.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2">
                  <p className="text-sm font-medium text-gray-700 truncate pr-2">{p.nombre}</p>
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{p.stock} {p.unidad}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/inventario" className="mt-4 flex items-center justify-center gap-1 text-xs text-primary-600 hover:underline">Ver inventario <ArrowRight size={12} /></Link>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
          <div className="space-y-3">
            <Link to="/productos" className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 hover:bg-primary-100 transition-colors">
              <Package size={18} className="text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Productos</span>
              <ArrowRight size={14} className="ml-auto text-primary-400" />
            </Link>
            <Link to="/inventario" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
              <Tag size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Movimientos de inventario</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link to="/pedidos" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
              <ClipboardList size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Pedidos pendientes</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Cotizador: sus cotizaciones ───────────────────────────────
function DashboardCotizador({ sesion, datos }) {
  const { totalProductos, totalClientes } = datos
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Hola, {sesion?.nombre.split(' ')[0]}</h1>
        <p className="page-subtitle">Panel de cotizaciones</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Productos disponibles" value={totalProductos.toLocaleString()} icon={Package} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Clientes registrados" value={totalClientes.toLocaleString()} icon={Users} iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
        <div className="space-y-3">
          <Link to="/cotizaciones/nueva" className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 hover:bg-primary-100 transition-colors">
            <ClipboardList size={18} className="text-primary-600" />
            <span className="text-sm font-medium text-primary-700">Nueva cotización</span>
            <ArrowRight size={14} className="ml-auto text-primary-400" />
          </Link>
          <Link to="/cotizaciones" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
            <ClipboardList size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Mis cotizaciones</span>
            <ArrowRight size={14} className="ml-auto text-gray-400" />
          </Link>
          <Link to="/clientes" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
            <Users size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Clientes</span>
            <ArrowRight size={14} className="ml-auto text-gray-400" />
          </Link>
          <Link to="/productos" className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
            <Package size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Consultar productos</span>
            <ArrowRight size={14} className="ml-auto text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Entry point ───────────────────────────────────────────────
export default function Dashboard() {
  const { sesion } = useAuth()
  const { totalVentasHoy, totalProductos, totalClientes, totalVentas, productosStockBajo, ventas } = useApp()

  const datos = {
    totalVentasHoy, totalProductos, totalClientes, totalVentas,
    productosStockBajo, ventas,
    ultimasVentas: ventas.slice(0, 5),
  }

  switch (sesion?.rol) {
    case 'bodeguero':  return <DashboardBodeguero  sesion={sesion} datos={datos} />
    case 'vendedor':   return <DashboardVendedor   sesion={sesion} datos={datos} />
    case 'cotizador':  return <DashboardCotizador  sesion={sesion} datos={datos} />
    default:           return <DashboardAdmin      sesion={sesion} datos={datos} />
  }
}
