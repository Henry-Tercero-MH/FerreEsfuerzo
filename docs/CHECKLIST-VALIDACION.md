# ✓ CHECKLIST DE VALIDACIÓN SQA - FerreApp

**Propósito:** Verificación rápida de cumplimiento de criterios SQA  
**Frecuencia:** Ejecutar cada sprint  
**Tiempo de ejecución:** 30-45 minutos

---

## 🔒 SEGURIDAD (15 preguntas)

### Autenticación y Autorización

- [ ] ¿Ya existe un backend con autenticación?
  - [ ] SÍ - ¿Usa bcrypt? 
  - [ ] SÍ - ¿Token JWT con expiración?
  - [ ] SÍ - ¿HttpOnly cookies?
  - [ ] NO - **BLOCKER CRÍTICO**

- [ ] ¿Las credenciales se validan en servidor?
  - [ ] SÍ
  - [ ] NO - **RIESGO CRÍTICO**

- [ ] ¿Los roles se validan en cada endpoint?
  - [ ] SÍ - ¿En middleware?
  - [ ] NO - **RIESGO CRÍTICO**

### Datos en Transit

- [ ] ¿Todo usa HTTPS?
  - [ ] SÍ - Valid certificate
  - [ ] SÍ - Self-signed (solo desarrollo)
  - [ ] NO - **CRITICAL**

- [ ] ¿Payload está encriptado?
  - [ ] SÍ - AES-256 o equivalente
  - [ ] SÍ - HTTPS basta (suficiente para mayoría)
  - [ ] NO - **REVISAR**

### Datos en Rest

- [ ] ¿localStorage está encriptado?
  - [ ] SÍ - Cliente y servidor usan keys
  - [ ] SÍ - Solo datos no sensibles
  - [ ] NO - **RIESGO ALTO**

- [ ] ¿Se limpia sessionStorage al logout?
  - [ ] SÍ
  - [ ] NO - **REVISAR**

- [ ] ¿Las bases de datos están encriptadas?
  - [ ] SÍ - Encryption at rest
  - [ ] SÍ - Acceso solo por conexión segura
  - [ ] NO - **REVISAR**

### Secretos y Configuración

- [ ] ¿Hay secretos en .env?
  - [ ] SÍ - Pero .env está en .gitignore
  - [ ] SÍ - Y está en comentario claro
  - [ ] NO - **EXCELENTE**

- [ ] ¿Secretos de terceros están protegidos?
  - [ ] SÍ - Google API keys no en FE
  - [ ] SÍ - Keys en backend solo
  - [ ] NO - **RIESGO CRÍTICO**

- [ ] ¿Hay documentación de secrets?
  - [ ] SÍ - En README o wiki
  - [ ] NO - **REVISAR**

### Auditoría

- [ ] ¿Se registran logins fallidos?
  - [ ] SÍ - Con IP y fecha
  - [ ] NO - **REVISAR**

- [ ] ¿Se registran cambios críticos?
  - [ ] SÍ - Usuarios, roles, permisos
  - [ ] SÍ - Datos fiscales, ventas
  - [ ] NO - **REVISAR**

- [ ] ¿Hay alertas por actividad sospechosa?
  - [ ] SÍ - Múltiples login fallidos
  - [ ] SÍ - Cambios de rol, etc.
  - [ ] NO - **FUTURO**

---

## 📊 INTEGRIDAD DE DATOS (15 preguntas)

### Normalización

- [ ] ¿La BD cumple 1FN? (Sin campos multivaluados)
  - [ ] SÍ
  - [ ] EN PROGRESO
  - [ ] NO

- [ ] ¿La BD cumple 2FN? (Sin deps parciales)
  - [ ] SÍ
  - [ ] EN PROGRESO
  - [ ] NO

- [ ] ¿La BD cumple 3FN? (Sin deps transitivas)
  - [ ] SÍ
  - [ ] EN PROGRESO - ⚠️ FerreApp actual está aquí
  - [ ] NO

### Validaciones

- [ ] ¿Todos los campos obligatorios se validan?
  - [ ] SÍ - En client Y server
  - [ ] SÍ - Solo en client - **REVISAR**
  - [ ] NO - **RIESGO ALTO**

- [ ] ¿Hay validación de rangos en números?
  - [ ] SÍ - Min y max para decimales
  - [ ] SÍ - Solo algunos campos - **REVISAR**
  - [ ] NO - **RIESGO BAJO pero MEJORAR**

- [ ] ¿Hay validación de ForeignKeys?
  - [ ] SÍ - Antes de insertar
  - [ ] SÍ - Solo lectura - **REVISAR**
  - [ ] NO - **RIESGO ALTO** ⚠️ FerreApp

- [ ] ¿Totales se validan para congruencia?
  - [ ] SÍ - Sum(items) == total_venta
  - [ ] SÍ - Sporadicamente - **REVISAR**
  - [ ] NO - **RIESGO MEDIO** ⚠️ FerreApp

### Transacciones

- [ ] ¿Las operaciones son atómicas?
  - [ ] SÍ - Usa transacciones DB
  - [ ] SÍ - Es read-only - **N/A**
  - [ ] NO - **REVISAR** ⚠️ FerreApp (localStorage)

- [ ] ¿Hay rollback en caso de fallo?
  - [ ] SÍ - Manual o automático
  - [ ] NO - **REVISAR**

- [ ] ¿Se manejan conflictos de concurrencia?
  - [ ] SÍ - Timestamps o versioning
  - [ ] SÍ - Aplicación single-user - **N/A**
  - [ ] NO - **REVISAR**

### Backup y Recuperación

- [ ] ¿Hay backups automáticos?
  - [ ] SÍ - Diarios o horarios
  - [ ] SÍ - Ad-hoc - **REVISAR**
  - [ ] NO - **RIESGO CRÍTICO**

- [ ] ¿Los backups se prueban?
  - [ ] SÍ - Recover test mensual
  - [ ] SÍ - Nunca se probaron - **REVISAR URGENTE**
  - [ ] NO - **RIESGO CRÍTICO**

- [ ] ¿Hay versionamiento de datos?
  - [ ] SÍ - Git-like o audit log
  - [ ] SÍ - Snapshots en fecha específica - **REVISAR**
  - [ ] NO

- [ ] ¿Existe disaster recovery plan?
  - [ ] SÍ - Documentado y probado
  - [ ] SÍ - Documentado - **REVISAR**
  - [ ] NO - **RIESGO ALTO**

---

## ✅ VALIDACIONES DE NEGOCIO (12 preguntas)

### Lógica de Ventas

- [ ] ¿El stock se decrementa en venta?
  - [ ] SÍ - Automático
  - [ ] SÍ - Manual (ojo de bombo) - **REVISAR**
  - [ ] NO - **RIESGO CRÍTICO**

- [ ] ¿Se valida stock antes de venta?
  - [ ] SÍ - Bloquea si hay insuficiencia
  - [ ] SÍ - Permite oversell - **REVISAR**
  - [ ] NO - **RIESGO ALTO**

- [ ] ¿Los descuentos tienen límites?
  - [ ] SÍ - % máximo definido
  - [ ] SÍ - Sin límites - **REVISAR**
  - [ ] NO - **RIESGO BAJO pero MEJORAR**

### Caja y Dinero

- [ ] ¿Hay auditoría de movimientos de caja?
  - [ ] SÍ - Quién, cuándo, cuánto
  - [ ] NO - **REVISAR**

- [ ] ¿El efectivo se contabiliza?
  - [ ] SÍ - Reconciliación diaria
  - [ ] SÍ - Sin contabilidad - **REVISAR**
  - [ ] NO - **RIESGO FISCAL**

- [ ] ¿Los pagos parciales se manejan?
  - [ ] SÍ - Cuentas por cobrar trackeadas
  - [ ] SÍ - Cash-only - **N/A**
  - [ ] NO - **RIESGO ALTO**

### Reportes

- [ ] ¿Los reportes se pueden auditar?
  - [ ] SÍ - Datos originales trackeables
  - [ ] NO - **REVISAR**

- [ ] ¿Los reportes son consistentes?
  - [ ] SÍ - Se prueban manualmente periódicamente
  - [ ] SÍ - A veces no cuadran - **REVISAR**
  - [ ] NO - **RIESGO ALTO**

- [ ] ¿Existen reportes de auditoría?
  - [ ] SÍ - Quién cambió qué y cuándo
  - [ ] NO - **REVISAR**

---

## 🧪 TESTING Y CALIDAD (12 preguntas)

### Coverage

- [ ] ¿Hay tests automatizados?
  - [ ] SÍ - > 70% coverage
  - [ ] SÍ - 30-70% - **REVISAR**
  - [ ] SÍ - < 30% - **RIESGO ALTO**
  - [ ] NO - **RIESGO ALTO** ⚠️ FerreApp

- [ ] ¿Hay tests de regresión?
  - [ ] SÍ - Se corre en cada commit
  - [ ] SÍ - Se corre en releases - **REVISAR**
  - [ ] NO - **REVISAR**

- [ ] ¿Hay tests de integración?
  - [ ] SÍ - End-to-end validados
  - [ ] SÍ - Manuales - **REVISAR**
  - [ ] NO - **REVISAR**

### Linting y Formato

- [ ] ¿Hay ESLint configurado?
  - [ ] SÍ - 0 warnings
  - [ ] SÍ - < 10 warnings
  - [ ] SÍ - -> 10 warnings - **REVISAR** ⚠️ FerreApp
  - [ ] NO - **REVISAR**

- [ ] ¿El código está formateado?
  - [ ] SÍ - Prettier o similar
  - [ ] NO - **REVISAR**

### Error Handling

- [ ] ¿Los errores se capturan globalmente?
  - [ ] SÍ - Error boundary / middleware
  - [ ] NO - **REVISAR**

- [ ] ¿Los errores se loguean?
  - [ ] SÍ - Centralizados en remote
  - [ ] SÍ - En archivos locales
  - [ ] NO - **REVISAR**

- [ ] ¿El usuario recibe mensajes claros?
  - [ ] SÍ - Errores descriptivos
  - [ ] SÍ - Mensajes genéricos - **REVISAR**
  - [ ] NO - **REVISAR**

---

## 🚀 PERFORMANCE Y ESCALABILIDAD (10 preguntas)

### Velocidad

- [ ] ¿Las páginas cargan < 3 segundos?
  - [ ] SÍ
  - [ ] SÍ - Pero en caché - **REVISAR**
  - [ ] NO - **REVISAR**

- [ ] ¿Las búsquedas responden < 500ms?
  - [ ] SÍ - Con >1K registros
  - [ ] SÍ - Con <100 registros
  - [ ] NO - **REVISAR**

- [ ] ¿No hay memory leaks en DEV tools?
  - [ ] SÍ - Chequeado periódicamente
  - [ ] DESCONOCIDO - **REVISAR**
  - [ ] NO - **REVISAR**

### Escalabilidad

- [ ] ¿La app maneja 1K usuarios?
  - [ ] SÍ - Testeado
  - [ ] DESCONOCIDO - **REVISAR**
  - [ ] NO - **REVISAR** ⚠️ FerreApp

- [ ] ¿La app maneja 100K registros?
  - [ ] SÍ - Testeado con índices
  - [ ] DESCONOCIDO - **REVISAR**
  - [ ] NO - **REVISAR** ⚠️ FerreApp

- [ ] ¿Hay limpieza de datos históricos?
  - [ ] SÍ - Archivado automático
  - [ ] SÍ - Manual - **REVISAR**
  - [ ] NO - **REVISAR**

### Monitoreo

- [ ] ¿Se monitorea uptime?
  - [ ] SÍ - Dashboard en tiempo real
  - [ ] NO - **REVISAR**

- [ ] ¿Se alertan errores > threshold?
  - [ ] SÍ - Automático Slack/Email
  - [ ] NO - **REVISAR**

- [ ] ¿Se miden métricas de negocio?
  - [ ] SÍ - Ventas, usuarios activos, etc.
  - [ ] NO - **REVISAR**

---

## 🏆 CUMPLIMIENTO Y DOCUMENTACIÓN (8 preguntas)

### Regulaciones

- [ ] ¿Cumple con regulaciones locales?
  - [ ] SÍ - Guatemala (FEL)
  - [ ] N/A - No aplica
  - [ ] DESCONOCIDO - **REVISAR URGENTE**
  - [ ] NO - **RIESGO FISCAL CRÍTICO**

- [ ] ¿Hay PVFSE o equivalente?
  - [ ] SÍ - Certificado
  - [ ] EN PROGRESO - **REVISAR**
  - [ ] NO - **RIESGO FISCAL**

- [ ] ¿Se cumple GDPR o LSCA?
  - [ ] SÍ - Privacy policy actualizada
  - [ ] N/A - Solo clientes locales - **REVISAR**
  - [ ] NO - **RIESGO LEGAL**

### Documentación

- [ ] ¿Hay documentación técnica?
  - [ ] SÍ - README, API docs, ADRs
  - [ ] SÍ - Parcial - **REVISAR**
  - [ ] NO - **REVISAR**

- [ ] ¿Hay documentación de usuario?
  - [ ] SÍ - Manual de usuario
  - [ ] SÍ - Tutoriales, wikis
  - [ ] NO - **REVISAR**

- [ ] ¿El código tiene ejemplos?
  - [ ] SÍ - Snippets en comentarios
  - [ ] NO - **REVISAR**

- [ ] ¿Hay runbook de operaciones?
  - [ ] SÍ - Deployment, rollback, DR
  - [ ] NO - **REVISAR URGENTE**

---

## 📊 SCORING TOTAL

### Cálculo:

```
Total preguntas: 72

Conteo de respuestas:
- SÍ (completo):    _____ × 3 puntos = _____
- EN PROGRESO:      _____ × 2 puntos = _____
- NO / DESCONOCIDO: _____ × 0 puntos = _____

SCORE = Suma / 216 × 100 = _____%
```

### Interpretación:

```
90-100%  🟢 EXCELENTE - Producción lista
70-89%   🟡 BUENO - Producción con cuidado
50-69%   🟠 ACEPTABLE - Necesita trabajo
< 50%    🔴 CRÍTICO - No publique
```

### FerreApp Actual: 52% - 🟠 ACEPTABLE

**Estimado para META: 85%+ en 90 días**

---

## 📝 NOTAS Y HALLAZGOS

```
[Escribir aquí cualquier observación en esta revisión]

Fecha de revisión: __________
Revisor: __________________
Equipo presente: ___________

Hallazgos principales:
1. _________________________________
2. _________________________________
3. _________________________________

Action items:
- [ ] _______________  (Asignado a: ___, Deadline: ___)
- [ ] _______________  (Asignado a: ___, Deadline: ___)
- [ ] _______________  (Asignado a: ___, Deadline: ___)

Próxima revisión: __________
```

---

**Versión:** 1.0  
**Creado:** 30 de Abril 2026  
**Actualizado:** ________
**Revisado por:** ________

---

> **CONSEJO:** Ejecuta esto cada 2 sprints para trackear progreso.
> Si ves rojo, escalada inmediata a tech lead.
