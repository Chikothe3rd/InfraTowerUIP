import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { Shield, User, Lock, Activity, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, error, isLoading, initAuth } = useAuthStore()
  
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('infratel2026')
  const [selectedRole, setSelectedRole] = useState<'OPERATOR' | 'ADMIN'>('OPERATOR')

  const from = (location.state as any)?.from?.pathname || '/'

  useEffect(() => {
    // If already authenticated, redirect
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleRoleSelection = (role: 'OPERATOR' | 'ADMIN') => {
    setSelectedRole(role)
    setUsername(role.toLowerCase())
    setPassword('infratel2026')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
    } catch (err) {
      // Handled in store
    }
  }

  return (
    <div style={styles.container}>
      {/* High precision tech grid overlay */}
      <div className="network-grid-overlay" style={styles.gridOverlay}></div>
      
      {/* Floating interactive gradient glow nodes (Stripe/Linear style) */}
      <div className="glow-node-1" style={styles.glowNode1}></div>
      <div className="glow-node-2" style={styles.glowNode2}></div>

      {/* Sleek, deep glass login card */}
      <div style={styles.card} className="card login-card-container">
        
        {/* Amazon-style Tech Logo Header */}
        <div style={styles.logoContainer}>
          {/* Custom pulsing network tower SVG */}
          <svg viewBox="0 0 48 48" width="56" height="56" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px' }}>
            <defs>
              <radialGradient id="peakPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="24" cy="12" r="10" fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3,3" opacity="0.6">
              <animate attributeName="r" values="8;14;8" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="24" cy="12" r="16" fill="none" stroke="#3B82F6" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.3">
              <animate attributeName="r" values="12;20;12" dur="5s" repeatCount="indefinite" />
            </circle>
            <line x1="24" y1="12" x2="13" y2="42" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="12" x2="35" y2="42" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <line x1="13" y1="42" x2="35" y2="42" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="28" x2="30" y2="28" stroke="#8899B4" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="28" x2="24" y2="12" stroke="#8899B4" strokeWidth="1" />
            <line x1="30" y1="28" x2="24" y2="12" stroke="#8899B4" strokeWidth="1" />
            <circle cx="24" cy="12" r="6" fill="url(#peakPulse)" />
            <circle cx="24" cy="12" r="2.5" fill="#E2E8F0" />
            <circle cx="13" cy="42" r="3" fill="#0B1929" stroke="#E2E8F0" strokeWidth="1.5" />
            <circle cx="35" cy="42" r="3" fill="#0B1929" stroke="#E2E8F0" strokeWidth="1.5" />
          </svg>
          
          {/* Custom wordmark with Amazon-style Swoop Connection Arrow */}
          <svg viewBox="0 0 240 60" width="210" height="50" xmlns="http://www.w3.org/2000/svg">
            <text x="14" y="34" fontFamily="'Lato', 'Inter', system-ui, sans-serif" fontSize="26" fontWeight="900" fill="#F8FAFC" letterSpacing="0.03em">
              Infra<tspan fill="#8899B4" fontWeight="300">Tower</tspan><tspan fill="#3B82F6" fontWeight="900">UIP</tspan>
            </text>
            <path d="M 22,42 Q 105,55 194,40" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 188,34 L 196,40 L 189,46" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={styles.philosophyTag}>
          "Unified Operational Intelligence — Efficiency through Centralized Monitoring"
        </div>

        {/* Demo Quick Select Profile Selector (Tech pills) */}
        <div style={styles.roleSelectorContainer}>
          <p style={styles.selectorLabel}>NOC Access Profiles</p>
          <div style={styles.selectorButtons}>
            <button
              type="button"
              onClick={() => handleRoleSelection('OPERATOR')}
              className={`role-pill ${selectedRole === 'OPERATOR' ? 'active' : ''}`}
              style={styles.selectorBtn}
            >
              <User size={14} />
              NOC Operator
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelection('ADMIN')}
              className={`role-pill ${selectedRole === 'ADMIN' ? 'active' : ''}`}
              style={styles.selectorBtn}
            >
              <Shield size={14} />
              System Admin
            </button>
          </div>
        </div>

        {/* Sleek Error Notification panel */}
        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                className="login-input"
                placeholder="operator / admin"
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                className="login-input"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
            style={styles.submitBtn}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spin" />
                Synchronizing Secure Ingress...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Minimalist Tech Footer */}
        <div style={styles.footer}>
          <span>Secured Terminal Node | v1.0.0</span>
          <span>© 2026 InfraTowerUIP</span>
        </div>
      </div>
    </div>
  )
}

// Inject keyframes and styles for interactive Linear/Stripe style elements
const styleSheet = document.createElement('style')
styleSheet.innerText = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes float-glow-1 {
    0% { transform: translate(0px, 0px) scale(1); }
    50% { transform: translate(60px, 40px) scale(1.1); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  @keyframes float-glow-2 {
    0% { transform: translate(0px, 0px) scale(1.1); }
    50% { transform: translate(-60px, -40px) scale(1); }
    100% { transform: translate(0px, 0px) scale(1.1); }
  }
  
  .glow-node-1 {
    animation: float-glow-1 12s ease-in-out infinite;
  }
  .glow-node-2 {
    animation: float-glow-2 15s ease-in-out infinite;
  }

  .network-grid-overlay {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 32px 32px;
    background-position: center;
    pointer-events: none;
    z-index: 1;
  }

  .login-card-container {
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .login-card-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .login-input {
    border: 1px solid rgba(226, 232, 240, 0.08);
    background-color: rgba(15, 23, 42, 0.6);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }

  .login-input:focus {
    border-color: #3B82F6 !important;
    background-color: #0a1727 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 8px 24px rgba(0,0,0,0.3) !important;
  }

  .role-pill {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid rgba(255, 255, 255, 0.06);
    background-color: rgba(255, 255, 255, 0.02);
    color: #8899B4;
  }

  .role-pill:hover {
    background-color: rgba(226, 232, 240, 0.06);
    border-color: rgba(226, 232, 240, 0.12);
    color: #F8FAFC;
  }

  .role-pill.active {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border-color: rgba(59, 130, 246, 0.4) !important;
    color: #3B82F6 !important;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.02);
  }

  .submit-button {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    border: none;
    border-radius: 8px;
    color: #FFFFFF;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .submit-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35), 0 0 0 2px rgba(37, 99, 235, 0.2);
    transform: translateY(-1px);
  }

  .submit-button:active:not(:disabled) {
    transform: translateY(0.5px);
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  }
`
document.head.appendChild(styleSheet)

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#050B14', // Sleek Near Black/Navy
    overflow: 'hidden',
  },
  gridOverlay: {
    opacity: 0.8,
  },
  glowNode1: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    left: '10%',
    top: '15%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(5,11,20,0) 70%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  glowNode2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    right: '15%',
    bottom: '10%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(5,11,20,0) 70%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    padding: '36px',
    zIndex: 10,
    backgroundColor: 'rgba(10, 20, 35, 0.55)', // Highly refined glassmorphism
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    textAlign: 'center',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '10px',
  },
  philosophyTag: {
    fontSize: '12px',
    color: '#506380',
    fontStyle: 'italic',
    lineHeight: 1.4,
    marginBottom: '28px',
    padding: '0 10px',
  },
  roleSelectorContainer: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  selectorLabel: {
    fontSize: '11px',
    color: '#8899B4',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  selectorButtons: {
    display: 'flex',
    gap: '10px',
  },
  selectorBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
    border: '1px solid rgba(255,255,255,0.05)',
    outline: 'none',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    color: '#EF4444',
    padding: '10px 14px',
    fontSize: '13px',
    textAlign: 'left',
    marginBottom: '20px',
  },
  form: {
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: '0.02em',
    marginBottom: '6px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#506380',
  },
  input: {
    width: '100%',
    padding: '11px 12px 11px 36px',
    borderRadius: '8px',
    color: '#F8FAFC',
    outline: 'none',
    fontSize: '14px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    marginTop: '6px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#506380',
    marginTop: '28px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
  }
}
