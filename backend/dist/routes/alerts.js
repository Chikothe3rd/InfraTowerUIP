"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const websocket_1 = require("../services/websocket");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ==========================================
// 1. PUBLIC INTERNAL ROUTE (For Python Service)
// ==========================================
router.post('/internal', async (req, res) => {
    const { towerId, type, severity, message } = req.body;
    if (!towerId || !type || !severity || !message) {
        return res.status(400).json({ error: 'Missing alert fields' });
    }
    try {
        const tower = await prisma.tower.findUnique({ where: { id: towerId } });
        if (!tower) {
            return res.status(404).json({ error: 'Tower not found' });
        }
        // Create the alert in DB
        const alert = await prisma.alert.create({
            data: {
                towerId,
                type: type,
                severity: severity,
                message,
                isAcknowledged: false
            },
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            }
        });
        // Update tower status to WARNING or CRITICAL depending on severity
        let targetStatus = tower.status;
        if (severity === 'CRITICAL' && tower.status !== 'OFFLINE') {
            targetStatus = 'CRITICAL';
        }
        else if (severity === 'HIGH' && tower.status !== 'OFFLINE' && tower.status !== 'CRITICAL') {
            targetStatus = 'CRITICAL';
        }
        else if (severity === 'MEDIUM' && tower.status === 'ONLINE') {
            targetStatus = 'WARNING';
        }
        if (targetStatus !== tower.status) {
            await prisma.tower.update({
                where: { id: towerId },
                data: { status: targetStatus }
            });
        }
        // Broadcast WebSocket event so the client screens update instantly
        (0, websocket_1.broadcastNewAlert)(alert);
        return res.status(201).json(alert);
    }
    catch (err) {
        console.error('Failed to create internal alert:', err);
        return res.status(500).json({ error: err.message || 'Failed to process alert' });
    }
});
// ==========================================
// CLIENT ROUTES (Require JWT authentication)
// ==========================================
router.use(auth_1.authenticateJWT);
// 2. GET /api/alerts - List all alerts with filters
router.get('/', async (req, res) => {
    const { isAcknowledged, severity, type, towerId } = req.query;
    const whereClause = {};
    if (isAcknowledged !== undefined) {
        whereClause.isAcknowledged = isAcknowledged === 'true';
    }
    if (severity) {
        whereClause.severity = severity;
    }
    if (type) {
        whereClause.type = type;
    }
    if (towerId) {
        whereClause.towerId = towerId;
    }
    try {
        const alerts = await prisma.alert.findMany({
            where: whereClause,
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(alerts);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve alerts' });
    }
});
// 3. PATCH /api/alerts/:id/acknowledge - Mark alert as acknowledged + audit log
router.patch('/:id/acknowledge', async (req, res) => {
    const { id } = req.params;
    try {
        const alert = await prisma.alert.findUnique({
            where: { id },
            include: { tower: true }
        });
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const updatedAlert = await prisma.alert.update({
            where: { id },
            data: {
                isAcknowledged: true,
                acknowledgedBy: req.user.username,
                acknowledgedAt: new Date()
            },
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            }
        });
        // If there are no more active critical/high alerts for this tower, we can reset status to ONLINE
        const activeAlertsCount = await prisma.alert.count({
            where: {
                towerId: alert.towerId,
                isAcknowledged: false,
                severity: { in: ['CRITICAL', 'HIGH'] }
            }
        });
        if (activeAlertsCount === 0 && alert.tower.status !== 'OFFLINE') {
            await prisma.tower.update({
                where: { id: alert.towerId },
                data: { status: 'ONLINE' }
            });
        }
        // Log the acknowledgment to the audit trail
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                username: req.user.username,
                role: req.user.role,
                action: 'ALERT_ACKNOWLEDGED',
                targetId: id,
                details: `Acknowledged alert ID ${id} of type ${alert.type} on tower ${alert.tower.siteCode}`
            }
        });
        return res.json(updatedAlert);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to acknowledge alert' });
    }
});
// 4. PATCH /api/alerts/:id/dispatch - Dispatch technician to alert site + audit log
router.patch('/:id/dispatch', async (req, res) => {
    const { id } = req.params;
    const { technician } = req.body;
    if (!technician) {
        return res.status(400).json({ error: 'Technician name is required' });
    }
    try {
        const alert = await prisma.alert.findUnique({
            where: { id },
            include: { tower: true }
        });
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const updatedAlert = await prisma.alert.update({
            where: { id },
            data: {
                dispatchStatus: 'DISPATCHED',
                dispatchedTechnician: technician,
                dispatchedAt: new Date()
            },
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            }
        });
        // Log the dispatch to the audit trail
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                username: req.user.username,
                role: req.user.role,
                action: 'ALERT_DISPATCHED',
                targetId: id,
                details: `Dispatched technician ${technician} to alert ID ${id} of type ${alert.type} on tower ${alert.tower.siteCode}`
            }
        });
        (0, websocket_1.broadcastAlertUpdate)(updatedAlert);
        return res.json(updatedAlert);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to dispatch technician' });
    }
});
// 5. PATCH /api/alerts/:id/resolve - Resolve alert (close ticket) + audit log + status restoration
router.patch('/:id/resolve', async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    if (!notes) {
        return res.status(400).json({ error: 'Resolution notes are required' });
    }
    try {
        const alert = await prisma.alert.findUnique({
            where: { id },
            include: { tower: true }
        });
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const updatedAlert = await prisma.alert.update({
            where: { id },
            data: {
                dispatchStatus: 'RESOLVED',
                resolvedAt: new Date(),
                resolutionNotes: notes,
                isAcknowledged: true, // auto-acknowledge resolved alarms
                acknowledgedBy: req.user.username,
                acknowledgedAt: new Date()
            },
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            }
        });
        // Log the resolution to the audit trail
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                username: req.user.username,
                role: req.user.role,
                action: 'ALERT_RESOLVED',
                targetId: id,
                details: `Resolved alert ID ${id} of type ${alert.type} on tower ${alert.tower.siteCode}. Notes: ${notes}`
            }
        });
        // Check if we should restore tower status to ONLINE
        const activeAlertsCount = await prisma.alert.count({
            where: {
                towerId: alert.towerId,
                isAcknowledged: false,
                severity: { in: ['CRITICAL', 'HIGH'] }
            }
        });
        if (activeAlertsCount === 0 && alert.tower.status !== 'OFFLINE') {
            const oldStatus = alert.tower.status;
            await prisma.tower.update({
                where: { id: alert.towerId },
                data: { status: 'ONLINE' }
            });
            (0, websocket_1.broadcastTowerStatusChange)(alert.towerId, {
                oldStatus,
                newStatus: 'ONLINE'
            });
        }
        (0, websocket_1.broadcastAlertUpdate)(updatedAlert);
        return res.json(updatedAlert);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to resolve alert' });
    }
});
exports.default = router;
