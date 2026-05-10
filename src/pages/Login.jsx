import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
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
    if (!form.email || !form.password) { setError('Completa todos los campos'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const result = await login(form.email, form.password)
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #08235a 50%, #1a4bb4 100%)' }}>

      {/* Círculos decorativos de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-3xl">

        {/* Card principal */}
        <div className="rounded-3xl overflow-hidden shadow-2xl flex flex-col sm:flex-row min-h-[520px]"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

          {/* Panel izquierdo — formulario */}
          <div className="flex-1 flex flex-col justify-center gap-6 p-8 sm:p-10"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Logo en móvil */}
            <div className="flex sm:hidden flex-col items-center mb-6 gap-3">
              <img src="/logoFerreApp.png" alt="Logo" className="h-20 w-20 rounded-full object-cover shadow-lg border-2 border-white/20" />
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Ferretería El Esfuerzo</h2>
                <p className="text-blue-300 text-xs mt-0.5">Sistema de gestión</p>
              </div>
            </div>

            <div>
              <div className="flex justify-center mb-1">
                <h1 className="text-2xl font-bold text-white tracking-wide">LOGIN</h1>
              </div>

              {error && (
                <div className="mb-5 rounded-xl px-4 py-3 text-sm text-red-200 border border-red-400/30 flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <span className="mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2 text-center">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="usuario@elesfuerzo.com"
                    className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2 text-center">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {sincronizando && (
                  <p className="text-xs text-blue-300 animate-pulse flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    Conectando con el servidor...
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || sincronizando}
                  className="w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
                >
                  {sincronizando ? 'Cargando...' : loading ? 'Iniciando sesión...' : 'Ingresar →'}
                </button>
              </form>
            </div>

            <p className="text-xs text-white/20 mt-8 text-center">© 2025 Ferretería El Esfuerzo</p>
          </div>

          {/* Panel derecho — logo y bienvenida (solo sm+) */}
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-10 gap-6"
            style={{ background: '#ffffff', boxShadow: 'inset 8px 0 24px rgba(10,22,60,0.18), inset 0 8px 24px rgba(10,22,60,0.12), inset 0 -8px 24px rgba(10,22,60,0.12)' }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'scale(1.5)' }} />
              <img
                src="/logoFerreApp.png"
                alt="Logo Ferretería El Esfuerzo"
                className="relative h-64 w-64 rounded-full object-cover border-4 border-white/20"
                style={{ boxShadow: '0 0 40px rgba(96,165,250,0.3)' }}
              />
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-white leading-tight">Bienvenido.</h2>
              <p className="text-black text-base mt-2 font-bold">Ferretería El Esfuerzo</p>
              <p className="text-white/30 text-xs mt-1">Sistema integral de gestión</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
