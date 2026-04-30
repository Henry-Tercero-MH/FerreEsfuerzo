# Plan de Testing - Validaciones Integradas

## ✅ Cambios Implementados

### Contextos Actualizados
- ✅ **ComprasContext**: Validación FK de proveedor + moneda
- ✅ **CotizacionesContext**: Validación FK de cliente + moneda  
- ✅ **CuentasPorCobrarContext**: Validación FK de cliente + moneda en abonos

### Nuevas Reglas de Validación
```javascript
// Fallos esperados (bloquean operación):
1. Compra sin proveedor existente → Error: "Proveedor ID XXX no existe"
2. Cotización sin cliente existente → Error: "Cliente ID XXX no existe"
3. Cuenta sin cliente existente → Error: "Cliente ID XXX no existe"
4. Montos negativos o > $9,999,999.99 → Error: "Monto inválido"
5. Abonos con montos inválidos → Error: "Monto de abono inválido"
```

---

## 🧪 Casos de Prueba

### Test 1: Crear Compra con Proveedor Válido
**Ubicación**: URL/compras
**Pasos**:
1. Ir a Compras → Nuevo
2. Llenar con proveedor **existente**
3. Subtotal: `1500.00`
4. Guardar

**Resultado esperado**:
- ✅ Compra creada exitosamente
- ✅ Vuelve a lista de compras
- ✅ Sincroniza a Google Sheets (si está online)

---

### Test 2: Crear Compra con Proveedor Inválido
**Ubicación**: URL/compras
**Pasos**:
1. Ir a Compras → Nuevo
2. Seleccionar cliente/proveedor que NO existe
3. Subtotal: `1500.00`
4. Guardar

**Resultado esperado**:
- ❌ Error de validación: `"Proveedor ID xxx-invalid no existe"`
- ❌ Compra NO se crea
- ❌ Permanece en formulario (sin guardar localmente)

**Cómo provocarlo**:
```javascript
// En DevTools console:
// Cambiar el ID del proveedor a algo inexistente
document.querySelector('select[name="proveedor_id"]').value = "nonexistent-id"
// Luego intentar guardar
```

---

### Test 3: Crear Cotización con Monto Inválido
**Ubicación**: URL/cotizaciones
**Pasos**:
1. Ir a Cotizaciones → Nueva
2. Cliente: (válido)
3. Subtotal: `-100` o `999999999.99`
4. Guardar

**Resultado esperado**:
- ❌ Error: `"Subtotal inválido: xxx"`
- ❌ Cotización NO se crea
- ❌ Formulario tiene error visual

---

### Test 4: Offline - Crear sin Validación FK (Backwards Compat)
**Ubicación**: URL/compras
**Pasos**:
1. Desconectar internet (DevTools → Network → Offline)
2. Crear Compra con datos mínimos
3. Reconectar internet

**Resultado esperado**:
- ✅ Compra se crea LOCAL (caché)
- ✅ Sincroniza cuando reconecta (con reintentos)
- ⚠️ Si FK es inválido: sync falla con error de validación en Apps Script

---

### Test 5: Offline - Crear Abono, Reconectar
**Ubicación**: URL/cuentas-por-cobrar
**Pasos**:
1. Desconectar internet
2. Ir a Cuentas por Cobrar
3. Seleccionar cuenta pendiente
4. Registrar abono: `500.00`
5. Reconectar internet

**Resultado esperado**:
- ✅ Abono se registra LOCAL
- ✅ Saldo se actualiza LOCAL
- ✅ Al reconectar, sincroniza automáticamente
- ✅ Console muestra: `[SyncRetry] ...` (1-3 intentos)

---

### Test 6: Validación de Totales Inconsistentes
**Ubicación**: URL/nueva-venta
**Pasos**:
1. Crear venta con 2 items
2. Item 1: $100
3. Item 2: $200
4. Subtotal: `250` (incorrecto, debe ser 300)
5. Guardar

**Resultado esperado**:
- ✅ Venta SE CREA (validador es WARNING, no bloquea)
- ✅ Console muestra: `Inconsistencia: items suman 300, pero subtotal es 250`
- ⚠️ En futuros sprints: se rechazará (aún es opcional)

---

## 📊 Matriz de Testing

| Caso | Contexto | Validador | Online | Offline | Esperado |
|------|----------|-----------|--------|---------|----------|
| FK válido | Compras | validateForeignKey | ✅ OK | ✅ OK | Creado |
| FK inválido | Compras | validateForeignKey | ❌ Falla | ⚠️ Local, sync falla | Rechazado |
| Moneda válida | Cotizaciones | isValidMoneda | ✅ OK | ✅ OK | Creado |
| Moneda inválida | Cuentas | isValidMoneda | ❌ Falla | ❌ Falla | Rechazado |
| Totales inconsistentes | Ventas | validateVentaTotales | ⚠️ Advertencia | ⚠️ Advertencia | Se crea (log) |
| Sync 1 intento | Abonos | - | ✅ OK | ⚠️ Sin reintentos | OK |
| Sync 3 intentos | Compras | - | ✅ OK | ✅ Retry 3x | OK después |
| Session perdida | Auth | - | ✅ Auto logout | ⚠️ Se queda | Sesión expira |

---

## 🔍 Verificaciones de Consola

### Activar Debug Mode
```javascript
// En DevTools, pega esto:
window._DEBUG_VALIDATIONS = true

// Luego verás logs como:
// [Validación] validateForeignKey: cliente_id=abc123 en clientes... ✅ VALIDO
// [Validación] isValidMoneda: 5000.50 <= 9999999.99... ✅ VALIDO
// [ValidacionFalla] Cliente ID xyz-invalid no existe
```

### Monitorear Sync
```javascript
// Ver cola de sincronización
const queue = JSON.parse(localStorage.getItem('ferreapp_sync_queue'))
console.log('Items en cola:', queue.length)
console.log('Items con error:', queue.filter(q => q.error).length)
console.log('Items reintentados:', queue.filter(q => q.reintentos > 0).length)
```

### Revisar Últimos Errores
```javascript
// Ver errores acumulados
const ultimosErrores = JSON.parse(localStorage.getItem('ferreapp_sync_errors') || '[]')
console.table(ultimosErrores.slice(-10))
```

---

## 🚀 Procedimiento de Testing Completo (15 mins)

### Setup (2 min)
- [ ] App corriendo en dev (`npm run dev`)
- [ ] DevTools abierto (F12)
- [ ] Network tab visible
- [ ] Console tab visible
- [ ] Logged in (con usuario de prueba)

### Validaciones Básicas (5 min)
- [ ] Test 1: Compra con proveedor válido ✅
- [ ] Test 2: Compra con proveedor inválido ❌
- [ ] Test 3: Cotización con monto inválido ❌
- [ ] Test 4: Abono con monto válido ✅

### Offline/Sync (5 min)
- [ ] Test 5: Offline → Crear → Reconectar ✅
- [ ] Verificar console: `[SyncRetry] ...` x3 ✅
- [ ] Verificar saldo actualizado correctamente

### Performance (3 min)
- [ ] Tiempo creación entrada: <1s local, <3s sync
- [ ] Reintentos: máx 4.5s (1s + 2s + 4s - 1s=4s de espera)
- [ ] No freezear UI durante sync

---

## 📝 Checklist Pre-Deploy

- [ ] Todos los tests pasaron
- [ ] No hay errores en console
- [ ] `npm run build` sin warnings/errors
- [ ] Offline functionality works
- [ ] Sync con reintentos funciona
- [ ] UI no se freezea
- [ ] Usuarios existentes siguen funcionando (backward compat)

---

## 🐛 Troubleshooting

### Problema: "Cannot read property 'getAll' of undefined"
**Causa**: db.getAll() no está exportado correctamente
**Solución**: Verificar que validateConstraints está en export db en db.js:
```javascript
export const db = {
  getAll,
  forceRefresh,
  insert,
  update,
  remove,
  refreshAll,
  validateConstraints,  // ← Debe estar aquí
}
```

### Problema: Validación no se dispara
**Causa**: Contexto no está llamando al validador
**Solución**: Verificar imports en contexto:
```javascript
import { validateForeignKey, isValidMoneda } from '../utils/validators'
```

### Problema: Sync intenta infinitamente
**Causa**: validateConstraints no está bien configurado
**Solución**: Revisar que la colección no es null:
```javascript
if (!validateForeignKey(data.proveedor_id, db.getAll('proveedores'))) {
  throw new Error(...)
}
```

### Problema: "No reintentos después de desconectar"
**Causa**: Sync NO se llama automático
**Solución**: Forzar refresh al reconectar en useEffect:
```javascript
window.addEventListener('online', () => {
  db.syncPending()  // Trigger sync
})
```

---

## 📞 Soporte

Si algún test falla:
1. Capturar screenshot de error
2. Copiar console error en DevTools
3. Revisar localStorage:
   ```javascript
   // Ver estado local
   localStorage.getItem('ferreapp_sync_queue')
   localStorage.getItem('ferreapp_compras')
   localStorage.getItem('ferreapp_clientes')
   ```
4. Contactar con logs completos

---

## Próximos Pasos (Después de Validar)

✅ **Fase 1 Completa**: Validaciones integradas
⏭️ **Fase 2**: Mejorar UX con notificaciones de validación
⏭️ **Fase 3**: Encriptación de localStorage
⏭️ **Fase 4**: Backend con JWT (SPRINT 1 completo)
