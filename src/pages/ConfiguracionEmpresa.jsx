import { useState } from 'react'
import { Building2, Save, AlertCircle } from 'lucide-react'
import { useEmpresa } from '../contexts/EmpresaContext'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Alert from '../components/ui/Alert'

export default function ConfiguracionEmpresa() {
  const { empresa, actualizarEmpresa } = useEmpresa()
  const [form, setForm] = useState({ ...empresa })
  const [loading, setLoading] = useState(false)
  const [alerta, setAlerta] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleGuardar = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    actualizarEmpresa(form)
    setLoading(false)
    setAlerta({ type: 'success', message: 'Configuración guardada correctamente' })
    setTimeout(() => setAlerta(null), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Configuración de Empresa</h1>
        <p className="page-subtitle">Datos fiscales y configuración del sistema</p>
      </div>

      {alerta && <Alert type={alerta.type} message={alerta.message} onClose={() => setAlerta(null)} />}

      {/* Datos Fiscales */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900">Datos Fiscales</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="NIT *"
            name="nit"
            value={form.nit}
            onChange={handleChange}
            placeholder="12345678-9"
          />
          <Input
            label="Régimen Tributario"
            name="regimen_tributario"
            value={form.regimen_tributario}
            onChange={handleChange}
            placeholder="GENERAL"
          />
          <Input
            label="Nombre Comercial *"
            name="nombre_comercial"
            value={form.nombre_comercial}
            onChange={handleChange}
            className="sm:col-span-2"
          />
          <Input
            label="Razón Social *"
            name="razon_social"
            value={form.razon_social}
            onChange={handleChange}
            className="sm:col-span-2"
          />
          <Input
            label="Dirección Fiscal *"
            name="direccion_fiscal"
            value={form.direccion_fiscal}
            onChange={handleChange}
            className="sm:col-span-2"
          />
          <Input
            label="Municipio"
            name="municipio"
            value={form.municipio}
            onChange={handleChange}
          />
          <Input
            label="Departamento"
            name="departamento"
            value={form.departamento}
            onChange={handleChange}
          />
          <Input
            label="Teléfono"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="2234-5678"
          />
          <Input
            label="Correo Electrónico"
            name="correo_electronico"
            type="email"
            value={form.correo_electronico}
            onChange={handleChange}
          />
          <Input
            label="Sitio Web"
            name="sitio_web"
            value={form.sitio_web}
            onChange={handleChange}
            placeholder="https://..."
            className="sm:col-span-2"
          />
        </div>
      </div>

      {/* Configuración FEL (Futuro) */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-blue-900 mb-1">
              Facturación Electrónica (FEL)
            </h2>
            <p className="text-sm text-blue-700 mb-3">
              La integración con FEL estará disponible en una próxima versión. Por ahora puedes configurar los datos básicos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="fel_habilitado"
                checked={form.fel_habilitado}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
                disabled
              />
              <span className="text-sm text-gray-600">Habilitar FEL (Próximamente)</span>
            </label>
          </div>

          <Input
            label="Certificador"
            name="certificador_nombre"
            value={form.certificador_nombre}
            onChange={handleChange}
            disabled
            placeholder="Nombre del certificador FEL"
          />
          <Input
            label="NIT Certificador"
            name="certificador_nit"
            value={form.certificador_nit}
            onChange={handleChange}
            disabled
            placeholder="NIT del certificador"
          />
          <Select
            label="Ambiente"
            name="fel_ambiente"
            value={form.fel_ambiente}
            onChange={handleChange}
            disabled
          >
            <option value="PRUEBAS">Pruebas</option>
            <option value="PRODUCCION">Producción</option>
          </Select>
          <Input
            label="API URL"
            name="fel_api_url"
            value={form.fel_api_url}
            onChange={handleChange}
            disabled
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Configuración General */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Configuración General</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Código de Moneda"
            name="moneda_codigo"
            value={form.moneda_codigo}
            onChange={handleChange}
            placeholder="GTQ"
          />
          <Input
            label="Símbolo de Moneda"
            name="moneda_simbolo"
            value={form.moneda_simbolo}
            onChange={handleChange}
            placeholder="Q"
          />
          <Input
            label="Porcentaje IVA (%)"
            name="iva_porcentaje"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.iva_porcentaje}
            onChange={handleChange}
          />
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="iva_incluido_precio"
                checked={form.iva_incluido_precio}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">IVA incluido en precio</span>
            </label>
          </div>
        </div>
      </div>

      {/* Personalización */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Personalización</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Pie de factura</label>
            <textarea
              name="pie_factura"
              value={form.pie_factura}
              onChange={handleChange}
              rows={2}
              className="input resize-none"
              placeholder="Mensaje que aparecerá al pie de las facturas..."
            />
          </div>
          <Input
            label="Ruta del logo"
            name="logo_path"
            value={form.logo_path}
            onChange={handleChange}
            placeholder="/ruta/al/logo.png"
          />
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button
          variant="success"
          icon={Save}
          loading={loading}
          onClick={handleGuardar}
          className="px-8"
        >
          Guardar configuración
        </Button>
      </div>
    </div>
  )
}
