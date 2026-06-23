import React from 'react'
import { TowerStatus } from '../types'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeClass = () => {
    switch (status) {
      case 'ONLINE': return 'status-badge-online'
      case 'WARNING': return 'status-badge-warning'
      case 'CRITICAL': return 'status-badge-critical'
      case 'OFFLINE': return 'status-badge-offline'
      case 'DISPATCHED': return 'status-badge-dispatched'
      case 'RESOLVED': return 'status-badge-resolved'
      default: return 'status-badge-offline'
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'ONLINE': return 'Online'
      case 'WARNING': return 'Warning'
      case 'CRITICAL': return 'Critical'
      case 'OFFLINE': return 'Offline'
      case 'DISPATCHED': return 'Dispatched'
      case 'RESOLVED': return 'Resolved'
      default: return status
    }
  }

  const showPulse = status === 'WARNING' || status === 'CRITICAL'

  return (
    <div className={`status-badge ${getBadgeClass()}`}>
      <span className={`pulse-dot ${showPulse ? 'pulse-dot-active' : ''}`} />
      <span>{getLabel()}</span>
    </div>
  )
}
