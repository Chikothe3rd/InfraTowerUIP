import React, { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { Tower, Telemetry } from '../types'
import {
  Power,
  Sun,
  Activity,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Battery,
  Radio as TowerIcon
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'

// Recharts
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

export default function PowerOperations() {
  const [towers, setTowers] = useState<Tower[]>([])
  const [selectedTowerId, setSelectedTowerId] = useState<string>('')
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [switchLog, setSwitchLog] = useState<any[]>([])
  const [powerMetrics, setPowerMetrics] = useState<any>(null)
  const [executingAction, setExecutingAction] = useState<string | null>(null)

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
  const fetchPowerData = async () => {
    if (!selectedTowerId) return
    setIsLoading(true)
    try {
      const [telemetryData, timelineData, metricsData] = await Promise.all([
        api.get(`/api/towers/${selectedTowerId}/telemetry?range=7d`),
        api.get(`/api/towers/${selectedTowerId}/power-timeline`),
        api.get(`/api/reports/power-metrics?towerId=${selectedTowerId}`)
      ])
      setTelemetry(telemetryData)

      const formattedTimeline = (timelineData || []).map((s: any, idx: number) => {
        const dateObj = new Date(s.timestamp)
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' CAT'
        return {
          id: String(idx),
          time: timeStr,
          from: s.source === 'GENERATOR' ? 'GRID' : (s.source === 'SOLAR' ? 'GRID' : 'GENERATOR'),
          to: s.source,
          reason: s.source === 'GENERATOR' ? 'Substation outage detected' : (s.source === 'SOLAR' ? 'High solar peak irradiance > 4.5kW' : 'Grid supply restored'),
          duration: '6.2s'
        }
      })
      setSwitchLog(formattedTimeline.slice(-10).reverse())
      setPowerMetrics(metricsData)
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load power data:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPowerData()
  }, [selectedTowerId])

  const handleRemoteAction = async (actionType: 'reset' | 'gen-test') => {
    if (!selectedTowerId) return
    setExecutingAction(actionType)
    try {
      const endpoint = actionType === 'reset' ? 'remote-reset' : 'remote-generator-test'
      const response = await api.post(`/api/towers/${selectedTowerId}/${endpoint}`, {})
      alert(response.message)
      fetchPowerData()
    } catch (err) {
      console.error('Remote action failed:', err)
      alert('Remote action failed. Check audit logs.')
    } finally {
      setExecutingAction(null)
    }
  }

  // 3. Socket.io Real-time update binding
  useEffect(() => {
    const socket = getSocket()

    const handleTelemetry = (data: any) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      setTelemetry(prev => [...prev.slice(1), data])
    }

    const handlePowerSwitch = (data: any) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      
      // Update tower local power source
      setTowers(prev => prev.map(t => {
        if (t.id === data.towerId) {
          return { ...t, powerSource: data.to }
        }
        return t
      }))

      // Prepend to switch log
      setSwitchLog(prev => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' CAT',
          from: data.from,
          to: data.to,
          reason: data.to === 'GENERATOR' ? 'Grid voltage drop alert' : 'Optimal threshold switch',
          duration: '4.8s'
        },
        ...prev.slice(0, 9)
      ])
    }

    socket.on('telemetry:update', handleTelemetry)
    socket.on('power:switch', handlePowerSwitch)

    return () => {
      socket.off('telemetry:update', handleTelemetry)
      socket.off('power:switch', handlePowerSwitch)
    }
  }, [])

  const currentTower = towers.find(t => t.id === selectedTowerId)
  const latestTelemetry = telemetry[telemetry.length - 1]

  const activeSource = currentTower?.powerSource || 'GRID'

  // Calculations for KPI Cards
  const gridLoad = latestTelemetry?.gridPower || 0
  const solarGen = latestTelemetry?.solarPower || 0
  const genLoad = latestTelemetry?.generatorPower || 0

  // Chart data
  const chartData = telemetry.slice(-48).map(t => {
    const date = new Date(t.timestamp)
    return {
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      Grid: t.gridPower,
      Solar: t.solarPower,
      Generator: t.generatorPower
    }
  })

  // Power source contribution counts
  const sourceContribution = useMemo(() => {
    let gridCount = 0
    let solarCount = 0
    let genCount = 0
    telemetry.forEach(t => {
      if (t.generatorRunning) genCount++
      else if (t.solarPower > t.gridPower) solarCount++
      else gridCount++
    })
    const total = Math.max(1, telemetry.length)
    return [
      { name: 'Grid Power', value: Math.round((gridCount / total) * 100), color: '#3B82F6' },
      { name: 'Solar Energy', value: Math.round((solarCount / total) * 100), color: '#10B981' },
      { name: 'Gen Backup', value: Math.round((genCount / total) * 100), color: '#F59E0B' }
    ]
  }, [telemetry])

  return (
    <div className="page-container">
      {/* Site Selector control bar */}
      <div style={styles.controlBar} className="card no-print">
        <div style={styles.selectorGroup}>
          <label style={styles.selectorLabel}>Select Tower Station:</label>
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
            <span style={styles.badgeLabel}>Active Infeed:</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              color: currentTower.powerSource === 'GRID' ? '#3B82F6' : (currentTower.powerSource === 'SOLAR' ? '#10B981' : '#F59E0B'),
              backgroundColor: currentTower.powerSource === 'GRID' ? 'rgba(59, 130, 246, 0.1)' : (currentTower.powerSource === 'SOLAR' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
              padding: '4px 10px',
              borderRadius: '12px',
              border: `1px solid ${currentTower.powerSource === 'GRID' ? 'rgba(59, 130, 246, 0.3)' : (currentTower.powerSource === 'SOLAR' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`
            }}>
              {currentTower.powerSource}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>CALCULATING ENERGY telemetry MATRIX...</h3>
        </div>
      ) : (
        <div style={styles.splitLayout}>
          
          {/* LEFT: POWER SCHEMATIC & SWITCHING TIMELINE */}
          <div style={styles.leftCol}>
            
            {/* Automatic Source Switching Schematic (SVG flow graph) */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Automatic Switching Infeed Schematic</h3>
                <span style={styles.cardTag} className="font-mono">LIVE RELAY STATE</span>
              </div>

              {/* Central SVG diagram */}
              <div style={styles.schematicContainer}>
                <svg width="100%" height="220" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid path line */}
                  <path
                    d="M 120,50 L 300,110"
                    fill="none"
                    stroke={activeSource === 'GRID' ? '#3B82F6' : 'var(--border-subtle)'}
                    strokeWidth={activeSource === 'GRID' ? '4' : '2'}
                    className={activeSource === 'GRID' ? 'switching-path-glow' : ''}
                    style={{ strokeDasharray: activeSource === 'GRID' ? '8, 8' : 'none' }}
                  />
                  {/* Solar path line */}
                  <path
                    d="M 120,110 L 300,110"
                    fill="none"
                    stroke={activeSource === 'SOLAR' ? '#10B981' : 'var(--border-subtle)'}
                    strokeWidth={activeSource === 'SOLAR' ? '4' : '2'}
                    className={activeSource === 'SOLAR' ? 'switching-path-glow' : ''}
                    style={{ strokeDasharray: activeSource === 'SOLAR' ? '8, 8' : 'none' }}
                  />
                  {/* Generator path line */}
                  <path
                    d="M 120,170 L 300,110"
                    fill="none"
                    stroke={activeSource === 'GENERATOR' ? '#F59E0B' : 'var(--border-subtle)'}
                    strokeWidth={activeSource === 'GENERATOR' ? '4' : '2'}
                    className={activeSource === 'GENERATOR' ? 'switching-path-glow' : ''}
                    style={{ strokeDasharray: activeSource === 'GENERATOR' ? '8, 8' : 'none' }}
                  />

                  {/* Tower station connection line */}
                  <line
                    x1="300" y1="110" x2="480" y2="110"
                    stroke="var(--text-secondary)"
                    strokeWidth="3.5"
                    strokeDasharray="4,4"
                  />

                  {/* Grid node circle */}
                  <g transform="translate(120, 50)">
                    <circle r="26" fill={activeSource === 'GRID' ? 'rgba(59,130,246,0.15)' : 'var(--bg-primary)'} stroke={activeSource === 'GRID' ? '#3B82F6' : 'var(--border-subtle)'} strokeWidth="2" />
                    <Power size={18} color={activeSource === 'GRID' ? '#3B82F6' : 'var(--text-secondary)'} x="-9" y="-9" />
                    <text y="42" textAnchor="middle" fill="var(--text-secondary)" fontSize="10.5" fontWeight="bold">NATIONAL GRID</text>
                  </g>

                  {/* Solar node circle */}
                  <g transform="translate(120, 110)">
                    <circle r="26" fill={activeSource === 'SOLAR' ? 'rgba(16,185,129,0.15)' : 'var(--bg-primary)'} stroke={activeSource === 'SOLAR' ? '#10B981' : 'var(--border-subtle)'} strokeWidth="2" />
                    <Sun size={18} color={activeSource === 'SOLAR' ? '#10B981' : 'var(--text-secondary)'} x="-9" y="-9" />
                    <text y="42" textAnchor="middle" fill="var(--text-secondary)" fontSize="10.5" fontWeight="bold">SOLAR ARRAY</text>
                  </g>

                  {/* Generator node circle */}
                  <g transform="translate(120, 170)">
                    <circle r="26" fill={activeSource === 'GENERATOR' ? 'rgba(245,158,11,0.15)' : 'var(--bg-primary)'} stroke={activeSource === 'GENERATOR' ? '#F59E0B' : 'var(--border-subtle)'} strokeWidth="2" />
                    <Activity size={18} color={activeSource === 'GENERATOR' ? '#F59E0B' : 'var(--text-secondary)'} x="-9" y="-9" />
                    <text y="42" textAnchor="middle" fill="var(--text-secondary)" fontSize="10.5" fontWeight="bold">GEN BACKUP</text>
                  </g>

                  {/* Central switching relay bus node */}
                  <g transform="translate(300, 110)">
                    <rect x="-16" y="-16" width="32" height="32" rx="4" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="2.5" />
                    <text fill="var(--text-primary)" fontSize="9.5" fontWeight="bold" textAnchor="middle" y="4">BUS</text>
                  </g>

                  {/* central tower node circle */}
                  <g transform="translate(480, 110)">
                    <circle r="28" fill="var(--bg-secondary)" stroke="var(--accent-primary)" strokeWidth="3" />
                    <TowerIcon size={20} color="var(--accent-primary)" x="-10" y="-10" />
                    <text y="44" textAnchor="middle" fill="var(--text-primary)" fontSize="10.5" fontWeight="bold">LOAD BUSBAR</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Switching logs list */}
            <div className="card">
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--accent-warning)" />
                  <h3 style={styles.cardTitle}>Automatic Switching Timeline Logs</h3>
                </div>
                <span style={styles.cardTag} className="font-mono">INGEST SYSTEM</span>
              </div>

              <div style={styles.switchLogsList}>
                {switchLog.map(log => (
                  <div key={log.id} style={styles.switchLogItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        {log.from} ➜ {log.to}
                      </span>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.time}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0' }}>
                      Reason: <b>{log.reason}</b> | Switch duration: <b>{log.duration}</b>
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: LOAD METRICS & ACCENT CHARTS */}
          <div style={styles.rightCol}>
            
            {/* Live details indicators */}
            <div style={styles.kpiGrid}>
              <KPICard
                title="Active Grid Load"
                value={`${gridLoad.toFixed(1)} kW`}
                trend={{ value: 'Voltage: 232V', direction: gridLoad > 0 ? 'neutral' : 'down', label: 'Infeed' }}
                icon={<Power size={18} />}
                variant={gridLoad > 0 ? 'primary' : 'primary'}
                subtext="National Grid Bus Connection"
              />
              <KPICard
                title="Solar Generation"
                value={`${solarGen.toFixed(1)} kW`}
                trend={{ value: 'Efficiency: 94%', direction: 'up', label: 'Solar' }}
                icon={<Sun size={18} />}
                variant="success"
                subtext="Solar Inverter Load"
              />
              <KPICard
                title="Generator Backup"
                value={`${genLoad.toFixed(1)} kW`}
                trend={{ value: activeSource === 'GENERATOR' ? 'RUNNING' : 'STANDBY', direction: 'neutral', label: 'State' }}
                icon={<Activity size={18} />}
                variant={activeSource === 'GENERATOR' ? 'warning' : 'primary'}
                subtext="Diesel Gen Starter Loop"
              />
              <KPICard
                title="Carbon Footprint Offset"
                value={powerMetrics ? `${powerMetrics.co2SavedKg.toLocaleString()} kg` : '0 kg'}
                trend={{ value: 'Solar Savings', direction: 'up', label: 'CO2 Saved' }}
                icon={<Sun size={18} />}
                variant="success"
                subtext={`Diesel Burn: ${powerMetrics ? powerMetrics.dieselConsumedLiters : 0}L | CO2 emission: ${powerMetrics ? powerMetrics.co2ProducedKg : 0} kg`}
              />
            </div>

            {/* IoT Remote Relays Card */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>IoT Remote Control Relays</h3>
                <span style={styles.cardTag} className="font-mono">RIMS ACTIVE</span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
                Issue encrypted IoT commands directly to site cabinet power systems.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleRemoteAction('reset')}
                  disabled={executingAction !== null}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <Power size={15} />
                  {executingAction === 'reset' ? 'RECYCLING...' : 'Reset Breaker'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoteAction('gen-test')}
                  disabled={executingAction !== null}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <Activity size={15} />
                  {executingAction === 'gen-test' ? 'CRANKING...' : 'Crank Generator'}
                </button>
              </div>
            </div>

            {/* Recharts Draw distributions */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Power Source Contribution % (7 Days)</h3>
              </div>
              
              <div style={{ marginTop: '16px', height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceContribution} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" style={{ fontSize: '12px', fontWeight: 'bold', fill: 'var(--text-secondary)' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                      {sourceContribution.map((entry: any, idx: number) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Power Load trend charts */}
            <div className="card">
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>24-Hour Load Generation profile</h3>
              </div>
              <div style={{ ...styles.chartWrapper, height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                    <XAxis dataKey="time" hide />
                    <YAxis unit="kW" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="Grid" stroke="#3B82F6" fillOpacity={0.08} fill="rgba(59,130,246,0.08)" stackId="1" />
                    <Area type="monotone" dataKey="Solar" stroke="#10B981" fillOpacity={0.08} fill="rgba(16,185,129,0.08)" stackId="1" />
                    <Area type="monotone" dataKey="Generator" stroke="#F59E0B" fillOpacity={0.08} fill="rgba(245,158,11,0.08)" stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
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
  schematicContainer: {
    padding: '12px 0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px'
  },
  switchLogsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '260px',
    overflowY: 'auto'
  },
  switchLogItem: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    borderLeft: '4px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column'
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
  chartWrapper: {
    height: '180px',
    width: '100%'
  }
}
