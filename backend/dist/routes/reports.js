"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateJWT);
// Helper to filter telemetry by tower and date range
function getFilterParams(req) {
    const { towerId, range } = req.query;
    const whereClause = {};
    if (towerId && towerId !== 'all') {
        whereClause.towerId = towerId;
    }
    const cutoff = new Date();
    if (range === '1d') {
        cutoff.setDate(cutoff.getDate() - 1);
    }
    else if (range === '7d') {
        cutoff.setDate(cutoff.getDate() - 7);
    }
    else if (range === '30d') {
        cutoff.setDate(cutoff.getDate() - 30);
    }
    else if (range === '90d') {
        cutoff.setDate(cutoff.getDate() - 90);
    }
    else if (range === '365d') {
        cutoff.setDate(cutoff.getDate() - 365);
    }
    else {
        cutoff.setDate(cutoff.getDate() - 7); // default to 7d
    }
    whereClause.timestamp = { gte: cutoff };
    return { whereClause, cutoff };
}
// 1. GET /api/reports/uptime - Uptime vs downtime hours per day
router.get('/uptime', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            orderBy: { timestamp: 'asc' }
        });
        // Group by day YYYY-MM-DD
        const dailyData = {};
        telemetry.forEach((t) => {
            const dateStr = t.timestamp.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { total: 0, online: 0 };
            }
            const isOnline = t.gridPower > 0 || t.solarPower > 0 || t.generatorRunning;
            dailyData[dateStr].total++;
            if (isOnline) {
                dailyData[dateStr].online++;
            }
        });
        const result = Object.entries(dailyData).map(([date, counts]) => {
            const uptimePercentage = parseFloat(((counts.online / counts.total) * 100).toFixed(2));
            const uptimeHrs = parseFloat(((counts.online / counts.total) * 24).toFixed(1));
            const downtimeHrs = parseFloat((24 - uptimeHrs).toFixed(1));
            return {
                date,
                uptimePercentage,
                uptimeHrs,
                downtimeHrs
            };
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to aggregate uptime reports' });
    }
});
// 2. GET /api/reports/power - Grid vs Solar vs Generator power percentage
router.get('/power', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            select: {
                timestamp: true,
                gridPower: true,
                solarPower: true,
                generatorPower: true,
                generatorRunning: true
            }
        });
        let gridSeconds = 0;
        let solarSeconds = 0;
        let generatorSeconds = 0;
        let totalSeconds = 0;
        // For each telemetry, check which was active primary source
        telemetry.forEach((t) => {
            totalSeconds += 1;
            if (t.generatorRunning || t.generatorPower > 0) {
                generatorSeconds += 1;
            }
            else if (t.solarPower > t.gridPower && t.solarPower > 0) {
                solarSeconds += 1;
            }
            else if (t.gridPower > 0) {
                gridSeconds += 1;
            }
        });
        if (totalSeconds === 0) {
            return res.json([
                { name: 'Grid', value: 100 },
                { name: 'Solar', value: 0 },
                { name: 'Generator', value: 0 }
            ]);
        }
        return res.json([
            { name: 'Grid', value: parseFloat(((gridSeconds / totalSeconds) * 100).toFixed(1)) },
            { name: 'Solar', value: parseFloat(((solarSeconds / totalSeconds) * 100).toFixed(1)) },
            { name: 'Generator', value: parseFloat(((generatorSeconds / totalSeconds) * 100).toFixed(1)) }
        ]);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to aggregate power reports' });
    }
});
// 3. GET /api/reports/sla - Daily SLA Trend compared with 99.5% threshold
router.get('/sla', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            orderBy: { timestamp: 'asc' }
        });
        const dailyData = {};
        telemetry.forEach((t) => {
            const dateStr = t.timestamp.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { total: 0, online: 0 };
            }
            const isOnline = t.gridPower > 0 || t.solarPower > 0 || t.generatorRunning;
            dailyData[dateStr].total++;
            if (isOnline) {
                dailyData[dateStr].online++;
            }
        });
        const result = Object.entries(dailyData).map(([date, counts]) => {
            const slaPercentage = parseFloat(((counts.online / counts.total) * 100).toFixed(2));
            return {
                date,
                slaPercentage,
                targetSla: 99.5
            };
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to aggregate SLA reports' });
    }
});
// 4. GET /api/reports/fuel - Generator runtime hours & fuel consumption
router.get('/fuel', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    try {
        // Also fetch alert counts (fuel thefts) for that period
        const alertFilters = {
            type: 'FUEL_THEFT'
        };
        if (whereClause.towerId) {
            alertFilters.towerId = whereClause.towerId;
        }
        const theftAlerts = await prisma.alert.findMany({
            where: alertFilters,
            select: { createdAt: true }
        });
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            orderBy: { timestamp: 'asc' }
        });
        const dailyData = {};
        telemetry.forEach((t) => {
            const dateStr = t.timestamp.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { total: 0, genActiveCount: 0, maxFuel: 0, minFuel: 100 };
            }
            dailyData[dateStr].total++;
            if (t.generatorRunning) {
                dailyData[dateStr].genActiveCount++;
            }
            if (t.fuelLevel > dailyData[dateStr].maxFuel) {
                dailyData[dateStr].maxFuel = t.fuelLevel;
            }
            if (t.fuelLevel < dailyData[dateStr].minFuel) {
                dailyData[dateStr].minFuel = t.fuelLevel;
            }
        });
        const result = Object.entries(dailyData).map(([date, stats]) => {
            // 2 hours per interval
            const generatorHours = parseFloat(((stats.genActiveCount / stats.total) * 24).toFixed(1));
            // Calculate fuel delta, if fuel drops (excluding refills)
            let fuelConsumedLiters = 0;
            if (generatorHours > 0) {
                // Assume tank is 1000 Liters, so 1% = 10L. 
                // Generator consumes 2L per hour.
                fuelConsumedLiters = parseFloat((generatorHours * 2.0).toFixed(1));
            }
            // Count thefts on this day
            const theftCount = theftAlerts.filter((a) => a.createdAt.toISOString().split('T')[0] === date).length;
            return {
                date,
                generatorHours,
                fuelConsumedLiters,
                thefts: theftCount
            };
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to aggregate fuel reports' });
    }
});
// 5. GET /api/reports/power-history - Time-series breakdown of power sources
router.get('/power-history', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    const { range } = req.query;
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            select: {
                timestamp: true,
                gridPower: true,
                solarPower: true,
                generatorPower: true,
                generatorRunning: true
            },
            orderBy: { timestamp: 'asc' }
        });
        const grouped = {};
        telemetry.forEach((t) => {
            let bucket = '';
            const date = new Date(t.timestamp);
            if (range === '1d') {
                const hours = date.getHours().toString().padStart(2, '0');
                bucket = `${date.toISOString().split('T')[0]} ${hours}:00`;
            }
            else if (range === '90d') {
                const day = date.getDay();
                const diff = date.getDate() - day;
                const sunday = new Date(date.setDate(diff));
                bucket = sunday.toISOString().split('T')[0];
            }
            else if (range === '365d') {
                bucket = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            else {
                bucket = date.toISOString().split('T')[0]; // default daily
            }
            if (!grouped[bucket]) {
                grouped[bucket] = { grid: 0, solar: 0, generator: 0, total: 0 };
            }
            grouped[bucket].total++;
            if (t.generatorRunning || t.generatorPower > 0) {
                grouped[bucket].generator++;
            }
            else if (t.solarPower > t.gridPower && t.solarPower > 0) {
                grouped[bucket].solar++;
            }
            else if (t.gridPower > 0) {
                grouped[bucket].grid++;
            }
        });
        const result = Object.entries(grouped).map(([date, data]) => {
            const tot = data.total || 1;
            return {
                date,
                Grid: parseFloat(((data.grid / tot) * 100).toFixed(1)),
                Solar: parseFloat(((data.solar / tot) * 100).toFixed(1)),
                Generator: parseFloat(((data.generator / tot) * 100).toFixed(1))
            };
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to aggregate power history' });
    }
});
// 6. GET /api/reports/power-metrics - Cumulative energy and CO2 offsets
router.get('/power-metrics', async (req, res) => {
    const { whereClause } = getFilterParams(req);
    try {
        const telemetry = await prisma.telemetry.findMany({
            where: whereClause,
            select: {
                solarPower: true,
                generatorRunning: true,
                generatorPower: true
            }
        });
        let totalSolarKwh = 0;
        let totalGenHours = 0;
        telemetry.forEach((t) => {
            totalSolarKwh += t.solarPower * 2.0;
            if (t.generatorRunning || t.generatorPower > 0) {
                totalGenHours += 2.0;
            }
        });
        const co2SavedKg = parseFloat((totalSolarKwh * 0.85).toFixed(1));
        const dieselConsumedLiters = parseFloat((totalGenHours * 2.0).toFixed(1));
        const co2ProducedKg = parseFloat((dieselConsumedLiters * 2.68).toFixed(1));
        return res.json({
            totalSolarKwh: parseFloat(totalSolarKwh.toFixed(1)),
            totalGenHours: parseFloat(totalGenHours.toFixed(1)),
            co2SavedKg,
            dieselConsumedLiters,
            co2ProducedKg
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to calculate power metrics' });
    }
});
// 7. POST /api/reports/schedule - Create scheduled report
router.post('/schedule', async (req, res) => {
    const { recipient, interval, category, towerId } = req.body;
    try {
        const report = await prisma.scheduledReport.create({
            data: {
                recipient,
                interval,
                category,
                towerId: towerId || 'all',
                isActive: true
            }
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                username: req.user.username,
                role: req.user.role,
                action: 'REPORT_SCHEDULED',
                targetId: report.id,
                details: `Scheduled ${category} report to ${recipient} on a ${interval} basis.`
            }
        });
        return res.json(report);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to create scheduled report' });
    }
});
// 8. GET /api/reports/schedules - List active scheduled reports
router.get('/schedules', async (req, res) => {
    try {
        const schedules = await prisma.scheduledReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(schedules);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to retrieve schedules' });
    }
});
exports.default = router;
