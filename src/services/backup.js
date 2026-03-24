/**
 * Servicio de backup: local (JSON) y nube (Google Sheets vía Apps Script).
 */
import { enviarBackupCompleto } from './googleAppsScript'

/** Descarga todos los datos como archivo JSON en el navegador/Electron */
export function descargarBackupLocal({ productos, clientes, ventas, movimientos }) {
  const payload = {
    version: '1.0',
    exportado_en: new Date().toISOString(),
    productos,
    clientes,
    ventas,
    movimientos,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ferreapp_backup_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Importa datos desde un archivo JSON previamente exportado */
export function importarBackupJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.version) throw new Error('Formato de backup inválido')
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}

/** Envía backup a Google Sheets vía Apps Script */
export async function backupNube({ productos, clientes, ventas, movimientos }) {
  return enviarBackupCompleto({ productos, clientes, ventas, movimientos })
}
