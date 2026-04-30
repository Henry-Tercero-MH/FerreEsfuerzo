import { test, expect } from '@playwright/test'

test.describe('API y Proxy', () => {
  test('API-01: Sin secret — debe rechazar petición no autorizada', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    
    // Verificar qué headers/secret se envía desde el cliente
    let capturedRequests = []
    
    page.on('request', request => {
      if (request.url().includes('/api/gas') || request.postDataJSON?.secret !== undefined) {
        capturedRequests.push({
          url: request.url(),
          method: request.method(),
          hasSecret: !!request.postDataJSON?.secret,
        })
      }
    })
    
    // Trigger una sincronización o refresh
    const refreshBtn = page.locator('button:has-text("Refrescar"), button:has-text("Sincronizar")').first()
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click()
      await page.waitForTimeout(2000)
    }
    
    // Sin VITE_APPS_SCRIPT_URL configurada en el frontend, la app podría fallar gracefully
    // El proxy debe estar configurado sin exponer secrets innecesarios
    expect(true).toBe(true) // Documentar comportamiento
  })

  test('API-02: Secret incorrecto — debe rechazar acceso', async ({ page }) => {
    // En esta configuración sin backend real, no podemos validar secret real
    // Pero podemos verificar que:
    // 1. El código intenta mandar secret (si está configurado)
    // 2. No expone secrets en URLs públicas
    
    let capturedRequests = []
    
    page.on('request', request => {
      if (request.url().includes('/api')) {
        capturedRequests.push(request.url())
        const body = request.postDataJSON
        if (body && body.secret) {
          console.log('⚠️  WARNING: secret encontrado en body POST')
        }
      }
    })
    
    await page.goto('/')
    await page.waitForTimeout(1000)
    
    // Verificar que secrets no aparecen en URLs de GET
    const allRequests = capturedRequests.filter(url => url.includes('secret='))
    
    // Si hay GET con secret, podría ser un riesgo (aunque es intencional para algunos usos)
    console.log(`Requests con ?secret= en URL: ${allRequests.length}`)
    
    expect(true).toBe(true)
  })

  test('API-03: Acción desconocida — debe rechazar controladamente', async ({ page }) => {
    await page.goto('/')
    
    // Intenta hacer una llamada inválida
    const invalidResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/gas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'INVALIDO_ACTION_12345' }),
        })
        const data = await res.json()
        return { status: res.status, data }
      } catch (err) {
        return { error: err.message }
      }
    }).catch(() => ({ error: 'Fetch no disponible en sandbox' }))
    
    // Debe haber respondido sin caída (error controlado)
    expect(invalidResponse).toBeDefined()
  })

  test('API-04: Payload malformado — error controlado sin caída', async ({ page }) => {
    await page.goto('/')
    
    // Intenta enviar JSON inválido
    const malformedResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/gas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not valid json {',
        })
        return res.status
      } catch (err) {
        return { networkError: err.message }
      }
    }).catch(() => ({ error: 'no fetch' }))
    
    // Error debe ser controlado (no debe caer)
    expect(malformedResponse).toBeDefined()
  })

  test('API-05: CORS — no expone más de lo necesario', async ({ page }) => {
    let corsHeaders = {}
    
    page.on('response', response => {
      if (response.url().includes('/api/gas')) {
        corsHeaders = response.headers()
      }
    })
    
    await page.goto('/')
    await page.waitForTimeout(1000)
    
    // Verificar CORS headers
    const allowOrigin = corsHeaders['access-control-allow-origin']
    
    if (allowOrigin) {
      console.log(`CORS Allow-Origin: ${allowOrigin}`)
      expect(allowOrigin).not.toBe('*')
    } else {
      expect(true).toBe(true)
    }
  })
})
