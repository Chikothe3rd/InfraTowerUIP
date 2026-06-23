import React, { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { useAuth } from '../hooks/use-auth'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import {
  LayoutDashboard,
  Shield,
  Briefcase,
  FileBarChart,
  LogOut,
  Sun,
  Moon,
  Clock,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  History,
  Search,
  Bell,
  Globe,
  AlertCircle,
  Power,
  Flame,
  Compass,
  Send,
  MessageSquare
} from 'lucide-react'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const { theme, setTheme } = useAuthStore()
  
  const [collapsed, setCollapsed] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const [isAiChatOpen, setIsAiChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: 'bot',
      text: `Hello! I am Antigravity AI Operations Analyst. I monitor the InfraTower network in real-time. Ask me things like "Which towers are offline?" or "Show active fuel alerts".`,
      timestamp: new Date()
    }
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAiChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isAiChatOpen])

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim()) return

    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date() }])
    setIsTyping(true)

    try {
      const response = await api.post('/api/ai/query', { query: userText })
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: response.responseText,
          timestamp: new Date(),
          data: response.matchingData,
          suggestion: response.suggestion
        }
      ])
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Communication uplink failed. AI processing is offline. Please retry.',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // 1. Live Time Update loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Incident count fetch & Real-time update binding
  useEffect(() => {
    async function loadAlertsCount() {
      try {
        const alertsData = await api.get('/api/alerts?isAcknowledged=false')
        setActiveAlertsCount(alertsData.length)
      } catch (err) {
        console.error('Failed to load active alerts count:', err)
      }
    }
    loadAlertsCount()

    const socket = getSocket()
    const handleNewAlert = () => {
      setActiveAlertsCount(c => c + 1)
    }
    
    socket.on('alert:new', handleNewAlert)
    
    // Periodically sync count every 15 seconds as fallback
    const interval = setInterval(loadAlertsCount, 15000)

    return () => {
      socket.off('alert:new', handleNewAlert)
      clearInterval(interval)
    }
  }, [])

  // Format Timezones
  const formatCATTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: 'Africa/Lusaka',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' CAT'
  }

  const formatUTCTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' UTC'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  let navItems: { path: string, label: string, icon: JSX.Element }[] = []

  if (user?.role === 'ADMIN') {
    navItems = [
      { path: '/analytics', label: 'Executive Dashboard', icon: <FileBarChart size={18} /> },
      { path: '/audit-log', label: 'Audit Trail', icon: <History size={18} /> }
    ]
  } else {
    navItems = [
      { path: '/', label: 'Global NOC Command', icon: <LayoutDashboard size={18} /> },
      { path: '/noc', label: 'Infrastructure NOC', icon: <Activity size={18} /> },
      { path: '/power', label: 'Intelligent Power', icon: <Power size={18} /> },
      { path: '/fuel', label: 'Fuel & Generator', icon: <Flame size={18} /> },
      { path: '/security', label: 'SOC Security', icon: <Shield size={18} /> },
      { path: '/sensors', label: 'Sensors & Env', icon: <Compass size={18} /> },
      { path: '/commercial', label: 'Commercial Hub', icon: <Briefcase size={18} /> },
      { path: '/analytics', label: 'Analytics Reports', icon: <FileBarChart size={18} /> }
    ]
  }

  const getPhilosophySubtitle = () => {
    switch (location.pathname) {
      case '/': return 'Global NOC Command Center — Enterprise Real-Time Operations Panel'
      case '/noc': return 'Infrastructure Operations Center — Live Tower Heartbeats & SLA Compliance'
      case '/power': return 'Intelligent Power Monitoring — Grid, Solar & Automated Switch Analytics'
      case '/fuel': return 'Fuel & Generator Intelligence — AI Theft Detection & Depletion Forecasting'
      case '/security': return 'Security Operations Center (SOC) — CCTV Feeds & Intrusion Detection Console'
      case '/sensors': return 'Sensors & Environmental NOC — Rack Temperature, Smoke & Fire Alarm Dials'
      case '/commercial': return 'Commercial Intelligence Hub — Tenant Co-location Space & Upside Opportunity Finder'
      case '/analytics': return 'Executive Analytics Engine — Predictive BI Forecasts & Report Exports'
      case '/audit-log': return 'System Traceability — Corporate Transparency and Access Auditing'
      default:
        if (location.pathname.startsWith('/towers/')) {
          return 'Asset Intelligence — Maximizing Infrastructure ROI'
        }
        return 'InfraTowerUIP'
    }
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Global NOC Command Center'
      case '/noc': return 'Infrastructure Operations'
      case '/power': return 'Power Operations Center'
      case '/fuel': return 'Fuel & Generator Intelligence'
      case '/security': return 'Security Operations (SOC)'
      case '/sensors': return 'Sensors & Environmental NOC'
      case '/commercial': return 'Commercial Intelligence Hub'
      case '/analytics': return user?.role === 'ADMIN' ? 'Executive Dashboard' : 'Analytics & Reporting'
      case '/audit-log': return 'Administrative Audit Logs'
      default:
        if (location.pathname.startsWith('/towers/')) {
          return 'Tower Site Analytics'
        }
        return 'InfraTowerUIP'
    }
  }

  return (
    <div className="app-wrapper">
      {/* 1. Full-Width Fixed Header Topbar (Chikoma profile layout template) */}
      <header className="topbar-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo container */}
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
            <svg viewBox="0 0 240 60" width="130" height="32" xmlns="http://www.w3.org/2000/svg">
              <text x="10" y="34" fontFamily="'Lato', 'Inter', system-ui, sans-serif" fontSize="26" fontWeight="900" fill="#FFFFFF" letterSpacing="0.03em">
                Infra<tspan fill="rgba(255,255,255,0.65)" fontWeight="300">Tower</tspan><tspan fill="#90CDF4" fontWeight="900">UIP</tspan>
              </text>
              <path d="M 18,42 Q 105,55 194,40" fill="none" stroke="#90CDF4" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 188,34 L 196,40 L 189,46" fill="none" stroke="#90CDF4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* System tag */}
          <div style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#90CDF4',
            border: '1px solid rgba(144, 205, 244, 0.3)',
            backgroundColor: 'rgba(144, 205, 244, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginLeft: '8px'
          }}>
            SIM-NOC
          </div>
        </div>

        {/* Center Search Element */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '260px' }}>
          <Search size={14} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px' }} />
          <input
            type="text"
            placeholder="Search telemetries, towers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="topbar-search-input"
            style={{
              width: '100%',
              padding: '8px 16px 8px 36px',
              borderRadius: '30px',
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              fontSize: '12px',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
          />
        </div>

        {/* Right Topbar actions (Incidents, Clocks, Bell, Profile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          {/* Incidents Counter widget */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 14px', 
            borderRadius: '30px', 
            backgroundColor: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.3s ease'
          }}>
            {activeAlertsCount > 0 ? (
              <span className="incident-blink-dot"></span>
            ) : (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
            )}
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 800, 
              color: activeAlertsCount > 0 ? '#FCA5A5' : 'rgba(255,255,255,0.8)',
              letterSpacing: '0.05em'
            }}>
              {activeAlertsCount} {activeAlertsCount === 1 ? 'INCIDENT' : 'INCIDENTS'}
            </span>
          </div>

          {/* Clocks widget */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            backgroundColor: 'rgba(255,255,255,0.04)', 
            padding: '6px 16px', 
            borderRadius: '30px', 
            border: '1px solid rgba(255,255,255,0.08)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>CAT</span>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{formatCATTime().replace(' CAT', '')}</span>
            </div>
            <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block' }}></span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>UTC</span>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{formatUTCTime().replace(' UTC', '')}</span>
            </div>
          </div>

          {/* Bell Icon */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={18} color="#FFFFFF" style={{ cursor: 'pointer' }} />
            {activeAlertsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-danger)',
                boxShadow: 'var(--glow-danger)'
              }}></span>
            )}
          </div>

          {/* User profile dropdown pill */}
          <div 
            style={{ position: 'relative' }}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: '30px',
                transition: 'all 0.2s',
                backgroundColor: showProfileMenu ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                fontWeight: 'bold',
                fontSize: '11px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {user?.username.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>@{user?.username}</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#90CDF4', textTransform: 'uppercase' }}>{user?.role}</span>
              </div>
            </div>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '190px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                padding: '6px',
                zIndex: 200,
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ACCOUNT SETTINGS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="dropdown-item-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left'
                  }}
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }}></div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="dropdown-item-btn danger"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left'
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Content Body Layout (Sidebar + Main Content Area starts below topbar) */}
      <div className="layout-body">
        {/* Sidebar Nav */}
        <aside 
          className="sidebar-panel no-print" 
          style={{
            width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)'
          }}
        >
          {/* Sidebar Menu Title (matches Chikoma's "Dashboard" section header) */}
          {!collapsed && (
            <div className="sidebar-section-title">
              Dashboard
            </div>
          )}

          {/* Navigation Items */}
          <nav className="sidebar-nav">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path))
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-link ${isActive ? 'active-link' : ''}`}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '12px 0' : '12px 18px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Collapsible toggle button */}
          <button 
            type="button" 
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: 'absolute',
              bottom: '125px',
              right: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Bottom user profile card + Sign Out */}
          <div className="sidebar-footer-container" style={{ padding: collapsed ? '12px 6px' : '16px' }}>
            {collapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div 
                  className="sidebar-user-mini-avatar" 
                  style={{ width: '32px', height: '32px' }}
                  title={`@${user?.username} (${user?.role})`}
                >
                  {user?.username.substring(0, 2).toUpperCase()}
                </div>
                <button 
                  type="button" 
                  onClick={handleLogout}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#EF4444', 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  className="sidebar-collapsed-logout"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="sidebar-user-mini-card">
                  <div className="sidebar-user-mini-avatar">
                    {user?.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="sidebar-user-mini-info">
                    <span className="sidebar-user-mini-name">@{user?.username}</span>
                    <span className="sidebar-user-mini-role">{user?.role === 'ADMIN' ? 'System Administrator' : 'NOC Operator'}</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleLogout}
                  className="sidebar-logout-button"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main content viewport */}
        <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
          {/* Main Title Banner inside content, mimicking Chikoma's profile header banner */}
          <div className="page-title-banner no-print">
            <div className="page-title-banner-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 className="page-title-banner-title">{getPageTitle()}</h2>
                {location.pathname === '/' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--accent-success)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '50px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>
                    <span style={{ marginRight: '6px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                    NOC ACTIVE
                  </div>
                )}
              </div>
              <span className="page-title-banner-subtitle">{getPhilosophySubtitle()}</span>
            </div>
            <div>
              <button 
                className="btn btn-secondary font-sans" 
                onClick={() => window.location.reload()}
                style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Outlet component container */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
        </main>

        {/* Floating AI Assistant FAB */}
        <button
          type="button"
          onClick={() => setIsAiChatOpen(!isAiChatOpen)}
          className={`ai-assistant-fab ${isAiChatOpen ? 'active' : ''}`}
          title="Toggle AI Assistant"
        >
          {isAiChatOpen ? (
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>×</span>
          ) : (
            <MessageSquare size={22} />
          )}
        </button>

        {/* Sliding AI Assistant Drawer */}
        <div className={`ai-assistant-drawer ${isAiChatOpen ? 'open' : 'closed'}`}>
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>AI OPERATIONS ASSISTANT</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAiChatOpen(false)}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontSize: '20px' }}
            >
              ×
            </button>
          </div>

          <div className="ai-chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`ai-chat-bubble ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                <div>{msg.text}</div>
                {msg.data && msg.data.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                    {msg.data.map((item: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        <span className="font-mono" style={{ fontWeight: 'bold', color: '#90CDF4' }}>{item.siteCode}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.activePower || item.status || item.severity || ''}</span>
                        {item.fuelLevel && <span style={{ fontFamily: 'var(--font-mono)' }}>{item.fuelLevel}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {msg.suggestion && (
                  <div style={{ marginTop: '8px', fontSize: '11px', fontStyle: 'italic', color: '#FCD34D', borderLeft: '2px solid #F59E0B', paddingLeft: '8px' }}>
                    💡 <b>Recommendation</b>: {msg.suggestion}
                  </div>
                )}
                <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ai-chat-bubble bot" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'incident-blink 1s infinite' }}></span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'incident-blink 1s infinite 0.2s' }}></span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'incident-blink 1s infinite 0.4s' }}></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChatMessage} className="ai-chat-input-area">
            <input
              type="text"
              placeholder="Query offline, theft, SLA, power..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="ai-chat-input"
            />
            <button type="submit" className="btn btn-primary ai-chat-send-btn">
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Inject stylesheet overrides dynamically
const sidebarStyle = document.createElement('style')
sidebarStyle.innerText = `
  .sidebar-collapsed-logout:hover {
    background-color: rgba(239, 68, 68, 0.08) !important;
  }
  .dropdown-item-btn:hover {
    background-color: var(--bg-tertiary) !important;
  }
  .dropdown-item-btn.danger:hover {
    background-color: rgba(239, 68, 68, 0.08) !important;
  }
  .topbar-search-input:focus {
    width: 320px !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.1) !important;
  }
`
document.head.appendChild(sidebarStyle)

