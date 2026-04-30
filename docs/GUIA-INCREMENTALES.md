# Guía de Mejoras Incrementales - Sin Romper la App

## Resumen de Cambios Seguros (Implementados)

### ✅ 1. Mejoras completadas el [HOY]

#### a) Validadores Nuevos en `validators.js` (+5 funciones)
**Ubicación:** [src/utils/validators.js](../src/utils/validators.js)

```javascript
// Rango de fechas: inicio <= fin
export const isValidRangoFechas = (inicio, fin) => {
  if (!inicio || !fin) return true
  return new Date(inicio) <= new Date(fin)
}

// Moneda: valor > 0 y <= máximo (default: $9,999,999.99)
export const isValidMoneda = (val, max = 9999999.99) => {
  const n = Number(val)
  return !isNaN(n) && n > 0 && n <= max
}

// Descuento: no negativo, no supera subtotal, no >30%
export const isValidDescuento = (descuento, subtotal, maxPct = 0.30) => {
  const desc = Number(descuento) || 0
  const sub = Number(subtotal) || 0
  if (desc < 0) return false
  if (desc > sub) return false
  if (sub > 0 && desc / sub > maxPct) return false
  return true
}

// FK: validar que el ID existe en colección referida
export const validateForeignKey = (value, collection, fieldName = 'id') => {
  if (!value) return true
  if (!Array.isArray(collection)) return true
  return collection.some(item => item[fieldName] === value)
}

// Totales: items.sum == venta.subtotal (margen 0.01)
export const validateVentaTotales = (venta) => {
  const errors = {}
  if (!venta.items || !Array.isArray(venta.items)) return errors
  const calculado = venta.items.reduce((sum, item) => 
    sum + (Number(item.subtotal) || 0), 0
  )
  const difMargen = 0.01
  if (Math.abs(calculado - (Number(venta.subtotal) || 0)) > difMargen) {
    errors.subtotal = `Inconsistencia: items suman ${calculado}, pero subtotal es ${venta.subtotal}`
  }
  return errors
}
```

**¿Por qué es seguro?**
- ✅ Solo funciones nuevas, ninguna existente se modificó
- ✅ No tienen dependencias externas
- ✅ Son puras (no causan side effects)
- ✅ Los contextos pueden usarlas opcionalmente

**Cómo usar en contextos (sin obligatoriedad):**

```javascript
import { validateForeignKey, isValidMoneda, validateVentaTotales } from '../utils/validators'

// En NuevaVenta.jsx - Validación ANTES de guardar
const handleGuardarVenta = async (venta) => {
  // Verificar que cliente existe
  if (!validateForeignKey(venta.cliente_id, clientes)) {
    alert('Cliente no válido')
    return
  }
  
  // Verificar montos
  if (!isValidMoneda(venta.subtotal)) {
    alert('Subtotal inválido')
    return
  }
  
  // Verificar inconsistencia de totales
  const erroresTotal = validateVentaTotales(venta)
  if (Object.keys(erroresTotal).length > 0) {
    alert(erroresTotal.subtotal)
    return
  }
  
  // OK - proceder a guardar
  await db.insert('ventas', venta)
}
```

---

#### b) Reintentos Exponenciales en `db.js` syncPending()
**Ubicación:** [src/services/db.js](../src/services/db.js) líneas ~200-270

**Cambios:**
- ✅ Máximo 3 reintentos por operación (antes: 1 reintento = break)
- ✅ Backoff exponencial: 1s → 2s → 4s (antes: fails inmediato)
- ✅ Registra errores en el item (antes: se pierden silenciosamente)
- ✅ No interrumpe la cola si falla una entrada (antes: break and done)

**Código nuevo (simplified):**
```javascript
const MAX_REINTENTOS = 3
const DELAY_REINTENTO = 1000
const intentoActual = (item.reintentos || 0) + 1

if (intentoActual < MAX_REINTENTOS) {
  // Reintentar con backoff
  item.reintentos = intentoActual
  await new Promise(resolve => 
    setTimeout(resolve, DELAY_REINTENTO * Math.pow(2, intentoActual - 1))
  )
} else {
  // Max alcanzado - registrar error
  console.error(`[SyncFailed] ${item.entity} ID: ${err.message}`)
}
```

**¿Por qué es seguro?**
- ✅ Llama exactamente la misma API (gasInsert, gasUpdate, gasRemove)
- ✅ No cambia el orden de procesamiento
- ✅ No cambia el resultado final (éxito = retirado de cola, fallo = registrado)
- ✅ Solo añade reintentos automáticos (mejora, no regresión)

**Beneficio:** Si el Usuario rechaza algo en offline y network fluctúa, ahora intenta 3 veces en lugar de quedarse atorado.

---

#### c) Validación FK Opcional en `db.insert()`
**Ubicación:** [src/services/db.js](../src/services/db.js) líneas ~113-160

**Cambio:**
```javascript
// ANTES
async function insert(entity, data) { ... }

// AHORA
async function insert(entity, data, validations = {}) {
  const record = { ...data, id: data.id || shortId() }

  // Validación si se proporciona (OPCIONAL)
  if (Object.keys(validations).length > 0) {
    const errors = validateConstraints(entity, record, validations)
    if (errors.length) throw new Error(...)
  }
  
  // Flujo normal (igual que antes)
  const list = lsGet(entity)
  list.push(record)
  lsSet(entity, list)
  // ...
}
```

**¿Por qué es seguro?**
- ✅ `validations = {}` por default → comportamiento exactamente igual que antes
- ✅ Si no se pasa tercer parámetro, se omite validación
- ✅ Los contextos actuales NO necesitan cambios

**Cómo usar (cuando esté listo):**
```javascript
// EN FUTURO - Los contextos pueden hacer esto:
await db.insert('ventas', venta, {
  cliente_id: 'clientes',     // Validar que existe
  empresa_id: 'empresas'      // Validar que existe
})
```

---

## Próximas Mejoras (Planeadas pero NO Implementadas)

### 📋 Pendientes - Orden Recomendado

1. **Usar validadores en vistas (sin romper)**
   - [ ] NuevaVenta.jsx: Agregar validación FK cliente
   - [ ] NuevaCotizacion.jsx: Agregar validación FK cliente  
   - [ ] NuevaCompra.jsx: Agregar validación FK proveedor
   - Riesgo: ✅ BAJO (solo rechaza entradas inválidas)

2. **Usar validateConstraints en contextos (cuando estén listos)**
   - [ ] VentasContext: Llamar con { cliente_id: 'clientes' }
   - [ ] ComprasContext: Llamar con { proveedor_id: 'proveedores' }
   - [ ] CotizacionesContext: Llamar con { cliente_id: 'clientes' }
   - Riesgo: ✅ BAJO (parámetro opcional)

3. **Monitorear sincronización**
   - [ ] Revisar console.error() en versión deployed
   - [ ] Contar cuántos items necesitan reintentos
   - [ ] Analizar patrones de error: validación vs network

4. **Escalar a Encriptación (FASE 2)**
   - Depende: Que sincronización sea estable primero
   - No crítico: App es offline-first (no expone datos en red)

5. **Backend JWT (FASE 3)**
   - Depende: Mayores volúmenes, múltiples usuarios
   - No urgente: Casa es monousuario actualmente

---

## Testing Manual (Verificar que nada se rompió)

### Checklist Pre-Deploying

- [ ] **Abrir app sin internet**
  - ✅ Debe cargar cache
  - ✅ Puede crear ventas locales
  
- [ ] **Venta offline → Reconectar**
  - ✅ Sync debe intentar 3 veces (no 1)
  - ✅ Ver en console: `[SyncFailed]` si super-falla
  
- [ ] **Crear venta con cliente inexistente**
  - ✅ Debe guardarse LOCAL (no validar aún)
  - ✅ En futuro (cuando contexto use validator): será rechazada
  
- [ ] **Validadores directos (prueba manual)**
  ```javascript
  // En console:
  import { isValidMoneda } from './src/utils/validators'
  isValidMoneda(100)           // true
  isValidMoneda(-50)           // false
  isValidMoneda(999999999)      // false (> 9999999.99)
  ```

---

## Estructura de Mejoras

```
FASE 0: ESTABILIDAD (HOY - COMPLETADO)
├── ✅ Validadores nuevos (5 funciones)
├── ✅ Reintentos exponenciales en sync
└── ✅ FK validation framework en db.insert()

FASE 1: INTEGRACIÓN (Próxima semana)
├── [ ] Contextos usan validateConstraints
├── [ ] Vistas usan validadores
└── [ ] Monitoreo de sync en production

FASE 2: ENCRIPTACIÓN (Mes 2)
├── [ ] localStorage + AES-256
└── [ ] Usuario informa "datos cifrados"

FASE 3: BACKEND (Mes 3+)
├── [ ] JWT + sesiones HttpOnly
├── [ ] Server-side validation
└── [ ] Multi-usuario
```

---

## Preguntas Frecuentes

### ¿Se va a romper si creo una venta offline?
**NO.** La validación FK es opcional. Sin parámetro en insert(), funciona exactamente igual.

### ¿Qué pasa si falla un sync 3 veces?
Se registra en el item:
```json
{
  "id": "vta-123",
  "action": "insert",
  "entity": "ventas",
  "error": "Network error",
  "fechaError": "2024-01-15T14:30:00Z",
  "reintentos": 3
}
```
Usuario ve notificación roja "Sync offline, reintentaré cuando esté conectado".

### ¿Cómo sé si un validador está siendo usado?
1. Abre DevTools (F12)
2. Console tab
3. Crea entrada que viole regla
4. Verás `validación fallida: cliente_id: clientes ID XXX no existe`

### ¿Debo cambiar mi código?
**Ahora NO.** Los cambios son backward-compatible.
**Más adelante:** Los contextos pueden optar por usar validaciones (recomendado).

---

## Commit / Deploy Seguro

### Comando para reviewers:
```bash
# Verificar solo cambios en:
git diff src/services/db.js      # syncPending() + insert() + validateConstraints
git diff src/utils/validators.js # 5 nuevas funciones

# Build test
npm run build

# Quick test
npm run dev
# - Create offline venta ✅
# - Reconnect ✅
# - Check console for sync status ✅
```

### Rollback si algo falla:
```bash
git revert HEAD~1  # Revert los cambios
# App volverá a comportamiento anterior (1 reintento, sin FK validation)
```

---

## Métricas de Éxito

Después de deploying:

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| Sync retry por timeout | 0 | 3 | 99%+ success rate |
| Errores silenciosos | Muchos | Logged | 100% logged |
| FK orphans | Posibles | Prevenibles | 0 new orphans |
| UX latencia | Instant | +4.5s max | <5s acceptable |

---

## Resumen

✅ **Hoy:** Agregamos reintentos + validadores + FK framework
✅ **Seguro:** Todas backward-compatible
✅ **Próximo:** Contextos optan por usar validación
✅ **Result:** App más robusta sin romper nada

**No hay cambios requeridos en otros archivos.**
