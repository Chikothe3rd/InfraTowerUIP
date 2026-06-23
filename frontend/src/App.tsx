import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth-store'

// Layouts & Guards
import DashboardLayout from './layouts/DashboardLayout'
import { AuthGuard, RoleGuard } from './components/RoleGuard'

// Lazy Loaded Pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const GlobalDashboard = lazy(() => import('./pages/GlobalDashboard'))
const TowerDetail = lazy(() => import('./pages/TowerDetail'))
const NocOperations = lazy(() => import('./pages/NocOperations'))
const PowerOperations = lazy(() => import('./pages/PowerOperations'))
const FuelOperations = lazy(() => import('./pages/FuelOperations'))
const FuelSecurity = lazy(() => import('./pages/FuelSecurity'))
const SensorOperations = lazy(() => import('./pages/SensorOperations'))
const CommercialHub = lazy(() => import('./pages/CommercialHub'))
const AnalyticsReporting = lazy(() => import('./pages/AnalyticsReporting'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))

// Loading Fallback Component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }}></div>
      <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em' }}>LOADING MODULE...</span>
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
