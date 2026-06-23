import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import {
  Radio as TowerIcon,
  ShieldAlert,
  Clock,
  TrendingUp,
  Percent,
  AlertOctagon,
  DollarSign,
  Activity,
  Power,
  Shield,
  Briefcase,
  Sparkles,
  Cpu,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'
import AlertFeed from '../components/AlertFeed'

// Stores / Hooks
import { useAuthStore } from '../store/auth-store'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { Tower, Alert } from '../types'

// Recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Network topology layout for Lusaka nodes
const NETWORK_LINKS = [
  { from: 'LUS-MAND-01', to: 'LUS-EMMS-08' }, // North-West Hub
  { from: 'LUS-MAND-01', to: 'LUS-CHIB-04' }, // West Hub
  { from: 'LUS-MAND-01', to: 'LUS-KBLG-03' }, // South Hub
  { from: 'LUS-MAND-01', to: 'LUS-WOOD-02' }, // South-East Hub
  { from: 'LUS-MAND-01', to: 'LUS-AVON-13' }, // East Hub
  { from: 'LUS-MAND-01', to: 'LUS-OLYM-07' }, // North-East Hub
  { from: 'LUS-MAND-01', to: 'LUS-RHDP-06' },
  { from: 'LUS-MAND-01', to: 'LUS-NMD-05' },
  { from: 'LUS-MAND-01', to: 'LUS-SHOW-17' },
  { from: 'LUS-MAND-01', to: 'LUS-FAIR-18' },
  
  { from: 'LUS-EMMS-08', to: 'LUS-MATR-09' },
  { from: 'LUS-EMMS-08', to: 'LUS-IND-19' },

  { from: 'LUS-CHIB-04', to: 'LUS-MAK-21' },
  { from: 'LUS-CHIB-04', to: 'LUS-KAFR-22' },

  { from: 'LUS-KBLG-03', to: 'LUS-LIBL-11' },
  { from: 'LUS-KBLG-03', to: 'LUS-LIL-20' },

  { from: 'LUS-WOOD-02', to: 'LUS-CHLN-10' },
  { from: 'LUS-WOOD-02', to: 'LUS-KABL-16' },

  { from: 'LUS-AVON-13', to: 'LUS-CHLS-12' },
  { from: 'LUS-AVON-13', to: 'LUS-IBEX-14' },
  { from: 'LUS-AVON-13', to: 'LUS-SALM-15' },
  { from: 'LUS-AVON-13', to: 'LUS-GER-23' },

  { from: 'LUS-GER-23', to: 'LUS-CHNG-24' },
  { from: 'LUS-KAFR-22', to: 'LUS-KAFM-25' }
]

// Memoized Map component for Leaflet rendering
interface NocNetworkMapProps {
  towers: Tower[]
  theme: string
}

const NocNetworkMap = React.memo(({ towers, theme }: NocNetworkMapProps) => {
  const mapTiles = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const createMarkerIcon = (status: string) => {
    let color = '#10B981' // Green
    let animate = false
    let animationClass = ''

    if (status === 'WARNING') {
      color = '#F59E0B' // Amber
      animate = true
      animationClass = 'pulse-border-warning'
    } else if (status === 'CRITICAL') {
      color = '#EF4444' // Red
      animate = true
      animationClass = 'pulse-border'
    } else if (status === 'OFFLINE') {
      color = '#8E9EBA' // Grey
    }

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid var(--bg-secondary);
          box-shadow: 0 0 10px ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          ${animate ? `
            <span style="
              position: absolute;
              width: 26px;
              height: 26px;
              border: 2px solid ${color};
              border-radius: 50%;
              animation: ${animationClass} 2s infinite;
              pointer-events: none;
            "></span>
          ` : ''}
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }

  const resolvedLinks = useMemo(() => {
    const links: Array<{ id: string; fromPos: [number, number]; toPos: [number, number]; status: string }> = []
    NETWORK_LINKS.forEach((link, idx) => {
      const fromTower = towers.find(t => t.siteCode === link.from)
      const toTower = towers.find(t => t.siteCode === link.to)
      if (fromTower && toTower) {
        const isOffline = fromTower.status === 'OFFLINE' || toTower.status === 'OFFLINE'
        const isCritical = fromTower.status === 'CRITICAL' || toTower.status === 'CRITICAL'
        let status = 'normal'
        if (isOffline) status = 'offline'
        else if (isCritical) status = 'critical'
        
        links.push({
          id: `link-${idx}`,
          fromPos: [fromTower.latitude, fromTower.longitude],
          toPos: [toTower.latitude, toTower.longitude],
          status
        })
      }
    })
    return links
  }, [towers])

  return (
    <div style={styles.mapWrapper}>
      <div className="network-overlay"></div>
      <MapContainer
        center={[-15.41, 28.32]}
        zoom={11}
        style={{ width: '100%', height: '100%', borderRadius: '8px', zIndex: 1 }}
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={mapTiles}
        />
        
        {/* Connection Links representing Fiber/Microwave Backhaul */}
        {resolvedLinks.map(link => (
          <React.Fragment key={link.id}>
            <Polyline
              positions={[link.fromPos, link.toPos]}
              pathOptions={{
                color: link.status === 'offline' ? 'var(--text-tertiary)' : link.status === 'critical' ? 'var(--accent-danger)' : 'var(--accent-info)',
                weight: 4,
                opacity: 0.12
              }}
            />
            <Polyline
              positions={[link.fromPos, link.toPos]}
              pathOptions={{
                color: link.status === 'offline' ? 'var(--text-tertiary)' : link.status === 'critical' ? 'var(--accent-danger)' : 'var(--accent-info)',
                weight: 1.5,
                opacity: 0.8,
                className: link.status === 'offline' ? '' : 'network-link-animated'
              }}
            />
          </React.Fragment>
        ))}

        {towers.map(tower => (
          <Marker
            key={tower.id}
            position={[tower.latitude, tower.longitude]}
            icon={createMarkerIcon(tower.status)}
          >
            <Popup>
              <div style={styles.popup}>
                <div style={styles.popupHeader}>
                  <h4 style={styles.popupTitle}>{tower.name}</h4>
                  <span className="font-mono" style={styles.popupCode}>{tower.siteCode}</span>
                </div>
                <div style={styles.popupBody}>
                  <div style={styles.popupItem}>
                    <span>Status:</span>
                    <StatusBadge status={tower.status} />
                  </div>
                  <div style={styles.popupItem}>
                    <span>Power Infeed:</span>
                    <span style={styles.valueText} className="font-mono">{tower.powerSource}</span>
                  </div>
                  <div style={styles.popupItem}>
                    <span>Fuel Capacity:</span>
                    <span style={styles.valueText} className="font-mono">{tower.fuelLevel}%</span>
                  </div>
                  <div style={styles.popupItem}>
                    <span>Operators Hosted:</span>
                    <span style={styles.valueText} className="font-mono">{tower.tenantCount} / 5</span>
                  </div>
                </div>
                <Link
                  to={`/towers/${tower.id}`}
                  className="btn btn-primary"
                  style={styles.popupLink}
                >
                  View Live Telemetry
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}, (prevProps, nextProps) => {
  if (prevProps.theme !== nextProps.theme) return false
  if (prevProps.towers.length !== nextProps.towers.length) return false
  for (let i = 0; i < prevProps.towers.length; i++) {
    if (prevProps.towers[i].status !== nextProps.towers[i].status) return false
    if (prevProps.towers[i].powerSource !== nextProps.towers[i].powerSource) return false
    if (prevProps.towers[i].fuelLevel !== nextProps.towers[i].fuelLevel) return false
  }
  return true
})

export default function GlobalDashboard() {
  const { theme } = useAuthStore()
  const [towers, setTowers] = useState<Tower[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<any>({
    totalRevenue: 0,
    totalActiveTenants: 0,
    averageTenancyRatio: 0,
    underutilizedSites: 0,
    slaPenaltyExposure: 0,
    breachingTowersCount: 0
  })
  const [powerDistribution, setPowerDistribution] = useState<any[]>([])
  const [powerSwitches, setPowerSwitches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // V2 AI Panel state
  const [aiInsights, setAiInsights] = useState<any>({
    globalRiskScore: 92,
    healthIndicator: 'OPTIMAL',
    recommendations: []
  })

  // Live timeline events (correlates logs from WebSockets)
  const [timelineEvents, setTimelineEvents] = useState<any[]>([
    { id: '1', type: 'STATUS', timestamp: new Date(Date.now() - 5 * 60 * 1000), siteCode: 'LUS-WOOD-02', message: 'Uptime verification diagnostics cleared.' },
    { id: '2', type: 'SWITCH', timestamp: new Date(Date.now() - 15 * 60 * 1000), siteCode: 'LUS-CHIB-04', message: 'Switched from National Grid to Diesel Backup.' },
    { id: '3', type: 'ALERT', timestamp: new Date(Date.now() - 35 * 60 * 1000), siteCode: 'LUS-EMMS-08', message: 'Incident #1809: Enclosure cabinet door closed.' }
  ])

  // Fetch initial states
  const fetchData = useCallback(async () => {
    try {
      const [towersData, alertsData, summaryData, aiData] = await Promise.all([
        api.get('/api/towers'),
        api.get('/api/alerts'),
        api.get('/api/commercial/summary'),
        api.get('/api/ai/insights')
      ])
      
      setTowers(towersData)
      setAlerts(alertsData)
      setSummary(summaryData)
      setAiInsights(aiData)
      
      // Calculate power distribution counts
      const grid = towersData.filter((t: Tower) => t.powerSource === 'GRID' && t.status !== 'OFFLINE').length
      const solar = towersData.filter((t: Tower) => t.powerSource === 'SOLAR' && t.status !== 'OFFLINE').length
      const generator = towersData.filter((t: Tower) => t.powerSource === 'GENERATOR' && t.status !== 'OFFLINE').length
      const offline = towersData.filter((t: Tower) => t.status === 'OFFLINE').length
      
      setPowerDistribution([
        { name: 'Grid', value: grid, color: '#3B82F6' },
        { name: 'Solar', value: solar, color: '#10B981' },
        { name: 'Generator', value: generator, color: '#F59E0B' },
        { name: 'Offline', value: offline, color: '#506380' }
      ])
      
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // WebSocket real-time updates binding
  useEffect(() => {
    const socket = getSocket()

    // Telemetry updates
    socket.on('telemetry:update', (data: any) => {
      setTowers(prevTowers => 
        prevTowers.map(t => {
          if (t.id === data.towerId) {
            return {
              ...t,
              fuelLevel: data.fuelLevel,
              latestTelemetry: data
            }
          }
          return t
        })
      )
    })

    // Alert triggers
    socket.on('alert:new', (data: Alert) => {
      setAlerts(prevAlerts => [data, ...prevAlerts])
      
      // Prepend to timeline
      setTimelineEvents(prev => [
        {
          id: Math.random().toString(),
          type: 'ALERT',
          timestamp: new Date(),
          siteCode: data.tower?.siteCode || 'SITE',
          message: data.message
        },
        ...prev.slice(0, 19)
      ])

      // Re-fetch AI recommendations and commercial summaries
      Promise.all([
        api.get('/api/commercial/summary'),
        api.get('/api/ai/insights')
      ]).then(([summaryData, aiData]) => {
        setSummary(summaryData)
        setAiInsights(aiData)
      }).catch(console.error)
    })

    // Tower status transitions
    socket.on('tower:statusChange', (data: any) => {
      let siteCode = 'LUS-XXX'
      setTowers(prevTowers => {
        const found = prevTowers.find(t => t.id === data.towerId)
        if (found) siteCode = found.siteCode
        return prevTowers.map(t => {
          if (t.id === data.towerId) {
            return { ...t, status: data.newStatus }
          }
          return t
        })
      })

      setTimelineEvents(prev => [
        {
          id: Math.random().toString(),
          type: 'STATUS',
          timestamp: new Date(),
          siteCode,
          message: `Site status transitioned from ${data.oldStatus} to ${data.newStatus}`
        },
        ...prev.slice(0, 19)
      ])
    })

    // Power switching logs
    socket.on('power:switch', (data: any) => {
      let siteCode = 'LUS-XXX'
      setTowers(prevTowers => {
        const found = prevTowers.find(t => t.id === data.towerId)
        if (found) siteCode = found.siteCode
        
        setTimeout(() => {
          setPowerSwitches(prev => [
            {
              id: Math.random().toString(),
              timestamp: new Date(),
              siteCode,
              from: data.from,
              to: data.to
            },
            ...prev.slice(0, 4)
          ])
        }, 0)

        return prevTowers.map(t => {
          if (t.id === data.towerId) {
            return { ...t, powerSource: data.to }
          }
          return t
        })
      })

      setTimelineEvents(prev => [
        {
          id: Math.random().toString(),
          type: 'SWITCH',
          timestamp: new Date(),
          siteCode,
          message: `Active power feed switched from ${data.from} to ${data.to}`
        },
        ...prev.slice(0, 19)
      ])

      // Re-calculate distribution
      fetchData()
    })

    // Alert updates (dispatches, resolutions)
    socket.on('alert:updated', (data: Alert) => {
      setAlerts(prevAlerts => prevAlerts.map(a => a.id === data.id ? data : a))
      fetchData()
    })

    return () => {
      socket.off('telemetry:update')
      socket.off('alert:new')
      socket.off('alert:updated')
      socket.off('tower:statusChange')
      socket.off('power:switch')
    }
  }, [fetchData])

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/acknowledge`, {})
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      const [summaryData, aiData] = await Promise.all([
        api.get('/api/commercial/summary'),
        api.get('/api/ai/insights')
      ])
      setSummary(summaryData)
      setAiInsights(aiData)
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }, [])

  const handleDispatchAlert = useCallback(async (alertId: string, technician: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/dispatch`, { technician })
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      const aiData = await api.get('/api/ai/insights')
      setAiInsights(aiData)
    } catch (err) {
      console.error('Failed to dispatch technician:', err)
    }
  }, [])

  const handleResolveAlert = useCallback(async (alertId: string, notes: string) => {
    try {
      const updated = await api.patch(`/api/alerts/${alertId}/resolve`, { notes })
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a))
      fetchData()
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }, [fetchData])

  // State for AI Drawer
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [aiChatQuery, setAiChatQuery] = useState('')
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([
    { role: 'assistant', text: 'Hello! I am your AI Operations Analyst. Ask me anything about tower status, average fuel levels, or SLA breaches.' }
  ])
  const [isAiChatLoading, setIsAiChatLoading] = useState(false)

  const handleSendAiQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiChatQuery.trim()) return

    const userMsg = aiChatQuery
    setAiChatQuery('')
    setAiChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setIsAiChatLoading(true)

    try {
      const data = await api.post('/api/ai/query', { query: userMsg })
      setAiChatHistory(prev => [...prev, {
        role: 'assistant',
        text: data.responseText,
        matchingData: data.matchingData,
        suggestion: data.suggestion
      }])
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error processing your query. Please make sure the backend is online.' }])
    } finally {
      setIsAiChatLoading(false)
    }
  }

  const totalTowers = towers.length
  const towersOnline = towers.filter(t => t.status !== 'OFFLINE').length
  const onlineRate = totalTowers > 0 ? ((towersOnline / totalTowers) * 100).toFixed(1) : '100.0'
  const activeCriticalAlarms = alerts.filter(a => a.severity === 'CRITICAL' && (a.dispatchStatus || 'PENDING') !== 'RESOLVED').length
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>LOAD INGESTION BUFFER...</h3>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ gap: '20px' }}>
      {/* Row 1 — Executive KPI Ribbon */}
      <div style={styles.kpiRow}>
        <KPICard
          title="Towers Online"
          value={towersOnline}
          unit={`/ ${totalTowers}`}
          trend={{ value: `${onlineRate}%`, direction: 'up', label: 'Availability' }}
          icon={<TowerIcon size={18} color="var(--accent-success)" />}
          variant="success"
        />
        <KPICard
          title="Active Critical Alarms"
          value={activeCriticalAlarms}
          trend={{ value: alerts.length, direction: 'neutral', label: 'Total Alerts' }}
          icon={<ShieldAlert size={18} color={activeCriticalAlarms > 0 ? "var(--accent-danger)" : "var(--text-secondary)"} />}
          variant={activeCriticalAlarms > 0 ? 'danger' : 'primary'}
          subtext={activeCriticalAlarms > 0 ? '🔒 Threat protocols active' : '⚡ Perimeter secure'}
        />
        <KPICard
          title="Global SLA Compliance"
          value="99.68"
          unit="%"
          trend={{ value: 'Target: 99.50%', direction: 'up', label: 'SLA' }}
          icon={<Percent size={18} color="var(--accent-info)" />}
          variant="primary"
        />
        <KPICard
          title="Real-Time SLA Risk"
          value={summary.breachingTowersCount}
          unit="Sites"
          trend={{ value: 'SLA < 99.5%', direction: 'neutral', label: 'Towers' }}
          icon={<AlertOctagon size={18} color={summary.breachingTowersCount > 0 ? "var(--accent-warning)" : "var(--text-secondary)"} />}
          variant={summary.breachingTowersCount > 0 ? 'warning' : 'primary'}
          subtext="Breaching or near SLA thresholds"
        />
        <KPICard
          title="Monthly SLA Penalty Exposure"
          value={`$${summary.slaPenaltyExposure.toLocaleString()}`}
          unit="USD"
          trend={{ value: 'Service Credits', direction: 'down', label: 'Risk' }}
          icon={<DollarSign size={18} color={summary.slaPenaltyExposure > 0 ? "var(--accent-danger)" : "var(--text-secondary)"} />}
          variant={summary.slaPenaltyExposure > 0 ? 'danger' : 'primary'}
          subtext="SLA failure credits liability"
        />
        <KPICard
          title="Avg. Tenancy Ratio"
          value={summary.averageTenancyRatio}
          unit="/ 5.0"
          trend={{ value: `${summary.totalActiveTenants} Active`, direction: 'up', label: 'Tenants' }}
          icon={<TrendingUp size={18} color="var(--accent-primary)" />}
          variant="primary"
          subtext={`Underutilized Sites: ${summary.underutilizedSites}`}
        />
      </div>

      {/* Row 2 — Map & AI Recommendations Split Layout */}
      <div style={styles.middleSplit}>
        {/* Map Card */}
        <div className="card" style={{ flex: 2.2, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Lusaka Metro Infrastructure & Microwave Topology</h3>
            <span style={styles.cardTag} className="font-mono">WS Live Connections</span>
          </div>
          <NocNetworkMap towers={towers} theme={theme} />
        </div>

        {/* AI Recommendations & Operational Risk Score Card */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '280px' }}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="var(--accent-primary)" />
              <h3 style={styles.cardTitle}>AI Operations Analyst</h3>
            </div>
            <span style={{ ...styles.cardTag, backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)' }} className="font-mono">ACTIVE SWEEP</span>
          </div>

          {/* Health indicator circle */}
          <div style={styles.riskBadgeContainer}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Global Risk Index</span>
              <span style={{ fontSize: '32px', fontWeight: 900, color: aiInsights.globalRiskScore > 75 ? 'var(--accent-success)' : 'var(--accent-warning)', fontFamily: 'var(--font-mono)' }}>
                {aiInsights.globalRiskScore}%
              </span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                STATUS: {aiInsights.healthIndicator || 'OPTIMAL'}
              </span>
            </div>
          </div>

          {/* Recommendations scrolling items */}
          <div style={styles.recommendationsList}>
            {aiInsights.recommendations && aiInsights.recommendations.map((rec: any, idx: number) => (
              <div key={rec.id || idx} style={{
                ...styles.recommendationItem,
                borderLeftColor: rec.severity === 'CRITICAL' ? 'var(--accent-danger)' : (rec.severity === 'HIGH' ? 'var(--accent-warning)' : 'var(--accent-primary)')
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>{rec.siteCode} • {rec.category}</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-info)', fontWeight: 'bold' }}>{rec.confidence}% Conf.</span>
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', margin: '4px 0', color: 'var(--text-primary)' }}>{rec.title}</h4>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — Unified Status Strip */}
      <div style={styles.statusStrip} className="card">
        <div style={styles.stripSection}>
          <div style={styles.stripHeader}>
            <Power size={16} color="var(--accent-primary)" />
            <span style={styles.stripTitle}>Power Grid Infeed Status</span>
          </div>
          <div style={styles.stripMetrics}>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>●</span>
              <b>{towers.filter(t => t.powerSource === 'GRID' && t.status !== 'OFFLINE').length}</b> Grid
            </span>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-success)', marginRight: '6px' }}>●</span>
              <b>{towers.filter(t => t.powerSource === 'SOLAR' && t.status !== 'OFFLINE').length}</b> Solar
            </span>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-warning)', marginRight: '6px' }}>●</span>
              <b>{towers.filter(t => t.powerSource === 'GENERATOR' && t.status !== 'OFFLINE').length}</b> Gen
            </span>
          </div>
        </div>

        <div style={styles.stripDivider}></div>

        <div style={styles.stripSection}>
          <div style={styles.stripHeader}>
            <Shield size={16} color="var(--accent-danger)" />
            <span style={styles.stripTitle}>Security Alarm Loops</span>
          </div>
          <div style={styles.stripMetrics}>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-success)', marginRight: '6px' }}>●</span>
              <b>{towers.filter(t => t.status === 'ONLINE').length}</b> Secure
            </span>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-warning)', marginRight: '6px' }}>●</span>
              <b>{towers.filter(t => t.status === 'WARNING').length}</b> Warnings
            </span>
            <span style={{ ...styles.stripCount, color: activeCriticalAlarms > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: activeCriticalAlarms > 0 ? 'bold' : 'normal' }}>
              <span style={{ color: activeCriticalAlarms > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)', marginRight: '6px' }}>●</span>
              <b>{activeCriticalAlarms}</b> Alarms
            </span>
          </div>
        </div>

        <div style={styles.stripDivider}></div>

        <div style={styles.stripSection}>
          <div style={styles.stripHeader}>
            <Briefcase size={16} color="var(--accent-info)" />
            <span style={styles.stripTitle}>Commercial Utilization</span>
          </div>
          <div style={styles.stripMetrics}>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-info)', marginRight: '6px' }}>●</span>
              <b>{summary.totalActiveTenants}</b> Co-tenants
            </span>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>●</span>
              Ratio: <b>{summary.averageTenancyRatio}</b>
            </span>
            <span style={styles.stripCount}>
              <span style={{ color: 'var(--accent-warning)', marginRight: '6px' }}>●</span>
              <b>{summary.underutilizedSites}</b> Vacancy
            </span>
          </div>
        </div>
      </div>

      {/* Row 4 — Alert Feed & Live Activity Timeline */}
      <div style={styles.bottomSplit}>
        {/* Timeline Logger Panel */}
        <div className="card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '20px', minWidth: '300px' }}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--accent-primary)" />
              <h3 style={styles.cardTitle}>Global NOC Activity Timeline</h3>
            </div>
            <span style={styles.cardTag} className="font-mono">REALTIME TERMINAL</span>
          </div>

          <div style={{ marginTop: '12px', flexGrow: 1 }} className="terminal-console-pane">
            {timelineEvents.map((evt, idx) => (
              <div key={evt.id || idx} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(16,185,129,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'rgba(16,185,129,0.5)', marginRight: '6px' }}>
                  [{new Date(evt.timestamp).toLocaleTimeString('en-US', { hour12: false })}]
                </span>
                <span style={{ color: '#90CDF4', fontWeight: 'bold', marginRight: '8px' }}>
                  {evt.siteCode}
                </span>
                <span style={{ color: evt.type === 'ALERT' ? 'var(--accent-danger)' : (evt.type === 'SWITCH' ? 'var(--accent-warning)' : '#10B981') }}>
                  ({evt.type})
                </span>{' '}
                <span style={{ color: 'var(--text-primary)' }}>{evt.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Power Generation Profile Card */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', minWidth: '300px' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Power Generation Profile</h3>
            <span style={styles.cardTag} className="font-mono">Sites Distribution</span>
          </div>
          
          <div style={styles.chartSplit}>
            <div style={{ flex: 1, height: '150px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={powerDistribution} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" style={{ fontSize: '11px', fontWeight: 'bold', fill: 'var(--text-secondary)' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                    {powerDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.eventLogCol}>
              <h4 style={styles.logTitle}>Switch Event History</h4>
              <div style={styles.logList}>
                {powerSwitches.length === 0 ? (
                  <span style={styles.logEmpty}>No active switches. Infeeds stable.</span>
                ) : (
                  powerSwitches.map(evt => (
                    <div key={evt.id} style={styles.logItem}>
                      <span className="font-mono" style={styles.logSite}>{evt.siteCode}</span>
                      <span style={styles.logMsg}>
                        <b>{evt.from}</b> ➜ <b>{evt.to}</b>
                      </span>
                      <span style={styles.logTime} className="font-mono">
                        {evt.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Operations Analyst Trigger Button */}
      <button
        type="button"
        onClick={() => setIsAiDrawerOpen(true)}
        style={styles.floatingAiBtn}
        className="no-print"
        title="Open AI Operations Assistant"
      >
        <Sparkles size={24} />
      </button>

      {/* Slide-out AI Operations Drawer */}
      <div style={{
        ...styles.aiDrawer,
        transform: isAiDrawerOpen ? 'translateX(0)' : 'translateX(100%)'
      }} className="no-print">
        <div style={styles.aiDrawerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="var(--accent-primary)" />
            <h3 style={styles.aiDrawerTitle}>AI Operations Analyst</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(false)}
            style={styles.closeDrawerBtn}
          >
            ×
          </button>
        </div>

        {/* Dynamic Chat Pane */}
        <div style={styles.aiDrawerBody}>
          {aiChatHistory.map((msg, idx) => (
            <div key={idx} style={{
              ...styles.chatMsgWrapper,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                ...styles.chatMsg,
                backgroundColor: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)'
              }}>
                <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.text}</p>
                
                {/* Dynamically render matchingData table if it exists */}
                {msg.matchingData && msg.matchingData.length > 0 && (
                  <div style={styles.chatTableWrapper}>
                    <table style={styles.chatTable}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          {Object.keys(msg.matchingData[0]).map((k, i) => (
                            <th key={i} style={{ padding: '4px', fontSize: '10.5px', textAlign: 'left' }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.matchingData.map((row: any, rIdx: number) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            {Object.values(row).map((v: any, cIdx: number) => (
                              <td key={cIdx} style={{ padding: '4px', fontSize: '11px', fontWeight: cIdx === 0 ? 'bold' : 'normal' }}>
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Suggestion box */}
                {msg.suggestion && (
                  <div style={styles.chatSuggestionBox}>
                    <span style={{ fontWeight: 'bold', display: 'block', fontSize: '11px', color: 'var(--accent-warning)', textTransform: 'uppercase' }}>Analyst Suggestion:</span>
                    <span style={{ fontSize: '12px', marginTop: '2px', display: 'block' }}>{msg.suggestion}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAiChatLoading && (
            <div style={{ ...styles.chatMsgWrapper, alignSelf: 'flex-start' }}>
              <div style={{ ...styles.chatMsg, backgroundColor: 'var(--bg-primary)' }}>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Analyzing real-time metrics...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSendAiQuery} style={styles.aiDrawerFooter}>
          <input
            type="text"
            placeholder="Ask Analyst: e.g., 'SLA of LUS-WOOD-02'..."
            value={aiChatQuery}
            onChange={(e) => setAiChatQuery(e.target.value)}
            style={styles.chatInput}
            disabled={isAiChatLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
            disabled={isAiChatLoading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// Inject page-specific animations
const styleSheet = document.createElement('style')
styleSheet.innerText = `
  @keyframes pulse-dot {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  .status-pulse-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--accent-success);
    animation: pulse-dot 2.5s infinite;
  }
`
document.head.appendChild(styleSheet)

const styles: Record<string, React.CSSProperties> = {
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '16px',
    width: '100%'
  },
  middleSplit: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    flexWrap: 'wrap'
  },
  riskBadgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '260px',
    overflowY: 'auto'
  },
  recommendationItem: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    borderLeftWidth: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  mapCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px'
  },
  cardTitle: {
    fontSize: '14.5px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  cardTag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  mapWrapper: {
    position: 'relative',
    height: '420px',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  popup: {
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '6px'
  },
  popupTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    margin: 0
  },
  popupCode: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--accent-info)'
  },
  popupBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  popupItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  valueText: {
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  popupLink: {
    display: 'block',
    textAlign: 'center',
    padding: '6px 12px',
    fontSize: '12px',
    marginTop: '6px'
  },
  statusStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  stripSection: {
    flex: 1,
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  stripHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  stripTitle: {
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em'
  },
  stripMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px'
  },
  stripCount: {
    fontSize: '13px',
    color: 'var(--text-primary)'
  },
  stripDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: 'var(--border-subtle)',
    alignSelf: 'center'
  },
  bottomSplit: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    width: '100%'
  },
  chartSplit: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    marginTop: '12px',
    flexWrap: 'wrap',
    height: '100%'
  },
  eventLogCol: {
    flex: 1.2,
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  logTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px dashed var(--border-subtle)',
    paddingBottom: '4px'
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '120px',
    overflowY: 'auto'
  },
  logEmpty: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    padding: '12px 0'
  },
  logItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '6px 8px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)'
  },
  logSite: {
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  logMsg: {
    color: 'var(--text-primary)'
  },
  logTime: {
    color: 'var(--text-secondary)'
  },
  floatingAiBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: 'var(--glow-primary), 0 4px 20px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 1000,
    transition: 'all var(--transition-fast)'
  },
  aiDrawer: {
    position: 'fixed',
    top: 'var(--topbar-height)',
    right: 0,
    width: '450px',
    height: 'calc(100vh - var(--topbar-height))',
    backgroundColor: 'var(--bg-glass)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '1px solid var(--border-subtle)',
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform var(--transition-normal)'
  },
  aiDrawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(5, 11, 20, 0.2)'
  },
  aiDrawerTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  closeDrawerBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
    transition: 'color var(--transition-fast)'
  },
  aiDrawerBody: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  chatMsgWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '85%',
    marginBottom: '8px'
  },
  chatMsg: {
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-subtle)',
    fontSize: '13px',
    lineHeight: 1.4
  },
  chatTableWrapper: {
    marginTop: '12px',
    width: '100%',
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  chatTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)'
  },
  chatSuggestionBox: {
    marginTop: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeft: '3px solid var(--accent-warning)',
    color: 'var(--text-primary)'
  },
  aiDrawerFooter: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    gap: '12px',
    background: 'rgba(5, 11, 20, 0.2)'
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color var(--transition-fast)'
  }
}
