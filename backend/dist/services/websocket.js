"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.getIO = getIO;
exports.broadcastTelemetryUpdate = broadcastTelemetryUpdate;
exports.broadcastNewAlert = broadcastNewAlert;
exports.broadcastTowerStatusChange = broadcastTowerStatusChange;
exports.broadcastPowerSwitch = broadcastPowerSwitch;
exports.broadcastAlertUpdate = broadcastAlertUpdate;
const socket_io_1 = require("socket.io");
let io = null;
function initWebSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // Allow all origins for the hackathon
            methods: ['GET', 'POST', 'PATCH']
        }
    });
    io.on('connection', (socket) => {
        console.log(`NOC operator client connected: ${socket.id}`);
        // Let clients join rooms for specific towers to filter updates if they wish
        socket.on('subscribe:tower', (data) => {
            if (data && data.towerId) {
                socket.join(`tower:${data.towerId}`);
                console.log(`Client ${socket.id} subscribed to tower: ${data.towerId}`);
            }
        });
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error('Socket.io has not been initialized!');
    }
    return io;
}
// Broadcasting helpers
function broadcastTelemetryUpdate(towerId, telemetry) {
    if (!io)
        return;
    // Broadcast to global feed
    io.emit('telemetry:update', { towerId, ...telemetry });
    // Broadcast to specific tower subscribers
    io.to(`tower:${towerId}`).emit('telemetry:towerUpdate', telemetry);
}
function broadcastNewAlert(alert) {
    if (!io)
        return;
    io.emit('alert:new', alert);
}
function broadcastTowerStatusChange(towerId, statusInfo) {
    if (!io)
        return;
    io.emit('tower:statusChange', { towerId, ...statusInfo });
}
function broadcastPowerSwitch(towerId, switchInfo) {
    if (!io)
        return;
    io.emit('power:switch', { towerId, ...switchInfo });
}
function broadcastAlertUpdate(alert) {
    if (!io)
        return;
    io.emit('alert:updated', alert);
}
