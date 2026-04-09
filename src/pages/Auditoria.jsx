import { useState, useMemo } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { getAuditoriaLocal } from '../services/auditoria'
import { formatDateTime } from '../utils/formatters'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useDebounce } from '../hooks/useDebounce'

const ACCION_CONFIG = {
  // Sesión
  login:                   { label: 'Login',                  variant: 'green' },
  login_fallido:           { label: 'Login fallido',          variant: 'red' },
  logout:                  { label: 'Logout',                 variant: 'gray' },
  // Ventas
  venta_creada:            { label: 'Venta creada',           variant: 'blue' },
  pedido_creado:           { label: 'Pedido creado',          variant: 'blue' },
  venta_cancelada:         { label: 'Venta cancelada',        variant: 'red' },
  // Cotizaciones
  cotizacion_creada:       { label: 'Cotización creada',      variant: 'purple' },
  // Productos
  producto_creado:         { label: 'Producto creado',        variant: 'green' },
  producto_editado:        { label: 'Producto editado',       variant: 'yellow' },
  producto_eliminado:      { label: 'Producto eliminado',     variant: 'red' },
  // Inventario
  stock_ajustado_manual:   { label: 'Ajuste de stock',        variant: 'orange' },
  // Clientes
  cliente_creado:          { label: 'Cliente creado',         variant: 'green' },
  cliente_editado:         { label: 'Cliente editado',        variant: 'yellow' },
  cliente_eliminado:       { label: 'Cliente eliminado',      variant: 'red' },
  // Proveedores
  proveedor_creado:        { label: 'Proveedor creado',       variant: 'green' },
  proveedor_editado:       { label: 'Proveedor editado',      variant: 'yellow' },
  proveedor_eliminado:     { label: 'Proveedor eliminado',    variant: 'red' },
  // Compras
  compra_registrada:       { label: 'Compra registrada',      variant: 'purple' },
  // Cuentas por cobrar
  cuenta_cobrar_creada:    { label: 'Cuenta por cobrar',      variant: 'blue' },
  abono_registrado:        { label: 'Abono registrado',       variant: 'green' },
  // Caja
  caja_abierta:            { label: 'Caja abierta',           variant: 'green' },
  caja_cerrada:            { label: 'Caja cerrada',           variant: 'gray' },
  caja_movimiento:         { label: 'Movimiento de caja',     variant: 'yellow' },
  // Pedidos
  despacho_actualizado:    { label: 'Despacho actualizado',   variant: 'blue' },
  // Usuarios
  usuario_creado:          { label: 'Usuario creado',         variant: 'green' },
  usuario_editado:         { label: 'Usuario editado',        variant: 'yellow' },
  usuario_eliminado:       { label: 'Usuario desactivado',    variant: 'red' },
  // Empresa
  empresa_actualizada:     { label: 'Empresa actualizada',    variant: 'purple' },
}

function accionBadge(accion) {
  return ACCION_CONFIG[accion] || { label: accion, variant: 'gray' }
}

export default function Auditoria() {
  const [registros, setRegistros] = useState(() => getAuditoriaLocal())
  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const termino = useDebounce(busqueda)

  const filtrados = useMemo(() => registros.filter(r => {
    const coincideTexto = !termino ||
      r.descripcion?.toLowerCase().includes(termino.toLowerCase()) ||
      r.usuario_nombre?.toLowerCase().includes(termino.toLowerCase()) ||
      r.entidad_id?.toLowerCase().includes(termino.toLowerCase())
    const coincideAccion = !filtroAccion || r.accion === filtroAccion
    return coincideTexto && coincideAccion
  }), [registros, termino, filtroAccion])

  const acciones = useMemo(() => [...new Set(registros.map(r => r.accion))], [registros])

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">{registros.length} eventos registrados</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={() => setRegistros(getAuditoriaLocal())}>
          Actualizar
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por descripción, usuario o ID..."
          className="flex-1"
        />
        <select
          value={filtroAccion}
          onChange={e => setFiltroAccion(e.target.value)}
          className="input sm:w-52"
        >
          <option value="">Todas las acciones</option>
          {acciones.map(a => (
            <option key={a} value={a}>{ACCION_CONFIG[a]?.label || a}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">
              {registros.length === 0 ? 'No hay eventos registrados aún' : 'No se encontraron eventos'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Descripción</th>
                  <th>Entidad</th>
                  <th>ID Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => {
                  const { label, variant } = accionBadge(r.accion)
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-gray-500">{formatDateTime(r.fecha)}</td>
                      <td>
                        <div className="font-medium text-gray-900">{r.usuario_nombre}</div>
                        <div className="text-gray-400">{r.usuario_rol}</div>
                      </td>
                      <td><Badge variant={variant}>{label}</Badge></td>
                      <td className="max-w-xs text-gray-700">{r.descripcion}</td>
                      <td className="text-gray-500">{r.entidad}</td>
                      <td className="font-mono text-gray-400">{r.entidad_id || '—'}</td>
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
