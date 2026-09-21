import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { ExercicesController } from "./controller/index.ts"

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/scalar'

app.use(express.json())

app.get('/api/v1', (_req, res) => {
  res.json({ status: 'ok', message: 'API Scalar (Backend)' })
})

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/v1/exercices', new ExercicesController().buildRouter())

async function demarrer() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI)
      console.log('Connecté à MongoDB avec succès')
    }
  } catch (err) {
    console.error('Connexion MongoDB échouée:', err)
  }

  if (process.env.NODE_ENV === 'production') {
    app.listen(PORT, () => {
      console.log(`Backend Express en écoute sur http://0.0.0.0:${PORT}`)
    })
  }
}

demarrer()

export const viteNodeApp = app
