import express from 'express'

const app = express()

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const port = 3001
app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', message: 'api listening', port }))
})
