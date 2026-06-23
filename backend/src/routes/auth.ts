import { Router, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { authenticateJWT, AuthRequest } from '../middleware/auth'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const MOCK_USERS = [
  { username: 'operator', password: 'infratel2026', role: 'OPERATOR', userId: 'operator-id-123' },
  { username: 'admin', password: 'infratel2026', role: 'ADMIN', userId: 'admin-id-456' }
]

router.post('/login', async (req: AuthRequest, res: Response) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const user = MOCK_USERS.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  )

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  // Sign JWT token
  const token = jwt.sign(
    { userId: user.userId, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  )

  // Log in Audit Trail
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        action: 'LOGIN',
        details: 'User authenticated successfully via mock RBAC login page.'
      }
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }

  return res.json({
    token,
    user: {
      userId: user.userId,
      username: user.username,
      role: user.role
    }
  })
})

router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user })
})

export default router
