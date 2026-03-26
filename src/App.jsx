import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { CatalogosProvider } from './contexts/CatalogosContext'
import { ProveedoresProvider } from './contexts/ProveedoresContext'
import { ComprasProvider } from './contexts/ComprasContext'
import { CotizacionesProvider } from './contexts/CotizacionesContext'
import { CajaProvider } from './contexts/CajaContext'
import { CuentasPorCobrarProvider } from './contexts/CuentasPorCobrarContext'
import { EmpresaProvider } from './contexts/EmpresaContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Ventas from './pages/Ventas'
import NuevaVenta from './pages/NuevaVenta'
import Inventario from './pages/Inventario'
import Clientes from './pages/Clientes'
import Proveedores from './pages/Proveedores'
import Compras from './pages/Compras'
import Cotizaciones from './pages/Cotizaciones'
import Caja from './pages/Caja'
import CuentasPorCobrar from './pages/CuentasPorCobrar'
import Reportes from './pages/Reportes'
import ConfiguracionEmpresa from './pages/ConfiguracionEmpresa'
import Ajustes from './pages/Ajustes'
import Catalogos from './pages/Catalogos'
import Pedidos from './pages/Pedidos'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EmpresaProvider>
          <CatalogosProvider>
          <AppProvider>
            <ProveedoresProvider>
              <ComprasProvider>
                <CotizacionesProvider>
                  <CajaProvider>
                    <CuentasPorCobrarProvider>
                      <Routes>
                        {/* Pública */}
                        <Route path="/login" element={<Login />} />

                        {/* Protegidas */}
                        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                          <Route path="/"                    element={<Dashboard />} />
                          <Route path="/ventas"              element={<Ventas />} />
                          <Route path="/ventas/nueva"        element={<NuevaVenta />} />
                          <Route path="/cotizaciones"        element={<Cotizaciones />} />
                          <Route path="/productos"           element={<Productos />} />
                          <Route path="/inventario"          element={<Inventario />} />
                          <Route path="/proveedores"         element={<Proveedores />} />
                          <Route path="/compras"             element={<Compras />} />
                          <Route path="/clientes"            element={<Clientes />} />
                          <Route path="/cuentas-por-cobrar"  element={<CuentasPorCobrar />} />
                          <Route path="/caja"                element={<Caja />} />
                          <Route path="/reportes"            element={<Reportes />} />
                          <Route path="/pedidos"             element={<Pedidos />} />
                          <Route path="/catalogos"           element={<Catalogos />} />
                          <Route path="/configuracion"       element={<ConfiguracionEmpresa />} />
                          <Route path="/ajustes"             element={<Ajustes />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </CuentasPorCobrarProvider>
                  </CajaProvider>
                </CotizacionesProvider>
              </ComprasProvider>
            </ProveedoresProvider>
          </AppProvider>
          </CatalogosProvider>
        </EmpresaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
