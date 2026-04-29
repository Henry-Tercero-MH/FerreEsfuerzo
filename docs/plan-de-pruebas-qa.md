# Plan de pruebas QA y seguridad para FerreApp

## Objetivo
Validar si la aplicación es robusta en autenticación, integridad de datos, sincronización, uso offline, Electron/PWA y resistencia ante abuso o datos corruptos.

## Alcance
- Frontend React/Vite.
- Capa local basada en localStorage.
- Proxy `api/gas.js` y Google Apps Script.
- App de escritorio Electron.
- Service worker y caché PWA.

## Riesgos principales detectados
1. La sesión y parte de la autorización viven en el cliente.
2. El backend real depende de un secret enviado desde el frontend.
3. Hay persistencia fuerte en localStorage, por lo que cualquier manipulación local impacta la app.
4. No se encontraron pruebas automatizadas en el repositorio.
5. El lint falla con errores base, señal de fragilidad estructural.

## Prioridad máxima
Estos son los frentes que deben validarse y corregirse primero porque comprometen seguridad, integridad y control de acceso:
1. Autenticación y autorización real.
2. Protección del secret y del proxy hacia Apps Script.
3. Persistencia y manipulación de localStorage.
4. Integridad de datos críticos: usuarios, productos, ventas, caja y sincronización.

## Criterios de entrada
- La app compila y arranca en modo local.
- Existe acceso a una instancia de Google Sheets o a un entorno de prueba equivalente.
- Se dispone de al menos un usuario admin y uno no admin.

## Criterios de salida
- Las pruebas críticas de seguridad, integridad y sincronización pasan.
- No hay errores bloqueantes en login, CRUD, sincronización o exportación.
- Los riesgos críticos quedan documentados con evidencia.

## Matriz de pruebas

### 1) Autenticación y autorización
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| AUTH-01 | P0 | Login válido | Iniciar sesión con credenciales correctas | Se crea sesión y se permite acceso |
| AUTH-02 | P0 | Login inválido | Usar email o contraseña incorrecta | No entra y muestra error genérico |
| AUTH-03 | P0 | Manipular sesión local | Modificar localStorage y refrescar | No debe escalar permisos ni saltarse controles |
| AUTH-04 | P0 | Ruta protegida sin sesión | Abrir una ruta protegida directamente | Redirige a login |
| AUTH-05 | P0 | Cambio de rol | Editar rol de usuario y validar acceso | Solo cambia si la regla de negocio lo permite |

### 2) Integridad de datos
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| DATA-01 | P0 | Producto duplicado | Crear producto con código repetido | Rechaza duplicado |
| DATA-02 | P0 | Cliente duplicado | Crear cliente con NIT o nombre repetido | Rechaza duplicado según regla |
| DATA-03 | P0 | Proveedor inválido | Enviar correo, URL o teléfono inválido | Muestra validación y no guarda |
| DATA-04 | P0 | Compra inconsistente | Guardar compra con subtotal negativo o documento repetido | Rechaza la operación |
| DATA-05 | P0 | Stock negativo | Forzar stock o ajuste negativo inválido | No permite estado inconsistente |
| DATA-06 | Alta | Datos truncados | Usar textos muy largos en campos clave | Maneja el límite sin romper UI o persistencia |

### 3) Sincronización y modo offline
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| SYNC-01 | P0 | Crear offline | Desconectar red y crear registros | Se encolan y quedan visibles localmente |
| SYNC-02 | P0 | Reconexión | Volver a conectar y observar sync | Se envían pendientes sin duplicar |
| SYNC-03 | P0 | Falla intermedia | Cortar red durante sync | La cola conserva lo pendiente |
| SYNC-04 | Alta | Refresco forzado | Ejecutar refresco desde Sheets | Actualiza cache sin romper datos locales |
| SYNC-05 | P0 | Conflicto local/remoto | Editar mismo registro local y remoto | Se define una estrategia consistente |

### 4) Google Apps Script y proxy
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| API-01 | Crítica | Sin secret | Llamar al proxy sin secret | Respuesta no autorizada |
| API-02 | Crítica | Secret incorrecto | Llamar con secret inválido | Respuesta no autorizada |
| API-03 | P0 | Acción desconocida | Enviar action no soportada | Rechazo controlado |
| API-04 | P0 | Payload malformado | Enviar JSON inválido o campos faltantes | Error controlado, sin caída |
| API-05 | P0 | CORS | Simular acceso desde otro origen | No expone más de lo necesario |

### 5) Electron y PWA
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| DESK-01 | Alta | Arranque Electron | Abrir app de escritorio | Carga sin errores y muestra ventana |
| DESK-02 | Alta | Navegación externa | Abrir link externo | Se abre fuera de la app |
| PWA-01 | Alta | Instalación service worker | Cargar la app y recargar | El SW cachea recursos sin romper navegación |
| PWA-02 | Alta | Modo offline | Abrir app sin red | La UI base sigue operativa con cache |
| PWA-03 | Alta | Actualización SW | Publicar cambio y usar actualizar | El usuario puede refrescar sin corrupción |

### 6) Rendimiento y resistencia
| ID | Prioridad | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| PERF-01 | Alta | Catálogo grande | Cargar miles de productos | La UI sigue usable |
| PERF-02 | Alta | Búsqueda con muchos datos | Buscar y filtrar listas grandes | Respuesta aceptable |
| PERF-03 | Alta | Exportación JSON | Exportar datos con volumen alto | Genera archivo completo sin bloqueo grave |
| PERF-04 | P0 | Arranque con datos grandes | Iniciar la app con cache grande | No se congela ni falla |

## Vulnerabilidades a validar con pruebas de penetración funcional
- Sesión manipulable desde localStorage.
- Permisos solo visuales, no necesariamente obligatorios en servidor.
- Secret compartido desde frontend hacia proxy.
- Exportación masiva de datos sensibles.
- Dependencia de un cache local que puede corromperse o falsificarse.

## Recomendación de cobertura mínima
1. 100% de AUTH y API críticos.
2. 100% de CRUD de productos, clientes, compras, ventas, caja y usuarios.
3. 100% de escenarios offline/sync.
4. 1 prueba de carga básica por módulo principal.

## Prioridad de remediación
1. Mover la autorización real al servidor o a reglas verificables en Apps Script.
2. Sacar secretos del frontend.
3. Proteger la sesión para que no dependa de localStorage como fuente de confianza.
4. Introducir tests automatizados de integración y regresión.
5. Endurecer validaciones de datos y estados.
6. Reducir dependencia de localStorage como fuente de verdad.
