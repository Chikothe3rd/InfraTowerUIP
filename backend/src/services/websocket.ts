import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

let io: SocketIOServer | null = null

export function initWebSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow all origins for the hackathon
      methods: ['GET', 'POST', 'PATCH']
    }
  })

  io.on('connection', (socket: Socket) => {
    console.log(`NOC operator client connected: ${socket.id}`)

    // Let clients join rooms for specific towers to filter updates if they wish
    socket.on('subscribe:tower', (data: { towerId: string }) => {
      if (data && data.towerId) {
        socket.join(`tower:${data.towerId}`)
        console.log(`Client ${socket.id} subscribed to tower: ${data.towerId}`)
      }
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized!')
  }
  return io
}

// Broadcasting helpers
export function broadcastTelemetryUpdate(towerId: string, telemetry: any) {
  if (!io) return
  // Broadcast to global feed
  io.emit('telemetry:update', { towerId, ...telemetry })
  // Broadcast to specific tower subscribers
  io.to(`tower:${towerId}`).emit('telemetry:towerUpdate', telemetry)
}

export function broadcastNewAlert(alert: any) {
  if (!io) return
  io.emit('alert:new', alert)
}

export function broadcastTowerStatusChange(towerId: string, statusInfo: { oldStatus: string, newStatus: string }) {
  if (!io) return
  io.emit('tower:statusChange', { towerId, ...statusInfo })
}

export function broadcastPowerSwitch(towerId: string, switchInfo: { from: string, to: string }) {
  if (!io) return
  io.emit('power:switch', { towerId, ...switchInfo })
}

export function broadcastAlertUpdate(alert: any) {
  if (!io) return
  io.emit('alert:updated', alert)
}
