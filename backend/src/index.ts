import express, { Request, Response, NextFunction } from 'express'
import http from 'http'
import cors from 'cors'
import { config } from './config'
import { initWebSocket } from './services/websocket'

// Import routers
import authRouter from './routes/auth'
import towersRouter from './routes/towers'
import alertsRouter from './routes/alerts'
import commercialRouter from './routes/commercial'
import reportsRouter from './routes/reports'
import aiRouter from './routes/ai'
import controlRouter from './routes/control'
import { startTelemetrySimulator } from './services/simulator'
import { startIntelligenceService } from './services/intelligence'

const app = express()
const server = http.createServer(app)

// Initialize Socket.io
initWebSocket(server)

// Middlewares
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date(), env: config.nodeEnv })
})

// Mount routers
app.use('/api/auth', authRouter)
app.use('/api/towers', towersRouter)
app.use('/api/towers', controlRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/commercial', commercialRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/ai', aiRouter)

// Direct Admin Audit Log endpoint
import { PrismaClient } from '@prisma/client'
import { authenticateJWT, authorizeRoles } from './middleware/auth'
const prismaInstance = new PrismaClient()

app.get('/api/audit-log', authenticateJWT, authorizeRoles('ADMIN'), async (req: any, res: Response) => {
  try {
    const logs = await prismaInstance.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // limit to latest 100 events
    })
    return res.json(logs)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch audit log' })
  }
})

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

// Start server
server.listen(config.port, () => {
  console.log(`========================================`)
  console.log(`InfraTowerUIP Backend running`)
  console.log(`Port: ${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
  console.log(`========================================`)
  
  // Start telemetry simulator
  startTelemetrySimulator()

  // Start intelligence service disabled for V2 (delegated to Python intelligence container)
  // startIntelligenceService()
})

export { app, server }
