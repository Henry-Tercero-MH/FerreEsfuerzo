import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Ventas from './pages/Ventas'
import NuevaVenta from './pages/NuevaVenta'
import Inventario from './pages/Inventario'
import Clientes from './pages/Clientes'
import Reportes from './pages/Reportes'
import Ajustes from './pages/Ajustes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            {/* Pública */}
            <Route path="/login" element={<Login />} />

            {/* Protegidas */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/ventas"        element={<Ventas />} />
              <Route path="/ventas/nueva"  element={<NuevaVenta />} />
              <Route path="/productos"     element={<Productos />} />
              <Route path="/inventario"    element={<Inventario />} />
              <Route path="/clientes"      element={<Clientes />} />
              <Route path="/reportes"      element={<Reportes />} />
              <Route path="/ajustes"       element={<Ajustes />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
