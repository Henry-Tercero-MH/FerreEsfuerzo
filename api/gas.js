/**
 * api/gas.js — Proxy serverless para Google Apps Script
 * Evita el problema de CORS al hacer fetch desde el navegador.
 * El frontend llama a /api/gas en lugar de directamente al script.
 */

export default async function handler(req, res) {
  const GAS_URL = globalThis?.process?.env?.VITE_APPS_SCRIPT_URL || ''
  const GAS_SECRET = globalThis?.process?.env?.API_SECRET || ''

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'VITE_APPS_SCRIPT_URL no configurada' })
  }

  // Headers CORS para el frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
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
