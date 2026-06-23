import { io, Socket } from 'socket.io-client'

const SOCKET_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    console.log('Socket.IO connecting...')
  }
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect()
    console.log('Socket.IO disconnected.')
  }
}
