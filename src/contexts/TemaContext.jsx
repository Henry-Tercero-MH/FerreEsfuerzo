import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { gasGetConfig, gasSaveConfig } from '../services/googleAppsScript'

export const PALETAS = {
  navy: {
    label: 'Azul Navy',
    preview: '#1a4bb4',
    vars: {
      '--color-primary-50':  '235 241 252',
      '--color-primary-100': '207 220 248',
      '--color-primary-200': '157 185 240',
      '--color-primary-300': '100 143 225',
      '--color-primary-400':  '55 105 205',
      '--color-primary-500':  '26  75 180',
      '--color-primary-600':  '15  52 150',
      '--color-primary-700':   '8  35 115',
      '--color-primary-800':   '3  20  80',
      '--color-primary-900':   '1  10  50',
    },
  },
  verde: {
    label: 'Verde Esmeralda',
    preview: '#059669',
    vars: {
      '--color-primary-50':  '236 253 245',
      '--color-primary-100': '209 250 229',
      '--color-primary-200': '167 243 208',
      '--color-primary-300': '110 231 183',
      '--color-primary-400':  '52 211 153',
      '--color-primary-500':  '16 185 129',
      '--color-primary-600':   '5 150 105',
      '--color-primary-700':   '4 120  87',
      '--color-primary-800':   '6  95  70',
      '--color-primary-900':   '6  78  59',
    },
  },
  rojo: {
    label: 'Rojo Ferretero',
    preview: '#dc2626',
    vars: {
      '--color-primary-50':  '254 242 242',
      '--color-primary-100': '254 226 226',
      '--color-primary-200': '254 202 202',
      '--color-primary-300': '252 165 165',
      '--color-primary-400': '248 113 113',
      '--color-primary-500': '239  68  68',
      '--color-primary-600': '220  38  38',
      '--color-primary-700': '185  28  28',
      '--color-primary-800': '153  27  27',
      '--color-primary-900': '127  29  29',
    },
  },
  purpura: {
    label: 'Púrpura',
    preview: '#7c3aed',
    vars: {
      '--color-primary-50':  '245 243 255',
      '--color-primary-100': '237 233 254',
      '--color-primary-200': '221 214 254',
      '--color-primary-300': '196 181 253',
      '--color-primary-400': '167 139 250',
      '--color-primary-500': '139 92  246',
      '--color-primary-600': '124 58  237',
      '--color-primary-700': '109 40  217',
      '--color-primary-800':  '91 33  182',
      '--color-primary-900':  '76 29  149',
    },
  },
  naranja: {
    label: 'Naranja',
    preview: '#ea580c',
    vars: {
      '--color-primary-50':  '255 247 237',
      '--color-primary-100': '255 237 213',
      '--color-primary-200': '254 215 170',
      '--color-primary-300': '253 186 116',
      '--color-primary-400': '251 146  60',
      '--color-primary-500': '249 115  22',
      '--color-primary-600': '234  88  12',
      '--color-primary-700': '194  65   12',
      '--color-primary-800': '154  52   18',
      '--color-primary-900': '124  45   18',
    },
  },
  gris: {
    label: 'Gris Profesional',
    preview: '#374151',
    vars: {
      '--color-primary-50':  '249 250 251',
      '--color-primary-100': '243 244 246',
      '--color-primary-200': '229 231 235',
      '--color-primary-300': '209 213 219',
      '--color-primary-400': '156 163 175',
      '--color-primary-500': '107 114 128',
      '--color-primary-600':  '75  85  99',
      '--color-primary-700':  '55  65  81',
      '--color-primary-800':  '31  41  55',
      '--color-primary-900':  '17  24  39',
    },
  },
}

const STORAGE_KEY = 'ferreapp_tema'

function aplicarPaleta(id) {
  const paleta = PALETAS[id]
  if (!paleta) return
  const root = document.documentElement
  Object.entries(paleta.vars).forEach(([prop, val]) => root.style.setProperty(prop, val))
}

const TemaContext = createContext(null)

export function TemaProvider({ children }) {
  const [paleta, setPaleta] = useState(() => localStorage.getItem(STORAGE_KEY) || 'navy')

  // Aplica al montar
  useEffect(() => { aplicarPaleta(paleta) }, [])

  // Carga desde Sheet al iniciar
  useEffect(() => {
    gasGetConfig().then(res => {
      if (res?.ok && res.data?.paleta) {
        const id = res.data.paleta
        if (PALETAS[id]) {
          setPaleta(id)
          localStorage.setItem(STORAGE_KEY, id)
          aplicarPaleta(id)
        }
      }
    }).catch(() => {})
  }, [])

  const cambiarPaleta = useCallback(async (id) => {
    if (!PALETAS[id]) return
    setPaleta(id)
    localStorage.setItem(STORAGE_KEY, id)
    aplicarPaleta(id)
    await gasSaveConfig({ paleta: id }).catch(() => {})
  }, [])

  return (
    <TemaContext.Provider value={{ paleta, cambiarPaleta, paletas: PALETAS }}>
      {children}
    </TemaContext.Provider>
  )
}

export const useTema = () => {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema debe usarse dentro de TemaProvider')
  return ctx
}
