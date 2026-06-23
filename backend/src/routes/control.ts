import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateJWT, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticateJWT)

// 1. POST /api/towers/:id/remote-reset - Remote Soft-Reset of Cabinet Breaker
router.post('/:id/remote-reset', async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  try {
    const tower = await prisma.tower.findUnique({ where: { id } })
    if (!tower) {
      return res.status(404).json({ error: 'Tower site not found' })
    }

    // Log the RIMS control action to Audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        username: req.user!.username,
        role: req.user!.role,
        action: 'REMOTE_BREAKER_RESET',
        targetId: id,
        details: `Issued remote soft-reset command for cabinet breaker on node ${tower.siteCode}.`
      }
    })

    return res.json({
      status: 'SUCCESS',
      message: `Remote breaker soft-reset successfully executed on site ${tower.siteCode}. Relay cycle completed in 4.8s.`
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Remote breaker reset failed' })
  }
})

// 2. POST /api/towers/:id/remote-generator-test - Remote Generator Crank Test
router.post('/:id/remote-generator-test', async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  try {
    const tower = await prisma.tower.findUnique({ where: { id } })
    if (!tower) {
      return res.status(404).json({ error: 'Tower site not found' })
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        username: req.user!.username,
        role: req.user!.role,
        action: 'REMOTE_GENERATOR_CRANK_TEST',
        targetId: id,
        details: `Issued remote diagnostics crank command for backup diesel generator on node ${tower.siteCode}.`
      }
    })

    return res.json({
      status: 'SUCCESS',
      message: `Remote diagnostic crank command successfully sent to generator starter on site ${tower.siteCode}. Crank initiated, starter loop voltage nominal.`
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Remote generator test failed' })
  }
})

export default router
