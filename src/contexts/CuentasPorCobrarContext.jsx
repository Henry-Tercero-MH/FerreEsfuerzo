import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId, generateNumeroDocumento } from '../utils/formatters'

export const CuentasPorCobrarContext = createContext(null)

const SEED = []

export function CuentasPorCobrarProvider({ children }) {
  const [cuentas, setCuentas] = useLocalStorage('ferreapp_cuentas_cobrar', SEED)
  const [abonos, setAbonos] = useLocalStorage('ferreapp_abonos', [])

  const crearCuenta = useCallback((data) => {
    const nueva = {
      ...data,
      id: shortId(),
      numero_documento: data.numero_documento || generateNumeroDocumento('CXC'),
      fecha_emision: data.fecha_emision || new Date().toISOString().split('T')[0],
      monto_pagado: 0,
      saldo: data.monto_original,
      estado: 'PENDIENTE',
      creado_en: new Date().toISOString(),
    }
    setCuentas(prev => [nueva, ...prev])
    return nueva
  }, [setCuentas])

  const registrarAbono = useCallback((cuentaId, data) => {
    const cuenta = cuentas.find(c => c.id === cuentaId)
    if (!cuenta) return

    const nuevoAbono = {
      ...data,
      id: shortId(),
      cuenta_por_cobrar_id: cuentaId,
      fecha: new Date().toISOString(),
    }

    setAbonos(prev => [nuevoAbono, ...prev])

    const nuevoMontoPagado = cuenta.monto_pagado + data.monto
    const nuevoSaldo = cuenta.monto_original - nuevoMontoPagado
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : nuevoMontoPagado > 0 ? 'PARCIAL' : 'PENDIENTE'

    setCuentas(prev =>
      prev.map(c => c.id === cuentaId ? {
        ...c,
        monto_pagado: nuevoMontoPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      } : c)
    )

    return nuevoAbono
  }, [cuentas, setAbonos, setCuentas])

  const cuentasPendientes = useMemo(
    () => cuentas.filter(c => c.estado === 'PENDIENTE' || c.estado === 'PARCIAL'),
    [cuentas]
  )

  const cuentasVencidas = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return cuentas.filter(c =>
      (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL') &&
      c.fecha_vencimiento < hoy
    )
  }, [cuentas])

  const totalPorCobrar = useMemo(
    () => cuentasPendientes.reduce((sum, c) => sum + c.saldo, 0),
    [cuentasPendientes]
  )

  return (
    <CuentasPorCobrarContext.Provider value={{
      cuentas,
      abonos,
      cuentasPendientes,
      cuentasVencidas,
      totalPorCobrar,
      crearCuenta,
      registrarAbono,
    }}>
      {children}
    </CuentasPorCobrarContext.Provider>
  )
}

export const useCuentasPorCobrar = () => {
  const context = useContext(CuentasPorCobrarContext)
  if (!context) throw new Error('useCuentasPorCobrar debe usarse dentro de CuentasPorCobrarProvider')
  return context
}
