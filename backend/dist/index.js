"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const websocket_1 = require("./services/websocket");
// Import routers
const auth_1 = __importDefault(require("./routes/auth"));
const towers_1 = __importDefault(require("./routes/towers"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const commercial_1 = __importDefault(require("./routes/commercial"));
const reports_1 = __importDefault(require("./routes/reports"));
const ai_1 = __importDefault(require("./routes/ai"));
const control_1 = __importDefault(require("./routes/control"));
const simulator_1 = require("./services/simulator");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Initialize Socket.io
(0, websocket_1.initWebSocket)(server);
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date(), env: config_1.config.nodeEnv });
});
// Mount routers
app.use('/api/auth', auth_1.default);
app.use('/api/towers', towers_1.default);
app.use('/api/towers', control_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/commercial', commercial_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/ai', ai_1.default);
// Direct Admin Audit Log endpoint
const client_1 = require("@prisma/client");
const auth_2 = require("./middleware/auth");
const prismaInstance = new client_1.PrismaClient();
app.get('/api/audit-log', auth_2.authenticateJWT, (0, auth_2.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const logs = await prismaInstance.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100 // limit to latest 100 events
        });
        return res.json(logs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to fetch audit log' });
    }
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});
// Start server
server.listen(config_1.config.port, () => {
    console.log(`========================================`);
    console.log(`InfraTowerUIP Backend running`);
    console.log(`Port: ${config_1.config.port}`);
    console.log(`Environment: ${config_1.config.nodeEnv}`);
    console.log(`========================================`);
    // Start telemetry simulator
    (0, simulator_1.startTelemetrySimulator)();
    // Start intelligence service disabled for V2 (delegated to Python intelligence container)
    // startIntelligenceService()
});
