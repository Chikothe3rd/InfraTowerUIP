import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { Tower, Telemetry } from '../types'
import {
  Thermometer,
  ShieldCheck,
  Flame,
  Activity,
  AlertTriangle,
  Cpu,
  Compass,
  Zap,
  TrendingDown
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'
import GaugeChart from '../components/GaugeChart'

export default function SensorOperations() {
  const [towers, setTowers] = useState<Tower[]>([])
  const [selectedTowerId, setSelectedTowerId] = useState<string>('')
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const selectedTowerIdRef = useRef(selectedTowerId)
  useEffect(() => {
    selectedTowerIdRef.current = selectedTowerId
  }, [selectedTowerId])

  // 1. Fetch towers list
  useEffect(() => {
    async function loadTowers() {
      try {
        const data = await api.get('/api/towers')
        setTowers(data)
        if (data.length > 0) {
          const defaultSite = data.find((t: Tower) => t.siteCode === 'LUS-WOOD-02') || data[0]
          setSelectedTowerId(defaultSite.id)
        }
      } catch (err) {
        console.error('Failed to load towers list:', err)
      }
    }
    loadTowers()
  }, [])

  // 2. Fetch telemetry for selected tower
  const fetchSensorData = async () => {
    if (!selectedTowerId) return
    setIsLoading(true)
    try {
      const telemetryData = await api.get(`/api/towers/${selectedTowerId}/telemetry?range=7d`)
      setTelemetry(telemetryData)
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load sensor data:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSensorData()
  }, [selectedTowerId])

  // 3. Socket.io Real-time update binding
  useEffect(() => {
    const socket = getSocket()

    const handleTelemetry = (data: any) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      setTelemetry(prev => [...prev.slice(1), data])
    }

    socket.on('telemetry:update', handleTelemetry)

    return () => {
      socket.off('telemetry:update', handleTelemetry)
    }
  }, [])

  const currentTower = towers.find(t => t.id === selectedTowerId)
  const latestReading = telemetry[telemetry.length - 1]

  // Environmental parameters
  const enclosureTemp = latestReading?.equipmentTemp ?? 0
  const ambientTemp = latestReading?.ambientTemp ?? 0
  const humidity = latestReading?.humidity ?? 0
  const doorOpen = latestReading?.doorStatus ?? false
  const smokeActive = latestReading?.smokeDetected ?? false

  // Diagnostics calculations
  const healthScore = enclosureTemp > 45 ? 78 : (enclosureTemp > 38 ? 90 : 98)
  const wearFactor = enclosureTemp > 45 ? 42 : 12
  const expectedLifespan = enclosureTemp > 45 ? '3.2 Years' : '7.5 Years'

  // Server rack configuration slots (U1 - U8)
  const serverRacks = [
    { u: 'U8', name: 'NOC Primary Fiber Transceiver', temp: enclosureTemp - 2, load: '45%' },
    { u: 'U7', name: 'Microwave Backhaul Hub Relay', temp: enclosureTemp + 1, load: '82%' },
    { u: 'U6', name: 'Zambian Grid Power Infeed Meter', temp: enclosureTemp - 4, load: '12%' },
    { u: 'U5', name: 'Solar Controller Switch Link', temp: enclosureTemp - 1, load: '64%' },
    { u: 'U4', name: 'AI Edge Anomaly Processing Box', temp: enclosureTemp + 3, load: '75%' },
    { u: 'U3', name: 'NOC Security DVR Video Processor', temp: enclosureTemp + 2, load: '58%' },
    { u: 'U2', name: 'Emergency Backup Battery Inverter', temp: enclosureTemp - 3, load: '22%' },
    { u: 'U1', name: 'Cooling Unit Compressor Controller', temp: enclosureTemp - 2, load: '40%' }
  ]

  return (
    <div className="page-container">
      {/* Site Selector control bar */}
      <div style={styles.controlBar} className="card no-print">
        <div style={styles.selectorGroup}>
          <label style={styles.selectorLabel}>Select Monitoring Site:</label>
          <select
            value={selectedTowerId}
            onChange={(e) => setSelectedTowerId(e.target.value)}
            style={styles.selector}
          >
            {towers.map(t => (
              <option key={t.id} value={t.id}>
                {t.siteCode} — {t.name} ({t.region})
              </option>
            ))}
          </select>
        </div>

        {currentTower && (
          <div style={styles.siteOverviewBadge}>
            <span style={styles.badgeLabel}>Asset Health State:</span>
            <StatusBadge status={currentTower.status} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>CALCULATING environmental MATRIX...</h3>
        </div>
      ) : (
        <div style={styles.splitLayout}>
          
          {/* LEFT COLUMN: DIALS & CABINET LAYOUT */}
          <div style={styles.leftCol}>
            
            {/* Environmental Dials gauges */}
            <div className="card" style={styles.gaugesCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Real-time cabinet parameters</h3>
                <span style={styles.cardTag} className="font-mono">GAUGE READINGS</span>
              </div>
              
              <div style={styles.gaugesGrid}>
                <GaugeChart
                  title="Ambient Temp"
                  value={ambientTemp}
                  min={0}
                  max={50}
                  unit="°C"
                  alertThreshold={35}
                />
                <GaugeChart
                  title="Cabinet Temp"
                  value={enclosureTemp}
                  min={0}
                  max={75}
                  unit="°C"
                  alertThreshold={45}
                />
                <GaugeChart
                  title="Relative Humidity"
                  value={humidity}
                  unit="%"
                  alertThreshold={85}
                />
              </div>
            </div>

            {/* Cabinet Server Racks Layout (Visual Rack Schematic) */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Cabinet Enclosure Slot Diagnostics</h3>
                <span style={styles.cardTag} className="font-mono">8U Server Frame</span>
              </div>

              <div style={styles.rackCabinetContainer}>
                {serverRacks.map(rack => {
                  const isHot = rack.temp > 45
                  return (
                    <div key={rack.u} style={{
                      ...styles.rackRow,
                      borderLeftColor: isHot ? 'var(--accent-danger)' : 'var(--accent-success)'
                    }}>
                      <span className="font-mono" style={{ ...styles.rackUnit, color: isHot ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{rack.u}</span>
                      <div style={styles.rackDetails}>
                        <span style={styles.rackName}>{rack.name}</span>
                        <div style={styles.rackSubtext}>
                          <span>Temp: <b className="font-mono">{rack.temp.toFixed(1)}°C</b></span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Cpu Load: <b className="font-mono">{rack.load}</b></span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: isHot ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {isHot ? '⚠️ EXHALT' : '🟢 NORMAL'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: FIRE ALARMS & LIFE DIAGNOSTICS */}
          <div style={styles.rightCol}>
            
            {/* Alarm loop status grid */}
            <div style={styles.kpiGrid}>
              <KPICard
                title="Cabinet Health Score"
                value={`${healthScore}%`}
                icon={<Cpu size={18} />}
                variant={healthScore > 90 ? 'success' : 'warning'}
                subtext="Calculated from enclosure heat loads"
              />
              <KPICard
                title="Fire Loop Status"
                value={smokeActive ? 'ALARM' : 'SECURE'}
                icon={<Flame size={18} />}
                variant={smokeActive ? 'danger' : 'primary'}
                subtext={smokeActive ? '🔥 Particulates detected!' : '🟢 Smoke sensors clear'}
              />
            </div>

            {/* Smart Sensors Loop States */}
            <div className="card">
              <h3 style={styles.cardTitle}>Smart Sensor Loop States</h3>
              <div style={styles.sensorStatesList}>
                <div style={styles.sensorStateItem}>
                  <Zap size={18} color="var(--accent-primary)" />
                  <div style={styles.sensorItemText}>
                    <span>Door Tamper Switch</span>
                    <b>{doorOpen ? '🔴 CABINET DOOR OPENED' : '🟢 DOOR LATCHED SECURE'}</b>
                  </div>
                </div>

                <div style={styles.sensorStateItem}>
                  <Compass size={18} color="var(--accent-info)" />
                  <div style={styles.sensorItemText}>
                    <span>Rack Vibration Sensor</span>
                    <b>🟢 ACCELEROMETER STABLE (0.01g)</b>
                  </div>
                </div>

                <div style={styles.sensorStateItem}>
                  <Activity size={18} color="var(--accent-success)" />
                  <div style={styles.sensorItemText}>
                    <span>Fan Cooler Exhaust RPM</span>
                    <b>🟢 RPM ACTIVE (3200 RPM)</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment diagnostic summary */}
            <div className="card">
              <h3 style={styles.cardTitle}>Predictive Failure Diagnostics</h3>
              <div style={styles.diagnosticGrid}>
                <div style={styles.diagItem}>
                  <span style={styles.diagLabel}>Expected Cabinet Lifespan</span>
                  <span style={styles.diagValue}>{expectedLifespan}</span>
                </div>
                <div style={styles.diagItem}>
                  <span style={styles.diagLabel}>Predictive Wear Factor</span>
                  <span style={{ ...styles.diagValue, color: wearFactor > 30 ? 'var(--accent-warning)' : 'inherit' }}>{wearFactor}% wear</span>
                </div>
                <div style={styles.diagItem}>
                  <span style={styles.diagLabel}>Failure Probability (30d)</span>
                  <span style={{ ...styles.diagValue, color: wearFactor > 30 ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 'bold' }}>
                    {wearFactor > 30 ? 'High Risk' : 'Low (1.5%)'}
                  </span>
                </div>
              </div>

              {/* Maintenance recommendation */}
              <div style={styles.recommendationAlert}>
                <AlertTriangle size={18} color="var(--accent-warning)" />
                <div style={styles.recText}>
                  <b>AI Maintenance Suggestion</b>
                  <span>
                    {enclosureTemp > 45 
                      ? 'Scheduler recommendation: Clean enclosure cooling ventilation grids and inspect fan starter coils immediately.'
                      : 'Air filter and loop parameters healthy. Schedule next general diagnostic sweep on next month patrol.'
                    }
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  selectorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexGrow: 1
  },
  selectorLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  selector: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    maxWidth: '360px',
    fontWeight: 'bold'
  },
  siteOverviewBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  badgeLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  splitLayout: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap'
  },
  leftCol: {
    flex: 1.3,
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  rightCol: {
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  gaugesCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  gaugesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '16px',
    width: '100%'
  },
  rackCabinetContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    backgroundColor: '#030810',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  rackRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    borderLeft: '4px solid var(--border-subtle)',
    justifyContent: 'space-between'
  },
  rackUnit: {
    fontSize: '11px',
    fontWeight: 'bold',
    width: '24px'
  },
  rackDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexGrow: 1,
    marginLeft: '12px'
  },
  rackName: {
    fontSize: '12.5px',
    color: 'var(--text-primary)',
    fontWeight: 'bold'
  },
  rackSubtext: {
    display: 'flex',
    fontSize: '11px',
    color: 'var(--text-secondary)'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardTag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  sensorStatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px'
  },
  sensorStateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)'
  },
  sensorItemText: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12.5px'
  },
  diagnosticGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    marginTop: '12px'
  },
  diagItem: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    alignItems: 'center'
  },
  diagLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  diagValue: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '4px'
  },
  recommendationAlert: {
    display: 'flex',
    gap: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '16px',
    alignItems: 'flex-start'
  },
  recText: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12px',
    color: 'var(--text-primary)',
    lineHeight: 1.4
  }
}
