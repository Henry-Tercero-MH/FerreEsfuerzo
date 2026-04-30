/**
 * api/gas.js — Proxy serverless para Google Apps Script
 * Evita el problema de CORS al hacer fetch desde el navegador.
 * El frontend llama a /api/gas en lugar de directamente al script.
 */

export default async function handler(req, res) {
  const GAS_URL = globalThis?.process?.env?.VITE_APPS_SCRIPT_URL || ''
  const GAS_SECRET = globalThis?.process?.env?.API_SECRET || ''
  const CORS_ALLOWED_ORIGINS = globalThis?.process?.env?.CORS_ALLOWED_ORIGINS || ''

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'VITE_APPS_SCRIPT_URL no configurada' })
  }

  const origin = req.headers.origin || ''
  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ]
  const allowedOrigins = new Set(
    CORS_ALLOWED_ORIGINS
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .concat(defaultOrigins)
  )

  // CORS restrictivo: solo refleja el origen si está permitido.
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '600')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (req.method === 'GET') {
      const url = GAS_SECRET ? `${GAS_URL}?secret=${encodeURIComponent(GAS_SECRET)}` : GAS_URL
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const body = GAS_SECRET ? { ...req.body, secret: GAS_SECRET } : req.body
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      return res.status(200).json(data)
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
