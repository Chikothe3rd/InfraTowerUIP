import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth-store'

// Layouts & Guards
import DashboardLayout from './layouts/DashboardLayout'
import { AuthGuard, RoleGuard } from './components/RoleGuard'

// Eagerly Imported Pages for Instant Navigation
import LoginPage from './pages/LoginPage'
import GlobalDashboard from './pages/GlobalDashboard'
import TowerDetail from './pages/TowerDetail'
import NocOperations from './pages/NocOperations'
import PowerOperations from './pages/PowerOperations'
import FuelOperations from './pages/FuelOperations'
import FuelSecurity from './pages/FuelSecurity'
import SensorOperations from './pages/SensorOperations'
import CommercialHub from './pages/CommercialHub'
import AnalyticsReporting from './pages/AnalyticsReporting'
import AuditLogPage from './pages/AuditLogPage'

// Loading Fallback Component (with Branded Logo without tower)
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <svg viewBox="0 0 240 60" width="160" height="40" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="34" fontFamily="'Lato', 'Inter', system-ui, sans-serif" fontSize="26" fontWeight="900" fill="#FFFFFF" letterSpacing="0.03em">
          Infra<tspan fill="rgba(255,255,255,0.65)" fontWeight="300">Tower</tspan><tspan fill="#3B82F6" fontWeight="900">UIP</tspan>
        </text>
        <path d="M 18,42 Q 105,55 194,40" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 188,34 L 196,40 L 189,46" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2.5px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }}></div>
    </div>
  </div>
)

export default function App() {
  const initAuth = useAuthStore(state => state.initAuth)

  useEffect(() => {
    // Restore session and socket connections on mount/reload
    initAuth()
  }, [initAuth])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            {/* Index Page: Global Map & Main Metrics */}
            <Route index element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <GlobalDashboard />
              </RoleGuard>
            } />

            {/* Tower site details drilldown */}
            <Route path="towers/:id" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <TowerDetail />
              </RoleGuard>
            } />

            {/* NOC operations */}
            <Route path="noc" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <NocOperations />
              </RoleGuard>
            } />

            {/* Power operations */}
            <Route path="power" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <PowerOperations />
              </RoleGuard>
            } />

            {/* Fuel operations */}
            <Route path="fuel" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <FuelOperations />
              </RoleGuard>
            } />

            {/* SOC Security Loop */}
            <Route path="security" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <FuelSecurity />
              </RoleGuard>
            } />

            {/* Sensors & Environmental Loop */}
            <Route path="sensors" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <SensorOperations />
              </RoleGuard>
            } />

            {/* Business & Tenancy ratios */}
            <Route path="commercial" element={
              <RoleGuard allowedRoles={['OPERATOR']} fallback={<Navigate to="/analytics" replace />}>
                <CommercialHub />
              </RoleGuard>
            } />

            {/* SLA analysis & PDF printing */}
            <Route path="analytics" element={<AnalyticsReporting />} />

            {/* Administrative Audit trail (restricted to ADMIN) */}
            <Route
              path="audit-log"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AuditLogPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Fallback to index dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
