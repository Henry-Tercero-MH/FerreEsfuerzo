import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, sincronizando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const result = await login(form.email, form.password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex min-h-[480px]">

        {/* Panel izquierdo — formulario */}
        <div className="flex-1 bg-[#3d5a80] flex flex-col justify-between p-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-8 tracking-wide">LOGIN</h1>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/40 px-4 py-2.5 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="usuario@elesfuerzo.com"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {sincronizando && (
                <p className="text-xs text-blue-200 animate-pulse">
                  Conectando con el servidor...
                </p>
              )}

              <button
                type="submit"
                disabled={loading || sincronizando}
                className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-[#3d5a80] hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {sincronizando ? 'Cargando...' : loading ? 'Iniciando sesión...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-xs text-white/30 mt-8">
            © 2025 Ferretería El Esfuerzo
          </p>
        </div>

        {/* Panel derecho — logo y bienvenida */}
        <div className="hidden sm:flex flex-1 bg-white flex-col items-center justify-center p-10 gap-6">
          <img
            src="/logoFerreApp.png"
            alt="Logo Ferretería El Esfuerzo"
            className="h-40 w-40 rounded-full object-cover shadow-lg"
          />
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-800 leading-tight">Bienvenido.</h2>
            <p className="text-gray-400 text-base mt-1">Ferretería El Esfuerzo</p>
          </div>
        </div>

      </div>
    </div>
  )
}
