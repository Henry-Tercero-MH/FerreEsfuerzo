import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import LoadingSpinner from '../ui/LoadingSpinner'
import { useApp } from '../../contexts/AppContext'
import { useCotizaciones } from '../../contexts/CotizacionesContext'
import { useCompras } from '../../contexts/ComprasContext'
import { useCuentasPorCobrar } from '../../contexts/CuentasPorCobrarContext'
import { useProveedores } from '../../contexts/ProveedoresContext'
import { useCaja } from '../../contexts/CajaContext'
import { useUI } from '../../contexts/UIContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { sidebarCollapsed, setSidebarCollapsed: setCollapsed } = useUI()
  const { pathname } = useLocation()
  const esNuevaVenta = pathname === '/ventas/nueva'
  const collapsed = sidebarCollapsed

  useEffect(() => {
    if (esNuevaVenta) setCollapsed(true)
  }, [esNuevaVenta])

  const { loadingApp }                    = useApp()
  const { loading: loadingCotizaciones }  = useCotizaciones()
  const { loading: loadingCompras }       = useCompras()
  const { loading: loadingCuentas }       = useCuentasPorCobrar()
  const { loading: loadingProveedores }   = useProveedores()
  const { loading: loadingCaja }          = useCaja()

  const cargando = loadingApp || loadingCotizaciones || loadingCompras || loadingCuentas || loadingProveedores || loadingCaja

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${esNuevaVenta ? 'lg:pr-[480px]' : ''}`}>
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner text="Cargando datos..." size="lg" />
            </div>
          ) : (
            <div className={`flex-1 overflow-y-auto animate-fade-in ${esNuevaVenta ? '' : 'p-4 sm:p-6'}`}>
              <Outlet key={pathname} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
