# FerreApp - Sistema de Gestión para Ferretería 🛠️

Sistema completo de gestión para ferreterías con soporte para ventas, inventario, compras, caja y facturación electrónica FEL (Guatemala).

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📋 Índice

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Roadmap](#roadmap)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## ✨ Características

### Módulos Implementados (v1.0 - DEMO)

#### 📊 **Dashboard**
- Resumen de ventas del día
- Productos con stock bajo
- Estadísticas generales
- Últimas transacciones

#### 💰 **Ventas**
- Punto de venta (POS) ágil
- Búsqueda rápida de productos
- Múltiples métodos de pago
- Generación de comprobantes
- Historial de ventas

#### 📝 **Cotizaciones**
- Creación de cotizaciones
- Conversión a ventas
- Estados: Vigente, Convertida, Vencida, Cancelada
- Seguimiento de validez

#### 📦 **Productos e Inventario**
- Catálogo de productos
- Control de stock
- Alertas de stock mínimo
- Categorías y marcas
- Unidades de medida
- **Preparado para presentaciones** (venta por unidad/caja/docena)

#### 👥 **Clientes**
- Gestión de clientes
- Datos fiscales (NIT, CF)
- **Preparado para créditos y límites**

#### 🚚 **Proveedores y Compras**
- Catálogo de proveedores
- Registro de compras
- Control de documentos
- Condiciones de crédito

#### 💵 **Caja**
- Apertura y cierre de caja
- Control de efectivo por turno
- Ingresos y egresos
- Arqueo de caja
- Historial de diferencias

#### 💳 **Cuentas por Cobrar**
- Gestión de créditos a clientes
- Registro de abonos
- Seguimiento de vencimientos
- Estados: Pendiente, Parcial, Pagada, Vencida

#### ⚙️ **Configuración**
- Datos fiscales de la empresa
- Configuración general del sistema
- **Preparado para integración FEL**
- Gestión de usuarios y permisos

### 🔐 **Sistema de Usuarios**
- Roles: Admin, Vendedor, Bodeguero
- Control de acceso por módulos
- Sesiones persistentes

### 📂 **Respaldos**
- Backup a Google Sheets (gratis, en la nube)
- Exportación JSON local
- Sincronización manual

---

## 🏗️ Arquitectura

### Stack Tecnológico

```
Frontend:
├── React 18                 # UI Framework
├── React Router DOM 7       # Enrutamiento
├── Tailwind CSS 3           # Estilos
├── Lucide React            # Iconos
└── Recharts                 # Gráficos

Desktop:
├── Electron 28             # Empaquetado desktop
└── electron-builder        # Generación instaladores

Backend/Almacenamiento:
├── localStorage            # Almacenamiento local (actual)
├── Google Apps Script      # Backup en la nube
└── [PostgreSQL/MySQL]      # Base de datos (futuro)

Build & Dev:
├── Vite 4                  # Bundler
├── ESLint                  # Linter
└── PostCSS                 # Procesador CSS
```

### Flujo de Datos

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   Contexts   │────▶│ localStorage│
│ Components  │◀────│  (State Mgmt)│◀────│    (DB)     │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            │
                            ▼
                    ┌──────────────┐
                    │ Google Sheets│
                    │  (Backup)    │
                    └──────────────┘
```

### Contextos (State Management)

```javascript
<AuthProvider>              // Autenticación y usuarios
  <EmpresaProvider>         // Configuración de la empresa
    <AppProvider>           // Productos, clientes, ventas, movimientos
      <ProveedoresProvider>
        <ComprasProvider>
          <CotizacionesProvider>
            <CajaProvider>
              <CuentasPorCobrarProvider>
                <Routes />  // Rutas de la aplicación
              </CuentasPorCobrarProvider>
            </CajaProvider>
          </CotizacionesProvider>
        </ComprasProvider>
      </ProveedoresProvider>
    </AppProvider>
  </EmpresaProvider>
</AuthProvider>
```

---

## 🗄️ Esquema de Base de Datos

El sistema está diseñado para migrar a una base de datos relacional robusta. El esquema completo está en `src/db.env`.

### Módulos del Esquema (15 módulos, 47 tablas)

#### 1. **Configuración Empresarial**
- `empresa` - Datos fiscales del emisor
- `establecimiento` - Sucursales/puntos de venta

#### 2. **Usuarios, Roles y Permisos**
- `rol`, `permiso`, `rol_permiso`
- `usuario`, `sesion_log`

#### 3. **Catálogos Base**
- `categoria` (jerárquica, N niveles)
- `marca`
- `unidad_medida` (UND, KG, MT, LT, etc.)
- `tipo_impuesto` (IVA 12%, IVA 5%, Exento)
- `metodo_pago` (Efectivo, Tarjeta, Crédito, etc.)

#### 4. **Productos e Inventario**
- `producto` - Datos del producto (unidad base)
- `presentacion` - Formas de venta (unidad/caja/docena)
  ```
  Ejemplo:
  Producto: "Clavos 2in" (unidad_base: UND)
    ├─ Presentación "Unidad"  → factor: 1   → Q0.15
    ├─ Presentación "Libra"   → factor: 100 → Q12.00
    └─ Presentación "Caja"    → factor: 500 → Q55.00
  ```
- `lote` - Para productos con vencimiento
- `bodega`, `stock_bodega` - Multi-bodega

#### 5. **Terceros**
- `cliente` - Con soporte para crédito
- `proveedor` - Con condiciones comerciales
- `proveedor_producto` - Relación producto-proveedor

#### 6. **Compras**
- `orden_compra`, `orden_compra_detalle`
- `compra`, `compra_detalle`

#### 7. **Ventas y POS**
- `correlativo` - Numeración de documentos
- `cotizacion`, `cotizacion_detalle`
- `venta`, `venta_detalle` - **Con soporte FEL**
- `venta_pago` - Múltiples formas de pago por venta

#### 8. **Notas de Crédito y Débito**
- `nota_credito_debito`, `nota_credito_debito_detalle`

#### 9. **Movimientos de Stock (Auditoría)**
- `movimiento_stock` - Kardex completo
  - Tipos: COMPRA, VENTA, DEVOLUCION, AJUSTE, TRASLADO, MERMA, etc.
- `traslado`, `traslado_detalle`
- `inventario_fisico`, `inventario_fisico_detalle`

#### 10. **Caja y Cortes**
- `caja`, `apertura_caja`
- `movimiento_caja` - Ingresos/egresos no ventas

#### 11. **Cuentas por Cobrar**
- `cuenta_por_cobrar`
- `abono` - Pagos parciales

#### 12. **Cuentas por Pagar**
- `cuenta_por_pagar`
- `pago_proveedor`

#### 13. **FEL (Facturación Electrónica)**
- `fel_log` - Historial de comunicación con certificador
  - Acciones: CREAR_XML, FIRMAR, CERTIFICAR, ANULAR, etc.

#### 14. **Auditoría General**
- `auditoria` - Log de INSERT/UPDATE/DELETE

#### 15. **Configuración del Sistema**
- `configuracion` - Parámetros clave-valor

### Vistas Útiles

```sql
v_producto_stock          -- Productos con stock y presentación default
v_ventas_dia              -- Ventas del día con datos FEL
v_stock_bajo              -- Productos bajo stock mínimo
v_cuentas_vencidas        -- Cuentas por cobrar vencidas
v_kardex                  -- Movimientos de stock (kardex)
```

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ y npm
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd FerreEsfuerzo

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# 4. Modo desarrollo (web)
npm run dev

# 5. Modo desarrollo (Electron)
npm run electron:dev

# 6. Construir para producción
npm run build
npm run electron:build
```

---

## ⚙️ Configuración

### 1. Configuración de Empresa

Al iniciar por primera vez, ve a **Configuración → Empresa** y completa:

- ✅ NIT y datos fiscales
- ✅ Dirección y contacto
- ✅ Régimen tributario
- ✅ Porcentaje de IVA
- 🔜 Datos FEL (próximamente)

### 2. Backup a Google Sheets

#### Paso 1: Crear Apps Script

1. Abre [Google Sheets](https://sheets.google.com) → Crea una hoja nueva
2. **Extensiones** → **Apps Script**
3. Copia el contenido de `apps-script/Code.gs`
4. **Guardar**

#### Paso 2: Ejecutar configuración inicial

1. En Apps Script, ejecuta la función `configurarHojas()`
2. Acepta los permisos solicitados
3. Se crearán automáticamente todas las hojas

#### Paso 3: Desplegar como Web App

1. **Implementar** → **Nueva implementación**
2. **Tipo**: Aplicación web
3. **Ejecutar como**: Yo
4. **Acceso**: Cualquier persona
5. **Implementar**
6. Copia la URL generada

#### Paso 4: Configurar en la app

1. En FerreApp, crea un archivo `.env` en la raíz:
   ```env
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
   ```
2. Reinicia la aplicación
3. Ve a **Ajustes** → **Backup a Google Sheets**

### 3. Usuarios y Roles

#### Roles disponibles:

- **Admin**: Acceso completo
- **Vendedor**: Ventas, clientes, productos (solo lectura)
- **Bodeguero**: Inventario, compras, productos

#### Usuario por defecto:
```
Email: admin@ferreapp.com
Password: admin123
```

**⚠️ IMPORTANTE**: Cambia la contraseña del admin después de la primera sesión.

---

## 📖 Uso

### Flujo de Trabajo Típico

#### 1. Configuración Inicial
```
1. Configurar empresa (Configuración → Empresa)
2. Crear usuarios (Ajustes → Usuarios)
3. Agregar categorías y marcas
4. Cargar productos
5. Registrar proveedores y clientes
```

#### 2. Operación Diaria
```
1. Abrir caja (Caja → Abrir caja)
2. Registrar ventas (Ventas → Nueva venta)
3. Registrar compras (Compras → Nueva compra)
4. Crear cotizaciones (Cotizaciones → Nueva cotización)
5. Registrar abonos (Cuentas por Cobrar)
6. Cerrar caja (Caja → Cerrar caja)
```

#### 3. Respaldo
```
- Diario: Backup a Google Sheets (Ajustes)
- Semanal: Exportar JSON local
```

---

## 🗺️ Roadmap

### ✅ Fase 1 - MVP/DEMO (Actual)
- [x] Sistema de usuarios y roles
- [x] Productos e inventario básico
- [x] Clientes y proveedores
- [x] Punto de venta (POS)
- [x] Cotizaciones
- [x] Compras
- [x] Caja
- [x] Cuentas por cobrar
- [x] Backup a Google Sheets
- [x] App de escritorio (Electron)

### 🔄 Fase 2 - Base de Datos Real (Próximo)
- [ ] Migración a PostgreSQL/MySQL
- [ ] Sincronización automática
- [ ] Backup automático programado
- [ ] Multi-usuario real (concurrencia)
- [ ] API REST backend

### 🚀 Fase 3 - Presentaciones y Lotes
- [ ] Sistema de presentaciones de productos
- [ ] Gestión de lotes y vencimientos
- [ ] Kardex detallado por presentación
- [ ] Reportes de rotación

### 📱 Fase 4 - Multi-Bodega
- [ ] Gestión de múltiples bodegas
- [ ] Traslados entre bodegas
- [ ] Stock por bodega
- [ ] Inventarios físicos

### 🧾 Fase 5 - FEL (Facturación Electrónica)
- [ ] Integración con certificador FEL
- [ ] Generación automática de DTEs
- [ ] Firma digital de documentos
- [ ] Generación de XML/PDF
- [ ] Anulación de documentos
- [ ] Notas de crédito/débito FEL
- [ ] Log de comunicación con SAT

### 📊 Fase 6 - Reportes Avanzados
- [ ] Dashboard analítico avanzado
- [ ] Reportes de rentabilidad
- [ ] Análisis de ventas por producto/categoría
- [ ] Proyecciones de inventario
- [ ] Reportes fiscales
- [ ] Exportación a Excel/PDF

### 🔐 Fase 7 - Seguridad y Auditoría
- [ ] Auditoría completa de operaciones
- [ ] Permisos granulares
- [ ] Cifrado de datos sensibles
- [ ] Logs de acceso
- [ ] Backups automáticos incrementales

### 🌐 Fase 8 - Características Adicionales
- [ ] Impresión de facturas y etiquetas
- [ ] Lector de código de barras
- [ ] App móvil (React Native)
- [ ] Portal de clientes (consulta de cuenta)
- [ ] Integración con pasarelas de pago
- [ ] Notificaciones por email/SMS

---

## 📂 Estructura del Proyecto

```
FerreEsfuerzo/
├── apps-script/             # Google Apps Script para backup
│   └── Code.gs
├── electron/                # Configuración Electron
│   ├── main.js
│   └── preload.js
├── public/                  # Archivos estáticos
│   └── icons/
├── src/
│   ├── components/          # Componentes React
│   │   ├── layout/          # Layout (Navbar, Sidebar, etc.)
│   │   ├── shared/          # Componentes compartidos
│   │   └── ui/              # Componentes UI básicos
│   ├── contexts/            # React Contexts (State)
│   │   ├── AppContext.jsx
│   │   ├── AuthContext.jsx
│   │   ├── CajaContext.jsx
│   │   ├── ClientesContext.jsx
│   │   ├── ComprasContext.jsx
│   │   ├── CotizacionesContext.jsx
│   │   ├── CuentasPorCobrarContext.jsx
│   │   ├── EmpresaContext.jsx
│   │   ├── ProductosContext.jsx
│   │   ├── ProveedoresContext.jsx
│   │   └── VentasContext.jsx
│   ├── hooks/               # Custom React Hooks
│   │   ├── useDebounce.js
│   │   └── useLocalStorage.js
│   ├── pages/               # Páginas de la app
│   │   ├── Ajustes.jsx
│   │   ├── Caja.jsx
│   │   ├── Clientes.jsx
│   │   ├── Compras.jsx
│   │   ├── ConfiguracionEmpresa.jsx
│   │   ├── Cotizaciones.jsx
│   │   ├── CuentasPorCobrar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Inventario.jsx
│   │   ├── Login.jsx
│   │   ├── NuevaVenta.jsx
│   │   ├── Productos.jsx
│   │   ├── Proveedores.jsx
│   │   ├── Reportes.jsx
│   │   └── Ventas.jsx
│   ├── services/            # Servicios externos
│   │   ├── backup.js
│   │   ├── googleAppsScript.js
│   │   └── storage.js
│   ├── utils/               # Utilidades
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── App.jsx              # Componente raíz
│   ├── db.env               # 🔥 Esquema de BD completo (47 tablas)
│   ├── index.css            # Estilos globales
│   └── main.jsx             # Entry point
├── .env.example             # Variables de entorno de ejemplo
├── .eslintrc.cjs            # Configuración ESLint
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── README.md                # 📘 Este archivo
├── tailwind.config.js
├── vercel.json              # Deploy a Vercel (opcional)
└── vite.config.js
```

---

## 🧪 Testing (Futuro)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📝 Notas Importantes

### Almacenamiento Actual (localStorage)

El sistema actual usa `localStorage` del navegador/Electron para almacenar datos. Esto significa:

✅ **Ventajas:**
- Sin necesidad de servidor
- Rápido y simple
- Funciona offline
- Sin costos de infraestructura

⚠️ **Limitaciones:**
- Datos locales (no compartidos entre PCs)
- Límite de ~10MB
- No hay concurrencia real
- Backups manuales

### Migración Futura a Base de Datos

El esquema en `src/db.env` está listo para PostgreSQL/MySQL. Cuando migres:

1. Ejecuta el script SQL en tu base de datos
2. Crea un backend (Node.js + Express recomendado)
3. Actualiza los contextos para consumir APIs
4. Implementa autenticación JWT
5. Configura backups automáticos

### FEL (Facturación Electrónica)

La estructura está preparada para FEL. Para implementar:

1. Contrata un certificador autorizado en Guatemala
2. Obtiene credenciales API
3. Implementa los endpoints de certificación
4. Configura firma digital
5. Genera XML según specs SAT
6. Implementa manejo de respuestas/errores

---

## 🤝 Contribuir

¿Mejoras, bugs, ideas? ¡Bienvenidas!

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/MejoraMejora`)
3. Commit tus cambios (`git commit -m 'Agrega MejoraMejora'`)
4. Push a la rama (`git push origin feature/MejoraMejora`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

Desarrollado con ❤️ para ferreterías guatemaltecas.

---

## 📞 Soporte

¿Preguntas? ¿Problemas?

- 📧 Email: soporte@ferreapp.com
- 🐛 Issues: [GitHub Issues]
- 📖 Docs: [Documentación completa]

---

**¡Gracias por usar FerreApp!** 🛠️✨
