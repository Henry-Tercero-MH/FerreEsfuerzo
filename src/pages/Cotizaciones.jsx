import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Eye, CheckCircle, XCircle } from 'lucide-react'
import { useCotizaciones } from '../contexts/CotizacionesContext'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/shared/EmptyState'

export default function Cotizaciones() {
  const { cotizaciones, cambiarEstado } = useCotizaciones()
  const { clientes } = useApp()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const termino = useDebounce(busqueda)

  const cotizacionesFiltradas = useMemo(() => {
    return cotizaciones.filter(c => {
      const coincideBusqueda = !termino ||
        c.numero_cotizacion?.toLowerCase().includes(termino.toLowerCase()) ||
        c.cliente_nombre?.toLowerCase().includes(termino.toLowerCase())
      const coincideEstado = !filtroEstado || c.estado === filtroEstado
      return coincideBusqueda && coincideEstado
    })
  }, [cotizaciones, termino, filtroEstado])

  const estadoBadge = (estado) => {
    const map = {
      VIGENTE: { label: 'Vigente', variant: 'green', icon: CheckCircle },
      CONVERTIDA: { label: 'Convertida', variant: 'blue', icon: CheckCircle },
      VENCIDA: { label: 'Vencida', variant: 'yellow', icon: XCircle },
      CANCELADA: { label: 'Cancelada', variant: 'red', icon: XCircle },
    }
    return map[estado] || { label: estado, variant: 'gray' }
  }

  const handleConvertir = (id) => {
    if (confirm('¿Convertir esta cotización en venta?')) {
      cambiarEstado(id, 'CONVERTIDA')
    }
  }

  const handleCancelar = (id) => {
    if (confirm('¿Cancelar esta cotización?')) {
      cambiarEstado(id, 'CANCELADA')
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle">{cotizaciones.length} cotizaciones registradas</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/cotizaciones/nueva')}>
          Nueva cotización
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por número o cliente..."
          className="flex-1"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="input sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="VIGENTE">Vigente</option>
          <option value="CONVERTIDA">Convertida</option>
          <option value="VENCIDA">Vencida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {cotizacionesFiltradas.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay cotizaciones"
          description={busqueda || filtroEstado ? 'Intenta con otros filtros' : 'Crea tu primera cotización'}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>N° Cotización</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cotizacionesFiltradas.map(c => {
                const { label, variant } = estadoBadge(c.estado)
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-gray-900">{c.numero_cotizacion}</td>
                    <td className="font-medium">{c.cliente_nombre || 'Sin cliente'}</td>
                    <td className="text-sm text-gray-500">{formatDate(c.fecha)}</td>
                    <td className="text-sm text-gray-500">
                      {c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}
                    </td>
                    <td className="font-semibold">{formatCurrency(c.total)}</td>
                    <td>
                      <Badge variant={variant}>{label}</Badge>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button className="btn-icon btn-ghost text-gray-400 hover:text-primary-600">
                          <Eye size={15} />
                        </button>
                        {c.estado === 'VIGENTE' && (
                          <>
                            <button
                              onClick={() => handleConvertir(c.id)}
                              className="btn-icon btn-ghost text-gray-400 hover:text-green-600"
                              title="Convertir a venta"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleCancelar(c.id)}
                              className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
                              title="Cancelar cotización"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
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
  )
}
