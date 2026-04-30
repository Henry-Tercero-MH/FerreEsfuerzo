import express from 'express'
import handler from '../api/gas.js'

const app = express()
app.use(express.json())

app.options('/api/gas', (req, res) => handler(req, res))
app.get('/api/gas', (req, res) => handler(req, res))
app.post('/api/gas', (req, res) => handler(req, res))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`API server listening on http://localhost:${port} (API_SECRET=${process.env.API_SECRET || '(none)'})`))
