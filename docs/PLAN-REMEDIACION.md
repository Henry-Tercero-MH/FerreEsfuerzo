# 🚀 PLAN DE REMEDIACIÓN - FerreApp SQA

**Fecha:** 30 de Abril 2026  
**Duración Estimada:** 60-90 días  
**Esfuerzo:** 400-500 horas  
**Equipo Recomendado:** 2 fullstack + 1 QA

---

## 📅 CRONOGRAMA DE SPRINTS

```
SPRINT 1 (Semanas 1-3)  — Seguridad Crítica
├── 20 horas: Migrar a backend con JWT
├── 15 horas: Implementar bcrypt
├── 15 horas: OAuth Google Sheets
├── 10 horas: Encriptación localStorage
└── 10 horas: Testing básico

SPRINT 2 (Semanas 4-6)  — Integridad de Datos
├── 20 horas: Refactorizar presentaciones
├── 15 horas: Normalizar stock por bodega
├── 15 horas: Validadores FK
├── 10 horas: Reintentos en sync
└── 10 horas: Resolución de conflictos

SPRINT 3 (Semanas 7-9)  — Calidad y Testing
├── 20 horas: Agregar tests (Jest + RTL)
├── 15 horas: Migrar a TypeScript
├── 15 horas: Auditoría completa
├── 10 horas: Rate limiting
└── 10 horas: Documentación actualizada

TOTAL ESTIMADO: 60 días
```

---

## SPRINT 1: SEGURIDAD CRÍTICA (Semanas 1-3)

### Tarea S1.1: Backend Node + JWT

**Duración:** 20 horas  
**Prioridad:** 🔴 CRÍTICA

#### Descripción:
Crear backend Node/Express que maneje autenticación, validación de roles y persistencia.

#### Pasos:

```bash
# 1. Inicializar proyecto backend
mkdir ferreapp-backend
cd ferreapp-backend
npm init -y
npm install express dotenv bcrypt jsonwebtoken cors pg
npm install --save-dev jest supertest

# 2. Estructura inicial
backend/
├── src/
│   ├── config/
│   │   └── database.js        (conexión PostgreSQL)
│   ├── middleware/
│   │   ├── auth.js            (verificar JWT)
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── auth.js            (login/logout/register)
│   │   ├── usuarios.js
│   │   ├── productos.js
│   │   └── ventas.js
│   ├── models/
│   │   └── usuario.js
│   ├── app.js                 (express app)
│   └── server.js              (start server)
├── tests/
│   └── auth.test.js
├── .env
└── .env.example
```

#### Código Inicial:

**backend/src/config/database.js:**
```javascript
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
})

export default pool
```

**backend/src/middleware/auth.js:**
```javascript
import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Token requerido' })
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ ok: false, error: 'Token inválido' })
  }
}

export const verifyRole = (rolesRequeridos) => {
  return (req, res, next) => {
    if (!rolesRequeridos.includes(req.user.rol)) {
      return res.status(403).json({ 
        ok: false, 
        error: `Solo ${rolesRequeridos.join(', ')} pueden acceder` 
      })
    }
    next()
  }
}
```

**backend/src/routes/auth.js:**
```javascript
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const router = express.Router()
const HASH_ROUNDS = 10

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  
  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE email = $1 AND activo = true',
      [email]
    )
    
    if (result.rows.length === 0) {
      // Auditar intento fallido
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    }
    
    const usuario = result.rows[0]
    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    
    if (!passwordValida) {
      // Auditar intento fallido
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    }
    
    // Generar JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    
    // Auditar login exitoso
    await pool.query(
      `INSERT INTO sesion_log (usuario_id, accion, fecha) 
       VALUES ($1, 'LOGIN', NOW())`,
      [usuario.id]
    )
    
    return res.json({ 
      ok: true, 
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ ok: false, error: 'Error en servidor' })
  }
})

export default router
```

**backend/src/app.js:**
```javascript
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import { verifyToken } from './middleware/auth.js'

const app = express()

app.use(express.json())
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))

// Rutas públicas
app.post('/auth/login', authRoutes) // Ya importado
app.post('/auth/logout', verifyToken, (req, res) => {
  // Auditar logout
  res.json({ ok: true })
})

// Rutas protegidas
app.get('/api/usuarios', verifyToken, async (req, res) => {
  // ... de aquí en adelante TODO requiere token
})

export default app
```

#### Checklist:
- [ ] Backend inicia sin errores
- [ ] Endpoint `/auth/login` funciona
- [ ] JWT se genera correctamente
- [ ] Endpoint protegido retorna 401 sin token
- [ ] Endpoint protegido retorna datos con token válido
- [ ] Tests de auth pasan

---

### Tarea S1.2: Encriptación localStorage

**Duración:** 10 horas  
**Prioridad:** 🔴 CRÍTICA

#### Descripción:
Encriptar datos sensibles en localStorage con AES-256.

#### Implementación:

```javascript
// src/utils/encryption.js
import CryptoJS from 'crypto-js'

const SECRET_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'dev-key-change-in-production'

export const encrypt = (data) => {
  if (!data) return null
  try {
    return CryptoJS.AES.encrypt(
      JSON.stringify(data),
      SECRET_KEY
    ).toString()
  } catch (err) {
    console.error('Encryption error:', err)
    return null
  }
}

export const decrypt = (ciphertext) => {
  if (!ciphertext) return null
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (err) {
    console.error('Decryption error:', err)
    return null
  }
}

// Reemplazar localStorage
export const secureStorage = {
  setItem: (key, value) => {
    const encrypted = encrypt(value)
    localStorage.setItem(key, encrypted)
  },
  
  getItem: (key) => {
    const encrypted = localStorage.getItem(key)
    return encrypted ? decrypt(encrypted) : null
  },
  
  removeItem: (key) => {
    localStorage.removeItem(key)
  },
  
  clear: () => {
    localStorage.clear()
  }
}
```

#### Uso en db.js:
```javascript
// Cambiar de:
// localStorage.setItem(lsKey(entity), JSON.stringify(data))

// A:
// secureStorage.setItem(lsKey(entity), data)
```

#### Checklist:
- [ ] Datos sensibles se encriptan al guardar
- [ ] Datos se desencriptan al leer
- [ ] Logout limpia localStorage
- [ ] Encriptación no hace la app más lenta (< 100ms)

---

### Tarea S1.3: OAuth Google Sheets

**Duración:** 15 horas  
**Prioridad:** 🔴 CRÍTICA

#### Descripción:
Reemplazar secret hardcodeado por OAuth 2.0.

#### Pasos:

1. **Ir a Google Cloud Console:**
   - Crear OAuth 2.0 Client ID
   - Scope: `https://www.googleapis.com/auth/spreadsheets`

2. **Implementar en backend:**

```javascript
// backend/src/services/googleSheets.js
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function getRefreshToken(authCode) {
  const { tokens } = await oauth2Client.getToken(authCode)
  return tokens.refresh_token  // Guardar en DB por usuario_id
}

export async function getSheetData(userId) {
  // Obtener refresh_token de BD
  const refreshToken = await getRefreshTokenFromDB(userId)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client })
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEETS_ID,
    range: 'Productos'
  })
  
  return result.data.values
}
```

3. **Frontend solicita acceso:**

```javascript
// src/components/SheetAuth.jsx
function SheetAuth() {
  const handleAuth = () => {
    const scopes = ['https://www.googleapis.com/auth/spreadsheets']
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${window.location.origin}/auth/callback` +
      `&scope=${scopes.join(' ')}` +
      `&response_type=code`
    
    window.location.href = authUrl
  }
  
  return <button onClick={handleAuth}>Autorizar Google Sheets</button>
}
```

#### Checklist:
- [ ] Usuario puede autorizar acceso a Google Sheets
- [ ] Token se guarda de forma segura (en BD, no en cliente)
- [ ] Refresh token se usa para obtener datos
- [ ] No hay secret en código

---

### Tarea S1.4: Rate Limiting en Proxy

**Duración:** 10 horas  
**Prioridad:** 🟠 ALTA

#### Descripción:
Proteger el proxy contra abuso.

#### Implementación:

```javascript
// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,                   // 100 requests por IP
  message: 'Demasiadas solicitudes, intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                     // 5 intentos de login
  skip: (req, res) => req.user,  // No limitar si está autenticado
})

export const sheetLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 10,                    // 10 requests al Sheet
})
```

#### Uso:
```javascript
app.post('/auth/login', authLimiter, authController.login)
app.use('/api/', apiLimiter)
app.get('/api/sync', verifyToken, sheetLimiter, syncController.sync)
```

#### Checklist:
- [ ] Rate limiting está activo
- [ ] Requests excedidas reciben 429
- [ ] Admins no están limitados
- [ ] Logs de intentos de abuso

---

## SPRINT 2: INTEGRIDAD DE DATOS (Semanas 4-6)

### Tarea S2.1: Refactorizar Presentaciones

**Duración:** 20 horas  
**Prioridad:** 🔴 ALTA

#### Descripción:
Normalizar presentaciones como entidad separada.

#### Antes (actual):
```javascript
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  precio_venta: 0.15,
  presentacion: "Caja"
}
```

#### Después:
```javascript
// Tabla: productos
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  unidad_base: "UND",
  presentacion_default_id: "PRES-1"
}

// Tabla: presentaciones
const presentaciones = [
  {
    id: "PRES-1",
    producto_id: "P1",
    nombre: "Unidad",
    factor: 1,
    precio: 0.15,
    es_default: true
  },
  {
    id: "PRES-2",
    producto_id: "P1",
    nombre: "Libra",
    factor: 100,
    precio: 12.00
  },
  {
    id: "PRES-3",
    producto_id: "P1",
    nombre: "Caja",
    factor: 500,
    precio: 55.00
  }
]
```

#### Cambios en db.js:

```javascript
// Nuevo schema en localStorage
// ferreapp_productos
// ferreapp_presentaciones

async function asignarPresentacion(productoId, presentacionData) {
  const presentaciones = lsGet('presentaciones')
  const nueva = {
    id: shortId(),
    producto_id: productoId,
    ...presentacionData
  }
  presentaciones.push(nueva)
  lsSet('presentaciones', presentaciones)
  
  // Sincronizar con backend
  if (_online) {
    try {
      await fetch('/api/presentaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(nueva)
      })
    } catch {
      enqueue('insert', 'presentaciones', nueva)
    }
  }
}

function getPresentacionesProducto(productoId) {
  return lsGet('presentaciones').filter(p => p.producto_id === productoId)
}

function getPrecioVenta(productoId, presentacionId) {
  const pres = lsGet('presentaciones').find(
    p => p.producto_id === productoId && p.id === presentacionId
  )
  return pres?.precio || 0
}
```

#### Checklist:
- [ ] Presentaciones se almacenan separadamente
- [ ] Precio se obtiene correctamente por presentación
- [ ] Conversion de unidades funciona
- [ ] Migrando datos históricos: OK

---

### Tarea S2.2: Normalizar Stock por Bodega

**Duración:** 15 horas  
**Prioridad:** 🟠 ALTA

#### Descripción:
Separar stock por bodega.

#### Esquema:

```javascript
// ferreapp_stock_bodega
[
  {
    id: "SB-1",
    producto_id: "P1",
    bodega_id: "BOD-1",
    stock: 500,
    stock_minimo: 100,
    ubicacion: "A-13-2"
  },
  {
    id: "SB-2",
    producto_id: "P1",
    bodega_id: "BOD-2",
    stock: 200,
    stock_minimo: 50,
    ubicacion: "B-05-1"
  }
]

// Helper:
function getStockTotal(productoId) {
  return lsGet('stock_bodega')
    .filter(sb => sb.producto_id === productoId)
    .reduce((sum, sb) => sum + sb.stock, 0)
}

function reducirStock(productoId, bodegaId, cantidad) {
  const stockBodega = lsGet('stock_bodega')
  const updated = stockBodega.map(sb => {
    if (sb.producto_id === productoId && sb.bodega_id === bodegaId) {
      return { ...sb, stock: sb.stock - cantidad }
    }
    return sb
  })
  lsSet('stock_bodega', updated)
}
```

#### Checklist:
- [ ] Stock se gestiona por bodega
- [ ] Se calcula stock total correctamente
- [ ] Movimientos de stock se registran
- [ ] Auditoría de consumo por bodega

---

### Tarea S2.3: Validadores de FK

**Duración:** 15 horas  
**Prioridad:** 🟠 ALTA

#### Descripción:
Validar que FK existan antes de insertar.

#### Implementación:

```javascript
// src/utils/referentialValidators.js

export async function validateForeignKey(entity, field, value, targetEntity) {
  const targets = await db.getAll(targetEntity)
  const exists = targets.some(t => t.id === value)
  
  if (!exists) {
    return {
      field,
      error: `${field} con ID '${value}' no existe en ${targetEntity}`
    }
  }
  
  return { ok: true }
}

export async function validateVentaForeignKeys(venta, clientes, productos) {
  const errors = {}
  
  // Validar cliente
  if (!clientes.find(c => c.id === venta.cliente_id)) {
    errors.cliente_id = 'Cliente no existe'
  }
  
  // Validar items
  venta.items?.forEach((item, idx) => {
    const prod = productos.find(p => p.id === item.producto_id)
    if (!prod) {
      errors[`items[${idx}].producto_id`] = 'Producto no existe '
    }
    
    const pres = lsGet('presentaciones').find(
      p => p.id === item.presentacion_id
    )
    if (!pres) {
      errors[`items[${idx}].presentacion_id`] = 'Presentación no existe'
    }
  })
  
  return errors
}

// En formulario de venta:
function handleInsertVenta(ventaData) {
  const clientes = lsGet('clientes')
  const productos = lsGet('productos')
  
  const fkErrors = validateVentaForeignKeys(ventaData, clientes, productos)
  if (Object.keys(fkErrors).length) {
    showErrors(fkErrors)
    return
  }
  
  // OK, proceder
  db.insert('ventas', ventaData)
}
```

#### Checklist:
- [ ] FK se validan antes de insertar
- [ ] Errores FK son informativos
- [ ] No hay registros huérfanos
- [ ] Auditoría de intentos de FK inválida

---

### Tarea S2.4: Reintentos Auto

**Duración:** 10 horas  
**Prioridad:** 🟠 ALTA

#### Descripción:
Implementar política de reintentos en syncPending.

#### Implementación:

```javascript
// src/services/db.js - syncPending mejorado

const MAX_REINTENTOS = 3
const DELAY_REINTENTO_MS = 1000  // Backoff exponencial

export async function syncPending() {
  if (_syncing || !_online) return
  
  _syncing = true
  _notify()
  
  const queue = getQueue()
  if (!queue.length) {
    _syncing = false
    return
  }
  
  for (const item of queue) {
    try {
      // Intentar sincronizar
      let respuesta
      
      if (item.action === 'insert') {
        respuesta = await gasInsert(item.entity, item.data)
      } else if (item.action === 'update') {
        respuesta = await gasUpdate(item.entity, item.recordId, item.data)
      } else if (item.action === 'remove') {
        respuesta = await gasRemove(item.entity, item.recordId)
      }
      
      // Si OK, remover de la cola
      if (respuesta?.ok !== false) {
        const updated = getQueue().filter(q => q.id !== item.id)
        saveQueue(updated)
        _notify()
      } else {
        // Error específico: NO reintentar si es 400 (bad request)
        if (respuesta.code === 'VALIDATION_ERROR' || respuesta.status === 400) {
          auditar({
            accion: 'sync_validation_error',
            entidad: item.entity,
            razon: respuesta.error,
            payload: item
          })
          // Remover de la cola: datos inválidos no mejoran con reintentos
          const updated = getQueue().filter(q => q.id !== item.id)
          saveQueue(updated)
        } else {
          // Error temporal: reintentar
          item.reintentos = (item.reintentos || 0) + 1
          
          if (item.reintentos >= MAX_REINTENTOS) {
            auditar({
              accion: 'sync_max_reintentos_excedidos',
              entidad: item.entity,
              intentos: item.reintentos,
              payload: item
            })
            // Remover y alertar al usuario
            const updated = getQueue().filter(q => q.id !== item.id)
            saveQueue(updated)
            toast.error(`No se pudo sincronizar ${item.entity}. Contacte soporte.`)
          } else {
            // Guardar con contador actualizado
            const updated = getQueue().map(q =>
              q.id === item.id ? item : q
            )
            saveQueue(updated)
            
            // Esperar antes del próximo intento
            await new Promise(resolve =>
              setTimeout(resolve, DELAY_REINTENTO_MS * Math.pow(2, item.reintentos))
            )
          }
        }
      }
    } catch (err) {
      console.error('Sync error:', err)
      item.reintentos = (item.reintentos || 0) + 1
      
      if (item.reintentos < MAX_REINTENTOS) {
        await new Promise(resolve =>
          setTimeout(resolve, DELAY_REINTENTO_MS * Math.pow(2, item.reintentos))
        )
      }
    }
  }
  
  _syncing = false
  _notify()
}
```

#### Checklist:
- [ ] Items se reintentan hasta 3 veces
- [ ] Backoff exponencial está implementado
- [ ] Errores de validación no se reintentan
- [ ] Usuario es notificado de fallos permanentes

---

## SPRINT 3: CALIDAD Y TESTING (Semanas 7-9)

### Tarea S3.1: Jest + React Testing Library

**Duración:** 20 horas  
**Prioridad:** 🟠 ALTA

#### Setup:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

#### Tests de Validadores:

```javascript
// src/utils/__tests__/validators.test.js

import { describe, it, expect } from 'vitest'
import {
  isRequired,
  isPositiveNumber,
  isEmail,
  validateProducto,
  validateCliente,
  validateVenta
} from '../validators'

describe('Validadores Básicos', () => {
  it('isRequired debe rechazar valores vacíos', () => {
    expect(isRequired('')).toBe(false)
    expect(isRequired(null)).toBe(false)
    expect(isRequired(undefined)).toBe(false)
    expect(isRequired('  ')).toBe(false)
    expect(isRequired('valor')).toBe(true)
  })
  
  it('isPositiveNumber debe validar números > 0', () => {
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-5)).toBe(false)
    expect(isPositiveNumber(5.5)).toBe(true)
    expect(isPositiveNumber('5')).toBe(true)
  })
  
  it('isEmail debe validar emails', () => {
    expect(isEmail('test@example.com')).toBe(true)
    expect(isEmail('invalid')).toBe(false)
    expect(isEmail('test@')).toBe(false)
    expect(isEmail('')).toBe(true)  // vacío es válido (campo opcional)
  })
})

describe('validateProducto', () => {
  it('debe rechazar producto sin nombre', () => {
    const errors = validateProducto({ nombre: '' })
    expect(errors.nombre).toBeDefined()
  })
  
  it('debe rechazar precio de venta < costo', () => {
    const errors = validateProducto({
      nombre: 'Test',
      categoria: 'CAT1',
      precio_compra: 100,
      precio_venta: 50,
      stock: 10
    })
    expect(errors.precio_venta).toBeDefined()
  })
  
  it('debe rechazar código duplicado', () => {
    const productosExistentes = [
      { id: 'P1', codigo: 'PROD-001' }
    ]
    const errors = validateProducto(
      { nombre: 'Test', codigo: 'PROD-001', ... },
      productosExistentes
    )
    expect(errors.codigo).toBeDefined()
  })
})

describe('validateVenta', () => {
  it('debe rechazar descuento mayor que subtotal', () => {
    const errors = validateVenta({
      cliente_id: 'C1',
      subtotal: 100,
      descuento: 150
    })
    expect(errors.descuento).toBeDefined()
  })
  
  it('debe validar estructura de items', () => {
    const errors = validateVenta({
      cliente_id: 'C1',
      items: [
        { producto_id: 'P1', cantidad: 5, precio: 100 },
        { producto_id: '', cantidad: 2, precio: 50 }  // Inválido
      ]
    })
    expect(errors).toBeDefined()
  })
})
```

#### Tests de Servicios:

```javascript
// src/services/__tests__/db.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db, getQueue, syncPending } from '../db'

describe('Database Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    localStorage.clear()
  })
  
  it('debe insertar un registro en localStorage', async () => {
    const data = { id: 'P1', nombre: 'Producto 1', precio: 100 }
    await db.insert('productos', data)
    
    const stored = db.getAll('productos')
    expect(stored).toContainEqual(data)
  })
  
  it('debe actualizar un registro', async () => {
    await db.insert('productos', { id: 'P1', nombre: 'Old', precio: 100 })
    await db.update('productos', 'P1', { nombre: 'New' })
    
    const updated = db.getAll('productos').find(p => p.id === 'P1')
    expect(updated.nombre).toBe('New')
  })
  
  it('debe encolar operaciones cuando está offline', async () => {
    // Simular offline
    global.navigator = { onLine: false }
    
    await db.insert('productos', { id: 'P1', nombre: 'Test' })
    
    const queue = getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].action).toBe('insert')
  })
  
  it('debe procesar la cola cuando se reconecta', async () => {
    // NOTA: Este test requiere mock de gasInsert
    // ...
  })
})
```

#### Checklist:
- [ ] 50+ tests escritos y pasando
- [ ] Coverage > 70%
- [ ] CI/CD ejecuta tests en cada push
- [ ] Tests de regresión implementados

---

### Tarea S3.2: Auditoría Completa

**Duración:** 15 horas  
**Prioridad:** 🟠 ALTA

#### Descripción:
Implementar auditoría exhaustiva de operaciones.

#### Esquema:

```javascript
// src/services/auditoria.js - MEJORADO

const AUDIT_ENTITIES = {
  'usuarios': { sensitive: true, trackFields: ['rol', 'email', 'activo'] },
  'productos': { sensitive: false, trackFields: ['nombre', 'precio_venta', 'stock'] },
  'ventas': { sensitive: true, trackFields: ['total', 'cliente_id', 'estado'] },
  'caja': { sensitive: true, trackFields: ['saldo', 'estado'] }
}

export async function auditar(evento) {
  const {
    accion,           // 'insert', 'update', 'delete', 'login', 'export'
    entidad,          // 'productos', 'usuarios', etc
    entidad_id,       // ID del registro
    cambios = {},     // { campo: { antes, después }, ... }
    usuario_id = null,
    ip_address = null,
    resultado = false,      // true si fue exitoso
    razon_fallo = null,
    notas = null
  } = evento
  
  try {
    // Validar que acción/entidad sean conocidas
    const config = AUDIT_ENTITIES[entidad]
    if (!config) {
      console.warn(`Entidad no auditada: ${entidad}`)

      return
    }
    
    // Crear registro de auditoría
    const auditRecord = {
      id: shortId(),
      accion,
      entidad,
      entidad_id,
      usuario_id: usuario_id || getCurrentUser()?.id,
      ip_address: ip_address || getClientIP(),
      cambios: config.sensitive ? encryptSensitiveData(cambios) : cambios,
      resultado,
      razon_fallo,
      notas,
      timestamp: new Date().toISOString()
    }
    
    // Guardar localmente
    const auditoriaLocal = lsGet('auditoria') || []
    auditoriaLocal.push(auditRecord)
    lsSet('auditoria', auditoriaLocal)
    
    // Enviar a backend si está online
    if (_online) {
      try {
        await fetch('/api/auditoria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditRecord)
        })
      } catch {
        // Si falla, está guardado local
      }
    }
  } catch (err) {
    console.error('Error en auditoría:', err)
  }
}

export async function generarReporteAuditoria(filtros = {}) {
  const {
    desde,
    hasta,
    usuario_id,
    entidad,
    accion,
    solo_fallos = false
  } = filtros
  
  let records = lsGet('auditoria') || []
  
  // Filtrar
  if (desde) records = records.filter(r => new Date(r.timestamp) >= new Date(desde))
  if (hasta) records = records.filter(r => new Date(r.timestamp) <= new Date(hasta))
  if (usuario_id) records = records.filter(r => r.usuario_id === usuario_id)
  if (entidad) records = records.filter(r => r.entidad === entidad)
  if (accion) records = records.filter(r => r.accion === accion)
  if (solo_fallos) records = records.filter(r => !r.resultado)
  
  return {
    total: records.length,
    registros: records,
    generado: new Date().toISOString()
  }
}
```

#### Cambios en db.js:

```javascript
export async function insert(entity, data) {
  const record = { ...data, id: data.id || shortId() }
  
  try {
    const list = lsGet(entity)
    list.push(record)
    lsSet(entity, list)
    
    auditar({
      accion: 'insert',
      entidad: entity,
      entidad_id: record.id,
      cambios: { nuevo: record },
      resultado: true
    })
    
    // ...resto
  } catch (err) {
    auditar({
      accion: 'insert',
      entidad: entity,
      resultado: false,
      razon_fallo: err.message
    })
    throw err
  }
}

export async function update(entity, id, data) {
  const list = lsGet(entity)
  const anterior = list.find(item => item.id === id)
  
  try {
    const updated = list.map(item =>
      item.id === id ? { ...item, ...data } : item
    )
    lsSet(entity, updated)
    
    // Registrar cambios específicos
    const cambios = {}
    for (const [key, valor] of Object.entries(data)) {
      cambios[key] = { antes: anterior?.[key], después: valor }
    }
    
    auditar({
      accion: 'update',
      entidad: entity,
      entidad_id: id,
      cambios,
      resultado: true
    })
  } catch (err) {
    auditar({
      accion: 'update',
      entidad: entity,
      entidad_id: id,
      resultado: false,
      razon_fallo: err.message
    })
    throw err
  }
}
```

#### Checklist:
- [ ] Todas las acciones CRUD se auditan
- [ ] Login/logout se registran
- [ ] Cambios específicos se rastrean
- [ ] Reportes de auditoría generan
- [ ] Datos sensibles se encriptan en auditoría

---

## 📊 MÉTRICAS DE ÉXITO

Después de los 3 sprints, debe cumplir:

```
SEGURIDAD:
  ✓ 0 datafiles en localstorage sin encriptar
  ✓ JWT + bcrypt implementado
  ✓ Rate limiting activo
  ✓ Sin secrets en código

INTEGRIDAD:
  ✓ 0 registros huérfanos
  ✓ 0 totales inconsistentes
  ✓ Score 3FN > 80%
  ✓ FK validadas al 100%

CONFIABILIDAD:
  ✓ Sync con reintentos automáticos
  ✓ Resolución de conflictos
  ✓ Auditoría completa
  ✓ 0 quejas de data loss

CALIDAD CÓDIGO:
  ✓ 70%+ test coverage
  ✓ 0 ESLint warnings
  ✓ TypeScript partial o full
  ✓ Documentación actualizada
```

---

## 📋 CHECKLIST FINAL

- [ ] SPRINT 1 completado (seguridad básica)
- [ ] SPRINT 2 completado (integridad de datos)
- [ ] SPRINT 3 completado (testing y auditoría)
- [ ] Todos los tests pasan
- [ ] Documentación actualizada
- [ ] Deploy a staging
- [ ] UAT aprobada
- [ ] Deploy a producción

---

**Plan compilado por:** SQA Team  
**Revisión Recomendada:** Cada 2 sprints
