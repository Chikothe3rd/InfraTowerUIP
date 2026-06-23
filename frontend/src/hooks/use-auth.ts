import { useAuthStore } from '../store/auth-store'

export function useAuth() {
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const login = useAuthStore(state => state.login)
  const logout = useAuthStore(state => state.logout)
  const isLoading = useAuthStore(state => state.isLoading)
  const error = useAuthStore(state => state.error)

  const isAdmin = user?.role === 'ADMIN'
  const isOperator = user?.role === 'OPERATOR'

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isOperator,
    login,
    logout,
    isLoading,
    error
  }
}
