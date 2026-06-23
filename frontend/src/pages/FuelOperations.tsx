import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { Tower, Telemetry, Alert } from '../types'
import {
  Flame,
  Activity,
  AlertTriangle,
  Calendar,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'

// Recharts
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function FuelOperations() {
  const [towers, setTowers] = useState<Tower[]>([])
  const [selectedTowerId, setSelectedTowerId] = useState<string>('')
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
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

  // 2. Fetch telemetry and alerts for selected tower
  const fetchFuelData = async () => {
    if (!selectedTowerId) return
    setIsLoading(true)
    try {
      const [telemetryData, alertsData] = await Promise.all([
        api.get(`/api/towers/${selectedTowerId}/telemetry?range=7d`),
        api.get(`/api/alerts?towerId=${selectedTowerId}`)
      ])
      setTelemetry(telemetryData)
      setAlerts(alertsData)
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load fuel data:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFuelData()
  }, [selectedTowerId])

  // 3. Socket.io Real-time update binding
  useEffect(() => {
    const socket = getSocket()

    const handleTelemetry = (data: any) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      setTelemetry(prev => [...prev.slice(1), data])
    }

    const handleAlert = (data: Alert) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      setAlerts(prev => [data, ...prev])
    }

    socket.on('telemetry:update', handleTelemetry)
    socket.on('alert:new', handleAlert)

    return () => {
      socket.off('telemetry:update', handleTelemetry)
      socket.off('alert:new', handleAlert)
    }
  }, [])

  const currentTower = towers.find(t => t.id === selectedTowerId)
  const latestReading = telemetry[telemetry.length - 1]

  // Fuel capacity and ETA calculations
  const fuelCapacityLiters = 1200
  const currentFuelPct = latestReading?.fuelLevel ?? (currentTower?.fuelLevel ?? 0)
  const currentFuelLiters = Math.round((currentFuelPct / 100) * fuelCapacityLiters)

  const generatorHoursPerDay = telemetry.filter(t => t.generatorRunning).length * (2 / 7)
  const dailyFuelConsumption = generatorHoursPerDay * 2.0 // 2L/hr consumption
  const daysRemaining = dailyFuelConsumption > 0 
    ? Math.floor(currentFuelLiters / dailyFuelConsumption) 
    : 99.9

  // Anomaly checks
  const theftAlerts = alerts.filter(a => a.type === 'FUEL_THEFT')
  const activeTheftAlert = theftAlerts.find(a => !a.isAcknowledged)
  
  const riskScore = activeTheftAlert ? 98 : (currentFuelPct < 20 ? 45 : 12)
  const riskStatus = riskScore > 75 ? 'CRITICAL_PROTOCOL' : (riskScore > 30 ? 'ELEVATED' : 'NOMINAL')

  // Generator calculations
  const totalGeneratorRuns = telemetry.filter(t => t.generatorRunning).length
  const generatorHealth = currentFuelPct < 10.0 ? 82 : 96

  // Chart data
  const chartData = telemetry.map(t => {
    const date = new Date(t.timestamp)
    return {
      time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      Level: t.fuelLevel
    }
  })

  // Refuel calculations
  const litersNeeded = fuelCapacityLiters - currentFuelLiters
  const costEstimateZMW = litersNeeded * 26.50 // K26.50 per Liter diesel

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
            <span style={styles.badgeLabel}>Asset State:</span>
            <StatusBadge status={currentTower.status} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>DECRYPTING FUEL INVENTORY MATRIX...</h3>
        </div>
      ) : (
        <div style={styles.splitLayout}>
          
          {/* LEFT COLUMN: CONSUMPTION TRENDS & STATS */}
          <div style={styles.leftCol}>
            
            <div style={styles.kpiGrid}>
              <KPICard
                title="Diesel Remaining"
                value={`${currentFuelPct}%`}
                unit={`/ ${currentFuelLiters} L`}
                icon={<Flame size={20} />}
                variant={currentFuelPct < 10 ? 'danger' : (currentFuelPct < 25 ? 'warning' : 'success')}
                subtext={`Total Tank Capacity: ${fuelCapacityLiters}L`}
              />
              <KPICard
                title="Est. Depletion ETA"
                value={daysRemaining > 90 ? 'Stable (Grid)' : `${daysRemaining} Days`}
                trend={{
                  value: `${generatorHoursPerDay.toFixed(1)} hrs/day`,
                  direction: generatorHoursPerDay > 0 ? 'down' : 'neutral',
                  label: 'Gen Use'
                }}
                icon={<Calendar size={20} />}
                variant={daysRemaining < 3 ? 'danger' : (daysRemaining < 7 ? 'warning' : 'primary')}
                subtext="Generator runtime consumption average"
              />
              <KPICard
                title="Refill Recommendation"
                value={`${litersNeeded} Liters`}
                trend={{ value: `Est. Cost: K${Math.round(costEstimateZMW).toLocaleString()}`, direction: 'neutral', label: 'ZMW' }}
                icon={<DollarSign size={20} />}
                variant={currentFuelPct < 25 ? 'warning' : 'primary'}
                subtext="Needed to reach 100% capacity"
              />
            </div>

            {/* Consumption Trend Line Chart */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Diesel Fuel Level Trend (7 Days)</h3>
                <span style={styles.cardTag} className="font-mono">Sensor Ingest</span>
              </div>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 15, bottom: 5 }}>
                    <XAxis dataKey="time" hide />
                    <YAxis unit="%" domain={[0, 100]} style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    <Area
                      type="monotone"
                      dataKey="Level"
                      name="Diesel Level"
                      stroke="var(--accent-info)"
                      fillOpacity={0.06}
                      fill="rgba(59,130,246,0.06)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Generator parameters */}
            <div className="card">
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--accent-primary)" />
                  <h3 style={styles.cardTitle}>Generator Operational Diagnostics</h3>
                </div>
              </div>

              <div style={styles.genMetricsGrid}>
                <div style={styles.genParamItem}>
                  <span style={styles.genParamLabel}>Starter Relay Health</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-success)' }}>{generatorHealth}% Optimal</span>
                </div>
                <div style={styles.genParamItem}>
                  <span style={styles.genParamLabel}>Start/Stop Frequency</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalGeneratorRuns} Ticks</span>
                </div>
                <div style={styles.genParamItem}>
                  <span style={styles.genParamLabel}>Next Scheduled Service</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-warning)' }}>42.5 Hrs</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: AI THEFT DETECTION & INVESTIGATION ACTIONS */}
          <div style={styles.rightCol}>
            
            {/* AI Fuel Theft Detection Risk */}
            <div className="card" style={{ borderLeft: riskScore > 75 ? '4px solid var(--accent-danger)' : '1px solid var(--border-subtle)' }}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="var(--accent-primary)" />
                  <h3 style={styles.cardTitle}>AI Fuel Anomaly Detector</h3>
                </div>
                <span className="font-mono" style={{ ...styles.cardTag, backgroundColor: riskScore > 75 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: riskScore > 75 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                  {riskStatus}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>THEFT PROBABILITY RISK</span>
                <span style={{ fontSize: '38px', fontWeight: 900, color: riskScore > 75 ? 'var(--accent-danger)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {riskScore}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>CONFIDENCE LEVEL: {activeTheftAlert ? 'HIGH (98%)' : 'NOMINAL'}</span>
              </div>

              {/* Anomaly triggers listing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={styles.investigationTitle}>Active Anomaly Warnings</h4>
                {theftAlerts.length === 0 ? (
                  <div style={styles.anomalyClear}>
                    <ShieldCheck size={20} color="var(--accent-success)" />
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Uplink stable. No anomalies detected.</span>
                  </div>
                ) : (
                  theftAlerts.map(alert => (
                    <div key={alert.id} style={{ ...styles.anomalyItem, opacity: alert.isAcknowledged ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 'bold', color: 'var(--accent-danger)' }}>
                        <span>⚠️ RAPID DECOMPRESSION DROP</span>
                        <span className="font-mono">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Investigation Recommendations checklist */}
            <div className="card">
              <h3 style={styles.cardTitle}>Guided Investigation Guidelines</h3>
              <div style={styles.guidelinesList}>
                <div style={styles.guidelineItem}>
                  <div style={styles.guidelineNum}>1</div>
                  <div style={styles.guidelineText}>
                    <b>Check CCTV Playback</b>
                    <span>Verify gate surveillance loops (SURV-CAM-01/02) for vehicle swiping or unauthorized night entries during the drop tick.</span>
                  </div>
                </div>

                <div style={styles.guidelineItem}>
                  <div style={styles.guidelineNum}>2</div>
                  <div style={styles.guidelineText}>
                    <b>Correlate Generator State</b>
                    <span>Ensure the generator starter relay did NOT turn on. Standard consumption is 2L/hr; drops &gt; 10L point to manual drainage.</span>
                  </div>
                </div>

                <div style={styles.guidelineItem}>
                  <div style={styles.guidelineNum}>3</div>
                  <div style={styles.guidelineText}>
                    <b>Dispatch Local Patrol</b>
                    <span>Deploy coordinate team or field engineer to lock enclosure gate locks and check fuel level sensor valves.</span>
                  </div>
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  chartWrapper: {
    height: '180px',
    width: '100%'
  },
  genMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginTop: '12px'
  },
  genParamItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: 'var(--bg-primary)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  genParamLabel: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  investigationTitle: {
    fontSize: '11.5px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px dashed var(--border-subtle)',
    paddingBottom: '4px'
  },
  anomalyClear: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 0'
  },
  anomalyItem: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    borderLeft: '4px solid var(--accent-danger)'
  },
  guidelinesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px'
  },
  guidelineItem: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start'
  },
  guidelineNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(37,99,235,0.1)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    border: '1px solid rgba(37,99,235,0.2)'
  },
  guidelineText: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12.5px',
    lineHeight: 1.4
  }
}
