import { test, expect } from '@playwright/test'

const ADMIN_SESSION = {
  id: 'usr-admin',
  nombre: 'Administrador',
  email: 'admin@ferreapp.com',
  rol: 'admin',
  activo: true,
}

const SEED_DATA = {
  productos: [
    {
      id: 'p-seed-001',
      codigo: 'PROD-0001',
      nombre: 'Producto Semilla 1',
      categoria: 'Herramientas Manuales',
      descripcion: 'Producto para pruebas',
      precio_compra: 20.00,
      precio_venta: 27.00,
      stock: 50,
      stock_minimo: 5,
      unidad: 'unidad',
      ubicacion: { pasillo: '1', estante: '1', bandeja: '1' },
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'p-seed-002',
      codigo: 'PROD-0002',
      nombre: 'Producto Semilla 2',
      categoria: 'Plomería',
      descripcion: 'Producto para pruebas 2',
      precio_compra: 30.00,
      precio_venta: 40.50,
      stock: 30,
      stock_minimo: 3,
      unidad: 'par',
      ubicacion: { pasillo: '2', estante: '1', bandeja: '2' },
      activo: true,
      creado_en: new Date().toISOString(),
    },
  ],
  clientes: [
    {
      id: 'cf',
      nombre: 'Consumidor Final',
      telefono: '',
      email: '',
      nit: 'CF',
      direccion: '',
      tipo: 'natural',
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'c-seed-001',
      nombre: 'Cliente Semilla 1',
      telefono: '5555-0001',
      email: 'cliente1@correo.com',
      nit: 'NIT-3000',
      direccion: 'Zona 1, Calle 1',
      tipo: 'natural',
      activo: true,
      creado_en: new Date().toISOString(),
    },
  ],
  proveedores: [
    {
      id: 'pr-seed-001',
      nombre: 'Proveedor Semilla 1',
      nit: 'PRV-7000',
      telefono: '4444-0001',
      correo: 'proveedor1@correo.com',
      direccion: 'Bodega 1',
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    },
  ],
}

async function loginAsAdmin(page) {
  await page.context().addInitScript(({ session, seed }) => {
    try {
      sessionStorage.setItem('ferreapp_sesion', JSON.stringify(session))
      localStorage.setItem('ferreapp_usuarios', JSON.stringify([
        {
          id: 'usr-admin',
          nombre: 'Administrador',
          email: 'admin@ferreapp.com',
          password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
          rol: 'admin',
          activo: true,
          creado_en: new Date().toISOString(),
        },
      ]))
      localStorage.setItem('ferreapp_productos', JSON.stringify(seed.productos))
      localStorage.setItem('ferreapp_clientes', JSON.stringify(seed.clientes))
      localStorage.setItem('ferreapp_proveedores', JSON.stringify(seed.proveedores))
    } catch (e) {
      // ignore
    }
  }, { session: ADMIN_SESSION, seed: SEED_DATA })
}

async function openModalAndExpectValidation(page, buttonName, fieldLabel, value) {
  await page.getByRole('button', { name: buttonName }).click()
  const inputNameMap = {
    'Código': 'codigo',
    'Nombre *': 'nombre',
    'NIT': 'nit',
    'NIT *': 'nit',
    'Teléfono': 'telefono',
    'Email': 'email',
    'Correo electrónico': 'correo',
    'Nombre comercial *': 'nombre',
  }
  const input = page.locator(`[name="${inputNameMap[fieldLabel] || fieldLabel}"]`)
  await expect(input).toBeVisible()
  await input.fill(value)
  await page.getByRole('button', { name: /Crear|Guardar cambios/i }).click()
  await page.waitForTimeout(1500)
}

test.describe('Conflictos en producción', () => {
  test('PROD-CONFLICT-01: Producto duplicado no debe guardarse', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    const before = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_productos') || '[]').length } catch { return 0 }
    })
    expect(before).toBeGreaterThan(0)
    const duplicateCode = await page.evaluate(() => {
      try {
        const list = JSON.parse(localStorage.getItem('ferreapp_productos') || '[]')
        return String(list[0]?.codigo || '')
      } catch {
        return ''
      }
    })

    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.locator('input[name="nombre"]').fill('Producto Conflicto')
    await page.locator('input[name="codigo"]').fill(duplicateCode)
    await page.locator('select[name="categoria"]').selectOption({ index: 1 })
    await page.locator('input[name="precio_compra"]').fill('10')
    await page.locator('input[name="precio_venta"]').fill('15')
    await page.locator('input[name="stock"]').fill('5')
    await page.locator('input[name="stock_minimo"]').fill('1')
    await page.locator('input[name="ubi_pasillo"]').fill('1')
    await page.locator('input[name="ubi_estante"]').fill('1')
    await page.locator('input[name="ubi_bandeja"]').fill('1')
    await page.getByRole('button', { name: /Crear producto/i }).click()
    await page.waitForTimeout(1500)
    const after = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_productos') || '[]').length } catch { return 0 }
    })
    expect(after).toBe(before)

  })

  test('PROD-CONFLICT-02: Cliente duplicado por NIT no debe guardarse', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/clientes', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    const before = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]').length } catch { return 0 }
    })
    expect(before).toBeGreaterThan(0)
    const duplicateNit = await page.evaluate(() => {
      try {
        const list = JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]')
        return String(list.find(c => c.id !== 'cf')?.nit || '')
      } catch {
        return ''
      }
    })

    await page.getByRole('button', { name: 'Nuevo cliente' }).click()
    await page.locator('input[name="nombre"]').fill('Cliente Conflicto')
    await page.locator('input[name="nit"]').fill(duplicateNit)
    await page.locator('input[name="telefono"]').fill('5555-1234')
    await page.locator('input[name="email"]').fill('cliente.conflicto@correo.com')
    await page.getByRole('button', { name: /Crear cliente/i }).click()
    await page.waitForTimeout(1500)

    const after = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_clientes') || '[]').length } catch { return 0 }
    })
    expect(after).toBe(before)
  })

  test('PROD-CONFLICT-03: Proveedor duplicado por NIT no debe guardarse', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/proveedores', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    const before = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]').length } catch { return 0 }
    })
    expect(before).toBeGreaterThan(0)
    const duplicateNit = await page.evaluate(() => {
      try {
        const list = JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]')
        return String(list[0]?.nit || '')
      } catch {
        return ''
      }
    })

    await page.getByRole('button', { name: 'Nuevo proveedor' }).click()
    await page.locator('input[name="nombre"]').fill('Proveedor Conflicto')
    await page.locator('input[name="nit"]').fill(duplicateNit)
    await page.locator('input[name="telefono"]').fill('4444-1234')
    await page.locator('input[name="correo"]').fill('proveedor.conflicto@correo.com')
    await page.getByRole('button', { name: /Crear proveedor/i }).click()
    await page.waitForTimeout(1500)

    const after = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ferreapp_proveedores') || '[]').length } catch { return 0 }
    })
    expect(after).toBe(before)
  })
})
