import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import onboardingRouter from './routes/onboarding'
import signupRouter from './routes/signup'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// En dev on accepte toutes les origines localhost
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/signup', signupRouter)
app.use('/api/onboarding', onboardingRouter)

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable.' })
})

// Erreurs globales
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur.' })
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
