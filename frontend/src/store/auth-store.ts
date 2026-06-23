import { create } from 'zustand'
import { User } from '../types'
import { api } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  theme: 'dark' | 'light'
  isLoading: boolean
  error: string | null
  
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setTheme: (theme: 'dark' | 'light') => void
  initAuth: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  theme: 'dark',
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.post('/api/auth/login', { username, password })
      localStorage.setItem('infratel_token', data.token)
      localStorage.setItem('infratel_user', JSON.stringify(data.user))
      
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      })

      // Connect real-time sockets
      connectSocket()
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false })
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('infratel_token')
    localStorage.removeItem('infratel_user')
    set({
      user: null,
      token: null,
      isAuthenticated: false
    })
    disconnectSocket()
  },

  setTheme: (theme) => {
    localStorage.setItem('infratel_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  initAuth: () => {
    const token = localStorage.getItem('infratel_token')
    const userJson = localStorage.getItem('infratel_user')
    const theme = (localStorage.getItem('infratel_theme') as 'dark' | 'light') || 'dark'
    
    // Set theme HTML attribute immediately
    document.documentElement.setAttribute('data-theme', theme)

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson)
        set({
          token,
          user,
          isAuthenticated: true,
          theme
        })
        connectSocket()
      } catch (err) {
        // Corrupt localStorage, clear it
        localStorage.removeItem('infratel_token')
        localStorage.removeItem('infratel_user')
        set({ theme })
      }
    } else {
      set({ theme })
    }
  }
}))
