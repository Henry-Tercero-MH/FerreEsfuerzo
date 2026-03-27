import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'

export const EmpresaContext = createContext(null)

const EMPRESA_DEFAULT = {
  // Datos fiscales
  nit: '',
  nombre_comercial: '',
  razon_social: '',
  direccion_fiscal: '',
  municipio: 'Guatemala',
  departamento: 'Guatemala',
  telefono: '',
  correo_electronico: '',
  sitio_web: '',
  regimen_tributario: 'GENERAL',

  // FEL (para futuro)
  fel_habilitado: false,
  certificador_nombre: '',
  certificador_nit: '',
  fel_api_url: '',
  fel_api_usuario: '',
  fel_api_llave: '',
  fel_ambiente: 'PRUEBAS',

  // Personalización
  logo_path: '',
  pie_factura: 'Gracias por su compra',

  // Config general
  moneda_codigo: 'GTQ',
  moneda_simbolo: 'Q',
  iva_porcentaje: 12,
  iva_incluido_precio: false,

  actualizado_en: null,
}

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ferreapp_empresa') || 'null') || EMPRESA_DEFAULT } catch { return EMPRESA_DEFAULT }
  })

  // Empresa es un registro único — se guarda con id='empresa'
  useEffect(() => {
    db.getAll('empresa').then(data => {
      if (data.length) setEmpresa(data[0])
    })
  }, [])

  const _guardarEmpresa = useCallback(async (nuevo) => {
    localStorage.setItem('ferreapp_empresa', JSON.stringify(nuevo))
    setEmpresa(nuevo)
    const id = nuevo.nit || 'empresa'
    // Intentar update primero; si no existe el registro, insertar
    await db.update('empresa', id, { ...nuevo, id })
      .catch(() => db.insert('empresa', { ...nuevo, id }))
  }, [])

  const actualizarEmpresa = useCallback((data) => {
    const nuevo = { ...empresa, ...data, actualizado_en: new Date().toISOString() }
    _guardarEmpresa(nuevo)
  }, [empresa, _guardarEmpresa])

  const actualizarFEL = useCallback((data) => {
    const nuevo = { ...empresa, ...data, actualizado_en: new Date().toISOString() }
    _guardarEmpresa(nuevo)
  }, [empresa, _guardarEmpresa])

  return (
    <EmpresaContext.Provider value={{
      empresa,
      actualizarEmpresa,
      actualizarFEL,
    }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export const useEmpresa = () => {
  const context = useContext(EmpresaContext)
  if (!context) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider')
  return context
}
