import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

interface GuardProps {
  children: React.ReactNode
}

// 1. Enforce that the user is logged in
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login page and store history location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// 2. Enforce specific roles (e.g., ADMIN only)
interface RoleGuardProps extends GuardProps {
  allowedRoles: ('ADMIN' | 'OPERATOR')[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
