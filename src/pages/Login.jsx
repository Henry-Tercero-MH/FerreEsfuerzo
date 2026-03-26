import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Wrench, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'

export default function Login() {
  const { login } = useAuth()
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
    await new Promise(r => setTimeout(r, 400)) // UX: pequeña pausa
    const result = login(form.email, form.password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-yellow-400/10 animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/10 animate-pulse-soft" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-pink-400/10 animate-pulse-soft" style={{animationDelay: '0.5s'}} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-purple-600 shadow-lg shadow-primary-600/40 hover:scale-110 transition-transform duration-300">
              <Wrench size={30} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">FerreApp</h1>
              <p className="text-sm text-gray-500">Sistema de Gestión para Ferreterías</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            {/* Email */}
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="usuario@ferreapp.com"
                  className="input pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full btn-lg mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          {/* Credenciales demo */}
          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Credenciales de acceso</p>
            <div className="space-y-1 text-xs text-gray-600 font-mono">
              <p><span className="text-gray-400">Email:</span> admin@ferreapp.com</p>
              <p><span className="text-gray-400">Pass: </span> admin123</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/50">
          FerreApp v1.0 — Guatemala
        </p>
      </div>
    </div>
  )
}
