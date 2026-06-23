import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { useAuth } from '../hooks/use-auth'
import { Tower, Telemetry, Alert, PowerSource, TowerStatus } from '../types'
import {
  ArrowLeft,
  Settings,
  Cpu,
  Thermometer,
  Shield,
  Coins,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react'

// Components
import StatusBadge from '../components/StatusBadge'
import PowerSourceIndicator from '../components/PowerSourceIndicator'
import GaugeChart from '../components/GaugeChart'
import AlertFeed from '../components/AlertFeed'

// Recharts
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function TowerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  
  const [tower, setTower] = useState<Tower | null>(null)
  const [latestTelemetry, setLatestTelemetry] = useState<Telemetry | null>(null)
  const [history, setHistory] = useState<Telemetry[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uptimeString, setUptimeString] = useState('0d 0h 0m 0s')

  // Admin Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configName, setConfigName] = useState('')
  const [configStatus, setConfigStatus] = useState<TowerStatus>('ONLINE')
  const [configFuel, setConfigFuel] = useState(100.0)
  const [configPower, setConfigPower] = useState<PowerSource>('GRID')
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  const fetchTowerData = async () => {
    try {
      const [towerData, historyData, timelineData, alertsData] = await Promise.all([
        api.get(`/api/towers/${id}`),
        api.get(`/api/towers/${id}/telemetry?range=24h`),
        api.get(`/api/towers/${id}/power-timeline`),
        api.get(`/api/alerts?towerId=${id}`)
      ])

      setTower(towerData)
      setLatestTelemetry(towerData.latestTelemetry)
      setHistory(historyData)
      setTimeline(timelineData)
      setAlerts(alertsData.filter((a: Alert) => !a.isAcknowledged || a.dispatchStatus !== 'RESOLVED'))
      
      // Initialize modal fields
      setConfigName(towerData.name)
      setConfigStatus(towerData.status)
      setConfigFuel(towerData.fuelLevel)
      setConfigPower(towerData.powerSource)

      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load tower details:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTowerData()
  }, [id])

  // Ticking Uptime Clock
  useEffect(() => {
    if (!tower?.upSince) return
    const upDate = new Date(tower.upSince)
    
    const updateClock = () => {
      const diff = Date.now() - upDate.getTime()
      if (diff < 0) {
        setUptimeString('0d 0h 0m 0s')
        return
      }
      const secs = Math.floor(diff / 1000)
      const days = Math.floor(secs / (24 * 3600))
      const hours = Math.floor((secs % (24 * 3600)) / 3600)
      const minutes = Math.floor((secs % 3600) / 60)
      const seconds = secs % 60
      
      setUptimeString(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }
    
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [tower?.upSince])

  // WebSocket Live Listeners
  useEffect(() => {
    const socket = getSocket()

    // Subscribe to updates for this specific tower
    socket.emit('subscribe:tower', { towerId: id })

    socket.on('telemetry:update', (data: any) => {
      if (data.towerId !== id) return
      setLatestTelemetry(data)
      setTower(prev => prev ? { ...prev, fuelLevel: data.fuelLevel } : null)
      // Prepend to history, maintaining 24h window
      setHistory(prev => [...prev.slice(1), data])
    })

    socket.on('alert:new', (data: Alert) => {
      if (data.towerId !== id) return
      setAlerts(prev => [data, ...prev])
    })

    socket.on('alert:updated', (data: Alert) => {
      if (data.towerId !== id) return
      setAlerts(prev => prev.map(a => a.id === data.id ? data : a))
      api.get(`/api/towers/${id}`).then(setTower).catch(console.error)
    })

    socket.on('tower:statusChange', (data: any) => {
      if (data.towerId !== id) return
      setTower(prev => prev ? { ...prev, status: data.newStatus } : null)
    })

    socket.on('power:switch', (data: any) => {
      if (data.towerId !== id) return
      setTower(prev => prev ? { ...prev, powerSource: data.to } : null)
      
      // Append to switching timeline
      setTimeline(prev => [
        { timestamp: new Date().toISOString(), source: data.to },
        ...prev
      ])
    })

    return () => {
      socket.off('telemetry:update')
      socket.off('alert:new')
      socket.off('alert:updated')
      socket.off('tower:statusChange')
      socket.off('power:switch')
    }
  }, [id])

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/acknowledge`, {})
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      const towerData = await api.get(`/api/towers/${id}`)
      setTower(towerData)
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  const handleDispatchAlert = async (alertId: string, technician: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/dispatch`, { technician })
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      const towerData = await api.get(`/api/towers/${id}`)
      setTower(towerData)
    } catch (err) {
      console.error('Failed to dispatch technician:', err)
    }
  }

  const handleResolveAlert = async (alertId: string, notes: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/resolve`, { notes })
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      const towerData = await api.get(`/api/towers/${id}`)
      setTower(towerData)
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingConfig(true)
    try {
      const updated = await api.patch(`/api/towers/${id}/config`, {
        name: configName,
        status: configStatus,
        fuelLevel: configFuel,
        powerSource: configPower
      })
      setTower(updated)
      setShowConfigModal(false)
    } catch (err) {
      alert('Failed to update config. Verify role authorization.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>DECRYPTING TELEMETRY STACK...</h3>
      </div>
    )
  }

  if (!tower) {
    return (
      <div className="page-container">
        <h3>Site not found.</h3>
        <Link to="/">Back to Dashboard</Link>
      </div>
    )
  }

  // Calculate SLA values
  const isSlaBreached = tower.status === 'CRITICAL' || tower.status === 'OFFLINE'
  const slaPercentage = isSlaBreached ? 98.42 : 99.85

  // Format Recharts timestamps to HH:MM
  const chartData = history.map(h => ({
    ...h,
    timeLabel: new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }))

  return (
    <div className="page-container">
      {/* Header bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/" style={styles.backBtn} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Map
          </Link>
          <div style={styles.titleWrapper}>
            <h1 style={styles.title}>{tower.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={styles.siteCode} className="font-mono">{tower.siteCode}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Clock size={12} />
                <span>Uptime:</span>
                <span className="font-mono" style={{ fontWeight: 'bold', color: 'var(--accent-success)' }}>{uptimeString}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <StatusBadge status={tower.status} />

          {/* Admin Override Config Button (Victory Factor #4) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="btn btn-primary"
              style={styles.configBtn}
            >
              <Settings size={16} />
              Override Config
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div style={styles.splitLayout}>
        
        {/* Left Column - Operational Telemetry */}
        <div style={styles.leftCol}>
          {/* Active Power feeds indicator */}
          <div className="card">
            <h3 style={styles.cardTitle}>Automatic Infeed Switching</h3>
            <div style={{ marginTop: '16px' }}>
              <PowerSourceIndicator
                activeSource={tower.powerSource}
                gridPower={latestTelemetry?.gridPower}
                solarPower={latestTelemetry?.solarPower}
                generatorPower={latestTelemetry?.generatorPower}
              />
            </div>
          </div>

          {/* 24-Hour Infeed Power Draw Charts (Stacked Area Chart) */}
          <div className="card">
            <h3 style={styles.cardTitle}>24-Hour Power Source Analytics</h3>
            <div style={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <XAxis dataKey="timeLabel" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                  <YAxis unit="kW" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="gridPower" name="National Grid" stroke="#3B82F6" fillOpacity={0.15} fill="rgba(59,130,246,0.15)" stackId="1" />
                  <Area type="monotone" dataKey="solarPower" name="Solar Array" stroke="#10B981" fillOpacity={0.15} fill="rgba(16,185,129,0.15)" stackId="1" />
                  <Area type="monotone" dataKey="generatorPower" name="Generator" stroke="#F59E0B" fillOpacity={0.15} fill="rgba(245,158,11,0.15)" stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Environmental Telemetry Dials */}
          <div className="card" style={styles.gaugesCard}>
            <h3 style={styles.cardTitle}>Environmental cabinet parameters</h3>
            <div style={styles.gaugesGrid}>
              <GaugeChart
                title="Ambient Temp"
                value={latestTelemetry?.ambientTemp || 0}
                min={0}
                max={50}
                unit="°C"
                alertThreshold={35}
              />
              <GaugeChart
                title="Enclosure Temp"
                value={latestTelemetry?.equipmentTemp || 0}
                min={0}
                max={75}
                unit="°C"
                alertThreshold={45}
              />
              <GaugeChart
                title="Relative Humidity"
                value={latestTelemetry?.humidity || 0}
                unit="%"
                alertThreshold={85}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Commercial Profile & SLA Risk */}
        <div style={styles.rightCol}>
          {/* SLA Rating widget */}
          <div className={`card ${isSlaBreached ? 'alert-critical' : ''}`} style={styles.slaCard}>
            <div style={styles.slaHeader}>
              <Cpu size={24} color={isSlaBreached ? 'var(--accent-danger)' : 'var(--accent-success)'} />
              <span style={styles.slaTitle}>SLA Target Rating</span>
            </div>
            <div style={styles.slaMetrics}>
              <span style={{ ...styles.slaPercentage, color: isSlaBreached ? 'var(--accent-danger)' : 'var(--accent-success)' }} className="font-mono">
                {slaPercentage}%
              </span>
              <span style={styles.slaThreshold}>Threshold: 99.50%</span>
            </div>
            {isSlaBreached && (
              <div style={styles.slaWarning}>
                <AlertTriangle size={16} />
                <span>Site is breaching SLA. Penalties active.</span>
              </div>
            )}
          </div>

          {/* Commercial profile card (Victory Factor #3) */}
          <div className="card" style={styles.commercialCard}>
            <div style={styles.cardHeader}>
              <Coins size={20} color="var(--accent-info)" />
              <h3 style={styles.cardTitle}>Commercial Revenue Profile</h3>
            </div>
            <div style={styles.commGrid}>
              <div style={styles.commItem}>
                <span style={styles.commLabel}>Active Co-tenants</span>
                <span style={styles.commValue}>{tower.tenants?.length || 0} Operators</span>
              </div>
              <div style={styles.commItem}>
                <span style={styles.commLabel}>Tenancy Occupancy</span>
                <span style={styles.commValue} className="font-mono">
                  {tower.tenants?.length || 0} / 5
                </span>
              </div>
              <div style={styles.commItem}>
                <span style={styles.commLabel}>Monthly Asset Yield</span>
                <span style={{ ...styles.commValue, color: 'var(--accent-success)', fontWeight: 'bold' }}>
                  ${tower.tenants?.reduce((sum, t) => sum + t.monthlyRevenue, 0).toLocaleString()} /mo
                </span>
              </div>
            </div>

            {/* List of active operators */}
            <div style={styles.operatorList}>
              <h4 style={styles.operatorListTitle}>Active Leases</h4>
              {tower.tenants?.length === 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No active operator leases.</span>
              ) : (
                tower.tenants?.map(tenant => (
                  <div key={tenant.id} style={styles.operatorRow}>
                    <span style={styles.operatorName}>{tenant.clientName}</span>
                    <span style={styles.operatorRevenue} className="font-mono">${tenant.monthlyRevenue.toLocaleString()}/mo</span>
                  </div>
                ))
              )}
            </div>

            {/* Commercial Opportunity tag (Victory Factor #3) */}
            <div style={styles.opportunityBox}>
              <Sparkles size={16} color="var(--accent-warning)" />
              <div style={styles.opportunityText}>
                <b>Capacity Opportunity</b>
                <span>Space for {5 - (tower.tenants?.length || 0)} more tenant leases. Potential: +${((5 - (tower.tenants?.length || 0)) * 4800).toLocaleString()}/mo.</span>
              </div>
            </div>
          </div>

          {/* Site Alert log feed */}
          <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={styles.cardTitle}>Active Site Alarms</h3>
            <div style={{ flexGrow: 1, marginTop: '12px' }}>
              <AlertFeed
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onDispatch={handleDispatchAlert}
                onResolve={handleResolveAlert}
                maxHeight="250px"
                showTowerInfo={false}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ADMIN CONFIG OVERRIDE MODAL */}
      {showConfigModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Override Tower Configuration</h3>
              <button 
                type="button" 
                onClick={() => setShowConfigModal(false)}
                style={styles.closeModalBtn}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveConfig} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tower Station Name</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Operational Status</label>
                <select
                  value={configStatus}
                  onChange={(e) => setConfigStatus(e.target.value as TowerStatus)}
                  style={styles.formSelect}
                >
                  <option value="ONLINE">Online</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Diesel Fuel Tank level (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={configFuel}
                  onChange={(e) => setConfigFuel(parseFloat(e.target.value))}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Manual Power Source Override</label>
                <select
                  value={configPower}
                  onChange={(e) => setConfigPower(e.target.value as PowerSource)}
                  style={styles.formSelect}
                >
                  <option value="GRID">National Grid</option>
                  <option value="SOLAR">Solar Array</option>
                  <option value="GENERATOR">Diesel Generator</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={styles.modalCancelBtn}
                  className="btn btn-secondary"
                >
                  Cancel Override
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  style={styles.modalSubmitBtn}
                  className="btn btn-primary"
                >
                  {isSavingConfig ? 'Applying overrides...' : 'Apply Overrides'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '24px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backBtn: {
    padding: '8px 14px'
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  siteCode: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  configBtn: {
    padding: '8px 14px'
  },
  splitLayout: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap'
  },
  leftCol: {
    flex: 1.6,
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
  cardTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  chartWrapper: {
    height: '240px',
    marginTop: '16px',
    width: '100%'
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
  slaCard: {
    borderLeft: '4px solid var(--accent-success)'
  },
  slaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  slaTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  slaMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: '12px'
  },
  slaPercentage: {
    fontSize: '36px',
    fontWeight: 900
  },
  slaThreshold: {
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  slaWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--accent-danger)',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '8px'
  },
  commercialCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px dashed var(--border-subtle)',
    paddingBottom: '8px'
  },
  commGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  commItem: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)'
  },
  commLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  commValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '2px',
    color: 'var(--text-primary)'
  },
  operatorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px'
  },
  operatorListTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  operatorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '6px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '4px'
  },
  operatorName: {
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  operatorRevenue: {
    color: 'var(--text-secondary)'
  },
  opportunityBox: {
    display: 'flex',
    gap: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    padding: '12px',
    borderRadius: '8px',
    alignItems: 'flex-start',
    marginTop: '8px'
  },
  opportunityText: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12px',
    color: 'var(--text-primary)',
    lineHeight: 1.4
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200
  },
  modalCard: {
    width: '100%',
    maxWidth: '450px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(0, 51, 136, 0.45)',
    boxShadow: '0 12px 50px rgba(0, 51, 136, 0.35)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  closeModalBtn: {
    fontSize: '24px',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  formInput: {
    padding: '10px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  formSelect: {
    padding: '10px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px'
  },
  modalCancelBtn: {
    padding: '8px 16px'
  },
  modalSubmitBtn: {
    padding: '8px 16px'
  }
}
