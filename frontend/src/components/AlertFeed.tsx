import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../types'
import { AlertCircle, AlertTriangle, Info, Check, ShieldAlert, Coins } from 'lucide-react'

interface AlertFeedProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: string) => void
  maxHeight?: string | number
  showTowerInfo?: boolean
}

function AlertFeed({
  alerts,
  onAcknowledge,
  onDispatch,
  onResolve,
  maxHeight = '400px',
  showTowerInfo = true
}: AlertFeedProps & {
  onDispatch?: (alertId: string, technician: string) => void
  onResolve?: (alertId: string, notes: string) => void
}) {
  const navigate = useNavigate()

  const [dispatchingId, setDispatchingId] = React.useState<string | null>(null)
  const [resolvingId, setResolvingId] = React.useState<string | null>(null)
  const [techName, setTechName] = React.useState('Chikoma Phiri')
  const [resolutionNotes, setResolutionNotes] = React.useState('')

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'alert-item-critical'
      case 'HIGH': return 'alert-item-warning'
      default: return 'alert-item-info'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <ShieldAlert size={20} color="var(--accent-danger)" />
      case 'HIGH': return <AlertTriangle size={20} color="var(--accent-warning)" />
      default: return <Info size={20} color="var(--accent-info)" />
    }
  }

  const getFinancialImpact = (alert: Alert) => {
    switch (alert.type) {
      case 'FUEL_THEFT':
        return 'Est. Loss: K18,500 + Tamper Risk'
      case 'UNAUTHORIZED_ACCESS':
        return 'Critical Security Breach (Audit Alert)'
      case 'TEMP_HIGH':
        return 'Uptime Risk: SLA Exposure K4,200/hr'
      case 'SLA_BREACH':
        return 'Penalty Triggered: Service Credit Liability'
      case 'LOW_FUEL':
        return 'Generator Depletion SLA Risk: K9,500'
      default:
        return null
    }
  }

  const handleAlertClick = (towerId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking interactive controls
    if ((event.target as HTMLElement).closest('.ack-btn') || (event.target as HTMLElement).closest('.dispatch-panel') || (event.target as HTMLElement).closest('.resolve-panel')) {
      return
    }
    navigate(`/towers/${towerId}`)
  }

  const submitDispatch = (alertId: string) => {
    if (onDispatch && techName) {
      onDispatch(alertId, techName)
      setDispatchingId(null)
    }
  }

  const submitResolution = (alertId: string) => {
    if (onResolve && resolutionNotes) {
      onResolve(alertId, resolutionNotes)
      setResolvingId(null)
      setResolutionNotes('')
    }
  }

  if (alerts.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Check size={28} color="var(--accent-success)" />
        <span style={styles.emptyText}>All systems operational. No active alarms.</span>
      </div>
    )
  }

  return (
    <div style={{ ...styles.container, maxHeight: maxHeight }}>
      {alerts.map(alert => {
        const severityClass = getSeverityClass(alert.severity)
        const financialImpact = getFinancialImpact(alert)
        const dispatchStatus = alert.dispatchStatus || 'PENDING'
        
        return (
          <div
            key={alert.id}
            className={`alert-item ${severityClass}`}
            onClick={(e) => handleAlertClick(alert.towerId, e)}
            style={{
              cursor: 'pointer',
              opacity: alert.isAcknowledged && dispatchStatus === 'RESOLVED' ? 0.65 : 1,
            }}
          >
            <div style={styles.iconCol}>
              {getSeverityIcon(alert.severity)}
            </div>

            <div style={styles.contentCol}>
              <div style={styles.alertHeader}>
                {showTowerInfo && alert.tower && (
                  <span style={styles.towerLabel} className="font-mono">
                    {alert.tower.siteCode} — {alert.tower.name}
                  </span>
                )}
                <span style={styles.timestamp}>
                  {new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <p style={styles.message}>{alert.message}</p>

              {/* Sub-panels for Interactive Workflows */}
              {alert.isAcknowledged && dispatchStatus === 'PENDING' && dispatchingId === alert.id && (
                <div className="dispatch-panel" style={styles.actionPanel}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Assign Regional Technician:</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <select
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      style={styles.panelSelect}
                    >
                      <option value="Chikoma Phiri">Chikoma Phiri (Central Sector)</option>
                      <option value="Mwansa Kapwepwe">Mwansa Kapwepwe (North Sector)</option>
                      <option value="Mulenga Banda">Mulenga Banda (East Sector)</option>
                      <option value="Kabaso Musonda">Kabaso Musonda (West Sector)</option>
                      <option value="Mwape Tembo">Mwape Tembo (South Sector)</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => submitDispatch(alert.id)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDispatchingId(null)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {dispatchStatus === 'DISPATCHED' && resolvingId === alert.id && (
                <div className="resolve-panel" style={styles.actionPanel}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Enter Resolution Report Details:</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexDirection: 'column' }}>
                    <input
                      type="text"
                      placeholder="e.g., Starter fuse replaced, diesel refueled 200L"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      style={styles.panelInput}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => submitResolution(alert.id)}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Submit Resolution
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setResolvingId(null)}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.alertFooter}>
                {financialImpact && (
                  <span style={styles.financialTag}>
                    <Coins size={12} style={{ marginRight: '4px' }} />
                    {financialImpact}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Status labels / Buttons based on workflow state */}
                  {alert.isAcknowledged ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="ack-btn">
                      <span style={styles.ackBadge}>
                        Ack: @{alert.acknowledgedBy}
                      </span>
                      
                      {dispatchStatus === 'PENDING' && dispatchingId !== alert.id && onDispatch && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setTechName('Chikoma Phiri')
                            setDispatchingId(alert.id)
                          }}
                          style={styles.actionBtn}
                        >
                          Dispatch Crew
                        </button>
                      )}

                      {dispatchStatus === 'DISPATCHED' && (
                        <span style={styles.dispatchedBadge}>
                          Dispatched: {alert.dispatchedTechnician}
                        </span>
                      )}

                      {dispatchStatus === 'DISPATCHED' && resolvingId !== alert.id && onResolve && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setResolutionNotes('')
                            setResolvingId(alert.id)
                          }}
                          style={styles.actionBtn}
                        >
                          Resolve Alarm
                        </button>
                      )}

                      {dispatchStatus === 'RESOLVED' && (
                        <span style={styles.resolvedBadge}>
                          Resolved: {alert.resolutionNotes}
                        </span>
                      )}
                    </div>
                  ) : (
                    onAcknowledge && (
                      <button
                        type="button"
                        className="btn btn-secondary ack-btn"
                        onClick={() => onAcknowledge(alert.id)}
                        style={styles.ackBtn}
                      >
                        Acknowledge
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px 0',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)'
  },
  emptyText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    fontWeight: 'bold'
  },
  iconCol: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px'
  },
  contentCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '12px'
  },
  towerLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  timestamp: {
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  message: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.4
  },
  alertFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  financialTag: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--accent-warning)',
    fontSize: '12px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(245, 158, 11, 0.15)'
  },
  ackBadge: {
    fontSize: '12px',
    color: 'var(--accent-success)',
    fontWeight: 700,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  ackBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-tertiary)'
  },
  actionPanel: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'default'
  },
  panelSelect: {
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    flexGrow: 1
  },
  panelInput: {
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%'
  },
  actionBtn: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-tertiary)',
    cursor: 'pointer'
  },
  dispatchedBadge: {
    fontSize: '12px',
    color: 'var(--accent-info)',
    fontWeight: 700,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  resolvedBadge: {
    fontSize: '12px',
    color: 'var(--accent-success)',
    fontWeight: 700,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px'
  }
}

export default React.memo(AlertFeed)

