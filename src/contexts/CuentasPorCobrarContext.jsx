import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { shortId, generateNumeroSecuencial } from '../utils/formatters'
import { db } from '../services/db'
import { useAuth } from './AuthContext'

export const CuentasPorCobrarContext = createContext(null)

export function CuentasPorCobrarProvider({ children }) {
  const { tieneAcceso, sesion } = useAuth()
  const puede = useCallback(() => !!sesion && tieneAcceso('/cuentas-por-cobrar'), [sesion, tieneAcceso])
  const [cuentas, setCuentas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_cuentas_cobrar') || '[]') } catch { return [] }
  })
  const [abonos, setAbonos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_abonos') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem('ferreapp_cuentas_cobrar') || '[]'); return !Array.isArray(c) || c.length === 0 } catch { return true }
  })

  useEffect(() => {
    localStorage.setItem('ferreapp_cuentas_cobrar', JSON.stringify(cuentas))
  }, [cuentas, puede])

  useEffect(() => {
    localStorage.setItem('ferreapp_abonos', JSON.stringify(abonos))
  }, [abonos])

  useEffect(() => {
    Promise.all([
      db.forceRefresh('cuentasCobrar').then(data => { if (data.length) setCuentas(data) }),
      db.forceRefresh('abonos').then(data => { if (data.length) setAbonos(data) }),
    ]).finally(() => setLoading(false))
  }, [])

  const crearCuenta = useCallback(async (data) => {
    if (!puede()) return null
    const nums = cuentas.map(c => parseInt(c.numero_documento?.replace('CXC-', '') || '0')).filter(n => !isNaN(n))
    const nueva = {
      ...data,
      id: shortId(),
      numero_documento: data.numero_documento || generateNumeroSecuencial('CXC', (nums.length ? Math.max(...nums) : 0) + 1),
      fecha_emision: data.fecha_emision || new Date().toISOString().split('T')[0],
      monto_pagado: 0,
      saldo: data.monto_original,
      estado: 'PENDIENTE',
      creado_en: new Date().toISOString(),
    }
    setCuentas(prev => [nueva, ...prev])
    await db.insert('cuentasCobrar', nueva)
    return nueva
  }, [cuentas, puede])

  const cancelarCuenta = useCallback(async (ventaId) => {
    if (!puede()) return null
    const cuenta = cuentas.find(c => c.referencia_venta === ventaId && c.estado !== 'CANCELADA')
    if (!cuenta) return
    const cambio = { estado: 'CANCELADA', actualizado_en: new Date().toISOString() }
    setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, ...cambio } : c))
    await db.update('cuentasCobrar', cuenta.id, cambio)
  }, [cuentas, puede])

  const registrarAbono = useCallback(async (cuentaId, data) => {
    if (!puede()) return null
    const cuenta = cuentas.find(c => c.id === cuentaId)
    if (!cuenta) return

    const nuevoAbono = {
      ...data,
      id: shortId(),
      cuenta_por_cobrar_id: cuentaId,
      fecha: new Date().toISOString(),
    }
    setAbonos(prev => [nuevoAbono, ...prev])
    await db.insert('abonos', nuevoAbono)

    const nuevoMontoPagado = cuenta.monto_pagado + data.monto
    const nuevoSaldo = cuenta.monto_original - nuevoMontoPagado
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : nuevoMontoPagado > 0 ? 'PARCIAL' : 'PENDIENTE'
    const cambio = {
      monto_pagado: nuevoMontoPagado,
      saldo: nuevoSaldo,
      estado: nuevoEstado,
      actualizado_en: new Date().toISOString(),
    }

    setCuentas(prev => prev.map(c => c.id === cuentaId ? { ...c, ...cambio } : c))
    await db.update('cuentasCobrar', cuentaId, cambio)

    return nuevoAbono
  }, [cuentas, puede])

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
      cancelarCuenta,
      registrarAbono,
      loading,
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

CuentasPorCobrarProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
