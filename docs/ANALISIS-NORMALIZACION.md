# 📐 MATRIZ DE NORMALIZACIÓN - FerreApp

## ANÁLISIS DE CALIDAD DEL MODELO ENTIDAD-RELACIÓN

---

## 1️⃣ PRIMERA FORMA NORMAL (1FN) - ÁTOMOS INDIVISIBLES

### ✅ CUMPLIMIENTO: 70%

```
1FN REQUIERE: Cada atributo es indivisible (atómico)
PROHÍBE: Campos con múltiples valores
```

### ANÁLISIS POR ENTIDAD:

#### ✅ BIEN: Producto (Tabla)
```sql
CREATE TABLE producto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo_interno VARCHAR(30),           ✓ Atómico
    nombre VARCHAR(250),                  ✓ Atómico
    categoria_id INT,                     ✓ FK, no anidado
    stock_actual DECIMAL(14,4),           ✓ Atómico
    ...
    UNIQUE (codigo_interno)
)
```

#### ⚠️ PROBLEMA: Venta en localStorage
```javascript
// ❌ VIOLACIÓN 1FN: campo items[] anidado
const venta = {
  id: "V001",
  numero: "VTA-000001",
  items: [  // ← MULTIVALUADO
    { 
      producto_id: "P1", 
      cantidad: 5,
      precio: 100,
      descuento: 10,
      subtotal: 450
    },
    { 
      producto_id: "P2", 
      cantidad: 2,
      precio: 200,
      descuento: 0,
      subtotal: 400
    }
  ],
  cliente_id: "C1",
  fecha: "2026-04-30",
  total: 850
}

// ✓ CORRECTO: Separar en tablas
// Tabla venta:
{
  id: "V001",
  numero: "VTA-000001",
  cliente_id: "C1",
  fecha: "2026-04-30",
  total: 850
}

// Tabla venta_detalle:
[
  { id: 1, venta_id: "V001", producto_id: "P1", cantidad: 5, ... },
  { id: 2, venta_id: "V001", producto_id: "P2", cantidad: 2, ... }
]
```

#### ⚠️ PROBLEMA: Métodos de pago multivaluados
```javascript
// ❌ NO ES 1FN
const venta = {
  ...
  metodos_pago: ["EFECTIVO", "TARJETA", "CHEQUE"]  // ← Múltiples valores
}

// ✓ CORRECTO:
// Tabla venta_pago:
[
  { venta_id: "V001", metodo_pago_id: 1, monto: 500 },
  { venta_id: "V001", metodo_pago_id: 3, monto: 350 }
]
```

---

## 2️⃣ SEGUNDA FORMA NORMAL (2FN) - DEPENDENCIA COMPLETA DE PK

### ✅ CUMPLIMIENTO: 95%

```
2FN REQUIERE:
  1. Cumplir 1FN
  2. Todos los atributos NO-KEY dependen del PK COMPLETO
PROHÍBE: Dependencias parciales en tablas con PK compuesto
```

### ANÁLISIS:

#### ✓ BIEN: Producto
```sql
CREATE TABLE producto (
    id INT PRIMARY KEY,              -- PK simple
    codigo_interno VARCHAR(30),      -- depende de {id}
    nombre VARCHAR(250),             -- depende de {id}
    categoria_id INT,                -- depende de {id}
    ...
)
-- Todos los atributos dependen del PK completo {id}
```

#### ✓ BIEN: Venta_Detalle
```sql
CREATE TABLE venta_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,        -- PK simple
    venta_id INT,                             -- FK
    producto_id INT,                          -- FK
    cantidad DECIMAL(14,4),                   -- depende de {id}
    precio_unitario DECIMAL(12,2),            -- depende de {id}
    ...
)
-- Aunque hay múltiples FKs, todos los atributos dependen de {id}
```

#### ⚠️ POTENCIAL PROBLEMA: Presentación
```sql
CREATE TABLE presentacion (
    id INT PRIMARY KEY,
    producto_id INT,              -- FK
    nombre VARCHAR(100),
    factor_conversion DECIMAL(14,4),
    precio_venta DECIMAL(12,2)
)

-- ANALIZAR: ¿precio_venta depende de {id} o de {producto_id, nombre}?
-- Respuesta: Depende de {id} ✓ (2FN OK)
-- Pero en localStorage, se desnormaliza como:
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  precio_venta: 0.15,    -- ❌ ¿Cuál presentación?
  presentacion: "Caja"   -- ❌ Denormalizado
}
```

**RECOMENDACIÓN:** Refactorizar a:
```javascript
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  presentaciones: [       // ✓ 2FN OK
    { id: "Pres-1", nombre: "Unidad", factor: 1, precio: 0.15 },
    { id: "Pres-2", nombre: "Libra", factor: 100, precio: 12.00 },
    { id: "Pres-3", nombre: "Caja", factor: 500, precio: 55.00 }
  ]
}
```

---

## 3️⃣ TERCERA FORMA NORMAL (3FN) - SIN DEPENDENCIAS TRANSITIVAS

### ⚠️ CUMPLIMIENTO: 60%

```
3FN REQUIERE:
  1. Cumplir 2FN
  2. NO debe haber atributos NO-KEY que dependan transitivamente de otros NO-KEY
PROHÍBE: Dependencias transitivas (X → Y → Z)
```

### VIOLACIONES DETECTADAS:

#### 🔴 CRÍTICA: Cliente con Saldo Denormalizado
```javascript
// ❌ VIOLACIÓN 3FN: Dependencia transitiva
const cliente = {
  id: "C001",
  nombre: "Juan Pérez",          // Depende de {id}
  nit: "1234567-0",              // Depende de {id}
  saldo_pendiente: 2500,         // ← Depende de {cuentasCobrar}, no de {cliente}
  limite_credito: 5000,          // Depende de {id}
  dias_credito: 30               // Depende de {id}
}

// RELACIÓN: cliente ---> saldo_pendiente
//              ↑
//          cuentasCobrar
// 
// Cuando se paga una cuenta:
// 1. Se actualiza cuentasCobrar
// 2. PERO saldo_pendiente del cliente queda viejo
// 3. ← INCONSISTENCIA

// ✓ CORRECTO: Separar en tablas
const cliente = {
  id: "C001",
  nombre: "Juan Pérez",
  nit: "1234567-0",
  limite_credito: 5000,
  dias_credito: 30
}

const cuentaPorCobrar = {
  id: "CPC-001",
  cliente_id: "C001",
  monto_original: 5000,
  saldo_pendiente: 2500,    // ← Solo aquí, no duplicado
  estado: "PARCIAL"
}

// Query para obtener saldo actual:
const saldoTotal = cuentasCobrar
  .filter(c => c.cliente_id === "C001")
  .reduce((sum, c) => sum + c.saldo_pendiente, 0)
```

#### 🔴 CRÍTICA: Producto con Stock Duplicado
```javascript
// ❌ VIOLACIÓN: stock_actual POR BODEGA debería estar en tabla separada
const producto = {
  id: "P1",
  nombre: "Cemento 25kg",
  stock_actual: 500,           // ← Total (confuso)
  bodega_id: "BOD-1",          // ← ¿Cuál bodega?
  stock_bodega1: 300,          // ← Denormalizado
  stock_bodega2: 150,          // ← Denormalizado
  stock_bodega3: 50            // ← Denormalizado
}

// PROBLEMA: Si bodegas cambian nombre, datos inconsistentes

// ✓ CORRECTO:
const producto = {
  id: "P1",
  nombre: "Cemento 25kg",
  stock_actual: 500  // Solo si es de una única bodega
}

const stockBodega = [
  { producto_id: "P1", bodega_id: "BOD-1", stock: 300 },
  { producto_id: "P1", bodega_id: "BOD-2", stock: 150 },
  { producto_id: "P1", bodega_id: "BOD-3", stock: 50 }
]

// Stock actual = SUM(stock) de todas las bodegas
```

#### 🔴 CRÍTICA: Venta con Saldo Calculable
```javascript
// ❌ VIOLACIÓN: subtotal, descuento, impuesto, total son calculables
const venta = {
  id: "V001",
  items: [
    { cantidad: 5, precio: 100, descuento: 10, subtotal: 450 },
    { cantidad: 2, precio: 200, descuento: 0, subtotal: 400 }
  ],
  subtotal: 850,              // ← CALCULADO (SUM items.subtotal)
  descuento: 10,              // ← CALCULADO (SUM items.descuento)
  impuesto: 102,              // ← CALCULADO (subtotal * iva_rate)
  total: 942                  // ← CALCULADO (subtotal - descuento + impuesto)
}

// PROBLEMA: Si un item se edita, ¿se recalculan automáticamente?
// Si no, se vuelven inconsistentes

// ✓ CORRECTO: Almacenar solo lo necesario
const venta = {
  id: "V001",
  items: [
    { cantidad: 5, precio: 100, descuento: 10, subtotal: 450 },
    { cantidad: 2, precio: 200, descuento: 0, subtotal: 400 }
  ],
  // Campos calculados: derivados en runtime
  get subtotal() { return items.reduce((s, i) => s + i.subtotal, 0) },
  get descuento() { return items.reduce((s, i) => s + i.descuento, 0) },
  get impuesto() { return this.subtotal * 0.12 },
  get total() { return this.subtotal - this.descuento + this.impuesto }
}

// O mejor aún: métodos de cálculo
class Venta {
  constructor(data) { this.data = data }
  
  get subtotal() {
    return this.data.items.reduce((s, i) => s + i.subtotal, 0)
  }
  
  get descuento() {
    return this.data.items.reduce((s, i) => s + i.descuento, 0)
  }
  
  get impuesto() {
    return this.subtotal * 0.12
  }
  
  get total() {
    return this.subtotal - this.descuento + this.impuesto
  }
}
```

#### 🔴 CRÍTICA: Proveedor con Condiciones Heredadas
```javascript
// ❌ VIOLACIÓN: Cada compra hereda dias_credito del proveedor
const proveedor = {
  id: "PRV-1",
  nombre: "Distribuidora ABC",
  dias_credito: 30,            // Atributo del proveedor
  porcentaje_descuento: 10     // Atributo del proveedor
}

const compra = {
  id: "COMP-1",
  proveedor_id: "PRV-1",
  dias_credito: 30,            // ← DENORMALIZADO (depende del proveedor)
  porcentaje_descuento: 10,    // ← DENORMALIZADO
  subtotal: 5000
}

// PROBLEMA: Si el proveedor cambia condiciones,
// ¿se actualizan las compras históricas? Probablemente NO
// → Datos inconsistentes sobre términos de la compra

// ✓ CORRECTO: Capturar condiciones al momento de compra
const compra = {
  id: "COMP-1",
  proveedor_id: "PRV-1",
  // Capturar snapshot de condiciones al momento
  dias_credito_al_momento: 30,
  porcentaje_descuento_al_momento: 10,
  subtotal: 5000,
  fecha: "2026-04-30"
}

// Si queremos condiciones actuales, consultamos proveedor por separado
```

### RESUMEN 3FN:

| Entidad | Estado | Problema | Impacto |
|---------|--------|----------|---------|
| cliente | ❌ Viola | Saldo denormalizado | Inconsistencia |
| producto | ❌ Viola | Stock por bodega denormalizado | Desfase |
| venta | ❌ Viola | Totales calculables | Desincronización |
| compra | ❌ Viola | Condiciones de proveedor | Datos históricos falsos |
| cuentaPorCobrar | ✓ OK | — | — |
| movimiento_stock | ✓ OK | — | — |

---

## 4️⃣ BOYCE-CODD NORMAL FORM (BCNF)

### CUMPLIMIENTO: 80%

```
BCNF REQUIERE: Cada determinante es una clave candidata
Es la forma más restrictiva (todo depende de claves)
```

#### ⚠️ PROBLEMA: Categorías Jerárquicas
```sql
CREATE TABLE categoria (
    id INT PRIMARY KEY,
    categoria_padre_id INT,
    nombre VARCHAR(100)
)

-- ANALIZAR dependencias:
-- nombre → ? (depende de {id}, potencialmente {categoria_padre_id, nombre})
-- 
-- Si dos categorías hermanas tienen el mismo nombre:
-- "Herramientas" bajo "Manuales"
-- "Herramientas" bajo "Eléctricas"
-- 
-- Determinante: {categoria_padre_id, nombre}
-- Pero PK es solo {id}
-- → NO es BCNF

-- ✓ MEJOR: Usar (parent_id, nombre) como unique constraint
CREATE TABLE categoria (
    id INT PRIMARY KEY,
    categoria_padre_id INT,
    nombre VARCHAR(100) NOT NULL,
    ...
    UNIQUE KEY uk_categoria_padre_nombre (categoria_padre_id, nombre)
)
```

---

## 📊 TABLA RESUMEN: Nivel de Normalización por Entidad

```
ENTIDAD                    1FN    2FN    3FN    BCNF   SCORE
─────────────────────────────────────────────────────────────
producto                  ✓      ✓      ⚠️     ⚠️     75%
presentacion              ✓      ✓      ✓      ✓      100%
cliente                   ✓      ✓      ❌     ❌     60%
proveedor                 ✓      ✓      ⚠️     ⚠️     75%
compra                    ✓      ✓      ❌     ❌     60%
venta                     ❌     ❌     ❌     ❌     40%
venta_detalle             ✓      ✓      ✓      ✓      100%
cotizacion                ❌     ❌     ❌     ❌     40%
cuentaPorCobrar           ✓      ✓      ✓      ✓      100%
caja_movimiento           ✓      ✓      ✓      ✓      100%
movimiento_stock          ✓      ✓      ✓      ✓      100%
─────────────────────────────────────────────────────────────
PROMEDIO                  85%    85%    60%    60%    73%
```

---

## 🔧 PLAN DE ACCIÓN: Normalizar localStorage

### PASO 1: Extender Validadores

```javascript
// src/utils/normalizedValidators.js

/**
 * Valida que una entidad sea atómica (1FN)
 */
export function isAtomic(value) {
  // No debe ser array de objetos
  if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
    return false
  }
  return true
}

/**
 * Valida que no haya dependencias transitivas
 */
export function validateNoTransitiveDependencies(entity, relatedEntities = {}) {
  const errors = {}
  
  // Ejemplo: Cliente no debe tener saldo_pendiente si existe cuentasCobrar
  if (entity.saldo_pendiente !== undefined && relatedEntities.cuentasCobrar?.length) {
    errors.saldo_pendiente = 'Debe calcularse desde cuentasCobrar, no almacenarse'
  }
  
  return errors
}

/**
 * Valida que totales sean consistentes
 */
export function validateTotalsConsistency(venta) {
  const errors = {}
  const calculado = venta.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0
  
  if (Math.abs(calculado - venta.subtotal) > 0.01) {  // Tolerancia 0.01
    errors.subtotal = `Inconsistencia: items suman ${calculado}, pero subtotal es ${venta.subtotal}`
  }
  
  return errors
}
```

### PASO 2: Refactorizar Entidades

```javascript
// Antes:
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  precio_venta: 0.15,
  presentacion: "Caja",
  stock: 500,
  bodega: "BOD-1"
}

// Después:
const producto = {
  id: "P1",
  nombre: "Clavos 2in",
  presentaciones: [
    { id: "PR-1", nombre: "Unidad", factor: 1, precio: 0.15 },
    { id: "PR-2", nombre: "Libra", factor: 100, precio: 12.00 },
    { id: "PR-3", nombre: "Caja", factor: 500, precio: 55.00 }
  ]
}

// Stock por bodega (tabla separada):
const stockBodega = [
  { producto_id: "P1", bodega_id: "BOD-1", stock: 500 },
  { producto_id: "P1", bodega_id: "BOD-2", stock: 200 }
]

// Helpers:
function getStockTotal(productoId, allStockBodega) {
  return allStockBodega 
    .filter(s => s.producto_id === productoId)
    .reduce((sum, s) => sum + s.stock, 0)
}

function getProductoPresentacionDefault(producto) {
  return producto.presentaciones?.find(p => p.es_predeterminada)
    || producto.presentaciones?.[0]
}
```

### PASO 3: Actualizar db.js

```javascript
// src/services/db.js

async function insert(entity, data) {
  // Validar normalización
  if (entity === 'producto') {
    const normErrors = validateNoTransitiveDependencies(data, { /* ... */ })
    if (Object.keys(normErrors).length) {
      return { ok: false, error: normErrors, code: 'NORMALIZATION_ERROR' }
    }
  }
  
  // ... resto de lógica
}

async function update(entity, id, data) {
  // Validar totales consistency para ventas
  if (entity === 'ventas') {
    const venta = lsGet('ventas').find(v => v.id === id) || {}
    const updated = { ...venta, ...data }
    const consistency = validateTotalsConsistency(updated)
    if (Object.keys(consistency).length) {
      auditar({ accion: 'totales_inconsistentes', entidad: 'ventas', entidad_id: id })
    }
  }
  
  // ... resto
}
```

---

## 📌 CONCLUSIÓN

**Calificación ACTUAL de Normalización: 3.5 / 5**

### Principales Deficiencias:
1. Denormalización excesiva en localStorage
2. Campos calculables almacenados como hechos
3. Dependencias transitivas sin resolver
4. Datos duplicados entre entidades

### Plan de Remediación:
- **Corto plazo (1 sprint):** Refactorizar presentaciones y stock por bodega
- **Mediano plazo (2 sprints):** Eliminar campos calculados
- **Largo plazo (migración):** Implementar PostgreSQL + normalización completa

---

**Documento generado:** 30 de Abril 2026  
**Revisor:** SQA Team
