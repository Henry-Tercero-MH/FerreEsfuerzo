import { useState } from 'react'
import { Lock, Unlock, TrendingUp, TrendingDown } from 'lucide-react'
import IconQ from '../components/ui/IconQ'
import { useCaja } from '../contexts/CajaContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function Caja() {
  const { sesion } = useAuth()
  const { aperturas, cajaAbierta, abrirCaja, cerrarCaja, registrarMovimiento, movimientos } = useCaja()
  const [modalApertura, setModalApertura] = useState(false)
  const [modalCierre, setModalCierre] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [montoApertura, setMontoApertura] = useState('100.00')
  const [formCierre, setFormCierre] = useState({ monto_real: '', notas: '' })
  const [formMovimiento, setFormMovimiento] = useState({ tipo: 'INGRESO', monto: '', concepto: '', referencia: '' })
  const [loading, setLoading] = useState(false)
  const [errCierre, setErrCierre] = useState('')
  const [errMovimiento, setErrMovimiento] = useState('')

  const handleAbrirCaja = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    abrirCaja({
      usuario_id: sesion.id,
      usuario_nombre: sesion.nombre,
      monto_apertura: Math.max(Number(montoApertura) || 0, 0),
    })
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
    cerrarCaja(cajaAbierta.id, {
      monto_real: Number(formCierre.monto_real) || 0,
      notas_cierre: formCierre.notas,
      monto_esperado: cajaAbierta.monto_apertura + cajaAbierta.total_ventas_efectivo + cajaAbierta.total_ingresos - cajaAbierta.total_egresos,
    })
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
    setLoading(false)
    setModalMovimiento(false)
    setFormMovimiento({ tipo: 'INGRESO', monto: '', concepto: '', referencia: '' })
  }

  const movimientosCajaActual = cajaAbierta
    ? movimientos.filter(m => m.apertura_caja_id === cajaAbierta.id)
    : []

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
            <Button variant="danger" icon={Lock} onClick={() => setModalCierre(true)}>
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
                </tr>
              </thead>
              <tbody>
                {aperturas.filter(a => a.estado === 'CERRADA').slice(0, 10).map(a => (
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
