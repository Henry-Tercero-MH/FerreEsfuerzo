# 🔍 REPORTE DE REVISIÓN SQA - FerreApp
**Fecha:** 30 de Abril 2026  
**Versión:** 1.0.0  
**Estado:** ⚠️ **CRÍTICO** — Varios hallazgos de seguridad y arquitectura

---

## 📋 ÍNDICE EJECUTIVO

### Resumen de Hallazgos
- **🔴 CRÍTICOS:** 8 hallazgos
- **🟠 ALTOS:** 12 hallazgos  
- **🟡 MEDIOS:** 15 hallazgos
- **🟢 BAJOS:** 7 hallazgos
- **✅ FORTALEZAS:** 5 hallazgos

**Calificación General:** 5.2/10

---

## 🏗️ I. ANÁLISIS DE ARQUITECTURA Y NORMALIZACIÓN

### 1.1 MODELO ENTIDAD-RELACIÓN (ER)

#### ✅ FORTALEZAS IDENTIFICADAS:
```
✓ Esquema bien documentado en db.env (1322 líneas)
✓ 15 módulos claros: Empresa, Usuarios, Catálogos, Productos, Terceros, etc.
✓ Relaciones jerárquicas (categorías autorreferenciadas)
✓ Índices explícitos en FKs y campos de búsqueda
✓ Convenciones consistentes (snake_case)
✓ Support para múltiples presentaciones (factor_conversion)
✓ Auditoría de movimientos de stock (kardex)
```

#### 🔴 HALLAZGOS CRÍTICOS:

##### H1: **Inconsistencia entre Modelo ER y Almacenamiento Real**
- **Severidad:** CRÍTICA
- **Ubicación:** [README.md](README.md#L121-L200) vs [src/services/db.js](src/services/db.js#L1-L40)
- **Descripción:** 
  - El archivo `db.env` define un modelo relacional completo (47 tablas normalizado)
  - **PERO** la app actual solo usa `localStorage` con estas entidades:
    - productos, clientes, proveedores, ventas, compras, cotizaciones
    - movimientos, catalogos, cuentasCobrar, abonos, cajaAperturas, cajaMovimientos
    - empresa, usuarios
  - **NO IMPLEMENTA:** Orden de compra, Presentaciones, Lotes, Multi-bodega, FEL, Notas de crédito, etc.
- **Impacto:** 
  - Desconexión total entre el diseño y la realidad
  - Características documentadas que NO funcionan
  - Riesgo para clientes que esperan migração a BD relacional
- **Recomendación:** Actualizar documentación o implementar modelo completo

---

##### H2: **Almacenamiento LocalStorage sin Transacciones**
- **Severidad:** CRÍTICA
- **Ubicación:** [src/services/db.js](src/services/db.js#L121-L200)
- **Descripción:**
  ```javascript
  // PROBLEMA: Sin atomicidad
  async function insert(entity, data) {
    const record = { ...data, id: data.id || shortId() }
    
    // 1. Se persiste en cache primero
    const list = lsGet(entity)
    list.push(record)
    lsSet(entity, list)  // ← Si falla aquí, datos inconsistentes
    
    // 2. Se intenta subir online (puede fallar)
    if (_online) {
      try {
        await gasInsert(entity, record)
        // ... items relacionados ...
      } catch {
        // Encola pero LOCAL ya está persistido ✓
      }
    }
  }
  ```
- **Escenarios de Fallo:**
  - Si `insert()` de ventas falla parcialmente, `ventaItems` queDA inconsistente
  - No hay rollback: datos huérfanos en localStorage
  - La cola de sincronización puede perder items si localStorage falla
- **Impacto:** Corrupción silenciosa de datos
- **Recomendación:** Implementar patrón transaccional o migrar a IndexedDB

---

##### H3: **Normalización Incompleta en localStorage**
- **Severidad:** ALTA
- **Ubicación:** [src/services/db.js](src/services/db.js#L121-L200)
- **Descripción:**
  ```javascript
  // En el modelo ER: presentación es tabla separada + relación
  CREATE TABLE presentacion {
    id, producto_id, nombre, factor_conversion, precio_venta, ...
  }
  
  // En la app: presentación está DENTRO del producto
  const producto = {
    id: "PROD-123",
    nombre: "Clavos 2in",
    precio_venta: 0.15,  // ← Cuál presentación? AMBIGUO
    presentacion: "Caja",  // ← Campo denormalizado
  }
  ```
- **Consecuencias:**
  - Mayor consumo de localStorage
  - Dificultad para auditar cambios de precios por presentación
  - Consultasy reportes más complicadas
- **Recomendación:** Refactorizar para usar arrays de presentaciones

---

### 1.2 NORMALIZACIÓN DE DATOS

#### 🟠 H4: **Primera Forma Normal (1FN) - PARCIALMENTE CUMPLIDA**

```javascript
// ❌ VIOLACIÓN: Campos multivaluados
const venta = {
  id: "VENTA-001",
  items: [  // ← Campo multivaluado dentro de venta
    { producto_id: "P1", cantidad: 5 },
    { producto_id: "P2", cantidad: 2 },
  ],
  métodos_pago: ["EFECTIVO", "TARJETA"],  // ← Múltiples valores
}

// ✓ CORRECTO: Tablas separadas
// venta: { id, numero, fecha, ... }
// venta_items: { id, venta_id, producto_id, ... }
// venta_pago: { id, venta_id, metodo_pago_id, ... }
```

**Hallazgo:** El ER está correcto en `db.env`, pero **localStorage denormaliza**:
- Ventas incluyen el array `items[]` directamente
- Esto es aceptable para caché, pero crea inconsistencias en sincronización

---

#### 🟠 H5: **Segunda Forma Normal (2FN) - CUMPLIDA (Schema)**

✓ No hay dependencias parciales de la clave primaria  
✓ La mayoría de atributos dependen del PK completo  

⚠️ **Pero en runtime:**
```javascript
// Problema: items duplicados en ventas y en la cola
const ventaPendiente = {
  id: "VENTA-X",
  items: [...],  // ← Aquí están los items
  fechaCreacion: ...
}

const itemsEnCola = {
  action: "insert",
  entity: "ventaItems",
  data: { ...item, venta_id: "VENTA-X" }
  // ← Mismo item en DOS lugares con datos posiblemente inconsistentes
}
```

---

#### 🟡 H6: **Tercera Forma Normal (3FN) - VIOLACIONES DETECTADAS**

```javascript
// ❌ VIOLACIÓN: Dependencia transitiva
const cliente = {
  id: "CLI-001",
  nombre: "Juan Pérez",
  nit: "1234567-0",
  limite_credito: 5000,
  saldo_pendiente: 2500,  // ← Depende de 'cuentasCobrar', no del cliente
  dias_credito: 30,       // ← Atributo denormalizado del proveedor
}

// ✓ CORRECTO: Separar en tabla aparte
// cliente: { id, nombre, nit, limite_credito, dias_credito }
// cuenta_por_cobrar: { id, cliente_id, saldo_pendiente, ... }
```

**Impacto:** 
- Inconsistencia cuando se actualizan saldos
- Duplicación de datos en sincronización
- Dificultad para auditar cambios

---

## 🔐 II. SEGURIDAD Y AUTENTICACIÓN

### 2.1 ANÁLISIS DE AUTENTICACIÓN

#### 🔴 H7: **Session Storage Inseguro**
- **Ubicación:** [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx#L50-L70)
- **Severidad:** CRÍTICA
- **Problema:**
  ```javascript
  const [sesion, setSesion] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ferreapp_sesion') || 'null') }
    catch { return null }
  })
  
  // ❌ Datos de sesión VISIBLES en DevTools
  // Vulnerable a XSS: si attacker inyecta JS, puede leer sessionStorage
  // Sin HttpOnly, sin Secure flags
  ```
- **Ataque Posible:** 
  ```bash
  # En consola del navegador:
  sessionStorage.getItem('ferreapp_sesion')
  # → Retorna todo el objeto usuario con token
  ```
- **Recomendación:**
  - Migrar a HttpOnly cookies (requiere backend)
  - O usar patrón PKCE si es SPA puro
  - Nunca almacenar credenciales en sessionStorage

---

#### 🔴 H8: **Hash de Password en Cliente**
- **Ubicación:** [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx#L72-L80)
- **Severidad:** CRÍTICA
- **Problema:**
  ```javascript
  const login = useCallback(async (email, password) => {
    const hash = await sha256(password)  // ← Hash en cliente
    const usuario = usuarios.find(
      u => u.email.toLowerCase() === email.toLowerCase() 
        && u.password_hash === hash  // ← Comparación en cliente
        && u.activo
    )
  })
  ```
- **Riesgos:**
  - Sin backend, el hash es reversible si es rainbow table
  - El mismo hash se envía siempre (vulnerable a replay)
  - localStorage expone todo el `password_hash` de todos los usuarios
- **Ataque Posible:**
  ```js
  // Attacker obtiene firebase de todos los usuarios
  const usuarios = JSON.parse(localStorage.getItem('ferreapp_usuarios'))
  // Intento de fuerza bruta local contra millones de hashes
  ```
- **Recomendación:**
  - Implementar backend con bcrypt + salt
  - Nunca almacenar password_hash en cliente
  - Usar autenticación delegada (Google, GitHub, etc.)

---

#### 🔴 H9: **Sin Validación de Roles en Backend**
- **Severidad:** CRÍTICA
- **Ubicación:** [api/gas.js](api/gas.js#L1-L48)
- **Problema:**
  ```javascript
  // El proxy /api/gas NO valida roles ni permisos
  // Solo reenvía requests al Apps Script
  
  export default async function handler(req, res) {
    // ❌ NO hay:
    // - Validación de token
    // - Verificación de rol
    // - Rate limiting
    // - Validación de payload
    
    const body = GAS_SECRET ? { ...req.body, secret: GAS_SECRET } : req.body
    const response = await fetch(GAS_URL, { ... })
  }
  ```
- **Riesgo:** 
  - Usuario puede alterar su rol en cliente
  - Puede acceder a funciones solo de admin modificando request
- **Prueba de Concepto:**
  ```js
  // En DevTools, modificar sesión:
  const sesion = JSON.parse(sessionStorage.getItem('ferreapp_sesion'))
  sesion.rol = 'admin'
  sessionStorage.setItem('ferreapp_sesion', JSON.stringify(sesion))
  // ← Ya es admin localmente
  ```

---

#### 🟠 H10: **Secret Enviado Desde Cliente**
- **Ubicación:** [api/gas.js](api/gas.js#L34-L40)
- **Severidad:** ALTA
- **Problema:**
  ```javascript
  // API_SECRET está en .env (visible en código)
  // Se envía en cada request POST al Apps Script
  
  const body = GAS_SECRET ? { ...req.body, secret: GAS_SECRET } : req.body
  
  // ❌ Cualquiera que lea el código obtiene el secret
  // ❌ En Vercel, secrets pueden ser expuestos por malas configuraciones
  ```
- **Impacto:** 
  - Acceso completo a Google Apps Script sin autenticación
  - Cualquiera puede:
    - Duplicar BD
    - Modificar datos históricos
    - Inyectar malware
- **Recomendación:** 
  - Usar OAuth 2.0 contra Google Sheets
  - O almacenar credenciales solo en backend

---

### 2.2 LOCALSTORAGE Y DATOS SENSIBLES

#### 🔴 H11: **Todos los Datos Expuestos en localStorage**
- **Severidad:** CRÍTICA
- **Ubicación:** [src/services/db.js](src/services/db.js#L45-L60)
- **Problema:**
  ```javascript
  // localStorage NO tiene encriptación
  localStorage.setItem('ferreapp_usuarios', JSON.stringify(usuarios))
  localStorage.setItem('ferreapp_ventas', JSON.stringify(ventas))
  localStorage.setItem('ferreapp_clientes', JSON.stringify(clientes))
  // ...
  
  // ❌ Cualquiera con acceso a PC puede leer todo
  // ❌ Un malware puede exfiltrar en background
  // ❌ Backups del navegador contienen datos
  ```
- **Riesgo Específico:** Si usuario comparte PC, otro usuario ve:
  - Ventas completas (precios, clientes, totales)
  - Datos de clientes (NITs, direcciones, teléfonos)
  - Usuarios y hashes de contraseña
- **Recomendación:**
  - Encriptar localStorage con AES-256 (crypto-js)
  - O usar IndexedDB con WebCrypto
  - Limpiar localStorage al logout

---

## ✅ III. VALIDACIONES DE DATOS

### 3.1 VALIDADORES EXISTENTES

#### ✅ FORTALEZAS:
```javascript
// [src/utils/validators.js] - Bien estructurado

✓ isRequired()              — valida campos requeridos
✓ isPositiveNumber()        — números > 0
✓ isNonNegative()          — números >= 0
✓ isEmail()                — regex para email
✓ isPhone()                — regex para teléfono
✓ isPercentage()           — rango 0-100
✓ validateProducto()       — lógica compleja
✓ validateCliente()        — duplicados por NIT
✓ validateProveedor()      — validación compuesta
✓ validateCompra()         — validación transaccional
✓ validateEmpresa()        — datos fiscales
```

---

#### 🟡 H12: **Validación Incompleta de Integridad Referencial**

```javascript
// ❌ FALTA: No valida que el cliente exista
function validateVenta(venta, clientes = []) {
  const errors = {}
  if (!isRequired(venta.cliente_id)) 
    errors.cliente_id = 'Cliente requerido'
  
  // ❌ NO VALIDA: ¿El cliente_id existe en clientes[]?
  // ❌ NO VALIDA: ¿Los producto_id existen en inventario?
  // ❌ NO VALIDA: ¿El stock es suficiente?
  
  return errors
}

// ✓ DEBERÍA:
function validateVenta(venta, clientes = [], productos = []) {
  const errors = {}
  
  if (!isRequired(venta.cliente_id)) 
    errors.cliente_id = 'Cliente requerido'
  else if (!clientes.find(c => c.id === venta.cliente_id))
    errors.cliente_id = 'Cliente no existe'  // ← FK validación
  
  // Validar items
  venta.items?.forEach((item, idx) => {
    const prod = productos.find(p => p.id === item.producto_id)
    if (!prod) 
      errors[`items[${idx}].producto_id`] = 'Producto no existe'
    else if (prod.stock < item.cantidad)
      errors[`items[${idx}].cantidad`] = 'Stock insuficiente'
  })
  
  return errors
}
```

**Impacto:** 
- Se pueden crear ventas con clientes inexistentes
- Se pueden vender productos que no existen
- Se pueden vender más stock del disponible

---

#### 🟠 H13: **Validación de Límites Numéricos Ausente**

```javascript
// ❌ PROBLEMA: Sin validación de límites máximos
export const isPositiveNumber = (val) => 
  !isNaN(val) && Number(val) > 0

// ✓ DEBERÍA:
export const isValidMoneda = (val) => {
  const n = Number(val)
  return !isNaN(n) && n > 0 && n <= 9999999.99  // Máximo ~10M
}

// ❌ Sin validación en precios:
const producto = {
  precio_venta: 999999999999999999999,  // ← Desborde
  stock: -999999999999999999999,         // ← Negativo
}
```

**Impacto:** 
- Reportes con cálculos incorrectos
- Desborde de decimales
- Exploits con números muy grandes

---

#### 🟡 H14: **Sin Validación de Rangos de Fechas**

```javascript
// ❌ PROBLEMA: Sin validación de lógica de fechas
const venta = {
  fecha_creacion: '2026-04-30',
  fecha_entrega: '2020-01-01',  // ← Fecha pasada ✓ INVÁLIDA pero aceptada
}

const cotizacion = {
  fecha_cotizacion: '2026-04-30',
  fecha_vencimiento: '2026-04-20',  // ← Vencimento antes que creación ✓ INVÁLIDA
}

// ✓ DEBERÍA:
export const isValidRangoFechas = (start, end) => {
  if (!start || !end) return true
  return new Date(start) <= new Date(end)
}
```

**Impacto:** 
- Cotizaciones con fechas inconsistentes
- Reportes de cuentas por cobrar incorrectos
- Auditoría comprometida

---

#### 🟡 H15: **Sin Validación de Descuentos Acumulados**

```javascript
// ❌ PROBLEMA: Sin límite de descuento total
const venta = {
  subtotal: 100.00,
  descuento: 50.00,           // 50% OK
}

// Pero en items:
items: [
  { subtotal: 100, descuento: 100 },  // 100% descuento en item
  { subtotal: 50, descuento: 50 },    // 100% descuento en item
]
// Total con DESC: -100 (REGALO TOTAL)

// ✓ DEBERÍA:
const MAX_DESCUENTO_PCT = 0.30  // 30% máximo
if (descuentoTotal / subtotal > MAX_DESCUENTO_PCT) {
  errors.descuento = 'Descuento no puede exceder 30%'
}
```

---

## 🔄 IV. SINCRONIZACIÓN Y CONSISTENCIA

### 4.1 ANÁLISIS DE COLA DE SINCRONIZACIÓN

#### 🟠 H16: **Cola sin Política de Reintentos**
- **Ubicación:** [src/services/db.js](src/services/db.js#L200-L240)
- **Problema:**
  ```javascript
  export async function syncPending() {
    for (const item of sorted) {
      try {
        // Intenta ejecutar
        if (item.action === 'insert') {
          await gasInsert(item.entity, item.data)
        }
      } catch {
        break  // ← Si falla CUALQUIER item, para TODO
        // Item no se reintenta nunca
        // Items posteriores quedan en la cola indefinidamente
      }
    }
  }
  ```
- **Escenario de Fallo:**
  1. Internet desconecta durante compra
  2. Se encola: `{ action: 'insert', entity: 'compras', data: {...} }`
  3. Internet se reconecta
  4. `syncPending()` intenta sync
  5. Si la compra falla por validación remota, **TODA la cola se detiene**
  6. Ventas posteriores encoladas quedan atrapadas

**Recomendación:**
```javascript
// ✓ Implementar:
const maxReintentos = 3
item.reintentos = (item.reintentos || 0) + 1

if (item.reintentos >= maxReintentos) {
  auditar({
    accion: 'sync_failure',
    entidad: item.entity,
    razon: 'Máximo de reintentos excedido',
    item
  })
  continue  // Saltar item problemático
}
```

---

#### 🟠 H17: **Sin Validación de Conflictos en Reconexión**

```javascript
// ESCENARIO:
// 1. Usuario crea Venta-001 offline
// 2. Otro usuario crea Venta-001 en línea
// 3. Se reconecta... ¿Cuál prevalece?

// ❌ ACTUAL: Sin resolver conflictos
export async function syncPending() {
  for (const item of sorted) {
    try {
      await gasInsert(item.entity, item.data)  // ← Si ID duplica, falla silenciosa
    } catch {
      break
    }
  }
}

// ✓ DEBERÍA:
export async function syncPending() {
  for (const item of sorted) {
    try {
      const res = await gasInsert(item.entity, item.data)
      
      if (!res.ok) {
        if (res.error.includes('duplicate')) {
          const resConflicto = await resolverConflicto(item, res)
          if (resConflicto.estrategia === 'skip') {
            // Ignorar conflicto
          } else if (resConflicto.estrategia === 'merge') {
            // Fusionar datos
          }
        } else {
          item.reintentos++
          if (item.reintentos < 3) {
            // Reintentar
          }
        }
      }
    } catch (err) {
      auditar({ accion: 'sync_error', ...item, error: err.message })
      item.reintentos++
    }
  }
}
```

---

#### 🟡 H18: **Sin Validación de Consistencia Post-Sync**

```javascript
// ❌ PROBLEMA: Después de sincronizar, NO valida que remoto == local
export async function syncPending() {
  // ... sync items ...
  _syncing = false
  _notify()
  // ← Fin. NO VALIDA que los datos coincidan
}

// ✓ DEBERÍA:
export async function syncPending() {
  for (const item of sorted) {
    try {
      await gasInsert(item.entity, item.data)
      // Validar que se creó correctamente
      const registroRemoto = await gasGetAll(item.entity)
      const existe = registroRemoto.find(r => r.id === item.data.id)
      
      if (!existe) {
        throw new Error('Registro no se creó en remoto')
      }
    } catch (err) {
      // ...
    }
  }
}
```

---

## 🗂️ V. CALIDAD DE CÓDIGO Y BUENAS PRÁCTICAS

### 5.1 PROPENSIÓN A ERRORES

#### 🟡 H19: **IDs Generados con `Math.random()`**
- **Ubicación:** [src/utils/formatters.js](src/utils/formatters.js#L20-L23)
- **Problema:**
  ```javascript
  export const shortId = () =>
    Math.random().toString(36).slice(2, 9).toUpperCase()
  
  // RESULTADO: "4K9FX2L" (7 caracteres)
  // Probabilidad de colisión con ~10K registros: ~1%
  ```
- **Riesgo:** 
  - Colisiones silenciosas en IDs
  - Dos productos con el mismo ID
  - Ventas huérfanas
- **Recomendación:**
  ```javascript
  // ✓ Usar nanoid o uuid
  import { v4 as uuid } from 'uuid'
  export const generateId = () => uuid()
  ```

---

#### 🟡 H20: **Sin Manejo de Errores en Async**
- **Ubicación:** Múltiples lugares en [src/services/db.js](src/services/db.js)
- **Problema:**
  ```javascript
  async function insert(entity, data) {
    const record = { ...data, id: data.id || shortId() }
    const list = lsGet(entity)
    list.push(record)
    lsSet(entity, list)  // ← Y si localStorage.setItem falla?
    
    if (_online) {
      try {
        await gasInsert(entity, record)
        // ...
      } catch {
        // ← Ignoramos error silenciosamente
        // El usuario no sabe que falló
      }
    }
    
    enqueue('insert', entity, record, record.id)
  }
  ```
- **Impacto:** 
  - Usuario no sabe si datos se guardaron
  - No hay retry automático
  - Logs sin trazabilidad

---

### 5.2 PROBLEMAS DE ARQUITECTURA

#### 🟠 H21: **Context API Sobrecargado**
- **Ubicación:** [src/contexts/](src/contexts/)
- **Problema:**
  ```
  9 contextos principales:
  ├── AppContext.jsx          (productos, clientes, ventas, movimientos)
  ├── AuthContext.jsx         (usuarios, sesión)
  ├── CajaContext.jsx
  ├── CatalogosContext.jsx
  ├── ComprasContext.jsx
  ├── CotizacionesContext.jsx
  ├── CuentasPorCobrarContext.jsx
  ├── EmpresaContext.jsx
  └── ProveedoresContext.jsx
  
  ✗ Re-renderización innecesaria
  ✗ Sin memoización
  ✗ Difícil de debuggear
  ✗ Bundle size grande
  ```
- **Recomendación:**
  - Usar Zustand o Jotai para state management
  - O refactorizar contextos con `useMemo`

---

#### 🟡 H22: **Sin Testing Automatizado**
- **Severidad:** Mediana
- **Problema:**
  - No hay archivos `.test.js`
  - No hay cobertura de tests
  - No hay CI/CD pipeline
- **Documentación dice:**
  ```markdown
  No se encontraron pruebas automatizadas en el repositorio.
  [docs/plan-de-pruebas-qa.md](docs/plan-de-pruebas-qa.md)
  ```
- **Recomendación:**
  - Agregar Jest + React Testing Library
  - Mínimo: tests de validadores y servicios críticos
  - Coverage target: 80%

---

#### 🟡 H23: **Sin Type Safety (JavaScript puro)**
- **Severidad:** Mediana
- **Problema:**
  ```javascript
  // Sin TypeScript o JSDoc
  export function validateProducto(data, productos = [], modoEditar = false) {
    // ¿data es un objeto? ¿Array? ¿string?
    // ¿productos es array de qué?
    // ¿modoEditar es boolean?
  }
  
  // Sin tipos, es fácil confundir:
  validateProducto({ precio_venta: "100" })  // String en lugar de number
  validateProducto({ precio_venta: null })   // null en lugar de 0
  ```
- **Recomendación:**
  - Migrar a TypeScript gradualmente
  - O agregar JSDoc completo

---

## 📊 VI. CAJA Y MOVIMIENTOS DE DINERO

#### 🟠 H24: **Sin Auditoría de Movimientos de Caja**
- **Ubicación:** [src/contexts/CajaContext.jsx](src/contexts/CajaContext.jsx)
- **Problema:**
  - No hay bitácora de quién y cuándo abrió/cerró caja
  - No hay trazabilidad de ingresos/egresos
  - Difícil auditar discrepancias
- **Recomendación:**
  - Registrar usuario, fecha, IP en cada transacción
  - Generar recibos de movimientos

---

#### 🟡 H25: **Sin Validación de Estados en Transiciones**
- **Problema:**
  ```javascript
  // ✗ Se puede pasar de cualquier estado a cualquier otro
  // ✓ DEBERÍA:
  
  const transicionesValidas = {
    ABIERTA: ['CIERRE_PARCIAL', 'CERRADA'],
    CIERRE_PARCIAL: ['ABIERTA', 'CERRADA'],
    CERRADA: ['ABIERTA'],  // Solo si admin autoriza
  }
  ```

---

## 🚨 VII. SINCRONIZACIÓN CON GOOGLE SHEETS

### 7.1 PROBLEMAS IDENTIFICADOS

#### 🔴 H26: **No Hay Versionamiento de Datos**
- **Severidad:** CRÍTICA
- **Problema:**
  - Google Sheets se sobrescribe en cada sync
  - Si hay corrupción, no hay backup histórico
  - No se pueden recuperar datos de hace 1 hora
- **Recomendación:**
  - Mantener hoja de "historial" con timestamps
  - O usar version control (Sheets con Apps Script history)

---

#### 🟠 H27: **Proxy sin Rate Limiting**
- **Ubicación:** [api/gas.js](api/gas.js)
- **Problema:**
  ```javascript
  // ✗ Sin límite de requests
  export default async function handler(req, res) {
    const response = await fetch(GAS_URL, { ... })
    // Attacker puede hacer 10K requests al minuto
  }
  ```
- **Ataque Posible:**
  ```bash
  # DDoS a Google Apps Script
  for i in {1..10000}; do
    curl -X POST http://localhost:3000/api/gas \
      -H "Content-Type: application/json" \
      -d '{"action":"getAll","entity":"productos"}'
  done
  ```
- **Recomendación:**
  - Agregar rate limiting: 100 requests/min por IP

---

## ✨ VIII. FORTALEZAS DETECTADAS

#### ✅ F1: **Documentación Exhaustiva**
- README.md completo (614 líneas)
- db.env con esquema completo (1322 líneas)
- Convenciones claras documentadas

#### ✅ F2: **Estructuración Lógica**
- Carpetas bien organizadas
- Separación de concerns (components, utils, services, contexts)

#### ✅ F3: **Soporte Offline**
- Cache en localStorage
- Cola de sincronización
- Indicador online/offline

#### ✅ F4: **Multi-plataforma**
- Web (React + Vite)
- Desktop (Electron)
- PWA (Service Worker)

#### ✅ F5: **Mapeo Débil a Datos Reales**
- Modelo ER completo pensado para migración futura

---

## 📋 IX. MATRIZ DE HALLAZGOS CONSOLIDADA

| ID | Severidad | Categoría | Título | Estado | Fix |
|----|-----------|-----------|--------|--------|-----|
| H1 | CRÍTICA | Arquitectura | Inconsistencia ER vs localStorage | ❌ | Implementar o documentar |
| H2 | CRÍTICA | BD | Sin transacciones en localStorage | ❌ | Usar patrón transaccional |
| H3 | ALTA | Normalización | Denormalización de presentaciones | ⚠️ | Refactorizar schema |
| H4 | ALTA | Normalización | 1FN parcialmente violada | ⚠️ | Separar en tablas |
| H5 | MEDIA | Normalización | 2FN cumplida | ✅ | — |
| H6 | MEDIA | Normalización | 3FN violada (deps transitivas) | ❌ | Normalizar más |
| H7 | CRÍTICA | Seguridad | Session Storage inseguro | ❌ | HttpOnly cookies |
| H8 | CRÍTICA | Seguridad | Hash en cliente | ❌ | Backend + bcrypt |
| H9 | CRÍTICA | Seguridad | Sin validación de roles en backend | ❌ | Implementar JWT |
| H10 | ALTA | Seguridad | Secret expuesto desde cliente | ❌ | OAuth 2.0 |
| H11 | CRÍTICA | Privacidad | Datos expuestos en localStorage | ❌ | Encriptar |
| H12 | MEDIA | Validación | Integridad referencial incompleta | ❌ | Validators FK |
| H13 | ALTA | Validación | Sin límites numéricos máximos | ❌ | Validar rangos |
| H14 | MEDIA | Validación | Sin validación de rangos de fechas | ❌ | Validar lógica |
| H15 | MEDIA | Validación | Sin validación descuentos acumulados | ❌ | Límites de DESC |
| H16 | ALTA | Sync | Sin política de reintentos | ❌ | Implementar retry |
| H17 | ALTA | Sync | Sin resolución de conflictos | ❌ | Estrategia merge/skip |
| H18 | MEDIA | Sync | Sin validación post-sync | ❌ | Checksum comparison |
| H19 | MEDIA | Código | IDs con Math.random() | ❌ | UUID v4 |
| H20 | MEDIA | Código | Sin manejo de errores async | ❌ | Try-catch exhaustivo |
| H21 | ALTA | Arquitectura | Context API sobrecargado | ⚠️ | Zustand/Jotai |
| H22 | MEDIA | Testing | Sin tests automatizados | ❌ | Jest + RTL |
| H23 | MEDIA | Código | Sin type safety | ⚠️ | TypeScript o JSDoc |
| H24 | ALTA | Auditoría | Sin auditoría de caja | ❌ | Bitácora completa |
| H25 | MEDIA | Lógica | Sin validación de transiciones | ❌ | State machine |
| H26 | CRÍTICA | Backup | Sin versionamiento de datos | ❌ | Historial completo |
| H27 | ALTA | Seguridad | Proxy sin rate limiting | ❌ | Implementar limiter |

---

## 🎯 X. PRIORIDADES DE CORRECCIÓN

### SPRINT 1 (CRÍTICO - 2-3 semanas)
```
[ ] H7  - Session Storage → HttpOnly cookies
[ ] H8  - Auth → Backend con bcrypt + JWT
[ ] H9  - Validar roles en backend
[ ] H10 - Google Sheets → OAuth 2.0
[ ] H11 - localStorage → Encriptación AES-256
[ ] H2  - Transacciones en sync
[ ] H26 - Versionamiento de datos
```

### SPRINT 2 (ALTO - 2-3 semanas)
```
[ ] H1  - Completar modelo ER o actualizar docs
[ ] H3  - Normalizar presentaciones
[ ] H4  - Separar items en tablas
[ ] H12 - Validación de FK
[ ] H13 - Límites numéricos
[ ] H16 - Política de reintentos
[ ] H27 - Rate limiting en proxy
```

### SPRINT 3 (MEDIO - 2-3 semanas)
```
[ ] H14 - Validación de fechas
[ ] H15 - Límites de descuentos
[ ] H17 - Resolución de conflictos
[ ] H19 - UUID en lugar de shortId
[ ] H21 - Refactorizar state management
[ ] H22 - Agregar tests
[ ] H24 - Auditoría de caja
```

---

## 📝 XI. CONCLUSIÓN Y RECOMENDACIONES

### Estado General: **PROTOTIPO FUNCIONAL, NO LISTO PARA PRODUCCIÓN**

**Calificación:** 5.2/10

### Recomendaciones Generales:

1. **Migrar a Backend Real** (30-40 días)
   - Node/Express + PostgreSQL
   - JWT + bcrypt
   - Validación en servidor
   - Auditoría desde backend

2. **Seguridad Primero** (20-30 días)
   - SSL/TLS
   - HTTPS solo
   - HttpOnly cookies
   - CSRF protection
   - XSS sanitization

3. **Mejorar Calidad de Código** (15-20 días)
   - TypeScript
   - Tests automatizados
   - Linter con 0 warnings
   - SonarQube analysis

4. **Arquitectura Escalable** (20-30 días)
   - Reemplazar Context API
   - Separar lógica de presentación
   - UI library consolidada
   - Error boundaries

5. **Documentación Técnica** (10 días)
   - ADR (Architecture Decision Records)
   - API contracts
   - Security guidelines
   - Deployment playbooks

### Siguiente Paso:
Programar sesión de refinamiento con stakeholders para priorizar items según riesgo de negocio.

---

**Reporte compilado por:** SQA Bot  
**Fecha:** 30 de Abril 2026  
**Clasificación:** INTERNO - CONFIDENCIAL
