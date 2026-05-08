# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prod-conflicts.spec.js >> Conflictos en producción >> PROD-CONFLICT-01: Producto duplicado no debe guardarse
- Location: tests/e2e/prod-conflicts.spec.js:127:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Nuevo producto' })

```

# Test source

```ts
  45  |     {
  46  |       id: 'cf',
  47  |       nombre: 'Consumidor Final',
  48  |       telefono: '',
  49  |       email: '',
  50  |       nit: 'CF',
  51  |       direccion: '',
  52  |       tipo: 'natural',
  53  |       activo: true,
  54  |       creado_en: new Date().toISOString(),
  55  |     },
  56  |     {
  57  |       id: 'c-seed-001',
  58  |       nombre: 'Cliente Semilla 1',
  59  |       telefono: '5555-0001',
  60  |       email: 'cliente1@correo.com',
  61  |       nit: 'NIT-3000',
  62  |       direccion: 'Zona 1, Calle 1',
  63  |       tipo: 'natural',
  64  |       activo: true,
  65  |       creado_en: new Date().toISOString(),
  66  |     },
  67  |   ],
  68  |   proveedores: [
  69  |     {
  70  |       id: 'pr-seed-001',
  71  |       nombre: 'Proveedor Semilla 1',
  72  |       nit: 'PRV-7000',
  73  |       telefono: '4444-0001',
  74  |       correo: 'proveedor1@correo.com',
  75  |       direccion: 'Bodega 1',
  76  |       activo: true,
  77  |       creado_en: new Date().toISOString(),
  78  |       actualizado_en: new Date().toISOString(),
  79  |     },
  80  |   ],
  81  | }
  82  | 
  83  | async function loginAsAdmin(page) {
  84  |   await page.context().addInitScript(({ session, seed }) => {
  85  |     try {
  86  |       sessionStorage.setItem('ferreapp_sesion', JSON.stringify(session))
  87  |       localStorage.setItem('ferreapp_usuarios', JSON.stringify([
  88  |         {
  89  |           id: 'usr-admin',
  90  |           nombre: 'Administrador',
  91  |           email: 'admin@ferreapp.com',
  92  |           password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  93  |           rol: 'admin',
  94  |           activo: true,
  95  |           creado_en: new Date().toISOString(),
  96  |         },
  97  |       ]))
  98  |       localStorage.setItem('ferreapp_productos', JSON.stringify(seed.productos))
  99  |       localStorage.setItem('ferreapp_clientes', JSON.stringify(seed.clientes))
  100 |       localStorage.setItem('ferreapp_proveedores', JSON.stringify(seed.proveedores))
  101 |     } catch (e) {
  102 |       // ignore
  103 |     }
  104 |   }, { session: ADMIN_SESSION, seed: SEED_DATA })
  105 | }
  106 | 
  107 | async function openModalAndExpectValidation(page, buttonName, fieldLabel, value) {
  108 |   await page.getByRole('button', { name: buttonName }).click()
  109 |   const inputNameMap = {
  110 |     'Código': 'codigo',
  111 |     'Nombre *': 'nombre',
  112 |     'NIT': 'nit',
  113 |     'NIT *': 'nit',
  114 |     'Teléfono': 'telefono',
  115 |     'Email': 'email',
  116 |     'Correo electrónico': 'correo',
  117 |     'Nombre comercial *': 'nombre',
  118 |   }
  119 |   const input = page.locator(`[name="${inputNameMap[fieldLabel] || fieldLabel}"]`)
  120 |   await expect(input).toBeVisible()
  121 |   await input.fill(value)
  122 |   await page.getByRole('button', { name: /Crear|Guardar cambios/i }).click()
  123 |   await page.waitForTimeout(1500)
  124 | }
  125 | 
  126 | test.describe('Conflictos en producción', () => {
  127 |   test('PROD-CONFLICT-01: Producto duplicado no debe guardarse', async ({ page }) => {
  128 |     await loginAsAdmin(page)
  129 |     await page.goto('/productos', { waitUntil: 'domcontentloaded' })
  130 |     await page.waitForLoadState('networkidle').catch(() => {})
  131 | 
  132 |     const before = await page.evaluate(() => {
  133 |       try { return JSON.parse(localStorage.getItem('ferreapp_productos') || '[]').length } catch { return 0 }
  134 |     })
  135 |     expect(before).toBeGreaterThan(0)
  136 |     const duplicateCode = await page.evaluate(() => {
  137 |       try {
  138 |         const list = JSON.parse(localStorage.getItem('ferreapp_productos') || '[]')
  139 |         return String(list[0]?.codigo || '')
  140 |       } catch {
  141 |         return ''
  142 |       }
  143 |     })
  144 | 
> 145 |     await page.getByRole('button', { name: 'Nuevo producto' }).click()
      |                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  146 |     await page.locator('input[name="nombre"]').fill('Producto Conflicto')
  147 |     await page.locator('input[name="codigo"]').fill(duplicateCode)
  148 |     await page.locator('select[name="categoria"]').selectOption({ index: 1 })
  149 |     await page.locator('input[name="precio_compra"]').fill('10')
  150 |     await page.locator('input[name="precio_venta"]').fill('15')
  151 |     await page.locator('input[name="stock"]').fill('5')
  152 |     await page.locator('input[name="stock_minimo"]').fill('1')
  153 |     await page.locator('input[name="ubi_pasillo"]').fill('1')
  154 |     await page.locator('input[name="ubi_estante"]').fill('1')
  155 |     await page.locator('input[name="ubi_bandeja"]').fill('1')
  156 |     await page.getByRole('button', { name: /Crear producto/i }).click()
  157 |     await page.waitForTimeout(1500)
  158 |     const after = await page.evaluate(() => {
  159 |       try { return JSON.parse(localStorage.getItem('ferreapp_productos') || '[]').length } catch { return 0 }
  160 |     })
  161 |     expect(after).toBe(before)
  162 | 
  163 |   })
  164 | 
  165 |   test('PROD-CONFLICT-02: Cliente duplicado por NIT no debe guardarse', async ({ page }) => {
  166 |     await loginAsAdmin(page)
  167 |     await page.goto('/clientes', { waitUntil: 'domcontentloaded' })
  168 |     await page.waitForLoadState('networkidle').catch(() => {})
  169 | 
  170 |     const before = await page.evaluate(() => {
  171 |       try { return JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]').length } catch { return 0 }
  172 |     })
  173 |     expect(before).toBeGreaterThan(0)
  174 |     const duplicateNit = await page.evaluate(() => {
  175 |       try {
  176 |         const list = JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]')
  177 |         return String(list.find(c => c.id !== 'cf')?.nit || '')
  178 |       } catch {
  179 |         return ''
  180 |       }
  181 |     })
  182 | 
  183 |     await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  184 |     await page.locator('input[name="nombre"]').fill('Cliente Conflicto')
  185 |     await page.locator('input[name="nit"]').fill(duplicateNit)
  186 |     await page.locator('input[name="telefono"]').fill('5555-1234')
  187 |     await page.locator('input[name="email"]').fill('cliente.conflicto@correo.com')
  188 |     await page.getByRole('button', { name: /Crear cliente/i }).click()
  189 |     await page.waitForTimeout(1500)
  190 | 
  191 |     const after = await page.evaluate(() => {
  192 |       try { return JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]').length } catch { return 0 }
  193 |     })
  194 |     expect(after).toBe(before)
  195 |   })
  196 | 
  197 |   test('PROD-CONFLICT-03: Proveedor duplicado por NIT no debe guardarse', async ({ page }) => {
  198 |     await loginAsAdmin(page)
  199 |     await page.goto('/proveedores', { waitUntil: 'domcontentloaded' })
  200 |     await page.waitForLoadState('networkidle').catch(() => {})
  201 | 
  202 |     const before = await page.evaluate(() => {
  203 |       try { return JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]').length } catch { return 0 }
  204 |     })
  205 |     expect(before).toBeGreaterThan(0)
  206 |     const duplicateNit = await page.evaluate(() => {
  207 |       try {
  208 |         const list = JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]')
  209 |         return String(list[0]?.nit || '')
  210 |       } catch {
  211 |         return ''
  212 |       }
  213 |     })
  214 | 
  215 |     await page.getByRole('button', { name: 'Nuevo proveedor' }).click()
  216 |     await page.locator('input[name="nombre"]').fill('Proveedor Conflicto')
  217 |     await page.locator('input[name="nit"]').fill(duplicateNit)
  218 |     await page.locator('input[name="telefono"]').fill('4444-1234')
  219 |     await page.locator('input[name="correo"]').fill('proveedor.conflicto@correo.com')
  220 |     await page.getByRole('button', { name: /Crear proveedor/i }).click()
  221 |     await page.waitForTimeout(1500)
  222 | 
  223 |     const after = await page.evaluate(() => {
  224 |       try { return JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]').length } catch { return 0 }
  225 |     })
  226 |     expect(after).toBe(before)
  227 |   })
  228 | })
  229 | 
```