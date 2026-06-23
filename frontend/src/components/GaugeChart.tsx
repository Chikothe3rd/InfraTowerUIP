import React from 'react'

interface GaugeChartProps {
  value: number
  min?: number
  max?: number
  title: string
  unit?: string
  alertThreshold?: number
  thresholdType?: 'high' | 'low' // high = spike alert, low = drop alert (like fuel)
}

export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  title,
  unit = '',
  alertThreshold,
  thresholdType = 'high'
}: GaugeChartProps) {
  // Clamp value
  const clampedValue = Math.max(min, Math.min(max, value))
  const percentage = ((clampedValue - min) / (max - min)) * 100

  // Calculate SVG arc parameters
  const radius = 50
  const circumference = 2 * Math.PI * radius
  // We'll do a 3/4 circle (270 degrees) gauge starting from bottom-left
  const arcLength = circumference * 0.75
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength

  // Determine indicator color
  let color = '#003388' // Resolution Blue
  let isAlert = false

  if (alertThreshold !== undefined) {
    if (thresholdType === 'high' && value >= alertThreshold) {
      color = '#EF4444' // Alert Red
      isAlert = true
    } else if (thresholdType === 'low' && value <= alertThreshold) {
      color = '#EF4444' // Alert Red
      isAlert = true
    } else if (thresholdType === 'low' && value <= alertThreshold * 2) {
      color = '#F59E0B' // Safety Amber
    } else if (thresholdType === 'high' && value >= alertThreshold * 0.8) {
      color = '#F59E0B' // Safety Amber
    } else {
      color = '#10B981' // Online Green
    }
  }

  return (
    <div style={styles.container}>
      <span style={styles.title}>{title}</span>
      
      <div style={styles.gaugeWrapper}>
        <svg viewBox="0 0 120 120" style={styles.svg}>
          {/* Track background */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth="8"
            strokeDasharray={arcLength}
            strokeDashoffset="0"
            transform="rotate(135 60 60)"
            strokeLinecap="round"
          />
          {/* Active fill */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(135 60 60)"
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 350ms cubic-bezier(0.4, 0, 0.2, 1), stroke 350ms'
            }}
          />
        </svg>

        {/* Center overlay readout */}
        <div style={styles.readout}>
          <span 
            style={{ 
              ...styles.value, 
              color: isAlert ? 'var(--accent-danger)' : 'var(--text-primary)',
              animation: isAlert ? 'blink 1.5s infinite' : 'none'
            }} 
            className="font-mono"
          >
            {value.toFixed(1)}
          </span>
          <span style={styles.unit}>{unit}</span>
        </div>
      </div>
    </div>
  )
}

// Inject keyframe style for temperature blinking alert
const styleSheet = document.createElement('style');
styleSheet.innerText = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;
document.head.appendChild(styleSheet);

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    height: '100%'
  },
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  gaugeWrapper: {
    position: 'relative',
    width: '140px',
    height: '140px'
  },
  svg: {
    width: '100%',
    height: '100%'
  },
  readout: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '10px'
  },
  value: {
    fontSize: '26px',
    fontWeight: 900,
    lineHeight: 1
  },
  unit: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    fontWeight: 'bold'
  }
}
