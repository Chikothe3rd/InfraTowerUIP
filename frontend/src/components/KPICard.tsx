import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  trend?: {
    value: number | string
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  subtext?: string
  onClick?: () => void
}

function KPICard({
  title,
  value,
  unit = '',
  trend,
  icon,
  variant = 'primary',
  subtext = '',
  onClick
}: KPICardProps) {
  return (
    <div 
      className={`kpi-glass-card ${variant}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="kpi-card-header">
        <span className="kpi-card-title-text">
          {title}
        </span>
        {icon && (
          <div className="kpi-card-icon-wrapper">
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="kpi-card-value-display">
          {value}
          {unit && <span className="kpi-card-unit-text">{unit}</span>}
        </div>
      </div>

      <div className="kpi-card-footer">
        {trend && (
          <div className="kpi-card-trend-badge">
            {trend.direction === 'up' && <TrendingUp size={14} />}
            {trend.direction === 'down' && <TrendingDown size={14} />}
            {trend.direction === 'neutral' && <AlertTriangle size={14} />}
            <span>{trend.value}</span>
            {trend.label && <span className="kpi-trend-label">{trend.label}</span>}
          </div>
        )}

        {subtext && (
          <div className="kpi-card-subtext">
            {subtext}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(KPICard)

