import React from 'react'
import { PowerSource } from '../types'
import { Power, Sun, Zap, HelpCircle } from 'lucide-react'

interface PowerSourceIndicatorProps {
  activeSource: PowerSource
  gridPower?: number
  solarPower?: number
  generatorPower?: number
  animate?: boolean
}

export default function PowerSourceIndicator({
  activeSource,
  gridPower = 0,
  solarPower = 0,
  generatorPower = 0,
  animate = true
}: PowerSourceIndicatorProps) {
  const sources = [
    {
      id: 'GRID',
      label: 'National Grid',
      icon: <Power size={22} />,
      power: gridPower,
      activeColor: '#3B82F6', // Info Blue
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)'
    },
    {
      id: 'SOLAR',
      label: 'Solar Array',
      icon: <Sun size={22} />,
      power: solarPower,
      activeColor: '#10B981', // Online Green
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      id: 'GENERATOR',
      label: 'Diesel Generator',
      icon: <Zap size={22} />,
      power: generatorPower,
      activeColor: '#F59E0B', // Safety Amber
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)'
    }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {sources.map(src => {
          const isActive = activeSource === src.id
          return (
            <div
              key={src.id}
              style={{
                ...styles.sourceCard,
                backgroundColor: isActive ? src.bgColor : 'var(--bg-secondary)',
                borderColor: isActive ? src.activeColor : 'var(--border-subtle)',
                boxShadow: isActive ? `0 0 15px ${src.activeColor}33` : 'none',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 250ms ease'
              }}
            >
              <div
                style={{
                  ...styles.iconWrapper,
                  backgroundColor: isActive ? src.activeColor : 'var(--bg-tertiary)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)'
                }}
              >
                {src.icon}
              </div>

              <div style={styles.details}>
                <span style={styles.label}>{src.label}</span>
                <span style={styles.powerReadout} className="font-mono">
                  {src.power.toFixed(2)} kW
                </span>
              </div>

              {isActive && (
                <div style={styles.activeIndicator}>
                  <span
                    style={{
                      ...styles.pulseRing,
                      borderColor: src.activeColor,
                      animation: animate ? 'pulse-border 2s infinite' : 'none'
                    }}
                  />
                  <span style={{ ...styles.activeDot, backgroundColor: src.activeColor }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* SVG Connection Lines Visual Flow */}
      <div style={styles.flowDiagram}>
        <svg width="100%" height="40" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--border-subtle)" />
              <stop offset="50%" stopColor={sources.find(s => s.id === activeSource)?.activeColor || '#003388'} />
              <stop offset="100%" stopColor="var(--infratel-blue)" />
            </linearGradient>
          </defs>
          {/* Connector paths */}
          <path d="M 50 0 L 50 20 L 150 20" fill="none" stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray={animate ? "5,5" : "none"} style={{ animation: animate ? 'dash 15s linear infinite' : 'none' }} />
          <path d="M 150 0 L 150 20" fill="none" stroke="url(#flowGrad)" strokeWidth="2" />
          <path d="M 250 0 L 250 20 L 150 20" fill="none" stroke="url(#flowGrad)" strokeWidth="2" />
          {/* Main output node */}
          <circle cx="150" cy="20" r="4" fill="var(--infratel-blue)" />
        </svg>
        <div style={styles.siteNode}>
          <span style={styles.siteNodeLabel}>TOWER BUSBAR INFEED</span>
        </div>
      </div>
    </div>
  )
}

// Inject keyframes for indicator pulse and dash scrolling
const styleSheet = document.createElement('style');
styleSheet.innerText = `
  @keyframes pulse-border {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes dash {
    to { stroke-dashoffset: -100; }
  }
`;
document.head.appendChild(styleSheet);

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    width: '100%'
  },
  sourceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid',
    position: 'relative',
    overflow: 'hidden'
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    flexShrink: 0
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  label: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 'bold'
  },
  powerReadout: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginTop: '2px'
  },
  activeIndicator: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '12px',
    height: '12px'
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '1px solid',
    borderRadius: '50%'
  },
  flowDiagram: {
    display: 'none', // Hide flow diagram by default unless nested in a specialized card
    position: 'relative',
    height: '40px',
    marginTop: '4px'
  },
  siteNode: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '-4px'
  },
  siteNodeLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 'bold',
    letterSpacing: '0.05em'
  }
}
