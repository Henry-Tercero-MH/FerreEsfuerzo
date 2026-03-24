/**
 * Capa de abstracción de almacenamiento.
 * Actualmente usa localStorage. Se migrará a SQLite (Electron) o Supabase sin cambiar los importadores.
 */

const PREFIX = 'ferreapp_'

export const storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(PREFIX + key)
      return item ? JSON.parse(item) : fallback
    } catch { return fallback }
  },

  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) }
    catch (e) { console.error('storage.set error:', e) }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key)
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  },

  exportAll() {
    const result = {}
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => {
        try { result[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k)) }
        catch { result[k.replace(PREFIX, '')] = null }
      })
    return result
  },
}
