import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

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
  const [empresa, setEmpresa] = useLocalStorage('ferreapp_empresa', EMPRESA_DEFAULT)

  const actualizarEmpresa = useCallback((data) => {
    setEmpresa(prev => ({
      ...prev,
      ...data,
      actualizado_en: new Date().toISOString(),
    }))
  }, [setEmpresa])

  const actualizarFEL = useCallback((data) => {
    setEmpresa(prev => ({
      ...prev,
      ...data,
      actualizado_en: new Date().toISOString(),
    }))
  }, [setEmpresa])

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
