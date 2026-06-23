import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { Tower, Alert } from '../types'
import {
  ShieldAlert,
  Shield,
  ShieldCheck,
  Camera,
  Activity,
  AlertOctagon,
  Clock,
  UserCheck,
  UserX,
  Lock,
  LockOpen
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'

interface CctvFeedProps {
  id: number
  label: string
  motionActive: boolean
  siteCode: string
}

function CctvFeed({ id, label, motionActive, siteCode }: CctvFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [streamUrl, setStreamUrl] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [fps, setFps] = useState(25)
  const [bitrate, setBitrate] = useState(1240)

  useEffect(() => {
    const interval = setInterval(() => {
      setBitrate(1200 + Math.floor(Math.random() * 80))
      setFps(24 + Math.floor(Math.random() * 3))
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let scanlineY = 0

    const render = () => {
      const w = canvas.width
      const h = canvas.height

      ctx.fillStyle = '#02070e'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)'
      ctx.lineWidth = 1
      const gridSize = 20
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, 20, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(w / 2 - 30, h / 2)
      ctx.lineTo(w / 2 + 30, h / 2)
      ctx.moveTo(w / 2, h / 2 - 30)
      ctx.lineTo(w / 2, h / 2 + 30)
      ctx.stroke()

      scanlineY = (scanlineY + 0.8) % h
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
      ctx.fillRect(0, scanlineY, w, 2)

      const gradient = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w / 2)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      if (motionActive) {
        const blink = Math.floor(Date.now() / 300) % 2 === 0
        if (blink) {
          ctx.strokeStyle = '#EF4444'
          ctx.lineWidth = 3
          ctx.strokeRect(10, 10, w - 20, h - 20)

          ctx.fillStyle = '#EF4444'
          ctx.font = 'bold 11px monospace'
          ctx.fillText('⚠️ MOTION ALARM ACTIVE', 20, 30)
          
          ctx.strokeRect(w / 2 - 40, h / 2 - 40, 80, 80)
          ctx.fillText('TARGET LOCK: ANOMALY', w / 2 - 60, h / 2 - 50)
        }
      } else {
        ctx.fillStyle = '#10B981'
        ctx.font = '9px monospace'
        ctx.fillText('SCANNING SECTOR...', 20, 30)
      }

      ctx.fillStyle = 'rgba(16, 185, 129, 0.6)'
      ctx.font = '9px monospace'
      ctx.fillText(`CAM_0${id}_UP=${siteCode}`, 15, h - 25)
      ctx.fillText(`FPS: ${fps} | RATE: ${bitrate} kb/s`, 15, h - 12)
      ctx.fillText(`LATENCY: 118ms`, w - 110, h - 12)

      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [motionActive, id, siteCode, fps, bitrate])

  return (
    <div style={{ position: 'relative', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#02070e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="cctv-rec-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#EF4444', borderRadius: '50%' }}></span>
          <span style={{ fontSize: '10.5px', color: '#FFFFFF', fontWeight: 'bold' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9.5px', color: '#10B981', fontWeight: 'bold' }}>● LIVE</span>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', fontSize: '12px', padding: 0 }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {showConfig && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 7, 14, 0.95)', zIndex: 20, display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Configure IP Camera Stream:</span>
          <input
            type="text"
            placeholder="rtsp://admin:pass@192.168.10.120:554/h264"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (streamUrl) {
                  alert(`Mounting external IP stream: ${streamUrl}`);
                }
                setShowConfig(false);
              }}
              style={{ padding: '3px 8px', fontSize: '10.5px' }}
            >
              Mount Source
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowConfig(false)}
              style={{ padding: '3px 8px', fontSize: '10.5px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {streamUrl ? (
        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#10B981', letterSpacing: '0.1em' }} className="font-mono">▶ MOUNTED: {streamUrl.slice(0, 24)}...</span>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>UPLINK BITRATE: {bitrate} kb/s</span>
        </div>
      ) : (
        <canvas ref={canvasRef} width="280" height="140" style={{ width: '100%', display: 'block', height: '140px' }} />
      )}
    </div>
  )
}

export default function SecurityOperationsCenter() {
  const [towers, setTowers] = useState<Tower[]>([])
  const [selectedTowerId, setSelectedTowerId] = useState<string>('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [securityScore, setSecurityScore] = useState(98)
  const [isLoading, setIsLoading] = useState(true)

  // Filter alarm category states
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'ACK' | 'RESOLVED'>('ALL')

  // Access Logs mock list (Lusaka node auth swipes)
  const [accessHistory, setAccessHistory] = useState<any[]>([
    { id: 'a1', user: 'technician_lungu', time: '22:15 CAT', auth: true, details: 'Regular preventive diagnostic scan.' },
    { id: 'a2', user: 'contractor_banda', time: '18:42 CAT', auth: true, details: 'Solar array surface clean wipe.' },
    { id: 'a3', user: 'unknown_uid_884f', time: '02:15 CAT', auth: false, details: 'Breach warning: failed cabinet latch keycode.' },
    { id: 'a4', user: 'security_supervisor', time: '14:20 CAT', auth: true, details: 'Standard patrol round check.' }
  ])

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
          const defaultSite = data.find((t: Tower) => t.siteCode === 'LUS-CHIB-04') || data[0]
          setSelectedTowerId(defaultSite.id)
        }
      } catch (err) {
        console.error('Failed to load towers list:', err)
      }
    }
    loadTowers()
  }, [])

  // 2. Fetch security alerts for selected tower
  const fetchSecurityData = async () => {
    if (!selectedTowerId) return
    setIsLoading(true)
    try {
      const alertsData = await api.get(`/api/alerts?towerId=${selectedTowerId}`)
      setAlerts(alertsData)
      
      // Calculate active security score based on critical/high alerts
      const activeUnack = alertsData.filter((a: Alert) => !a.isAcknowledged && a.severity === 'CRITICAL').length
      setSecurityScore(Math.max(50, 100 - activeUnack * 15))
      
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load security alerts:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()
  }, [selectedTowerId])

  // 3. Socket.io Real-time update binding
  useEffect(() => {
    const socket = getSocket()

    const handleAlert = (data: Alert) => {
      if (data.towerId !== selectedTowerIdRef.current) return
      
      // Add standard alarm trigger
      setAlerts(prev => [data, ...prev])
      
      // Update security score
      if (data.severity === 'CRITICAL') {
        setSecurityScore(score => Math.max(50, score - 15))
      }

      // If intrusion-related, add warning swipe trace to access logs
      if (data.type === 'UNAUTHORIZED_ACCESS' || data.type === 'INTRUSION') {
        setAccessHistory(prev => [
          {
            id: Math.random().toString(),
            user: 'UNKNOWN_INTRUDER',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' CAT',
            auth: false,
            details: data.message
          },
          ...prev.slice(0, 5)
        ])
      }
    }

    socket.on('alert:new', handleAlert)

    return () => {
      socket.off('alert:new', handleAlert)
    }
  }, [])

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.patch(`/api/alerts/${alertId}/acknowledge`, {})
      
      // Re-fetch local data to sync acknowledged states
      fetchSecurityData()
    } catch (err) {
      console.error('Acknowledge failed:', err)
    }
  }

  const currentTower = towers.find(t => t.id === selectedTowerId)
  
  // Filter list logic
  const filteredAlerts = alerts.filter(a => {
    // We display intrusion, door status, high temps and fuel thefts as security alerts
    const isSecAlert = ['INTRUSION', 'UNAUTHORIZED_ACCESS', 'FUEL_THEFT', 'SMOKE', 'TEMP_HIGH'].includes(a.type)
    if (!isSecAlert) return false

    if (activeTab === 'CRITICAL') return a.severity === 'CRITICAL' && !a.isAcknowledged
    if (activeTab === 'ACK') return a.isAcknowledged
    if (activeTab === 'RESOLVED') return a.isAcknowledged // acknowledged acts as resolved in dashboard simulation
    return true
  })

  // Count metrics
  const activeAlarmsCount = alerts.filter(a => !a.isAcknowledged).length
  const criticalAlarmsCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.isAcknowledged).length

  return (
    <div className="page-container">
      {/* Site Selector control bar */}
      <div style={styles.controlBar} className="card no-print">
        <div style={styles.selectorGroup}>
          <label style={styles.selectorLabel}>SOC Surveillance Node:</label>
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
            <span style={styles.badgeLabel}>Perimeter State:</span>
            <StatusBadge status={currentTower.status} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>DECRYPTING SECURE CHANNELS...</h3>
        </div>
      ) : (
        <div style={styles.splitLayout}>
          
          {/* LEFT COLUMN: CCTV GRID & ACCESS LOGS */}
          <div style={styles.leftCol}>
            
            {/* CCTV Grid of 4 cameras */}
            <div className="card">
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={16} color="var(--accent-primary)" />
                  <h3 style={styles.cardTitle}>Live CCTV Surveillance Grid</h3>
                </div>
                <span style={styles.cardTag} className="font-mono">IP MULTICAST ACTIVE</span>
              </div>

              <div style={styles.cctvGrid}>
                {[
                  { id: 1, label: 'SURV-CAM-01: Main Outer Gate' },
                  { id: 2, label: 'SURV-CAM-02: Diesel Fuel Tank' },
                  { id: 3, label: 'SURV-CAM-03: Equipment Cabinet' },
                  { id: 4, label: 'SURV-CAM-04: Perimeter Fence West' }
                ].map(cam => (
                  <CctvFeed
                    key={cam.id}
                    id={cam.id}
                    label={cam.label}
                    motionActive={
                      alerts.some(a => !a.isAcknowledged && (a.type === 'INTRUSION' || a.type === 'UNAUTHORIZED_ACCESS' || a.type === 'FUEL_THEFT')) &&
                      (cam.id === 2 || cam.id === 3)
                    }
                    siteCode={currentTower?.siteCode || 'SITE'}
                  />
                ))}
              </div>
            </div>

            {/* Access Logs Swipes */}
            <div className="card">
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="var(--accent-success)" />
                  <h3 style={styles.cardTitle}>Access Control Intelligence</h3>
                </div>
                <span style={styles.cardTag} className="font-mono">RFID Reader Ingest</span>
              </div>

              <div style={styles.accessList}>
                {accessHistory.map(entry => (
                  <div key={entry.id} style={{
                    ...styles.accessItem,
                    borderLeftColor: entry.auth ? 'var(--accent-success)' : 'var(--accent-danger)'
                  }}>
                    <div style={styles.accessItemHeader}>
                      <span style={{ fontWeight: 'bold', color: entry.auth ? 'var(--text-primary)' : 'var(--accent-danger)' }}>
                        {entry.auth ? '🟢 Credentials Verified' : '🔴 Authentication Breach'}
                      </span>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.time}</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0' }}>
                      UID: <code>@{entry.user}</code> — {entry.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: SECURITY STATUS & ALARM MANAGER */}
          <div style={styles.rightCol}>
            
            {/* Security KPI stats */}
            <div style={styles.kpiGrid}>
              <KPICard
                title="Security Score"
                value={`${securityScore}%`}
                icon={<ShieldCheck size={20} />}
                variant={securityScore > 85 ? 'success' : (securityScore > 65 ? 'warning' : 'danger')}
                subtext="Regional weight calculation"
              />
              <KPICard
                title="Active Alarms"
                value={activeAlarmsCount}
                unit="Loops"
                icon={<ShieldAlert size={20} />}
                variant={criticalAlarmsCount > 0 ? 'danger' : (activeAlarmsCount > 0 ? 'warning' : 'primary')}
                subtext={`${criticalAlarmsCount} Critical Threat levels`}
              />
            </div>

            {/* Centralized Alarm Manager console */}
            <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Centralized Security Console</h3>
                <div style={styles.tabsContainer}>
                  <button type="button" onClick={() => setActiveTab('ALL')} style={{ ...styles.tabBtn, opacity: activeTab === 'ALL' ? 1 : 0.6, fontWeight: activeTab === 'ALL' ? 'bold' : 'normal' }}>ALL</button>
                  <button type="button" onClick={() => setActiveTab('CRITICAL')} style={{ ...styles.tabBtn, opacity: activeTab === 'CRITICAL' ? 1 : 0.6, fontWeight: activeTab === 'CRITICAL' ? 'bold' : 'normal', color: 'var(--accent-danger)' }}>CRITICAL</button>
                  <button type="button" onClick={() => setActiveTab('RESOLVED')} style={{ ...styles.tabBtn, opacity: activeTab === 'RESOLVED' ? 1 : 0.6, fontWeight: activeTab === 'RESOLVED' ? 'bold' : 'normal', color: 'var(--accent-success)' }}>RESOLVED</button>
                </div>
              </div>

              <div style={styles.consoleList}>
                {filteredAlerts.length === 0 ? (
                  <div style={styles.emptyConsole}>
                    <ShieldCheck size={32} color="var(--accent-success)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', marginTop: '10px' }}>
                      Security loop is quiet. No matches.
                    </span>
                  </div>
                ) : (
                  filteredAlerts.map(evt => (
                    <div key={evt.id} style={{
                      ...styles.consoleItem,
                      borderLeftColor: evt.severity === 'CRITICAL' ? 'var(--accent-danger)' : (evt.severity === 'HIGH' ? 'var(--accent-warning)' : 'var(--accent-info)'),
                      opacity: evt.isAcknowledged ? 0.65 : 1
                    }}>
                      <div style={styles.consoleItemHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {evt.severity === 'CRITICAL' ? <LockOpen size={14} color="var(--accent-danger)" /> : <Lock size={14} color="var(--text-secondary)" />}
                          <span style={{ fontWeight: 'bold', fontSize: '12.5px', color: evt.severity === 'CRITICAL' ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                            {evt.type} ({evt.severity})
                          </span>
                        </div>
                        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.4 }}>{evt.message}</p>
                      
                      {!evt.isAcknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(evt.id)}
                          className="btn btn-secondary"
                          style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '11px', marginTop: '4px' }}
                        >
                          Acknowledge Alarm
                        </button>
                      )}
                    </div>
                  ))
                )}
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
  cctvGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '12px'
  },
  cctvHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  cctvName: {
    fontSize: '10.5px',
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  cctvStatus: {
    fontSize: '9.5px',
    color: 'var(--accent-danger)',
    fontWeight: 'bold'
  },
  cctvCrosshair: {
    width: '30px',
    height: '30px',
    border: '1px dashed rgba(16, 185, 129, 0.2)',
    borderRadius: '50%'
  },
  cctvTimestamp: {
    position: 'absolute',
    bottom: '8px',
    left: '10px',
    fontSize: '9px',
    color: 'rgba(16, 185, 129, 0.6)'
  },
  accessList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    maxHeight: '260px',
    overflowY: 'auto'
  },
  accessItem: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    borderLeft: '4px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column'
  },
  accessItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tabsContainer: {
    display: 'flex',
    gap: '12px'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  consoleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px',
    maxHeight: '380px',
    overflowY: 'auto'
  },
  consoleItem: {
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    borderLeft: '4px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  consoleItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  emptyConsole: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0'
  }
}
