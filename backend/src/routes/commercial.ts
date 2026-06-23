import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateJWT, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticateJWT)

// Fixed operational cost per tower site for margin calculation (in USD)
const OPERATIONAL_COST_PER_TOWER = 1800

// Helper to calculate SLA & revenue risk for towers
async function getTowerCommercialData() {
  const towers = await prisma.tower.findMany({
    include: {
      tenants: { where: { isActive: true } },
      telemetry: {
        select: { generatorRunning: true, gridPower: true, solarPower: true }
      }
    }
  })

  return towers.map((tower: any) => {
    // 1. Uptime calculation (from telemetry records)
    const telemetryCount = tower.telemetry.length
    let uptimeCount = 0

    if (telemetryCount > 0) {
      // Tower is "online" if there is grid power, solar power, or generator running
      uptimeCount = tower.telemetry.filter((t: any) =>
        t.gridPower > 0 || t.solarPower > 0 || t.generatorRunning
      ).length
    }

    const slaPercentage = telemetryCount > 0
      ? parseFloat(((uptimeCount / telemetryCount) * 100).toFixed(2))
      : 100.00

    // 2. Revenue calculation
    const monthlyRevenue = tower.tenants.reduce((sum: number, t: any) => sum + t.monthlyRevenue, 0)

    // 3. Tenancy capacity (assume max capacity is 5 operators per tower)
    const maxCapacity = 5
    const tenancyRatio = parseFloat((tower.tenants.length / maxCapacity * 5).toFixed(1)) // count

    // 4. SLA penalty risk (If SLA is below 99.5%, penalty is 10% of monthly revenue)
    const isSlaBreached = slaPercentage < 99.5
    const penaltyExposure = isSlaBreached ? parseFloat((monthlyRevenue * 0.1).toFixed(2)) : 0.0

    return {
      id: tower.id,
      name: tower.name,
      siteCode: tower.siteCode,
      region: tower.region,
      status: tower.status,
      tenantsCount: tower.tenants.length,
      tenants: tower.tenants.map((t: any) => t.clientName),
      tenancyRatio,
      monthlyRevenue,
      operationalCost: OPERATIONAL_COST_PER_TOWER,
      profit: parseFloat((monthlyRevenue - OPERATIONAL_COST_PER_TOWER).toFixed(2)),
      slaPercentage,
      isSlaBreached,
      penaltyExposure
    }
  })
}

// 1. GET /api/commercial/summary - Aggregate business KPIs
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const commercialData = await getTowerCommercialData()

    const totalRevenue = commercialData.reduce((sum: number, t: any) => sum + t.monthlyRevenue, 0)
    const totalCost = commercialData.reduce((sum: number, t: any) => sum + t.operationalCost, 0)
    const totalProfit = totalRevenue - totalCost
    const totalTenants = commercialData.reduce((sum: number, t: any) => sum + t.tenantsCount, 0)
    const avgTenancyRatio = parseFloat((commercialData.reduce((sum: number, t: any) => sum + t.tenancyRatio, 0) / commercialData.length).toFixed(2))

    const breachingTowers = commercialData.filter((t: any) => t.isSlaBreached)
    const totalSlaPenaltyExposure = breachingTowers.reduce((sum: number, t: any) => sum + t.penaltyExposure, 0)
    const underutilizedSites = commercialData.filter((t: any) => t.tenantsCount < 2).length

    return res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOperationalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalActiveTenants: totalTenants,
      averageTenancyRatio: avgTenancyRatio,
      underutilizedSites,
      slaPenaltyExposure: parseFloat(totalSlaPenaltyExposure.toFixed(2)),
      breachingTowersCount: breachingTowers.length
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to aggregate commercial data' })
  }
})

// 2. GET /api/commercial/towers - Rank towers by revenue/utilization
router.get('/towers', async (req: AuthRequest, res: Response) => {
  try {
    const commercialData = await getTowerCommercialData()
    // Sort by revenue descending (highest commercial value first)
    commercialData.sort((a: any, b: any) => b.monthlyRevenue - a.monthlyRevenue)
    return res.json(commercialData)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve commercial rankings' })
  }
})

export default router
