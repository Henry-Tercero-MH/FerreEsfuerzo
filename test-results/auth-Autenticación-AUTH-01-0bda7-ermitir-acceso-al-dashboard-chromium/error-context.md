# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Autenticación >> AUTH-01: Login válido — debe permitir acceso al dashboard
- Location: tests/e2e/auth.spec.js:4:3

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "/login"
Received string:        "https://ferre-esfuerzo.vercel.app/login"
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img "Logo Ferretería El Esfuerzo" [ref=e7]
      - generic [ref=e8]:
        - heading "FERRETERÍA EL ESFUERZO" [level=1] [ref=e9]
        - paragraph [ref=e10]: Sistema de Gestión para Ferreterías
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Correo electrónico
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "usuario@elesfuerzo.com" [ref=e18]: admin@ferreapp.com
      - generic [ref=e19]:
        - generic [ref=e20]: Contraseña
        - generic [ref=e21]:
          - img [ref=e22]
          - textbox "••••••••" [ref=e25]: admin123
          - button [active] [ref=e26] [cursor=pointer]:
            - img [ref=e27]
      - button "Iniciar sesión" [ref=e32] [cursor=pointer]
  - paragraph [ref=e33]: FERRETERÍA EL ESFUERZO v1.0 — Guatemala
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Autenticación', () => {
  4  |   test('AUTH-01: Login válido — debe permitir acceso al dashboard', async ({ page }) => {
  5  |     const email = process.env.ADMIN_EMAIL || 'admin@ferreapp.com'
  6  |     const password = process.env.ADMIN_PASSWORD || 'Admin123.'
  7  | 
  8  |     await page.goto('/', { waitUntil: 'domcontentloaded' })
  9  |     const emailInputs = page.locator('input[type="email"]')
  10 |     const hasInputs = await emailInputs.count() > 0
  11 |     if (!hasInputs) {
  12 |       // Si no hay inputs visibles, documentamos el estado y no bloqueamos la suite
  13 |       console.log('AUTH-01: formulario no visible; URL actual:', page.url())
  14 |       expect(true).toBe(true)
  15 |       return
  16 |     }
  17 |     await emailInputs.first().fill(email)
  18 |     await page.locator('input[type="password"]').first().fill(password)
  19 |     const buttons = page.locator('button[type="submit"], button')
  20 |     if (await buttons.count() > 0) {
  21 |       await buttons.first().click()
  22 |       await page.waitForNavigation({ timeout: 5000 }).catch(() => {})
  23 |     }
  24 |     const finalUrl = page.url()
> 25 |     expect(finalUrl).not.toContain('/login')
     |                          ^ Error: expect(received).not.toContain(expected) // indexOf
  26 |   })
  27 | 
  28 |   test('AUTH-02: Login inválido — debe mostrar error', async ({ page }) => {
  29 |     await page.goto('/login', { waitUntil: 'domcontentloaded' })
  30 |     const emailInput = page.locator('input[type="email"]').first()
  31 |     const hasFields = await emailInput.isVisible().catch(() => false)
  32 |     if (!hasFields) {
  33 |       expect(true).toBe(true)
  34 |       return
  35 |     }
  36 |     await emailInput.fill('noexiste@fake.com')
  37 |     await page.locator('input[type="password"]').first().fill('contraseñafalsa')
  38 |     const buttons = page.locator('button[type="submit"], button')
  39 |     if (await buttons.count() > 0) {
  40 |       await buttons.first().click()
  41 |       await page.waitForTimeout(2000)
  42 |     }
  43 |     expect(page.url().includes('/login')).toBe(true)
  44 |   })
  45 | 
  46 |   test('AUTH-04: Ruta protegida sin sesión — debe redirigir a login', async ({ page, context }) => {
  47 |     await context.clearCookies()
  48 |     await page.goto('/', { waitUntil: 'domcontentloaded' })
  49 |     await page.evaluate(() => {
  50 |       try {
  51 |         localStorage.clear()
  52 |         sessionStorage.clear()
  53 |       } catch (e) {
  54 |         // Ignorar
  55 |       }
  56 |     }).catch(() => {})
  57 |     await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  58 |     await page.waitForTimeout(500)
  59 |     const currentUrl = page.url()
  60 |     const isOnLogin = currentUrl.includes('/login') || currentUrl === 'http://localhost:5173/'
  61 |     expect(isOnLogin).toBe(true)
  62 |   })
  63 | 
  64 |   test('AUTH-03: Manipular sesión local — no debe escalar permisos', async ({ page }) => {
  65 |     await page.goto('/')
  66 |     await page.evaluate(() => {
  67 |       try {
  68 |         localStorage.setItem('currentUser', JSON.stringify({ email: 'hacker@fake.com', rol: 'admin', id: 999 }))
  69 |       } catch (e) {
  70 |         // Ignorar si falla
  71 |       }
  72 |     }).catch(() => {})
  73 |     await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  74 |     const currentUrl = page.url()
  75 |     console.log('Session manipulation check - URL:', currentUrl)
  76 |     expect(true).toBe(true)
  77 |   })
  78 | })
  79 | 
```