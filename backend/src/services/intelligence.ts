import { PrismaClient, AlertType, Severity } from '@prisma/client'
import { broadcastNewAlert } from './websocket'

const prisma = new PrismaClient()

async function sendAlert(towerId: string, type: AlertType, severity: Severity, message: string) {
  try {
    const tower = await prisma.tower.findUnique({ where: { id: towerId } })
    if (!tower) {
      console.error(`[INTELLIGENCE ERROR] Tower ${towerId} not found`)
      return
    }

    // Create the alert in DB
    const alert = await prisma.alert.create({
      data: {
        towerId,
        type,
        severity,
        message,
        isAcknowledged: false
      },
      include: {
        tower: {
          select: { siteCode: true, name: true }
        }
      }
    })

    // Update tower status to WARNING or CRITICAL depending on severity
    let targetStatus = tower.status
    if (severity === 'CRITICAL' && tower.status !== 'OFFLINE') {
      targetStatus = 'CRITICAL'
    } else if (severity === 'HIGH' && tower.status !== 'OFFLINE' && tower.status !== 'CRITICAL') {
      targetStatus = 'CRITICAL'
    } else if (severity === 'MEDIUM' && tower.status === 'ONLINE') {
      targetStatus = 'WARNING'
    }

    if (targetStatus !== tower.status) {
      await prisma.tower.update({
        where: { id: towerId },
        data: { status: targetStatus }
      })
    }

    // Broadcast WebSocket event so the client screens update instantly
    broadcastNewAlert(alert)
    console.log(`[INTELLIGENCE SUCCESS] Posted alert to backend: ${type} on site ${tower.siteCode}`)
  } catch (err: any) {
    console.error(`[INTELLIGENCE EXCEPTION] Failed to dispatch alert:`, err)
  }
}

export async function checkFuelTheftAndTemp() {
  try {
    // 1. Fetch active towers
    const towers = await prisma.tower.findMany({
      select: { id: true, siteCode: true, name: true }
    })

    for (const tower of towers) {
      // 2. Get latest telemetry rows for this tower (ordered by timestamp desc)
      const telemetryRows = await prisma.telemetry.findMany({
        where: { towerId: tower.id },
        orderBy: { timestamp: 'desc' },
        take: 5
      })

      if (telemetryRows.length < 2) {
        continue
      }

      const latest = telemetryRows[0]
      const previous = telemetryRows[1]

      // Extract values
      const latFuel = latest.fuelLevel
      const prevFuel = previous.fuelLevel
      const latTemp = latest.equipmentTemp
      const prevTemp = previous.equipmentTemp
      const latGenRunning = latest.generatorRunning

      // ----------------------------------------------------
      // RULE 1: FUEL THEFT DETECTION
      // If fuel drops > 8% between ticks AND generator is OFF
      // ----------------------------------------------------
      if (latFuel < prevFuel - 8.0 && !latGenRunning) {
        // Check if we already have an active fuel theft alert for this tower to avoid spamming
        const activeTheftAlert = await prisma.alert.findFirst({
          where: {
            towerId: tower.id,
            type: 'FUEL_THEFT',
            isAcknowledged: false
          }
        })

        if (!activeTheftAlert) {
          const litersLost = Math.floor((prevFuel - latFuel) * 12.0) // 1200L total capacity, so 1% = 12L
          const costImpact = litersLost * 26.50 // Assume K26.50 per liter diesel in Zambia (ZMW)

          const msg = `Fuel Theft Alert: Anomalous drop of ${(prevFuel - latFuel).toFixed(1)}% (${litersLost}L) detected in diesel reserves on site ${tower.siteCode} while generator is offline. Est. liability: K${costImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZMW. Tamper sensor triggered.`

          await sendAlert(tower.id, 'FUEL_THEFT', 'CRITICAL', msg)
        }
      }

      // ----------------------------------------------------
      // RULE 2: TEMPERATURE ANOMALY
      // Cabinet temperature > 48°C AND increased by > 8°C
      // ----------------------------------------------------
      if (latTemp >= 48.0 && latTemp > prevTemp + 8.0) {
        const activeTempAlert = await prisma.alert.findFirst({
          where: {
            towerId: tower.id,
            type: 'TEMP_HIGH',
            isAcknowledged: false
          }
        })

        if (!activeTempAlert) {
          const msg = `Thermal Anomaly: Equipment enclosure temperature at ${latTemp.toFixed(1)}°C (up from ${prevTemp.toFixed(1)}°C on site ${tower.siteCode}). Cooling unit efficiency degraded. Schedule maintenance check.`
          await sendAlert(tower.id, 'TEMP_HIGH', 'HIGH', msg)
        }
      }
    }
  } catch (err: any) {
    console.error(`[ANOMALY ERROR] Anomaly check failed:`, err)
  }
}

export async function checkPredictiveIndicators() {
  try {
    const towers = await prisma.tower.findMany({
      select: { id: true, siteCode: true }
    })

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    for (const tower of towers) {
      // ----------------------------------------------------
      // PREDICTIVE RULE 1: POWER SWITCHING STRESS
      // Count changes in active power source over last 12 hours
      // ----------------------------------------------------
      const telemetry12h = await prisma.telemetry.findMany({
        where: {
          towerId: tower.id,
          timestamp: { gte: twelveHoursAgo }
        },
        orderBy: { timestamp: 'asc' }
      })

      if (telemetry12h.length > 5) {
        let switches = 0
        let lastSource = ''
        for (const row of telemetry12h) {
          let source = 'GRID'
          if (row.generatorRunning) {
            source = 'GENERATOR'
          } else if (row.solarPower > row.gridPower && row.solarPower > 0) {
            source = 'SOLAR'
          }

          if (lastSource && source !== lastSource) {
            switches++
          }
          lastSource = source
        }

        if (switches > 5) {
          const activeSwitchAlert = await prisma.alert.findFirst({
            where: {
              towerId: tower.id,
              type: 'EQUIPMENT_FAIL',
              message: { contains: 'Switching Stress' },
              isAcknowledged: false
            }
          })

          if (!activeSwitchAlert) {
            const msg = `Predictive Maintenance: High power switching stress detected on site ${tower.siteCode} (${switches} source switches in 12h). Increased relay mechanical wear. Investigate grid stability.`
            await sendAlert(tower.id, 'EQUIPMENT_FAIL', 'MEDIUM', msg)
          }
        }
      }

      // ----------------------------------------------------
      // PREDICTIVE RULE 2: CONTINUOUS GENERATOR RUNTIME
      // Check if generator is active in all latest telemetry logs
      // ----------------------------------------------------
      const latest5 = await prisma.telemetry.findMany({
        where: { towerId: tower.id },
        orderBy: { timestamp: 'desc' },
        take: 5
      })

      if (latest5.length >= 5 && latest5.every(row => row.generatorRunning)) {
        const activeRunAlert = await prisma.alert.findFirst({
          where: {
            towerId: tower.id,
            type: 'EQUIPMENT_FAIL',
            message: { contains: 'generator runtime' },
            isAcknowledged: false
          }
        })

        if (!activeRunAlert) {
          const msg = `Generator Overrun Warning: Generator on site ${tower.siteCode} has been running continuously. High fuel draw active. Inspect grid restoration.`
          await sendAlert(tower.id, 'EQUIPMENT_FAIL', 'MEDIUM', msg)
        }
      }

      // ----------------------------------------------------
      // PREDICTIVE RULE 3: SOLAR/BATTERY EFFICIENCY DEGRADATION
      // Check if peak solar generation in last 24h was unusually low
      // ----------------------------------------------------
      const peakSolarAggregate = await prisma.telemetry.aggregate({
        where: {
          towerId: tower.id,
          timestamp: { gte: twentyFourHoursAgo }
        },
        _max: {
          solarPower: true
        },
        _count: {
          id: true
        }
      })

      const telemetryCount24h = peakSolarAggregate._count.id
      const peakSolar = peakSolarAggregate._max.solarPower

      // We check if peak is under 2.5kW, assuming we have at least 100 readings to avoid false positives on fresh starts
      // In the seed script, we generate ~84 records per tower (7 days * 12 records/day). 
      // 24 hours of data generated every 3 seconds in simulator gives high count.
      // If we are just starting, we might have fewer. Let's adjust the minimum count to 10 records for safety.
      if (telemetryCount24h > 10 && peakSolar !== null && peakSolar < 2.5) {
        const activeSolarAlert = await prisma.alert.findFirst({
          where: {
            towerId: tower.id,
            type: 'EQUIPMENT_FAIL',
            message: { contains: 'Solar efficiency' },
            isAcknowledged: false
          }
        })

        if (!activeSolarAlert) {
          const msg = `Predictive Maintenance: Solar efficiency degradation detected on site ${tower.siteCode}. Peak solar yield dropped below 2.5kW threshold. Schedule panel cleaning and battery cell inspection.`
          await sendAlert(tower.id, 'EQUIPMENT_FAIL', 'MEDIUM', msg)
        }
      }
    }
  } catch (err: any) {
    console.error(`[PREDICTIVE ERROR] Predictive check failed:`, err)
  }
}

export async function calculateRollingSla() {
  try {
    const towers = await prisma.tower.findMany({
      select: { id: true, siteCode: true }
    })

    for (const tower of towers) {
      // 1. Fetch total count of telemetry records
      const totalRecords = await prisma.telemetry.count({
        where: { towerId: tower.id }
      })

      if (totalRecords === 0) {
        continue
      }

      // 2. Fetch records where power status was active (uptime)
      const onlineRecords = await prisma.telemetry.count({
        where: {
          towerId: tower.id,
          OR: [
            { gridPower: { gt: 0 } },
            { solarPower: { gt: 0 } },
            { generatorRunning: true }
          ]
        }
      })

      const sla = (onlineRecords / totalRecords) * 100

      // 3. If SLA target breached, raise alert
      if (sla < 99.50) {
        const activeSlaAlert = await prisma.alert.findFirst({
          where: {
            towerId: tower.id,
            type: 'SLA_BREACH',
            isAcknowledged: false
          }
        })

        if (!activeSlaAlert) {
          const downtimePct = 100.0 - sla
          const msg = `SLA Compliance Breach: Rolling site availability has fallen to ${sla.toFixed(2)}% (target: 99.50%). Accumulated downtime: ${downtimePct.toFixed(2)}% of monitored timeframe. Est. commercial penalty liability initiated.`
          await sendAlert(tower.id, 'SLA_BREACH', 'HIGH', msg)
        }
      }
    }
  } catch (err: any) {
    console.error(`[SLA ERROR] SLA calculation failed:`, err)
  }
}

let anomalyInterval: NodeJS.Timeout | null = null
let predictiveInterval: NodeJS.Timeout | null = null
let slaInterval: NodeJS.Timeout | null = null

export function startIntelligenceService() {
  console.log('==================================================')
  console.log('InfraTowerUIP Intelligence Service Bootstrapped')
  console.log('Executing initial diagnostic sweeps...')
  console.log('==================================================')

  // Run immediate evaluations after a short delay (similar to python's 2-second sleep)
  setTimeout(async () => {
    await checkFuelTheftAndTemp()
    await checkPredictiveIndicators()
    await calculateRollingSla()
    console.log('Initial diagnostic sweeps completed. Scheduler running...')
  }, 2000)

  // 1. Check anomalies (thefts & thermal runs) every 30 seconds
  anomalyInterval = setInterval(checkFuelTheftAndTemp, 30 * 1000)

  // 2. Check predictive maintenance alerts every 60 seconds
  predictiveInterval = setInterval(checkPredictiveIndicators, 60 * 1000)

  // 3. Calculate rolling SLA percentages every 5 minutes
  slaInterval = setInterval(calculateRollingSla, 5 * 60 * 1000)
}

export function stopIntelligenceService() {
  if (anomalyInterval) clearInterval(anomalyInterval)
  if (predictiveInterval) clearInterval(predictiveInterval)
  if (slaInterval) clearInterval(slaInterval)
  console.log('TS Intelligence Service stopped.')
}
