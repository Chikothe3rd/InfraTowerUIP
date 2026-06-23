export type TowerStatus = 'ONLINE' | 'WARNING' | 'CRITICAL' | 'OFFLINE'
export type PowerSource = 'GRID' | 'SOLAR' | 'GENERATOR'

export type AlertType =
  | 'INTRUSION'
  | 'UNAUTHORIZED_ACCESS'
  | 'FUEL_THEFT'
  | 'LOW_FUEL'
  | 'TEMP_HIGH'
  | 'EQUIPMENT_FAIL'
  | 'POWER_SWITCH'
  | 'SLA_BREACH'
  | 'SMOKE'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Tenant {
  id: string
  towerId: string
  clientName: string
  monthlyRevenue: number
  contractStart: string
  contractEnd: string
  isActive: boolean
}

export interface Telemetry {
  id: string
  towerId: string
  timestamp: string
  gridPower: number
  solarPower: number
  generatorPower: number
  fuelLevel: number
  ambientTemp: number
  equipmentTemp: number
  humidity: number
  doorStatus: boolean
  smokeDetected: boolean
  generatorRunning: boolean
  motionDetected: boolean
  batterySoH: number
}

export interface Alert {
  id: string
  towerId: string
  type: AlertType
  severity: Severity
  message: string
  isAcknowledged: boolean
  acknowledgedBy?: string | null
  acknowledgedAt?: string | null
  dispatchStatus?: 'PENDING' | 'DISPATCHED' | 'RESOLVED'
  dispatchedTechnician?: string | null
  dispatchedAt?: string | null
  resolvedAt?: string | null
  resolutionNotes?: string | null
  createdAt: string
  tower?: {
    siteCode: string
    name: string
  }
}

export interface Tower {
  id: string
  name: string
  siteCode: string
  latitude: number
  longitude: number
  region: string
  status: TowerStatus
  powerSource: PowerSource
  fuelLevel: number
  upSince: string
  createdAt: string
  tenantCount?: number
  tenants?: Tenant[]
  latestTelemetry?: Telemetry | null
}

export interface User {
  userId: string
  username: string
  role: 'ADMIN' | 'OPERATOR'
}

export interface AuditLog {
  id: string
  userId: string
  username: string
  role: string
  action: string
  targetId?: string | null
  details?: string | null
  createdAt: string
}
