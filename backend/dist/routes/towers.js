"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// All routes here require authentication
router.use(auth_1.authenticateJWT);
// 1. GET /api/towers - List all towers with active tenant count and latest telemetry snapshot
router.get('/', async (req, res) => {
    try {
        const towers = await prisma.tower.findMany({
            include: {
                tenants: {
                    where: { isActive: true },
                    select: { id: true, clientName: true, monthlyRevenue: true }
                },
                // Fetch the single latest telemetry record
                telemetry: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            },
            orderBy: { siteCode: 'asc' }
        });
        // Format the response
        const formattedTowers = towers.map(tower => {
            const latestTelemetry = tower.telemetry[0] || null;
            return {
                id: tower.id,
                name: tower.name,
                siteCode: tower.siteCode,
                latitude: tower.latitude,
                longitude: tower.longitude,
                region: tower.region,
                status: tower.status,
                powerSource: tower.powerSource,
                fuelLevel: tower.fuelLevel,
                upSince: tower.upSince,
                createdAt: tower.createdAt,
                tenantCount: tower.tenants.length,
                tenants: tower.tenants,
                latestTelemetry
            };
        });
        return res.json(formattedTowers);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve towers' });
    }
});
// 2. GET /api/towers/:id - Retrieve single tower details with latest telemetry
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const tower = await prisma.tower.findUnique({
            where: { id },
            include: {
                tenants: { where: { isActive: true } },
                telemetry: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                },
                alerts: {
                    orderBy: { createdAt: 'desc' },
                    take: 10 // latest 10 alerts
                }
            }
        });
        if (!tower) {
            return res.status(404).json({ error: 'Tower site not found' });
        }
        const latestTelemetry = tower.telemetry[0] || null;
        return res.json({
            ...tower,
            latestTelemetry,
            telemetry: undefined // hide array from root
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve tower' });
    }
});
// 3. GET /api/towers/:id/telemetry - Retrieve historical telemetry for chart plotting
router.get('/:id/telemetry', async (req, res) => {
    const { id } = req.params;
    const { range } = req.query; // '24h', '7d', '30d'
    let cutoffDate = new Date();
    if (range === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
    }
    else if (range === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
    }
    else {
        // Default to 24h
        cutoffDate.setHours(cutoffDate.getHours() - 24);
    }
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: {
                towerId: id,
                timestamp: { gte: cutoffDate }
            },
            orderBy: { timestamp: 'asc' }
        });
        return res.json(telemetry);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve telemetry' });
    }
});
// 4. GET /api/towers/:id/power-timeline - Power source switching history
router.get('/:id/power-timeline', async (req, res) => {
    const { id } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days switching history
    try {
        // Fetch telemetry where generatorRunning state changes, or power values differ
        const telemetry = await prisma.telemetry.findMany({
            where: {
                towerId: id,
                timestamp: { gte: cutoffDate }
            },
            orderBy: { timestamp: 'asc' },
            select: {
                timestamp: true,
                gridPower: true,
                solarPower: true,
                generatorPower: true,
                generatorRunning: true
            }
        });
        // We can compute the active power source at each telemetry frame
        const history = telemetry.map(t => {
            let source = 'GRID';
            if (t.generatorRunning || t.generatorPower > 0) {
                source = 'GENERATOR';
            }
            else if (t.solarPower > t.gridPower) {
                source = 'SOLAR';
            }
            return {
                timestamp: t.timestamp,
                source
            };
        });
        // Filter switches (only emit when source changes)
        const switches = [];
        let lastSource = '';
        for (const entry of history) {
            if (entry.source !== lastSource) {
                switches.push(entry);
                lastSource = entry.source;
            }
        }
        return res.json(switches);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve power timeline' });
    }
});
// 5. PATCH /api/towers/:id/config - Update tower configurations (ADMIN ONLY)
router.patch('/:id/config', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, status, fuelLevel, powerSource } = req.body;
    try {
        const originalTower = await prisma.tower.findUnique({ where: { id } });
        if (!originalTower) {
            return res.status(404).json({ error: 'Tower site not found' });
        }
        const updatedTower = await prisma.tower.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                status: status !== undefined ? status : undefined,
                fuelLevel: fuelLevel !== undefined ? parseFloat(fuelLevel) : undefined,
                powerSource: powerSource !== undefined ? powerSource : undefined
            }
        });
        // Log the action to Audit trail
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                username: req.user.username,
                role: req.user.role,
                action: 'TOWER_CONFIG_UPDATED',
                targetId: id,
                details: `Updated config for ${originalTower.siteCode}. Changes: ${JSON.stringify(req.body)}`
            }
        });
        return res.json(updatedTower);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to update tower configuration' });
    }
});
exports.default = router;
