import { useState, useMemo } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import IconQ from '../components/ui/IconQ'
import { useCuentasPorCobrar } from '../contexts/CuentasPorCobrarContext'
import { useApp } from '../contexts/AppContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate } from '../utils/formatters'
import { METODOS_PAGO } from '../utils/constants'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/shared/SearchBar'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import ClienteSelector from '../components/shared/ClienteSelector'

export default function CuentasPorCobrar() {
  const { cuentas, cuentasVencidas, totalPorCobrar, registrarAbono, abonos, crearCuenta } = useCuentasPorCobrar()
  const { clientes } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalAbono, setModalAbono] = useState({ open: false, cuenta: null })
  const [formAbono, setFormAbono] = useState({ monto: '', metodo_pago: 'efectivo', referencia: '', notas: '' })
  const [loading, setLoading] = useState(false)
  const [modalNueva, setModalNueva] = useState(false)
  const [formNueva, setFormNueva] = useState({ cliente_id: '', monto_original: '', fecha_vencimiento: '', notas: '' })
  const [errNueva, setErrNueva] = useState('')

  const termino = useDebounce(busqueda)

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter(c => {
      const coincideBusqueda = !termino ||
        c.numero_documento?.toLowerCase().includes(termino.toLowerCase()) ||
        c.cliente_nombre?.toLowerCase().includes(termino.toLowerCase())
      const coincideEstado = !filtroEstado || c.estado === filtroEstado
      return coincideBusqueda && coincideEstado
    })
  }, [cuentas, termino, filtroEstado])

  const abrirModalAbono = (cuenta) => {
    setModalAbono({ open: true, cuenta })
    setFormAbono({ monto: '', metodo_pago: 'efectivo', referencia: '', notas: '' })
  }

  const cerrarModalAbono = () => {
    setModalAbono({ open: false, cuenta: null })
  }

  const handleRegistrarAbono = async () => {
    if (!modalAbono.cuenta) return
    if (!formAbono.monto || Number(formAbono.monto) <= 0) return

    const montoAbono = Number(formAbono.monto)
    if (montoAbono > modalAbono.cuenta.saldo) {
      alert('El monto no puede ser mayor al saldo pendiente')
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))

    registrarAbono(modalAbono.cuenta.id, {
      monto: montoAbono,
      metodo_pago: formAbono.metodo_pago,
      referencia: formAbono.referencia,
      notas: formAbono.notas,
    })

    setLoading(false)
    cerrarModalAbono()
  }

  const estadoBadge = (estado) => {
    const map = {
      PENDIENTE: { label: 'Pendiente', variant: 'yellow' },
      PARCIAL: { label: 'Parcial', variant: 'blue' },
      PAGADA: { label: 'Pagada', variant: 'green' },
      VENCIDA: { label: 'Vencida', variant: 'red' },
      CANCELADA: { label: 'Cancelada', variant: 'gray' },
    }
    return map[estado] || { label: estado, variant: 'gray' }
  }

  const esVencida = (cuenta) => {
    const hoy = new Date().toISOString().split('T')[0]
    return (cuenta.estado === 'PENDIENTE' || cuenta.estado === 'PARCIAL') && cuenta.fecha_vencimiento < hoy
  }

  const abonosPorCuenta = (cuentaId) => {
    return abonos.filter(a => a.cuenta_por_cobrar_id === cuentaId)
  }

  const handleCrearCuenta = async () => {
    if (!formNueva.cliente_id) { setErrNueva('Selecciona un cliente'); return }
    if (!formNueva.monto_original || Number(formNueva.monto_original) <= 0) { setErrNueva('Ingresa un monto válido'); return }
    if (!formNueva.fecha_vencimiento) { setErrNueva('Ingresa la fecha de vencimiento'); return }
    const hoy = new Date().toISOString().split('T')[0]
    if (formNueva.fecha_vencimiento < hoy) { setErrNueva('La fecha de vencimiento debe ser futura'); return }
    setErrNueva('')
    const clienteNombre = clientes.find(c => c.id === formNueva.cliente_id)?.nombre || ''
    await crearCuenta({
      cliente_id: formNueva.cliente_id,
      cliente_nombre: clienteNombre,
      monto_original: Number(formNueva.monto_original),
      fecha_vencimiento: formNueva.fecha_vencimiento,
      notas: formNueva.notas,
    })
    setModalNueva(false)
    setFormNueva({ cliente_id: '', monto_original: '', fecha_vencimiento: '', notas: '' })
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cuentas por Cobrar</h1>
          <p className="page-subtitle">Control de créditos a clientes</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setModalNueva(true)}>
          Nueva cuenta
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total por cobrar"
          value={formatCurrency(totalPorCobrar)}
          icon={IconQ}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Cuentas pendientes"
          value={cuentas.filter(c => c.estado !== 'PAGADA' && c.estado !== 'CANCELADA').length}
          icon={IconQ}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <StatCard
          label="Cuentas vencidas"
          value={cuentasVencidas.length}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por documento o cliente..."
          className="flex-1"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="input sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGADA">Pagada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>N° Documento</th>
              <th>Cliente</th>
              <th>Emisión</th>
              <th>Vencimiento</th>
              <th>Monto original</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cuentasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  <IconQ size={32} className="mx-auto mb-2 opacity-30" />
                  {cuentas.length === 0 ? 'Aún no hay cuentas por cobrar registradas' : 'No se encontraron cuentas'}
                </td>
              </tr>
            ) : (
              cuentasFiltradas.map(c => {
                const vencida = esVencida(c)
                const { label, variant } = estadoBadge(vencida ? 'VENCIDA' : c.estado)
                const abonosCuenta = abonosPorCuenta(c.id)

                return (
                  <tr key={c.id} className={vencida ? 'bg-red-50' : ''}>
                    <td className="font-mono text-xs text-gray-900">{c.numero_documento}</td>
                    <td className="font-medium">{c.cliente_nombre}</td>
                    <td className="text-sm text-gray-500">{formatDate(c.fecha_emision)}</td>
                    <td className="text-sm text-gray-500">{formatDate(c.fecha_vencimiento)}</td>
                    <td className="font-semibold">{formatCurrency(c.monto_original)}</td>
                    <td className="text-green-600">{formatCurrency(c.monto_pagado)}</td>
                    <td className="font-bold text-orange-600">{formatCurrency(c.saldo)}</td>
                    <td>
                      <Badge variant={variant}>{label}</Badge>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        {c.estado !== 'PAGADA' && c.estado !== 'CANCELADA' && (
                          <Button
                            variant="success"
                            size="sm"
                            icon={Plus}
                            onClick={() => abrirModalAbono(c)}
                          >
                            Abonar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Cuenta Manual */}
      <Modal
        open={modalNueva}
        onClose={() => { setModalNueva(false); setErrNueva('') }}
        title="Nueva cuenta por cobrar"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalNueva(false); setErrNueva('') }}>Cancelar</Button>
            <Button variant="primary" onClick={handleCrearCuenta}>Crear cuenta</Button>
          </>
        }
      >
        <div className="space-y-3">
          <ClienteSelector
            clientes={clientes}
            value={formNueva.cliente_id}
            onChange={id => setFormNueva(p => ({ ...p, cliente_id: id }))}
            showCF={false}
          />
          <Input
            label="Monto (Q) *"
            type="number"
            min="0"
            step="0.01"
            value={formNueva.monto_original}
            onChange={e => setFormNueva(p => ({ ...p, monto_original: e.target.value }))}
            placeholder="0.00"
          />
          <div>
            <label className="label">Fecha de vencimiento *</label>
            <input
              type="date"
              value={formNueva.fecha_vencimiento}
              onChange={e => setFormNueva(p => ({ ...p, fecha_vencimiento: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="input"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              value={formNueva.notas}
              onChange={e => setFormNueva(p => ({ ...p, notas: e.target.value }))}
              rows={2}
              className="input resize-none"
              placeholder="Concepto del crédito..."
            />
          </div>
          {errNueva && <p className="text-xs text-red-500">{errNueva}</p>}
        </div>
      </Modal>

      {/* Modal Registrar Abono */}
      <Modal
        open={modalAbono.open}
        onClose={cerrarModalAbono}
        title="Registrar Abono"
        footer={
          <>
            <Button variant="secondary" onClick={cerrarModalAbono}>
              Cancelar
            </Button>
            <Button variant="success" loading={loading} onClick={handleRegistrarAbono}>
              Registrar abono
            </Button>
          </>
        }
      >
        {modalAbono.cuenta && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-semibold">{modalAbono.cuenta.cliente_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Documento:</span>
                <span className="font-mono text-xs">{modalAbono.cuenta.numero_documento}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-600">Monto original:</span>
                <span className="font-semibold">{formatCurrency(modalAbono.cuenta.monto_original)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Pagado:</span>
                <span className="font-semibold">{formatCurrency(modalAbono.cuenta.monto_pagado)}</span>
              </div>
              <div className="flex justify-between text-orange-600 font-bold">
                <span>Saldo pendiente:</span>
                <span>{formatCurrency(modalAbono.cuenta.saldo)}</span>
              </div>
            </div>

            {abonosPorCuenta(modalAbono.cuenta.id).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Abonos anteriores:</p>
                <div className="space-y-1">
                  {abonosPorCuenta(modalAbono.cuenta.id).map(a => (
                    <div key={a.id} className="flex justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span>{formatDate(a.fecha)}</span>
                      <span className="font-semibold text-green-600">{formatCurrency(a.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Monto a abonar (Q) *"
              type="number"
              min="0"
              max={modalAbono.cuenta.saldo}
              step="0.01"
              value={formAbono.monto}
              onChange={e => setFormAbono(p => ({ ...p, monto: e.target.value }))}
              placeholder="0.00"
            />

            <Select
              label="Método de pago"
              value={formAbono.metodo_pago}
              onChange={e => setFormAbono(p => ({ ...p, metodo_pago: e.target.value }))}
            >
              {METODOS_PAGO.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>

            <Input
              label="Referencia"
              value={formAbono.referencia}
              onChange={e => setFormAbono(p => ({ ...p, referencia: e.target.value }))}
              placeholder="N° de recibo, cheque, etc."
            />

            <div>
              <label className="label">Notas</label>
              <textarea
                value={formAbono.notas}
                onChange={e => setFormAbono(p => ({ ...p, notas: e.target.value }))}
                rows={2}
                className="input resize-none"
                placeholder="Observaciones..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
