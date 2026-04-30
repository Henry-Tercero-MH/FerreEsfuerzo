import handler from '../api/gas.js'

function makeRes() {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { this.headers[k] = v },
    status(code) { this.statusCode = code; return this },
    json(obj) { console.log('<< JSON RESPONSE', JSON.stringify(obj, null, 2)); return obj },
    end() { console.log('<< END'); }
  }
  return res
}

async function runTest({ method = 'POST', body = {}, env = {} } = {}) {
  // Apply env
  const prevEnv = { ...process.env }
  Object.assign(process.env, env)

  // Mock fetch to capture forwarded url/body
  globalThis.fetch = async (url, opts = {}) => {
    return {
      ok: true,
      json: async () => ({ forwarded: { url, opts } }),
    }
  }

  const req = { method, body }
  const res = makeRes()
  try {
    console.log('\n-- Running test:', method, 'env.API_SECRET=', process.env.API_SECRET || '(none)')
    await handler(req, res)
  } catch (err) {
    console.error('handler threw', err)
  }

  // restore env
  process.env = prevEnv
}

async function main() {
  await runTest({ method: 'POST', body: { action: 'insert', foo: 'bar' }, env: { VITE_APPS_SCRIPT_URL: 'https://example.com/gas' } })
  await runTest({ method: 'POST', body: { action: 'insert', foo: 'bar' }, env: { VITE_APPS_SCRIPT_URL: 'https://example.com/gas', API_SECRET: 'supersecret' } })
  await runTest({ method: 'GET', env: { VITE_APPS_SCRIPT_URL: 'https://example.com/gas' } })
  await runTest({ method: 'GET', env: { VITE_APPS_SCRIPT_URL: 'https://example.com/gas', API_SECRET: 'supersecret' } })
}

main().catch(err => { console.error(err); process.exit(1) })
