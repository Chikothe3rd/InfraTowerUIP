import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
    role: 'ADMIN' | 'OPERATOR'
  }
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Access token missing' })
  }

  const token = authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Malformed authorization header' })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string
      username: string
      role: 'ADMIN' | 'OPERATOR'
    }
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export function authorizeRoles(...allowedRoles: ('ADMIN' | 'OPERATOR')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' })
    }

    next()
  }
}
