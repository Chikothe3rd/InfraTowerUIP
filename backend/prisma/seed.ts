/// <reference path="../node_modules/@prisma/client/index.d.ts" />
import { PrismaClient, TowerStatus, PowerSource, AlertType, Severity } from '@prisma/client'
import * as process from 'process'


const prisma = new PrismaClient()

interface SiteConfig {
  siteCode: string
  name: string
  lat: number
  lng: number
  region: string
}

const LUSAKA_SITES: SiteConfig[] = [
  { siteCode: 'LUS-MAND-01', name: 'Manda Hill Commercial Exchange', lat: -15.3910, lng: 28.3120, region: 'Lusaka Central' },
  { siteCode: 'LUS-WOOD-02', name: 'Woodlands Retail Relay', lat: -15.4410, lng: 28.3280, region: 'Lusaka South-East' },
  { siteCode: 'LUS-KBLG-03', name: 'Kabwata Market Core', lat: -15.4350, lng: 28.2960, region: 'Lusaka South' },
  { siteCode: 'LUS-CHIB-04', name: 'Chibolya Industrial Tower', lat: -15.4280, lng: 28.2730, region: 'Lusaka West' },
  { siteCode: 'LUS-NMD-05', name: 'Northmead Residential Spine', lat: -15.3970, lng: 28.2990, region: 'Lusaka Central' },
  { siteCode: 'LUS-RHDP-06', name: 'Rhodes Park Clinic Hub', lat: -15.4080, lng: 28.3070, region: 'Lusaka Central' },
  { siteCode: 'LUS-OLYM-07', name: 'Olympia Park Extension', lat: -15.3850, lng: 28.3190, region: 'Lusaka North-East' },
  { siteCode: 'LUS-EMMS-08', name: 'Emmasdale Industrial Link', lat: -15.3780, lng: 28.2810, region: 'Lusaka North-West' },
  { siteCode: 'LUS-MATR-09', name: 'Matero Substation Tower', lat: -15.3680, lng: 28.2610, region: 'Lusaka North-West' },
  { siteCode: 'LUS-CHLN-10', name: 'Chilenje South Secondary', lat: -15.4520, lng: 28.3180, region: 'Lusaka South-East' },
  { siteCode: 'LUS-LIBL-11', name: 'Libala Stage II Relay', lat: -15.4420, lng: 28.3050, region: 'Lusaka South' },
  { siteCode: 'LUS-CHLS-12', name: 'Chelstone Hospital Base', lat: -15.3620, lng: 28.3750, region: 'Lusaka East' },
  { siteCode: 'LUS-AVON-13', name: 'Avondale West Exchange', lat: -15.3780, lng: 28.3610, region: 'Lusaka East' },
  { siteCode: 'LUS-IBEX-14', name: 'Ibex Hill Premium Mast', lat: -15.4210, lng: 28.3680, region: 'Lusaka East' },
  { siteCode: 'LUS-SALM-15', name: 'Salama Park Grid Link', lat: -15.3950, lng: 28.3650, region: 'Lusaka East' },
  { siteCode: 'LUS-KABL-16', name: 'Kabulonga Shopping Mast', lat: -15.4150, lng: 28.3410, region: 'Lusaka South-East' },
  { siteCode: 'LUS-SHOW-17', name: 'Showgrounds Exhibition Node', lat: -15.4020, lng: 28.3240, region: 'Lusaka Central' },
  { siteCode: 'LUS-FAIR-18', name: 'Fairview Hotel Gateway', lat: -15.4120, lng: 28.2910, region: 'Lusaka Central' },
  { siteCode: 'LUS-IND-19', name: 'Heavy Industrial Zone Alpha', lat: -15.3950, lng: 28.2580, region: 'Lusaka West' },
  { siteCode: 'LUS-LIL-20', name: 'Lilayi Police Training Relay', lat: -15.5120, lng: 28.2950, region: 'Lusaka Outer South' },
  { siteCode: 'LUS-MAK-21', name: 'Makeni Mall Core Tower', lat: -15.4650, lng: 28.2520, region: 'Lusaka Outer South' },
  { siteCode: 'LUS-KAFR-22', name: 'Kafue Road Transit Mast', lat: -15.4850, lng: 28.2720, region: 'Lusaka South' },
  { siteCode: 'LUS-GER-23', name: 'Great East Road Airport Node', lat: -15.3520, lng: 28.4350, region: 'Lusaka East' },
  { siteCode: 'LUS-CHNG-24', name: 'Chongwe Town Central', lat: -15.3290, lng: 28.6820, region: 'Lusaka Rural East' },
  { siteCode: 'LUS-KAFM-25', name: 'Kafue Bridge Gateway', lat: -15.7690, lng: 28.1820, region: 'Kafue District' },
]

const OPERATORS = ['MTN Zambia', 'Airtel Zambia', 'Zamtel', 'Vodafone Zambia']

async function main() {
  console.log('Seeding Database...')

  // Clear existing records
  await prisma.auditLog.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.telemetry.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.tower.deleteMany()

  const seedStartDate = new Date()
  seedStartDate.setDate(seedStartDate.getDate() - 7) // 7 days ago

  for (const site of LUSAKA_SITES) {
    // 1. Determine baseline tower parameters
    let status: TowerStatus = TowerStatus.ONLINE
    let fuelLevel = 85.0 + Math.random() * 15.0
    let powerSource: PowerSource = PowerSource.GRID

    // Induce specific statuses for a couple of towers for rich NOC visualization
    if (site.siteCode === 'LUS-WOOD-02') {
      status = TowerStatus.WARNING
      fuelLevel = 24.5 // low fuel warning
      powerSource = PowerSource.GENERATOR
    } else if (site.siteCode === 'LUS-CHIB-04') {
      status = TowerStatus.CRITICAL
      fuelLevel = 8.0 // critical fuel/security alert
      powerSource = PowerSource.GENERATOR
    } else if (site.siteCode === 'LUS-MATR-09') {
      status = TowerStatus.OFFLINE
      fuelLevel = 0.0
      powerSource = PowerSource.GRID
    }

    // Create Tower
    const tower = await prisma.tower.create({
      data: {
        name: site.name,
        siteCode: site.siteCode,
        latitude: site.lat,
        longitude: site.lng,
        region: site.region,
        status,
        powerSource,
        fuelLevel,
        upSince: new Date(Date.now() - (3 + Math.random() * 10) * 24 * 60 * 60 * 1000), // 3-13 days ago
      }
    })

    // 2. Add Tenants (1 to 4 tenants per tower)
    const numTenants = 1 + Math.floor(Math.random() * 3) // 1 to 3 tenants
    const selectedOps = [...OPERATORS].sort(() => 0.5 - Math.random()).slice(0, numTenants)

    for (const op of selectedOps) {
      await prisma.tenant.create({
        data: {
          towerId: tower.id,
          clientName: op,
          monthlyRevenue: 3500 + Math.floor(Math.random() * 3000), // 3500 - 6500 USD
          contractStart: new Date(2024, 0, 1),
          contractEnd: new Date(2027, 11, 31),
          isActive: true
        }
      })
    }

    // 3. Generate 7 Days Historical Telemetry (Every 2 Hours)
    const telemetryData = []
    let currentFuel = fuelLevel
    let currentPowerSource: PowerSource = powerSource

    for (let h = 0; h < 24 * 7; h += 2) {
      const timestamp = new Date(seedStartDate.getTime() + h * 60 * 60 * 1000)
      const hourOfDay = timestamp.getHours()

      // Solar curve (bell curve peaking at noon, 0 at night)
      let solarPower = 0
      if (hourOfDay >= 6 && hourOfDay <= 18) {
        // peak 5kW solar power
        solarPower = Math.sin(((hourOfDay - 6) / 12) * Math.PI) * (4.0 + Math.random() * 1.5)
      }

      // Grid availability: 95% chance grid is active. Some outages.
      // Let's make an outage happen for site 4 (Chibolya) during hour 48-60
      let gridActive = true
      if (site.siteCode === 'LUS-CHIB-04' && h >= 48 && h <= 62) {
        gridActive = false
      } else if (Math.random() < 0.04) {
        gridActive = false // random occasional outage
      }

      let gridPower = gridActive ? (6.0 + Math.random() * 2) : 0
      let generatorRunning = false
      let generatorPower = 0

      // If grid is off, generator runs to support load (if solar is low)
      if (!gridActive) {
        if (solarPower < 2.0) {
          generatorRunning = true
          generatorPower = 7.0 + Math.random() * 1.5
          currentPowerSource = PowerSource.GENERATOR
          currentFuel -= 0.8 // Fuel drops by 0.8% per 2 hours when generator runs
          if (currentFuel < 0) currentFuel = 0
        } else {
          currentPowerSource = PowerSource.SOLAR
        }
      } else {
        currentPowerSource = solarPower > 4.0 ? PowerSource.SOLAR : PowerSource.GRID
      }

      // Temperatures
      const ambientTemp = 18 + Math.sin(((hourOfDay - 8) / 24) * 2 * Math.PI) * 6 + Math.random() * 2 // 12 to 26 °C range
      const equipmentLoadTemp = (gridPower + solarPower + generatorPower) * 1.8
      const equipmentTemp = ambientTemp + equipmentLoadTemp + Math.random() * 2

      // Security check
      let doorStatus = false
      if (site.siteCode === 'LUS-WOOD-02' && h === 90) {
        doorStatus = true // a historical door open event
      }

      const motionDetected = Math.random() < 0.02 || (site.siteCode === 'LUS-CHIB-04' && hourOfDay === 0 && h === 56)
      const batterySoH = parseFloat((98.5 - (h / 168) * 1.5 + Math.sin(h / 10) * 0.4 - Math.random() * 0.2).toFixed(2))

      telemetryData.push({
        towerId: tower.id,
        timestamp,
        gridPower,
        solarPower,
        generatorPower,
        fuelLevel: parseFloat(currentFuel.toFixed(1)),
        ambientTemp: parseFloat(ambientTemp.toFixed(1)),
        equipmentTemp: parseFloat(equipmentTemp.toFixed(1)),
        humidity: parseFloat((50 + Math.sin((hourOfDay / 24) * 2 * Math.PI) * 15 + Math.random() * 5).toFixed(1)),
        doorStatus,
        smokeDetected: false,
        generatorRunning,
        motionDetected,
        batterySoH,
      })
    }

    await prisma.telemetry.createMany({
      data: telemetryData
    })

    // Update tower fuel to match the final telemetry reading
    await prisma.tower.update({
      where: { id: tower.id },
      data: {
        fuelLevel: parseFloat(currentFuel.toFixed(1)),
        powerSource: currentPowerSource,
      }
    })

    // 4. Create Seed Alerts (Active & Historical)
    if (site.siteCode === 'LUS-WOOD-02') {
      await prisma.alert.create({
        data: {
          towerId: tower.id,
          type: AlertType.FUEL_THEFT,
          severity: Severity.HIGH,
          message: 'Anomalous fuel level drop: 15% drop detected within 1 hour while generator is inactive.',
          isAcknowledged: false,
        }
      })
    }

    if (site.siteCode === 'LUS-CHIB-04') {
      await prisma.alert.create({
        data: {
          towerId: tower.id,
          type: AlertType.UNAUTHORIZED_ACCESS,
          severity: Severity.CRITICAL,
          message: 'Security Event: Perimeter door opened during restricted hours (23:45 CAT) with motion alert active.',
          isAcknowledged: false,
        }
      })
      await prisma.alert.create({
        data: {
          towerId: tower.id,
          type: AlertType.TEMP_HIGH,
          severity: Severity.MEDIUM,
          message: 'Thermal Threshold Breach: Equipment cabinet temperature at 52.3°C, cooling efficiency degraded.',
          isAcknowledged: true,
          acknowledgedBy: 'operator',
          acknowledgedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
        }
      })
    }
  }

  // Add system logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: 'admin-id',
        username: 'admin',
        role: 'ADMIN',
        action: 'SYSTEM_INITIALIZATION',
        details: 'System database successfully seeded with 25 Lusaka operational nodes and operators.',
      },
      {
        userId: 'operator-id',
        username: 'operator',
        role: 'OPERATOR',
        action: 'LOGIN',
        details: 'Operator session initiated from NOC Client (192.168.10.42)',
      }
    ]
  })

  // Add scheduled reports to the database
  // @ts-ignore
  await prisma.scheduledReport.createMany({
    data: [
      {
        recipient: 'noc-supervisors@infratel.co.zm',
        interval: 'WEEKLY',
        category: 'UPTIME',
        towerId: 'all',
        isActive: true,
      },
      {
        recipient: 'operations-manager@infratel.co.zm',
        interval: 'DAILY',
        category: 'SLA',
        towerId: 'all',
        isActive: true,
      }
    ]
  })

  console.log('Database Seed Successful.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
