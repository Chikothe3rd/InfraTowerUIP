"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTelemetrySimulator = startTelemetrySimulator;
exports.stopTelemetrySimulator = stopTelemetrySimulator;
const client_1 = require("@prisma/client");
const websocket_1 = require("./websocket");
const prisma = new client_1.PrismaClient();
const towerSimStates = new Map();
// Core simulator loop
let simInterval = null;
function startTelemetrySimulator() {
    if (simInterval)
        return;
    console.log('Starting Telemetry Simulator (3-second interval)...');
    simInterval = setInterval(async () => {
        try {
            const towers = await prisma.tower.findMany();
            for (const tower of towers) {
                // Initialize sim state if not exists
                if (!towerSimStates.has(tower.id)) {
                    // Induce degraded battery for Chibolya
                    const initialSoH = tower.siteCode === 'LUS-CHIB-04' ? 84.2 : (96.5 + Math.random() * 3.4);
                    towerSimStates.set(tower.id, {
                        gridUp: true,
                        gridStepsRemaining: 50 + Math.floor(Math.random() * 100),
                        activeIntrusion: false,
                        intrusionStepsRemaining: 0,
                        hasLowFuelAlert: false,
                        hasSmokeAlert: false,
                        batterySoH: initialSoH
                    });
                }
                const simState = towerSimStates.get(tower.id);
                // 1. Update Grid State machine
                simState.gridStepsRemaining--;
                if (simState.gridStepsRemaining <= 0) {
                    if (simState.gridUp) {
                        // Grid goes down (power outage)
                        simState.gridUp = false;
                        simState.gridStepsRemaining = 10 + Math.floor(Math.random() * 15); // remains down for 30-75s (10-25 ticks)
                        // Log/broadcast power switch event
                        (0, websocket_1.broadcastPowerSwitch)(tower.id, { from: 'GRID', to: 'GENERATOR' });
                    }
                    else {
                        // Grid restored
                        simState.gridUp = true;
                        simState.gridStepsRemaining = 150 + Math.floor(Math.random() * 300); // remains up for a long time
                        (0, websocket_1.broadcastPowerSwitch)(tower.id, { from: 'GENERATOR', to: 'GRID' });
                    }
                }
                // 2. Solar calculations (bell curve based on Lusaka hour of day)
                // Adjust for Zambia (CAT is UTC+2)
                const catTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
                const hour = catTime.getHours();
                let solarPower = 0;
                if (hour >= 6 && hour <= 18) {
                    // peak solar around 12:00
                    solarPower = Math.sin(((hour - 6) / 12) * Math.PI) * (4.5 + Math.random() * 1.0);
                }
                // 3. Power source logic
                let gridPower = 0;
                let generatorPower = 0;
                let generatorRunning = false;
                let activePowerSource = client_1.PowerSource.GRID;
                if (simState.gridUp) {
                    gridPower = 6.0 + Math.random() * 1.5;
                    // If solar is high and active, draw less from grid
                    if (solarPower > 4.5) {
                        activePowerSource = client_1.PowerSource.SOLAR;
                    }
                    else {
                        activePowerSource = client_1.PowerSource.GRID;
                    }
                }
                else {
                    // Grid is DOWN
                    if (solarPower > 3.0) {
                        activePowerSource = client_1.PowerSource.SOLAR;
                    }
                    else {
                        // Generator is required
                        if (tower.fuelLevel > 1.0) {
                            generatorRunning = true;
                            generatorPower = 7.0 + Math.random() * 1.0;
                            activePowerSource = client_1.PowerSource.GENERATOR;
                        }
                        else {
                            // Fuel depleted - tower goes offline!
                            activePowerSource = client_1.PowerSource.GRID; // fallback
                        }
                    }
                }
                // 4. Fuel Consumption & Theft simulation
                let fuelLevel = tower.fuelLevel;
                if (generatorRunning) {
                    // Consumes fuel (approx 0.05% per 3s tick)
                    fuelLevel = Math.max(0, fuelLevel - 0.05);
                }
                // Random fuel theft trigger (0.05% chance per tick for warning/critical sites, or 0.01% general)
                // Fuel theft occurs when generator is NOT running and fuel drops drastically
                let isTheftOccurring = false;
                if (!generatorRunning && fuelLevel > 20 && Math.random() < 0.0005) {
                    // Fuel drop of 12% suddenly
                    fuelLevel = Math.max(0, fuelLevel - 12.0);
                    isTheftOccurring = true;
                }
                // Low Fuel Alert Trigger
                if (fuelLevel < 20.0 && !simState.hasLowFuelAlert) {
                    simState.hasLowFuelAlert = true;
                    await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.LOW_FUEL, client_1.Severity.HIGH, `Low Fuel Warning: Reserve tank dropped below 20%. Refueling required immediately.`);
                }
                else if (fuelLevel >= 20.0) {
                    simState.hasLowFuelAlert = false;
                }
                // 5. Environmental sensor simulation
                // Ambient sine wave temperature (min 15°C at 4AM, max 30°C at 2PM)
                const ambientTemp = 22.5 + Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 6 + Math.random() * 0.5;
                // Equipment temp is ambient + heat based on power load
                const loadHeat = (gridPower + solarPower + generatorPower) * 1.8;
                let equipmentTemp = ambientTemp + loadHeat + Math.random() * 0.5;
                // High Temp Anomaly: 0.1% chance cooling system breaks down
                if (Math.random() < 0.001 && equipmentTemp < 50) {
                    equipmentTemp += 15; // spike temperature
                }
                let smokeDetected = false;
                // Smoke Anomaly: 0.05% chance if temp > 40
                if (Math.random() < 0.0005 && equipmentTemp > 40 && !simState.hasSmokeAlert) {
                    smokeDetected = true;
                    simState.hasSmokeAlert = true;
                    await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.SMOKE, client_1.Severity.CRITICAL, `Fire / Smoke Detected: High heat and particulate sensors triggered inside the equipment cabinet.`);
                }
                else if (simState.hasSmokeAlert) {
                    if (Math.random() < 0.02) {
                        simState.hasSmokeAlert = false;
                    }
                    else {
                        smokeDetected = true;
                    }
                }
                // 6. Security & Intrusion simulation
                let doorStatus = false;
                const isRestrictedHours = hour >= 22 || hour < 6;
                if (simState.activeIntrusion) {
                    doorStatus = true;
                    simState.intrusionStepsRemaining--;
                    if (simState.intrusionStepsRemaining <= 0) {
                        simState.activeIntrusion = false;
                    }
                }
                else {
                    // Trigger security intrusion
                    // 0.05% general chance, increased to 0.1% during restricted hours
                    const intrusionChance = isRestrictedHours ? 0.001 : 0.0002;
                    if (Math.random() < intrusionChance) {
                        simState.activeIntrusion = true;
                        simState.intrusionStepsRemaining = 5 + Math.floor(Math.random() * 5); // remains open for 15-30 seconds
                        doorStatus = true;
                        // Trigger alarms!
                        if (isRestrictedHours) {
                            // SECURITY FLOW 1: Unauthorized Access Alert
                            await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.UNAUTHORIZED_ACCESS, client_1.Severity.CRITICAL, `Security Breach: Perimeter door opened at ${catTime.toLocaleTimeString('en-US')} CAT with motion sensors active during restricted hours (22:00-06:00).`);
                        }
                        else {
                            // Standard door open alert
                            await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.INTRUSION, client_1.Severity.HIGH, `Door open warning: Server cabinet enclosure door opened at ${catTime.toLocaleTimeString('en-US')} CAT.`);
                        }
                    }
                }
                // Drift battery SoH slightly and define motion
                simState.batterySoH = Math.max(50.0, Math.min(100.0, simState.batterySoH + (Math.random() - 0.5) * 0.04));
                const motionDetected = Math.random() < 0.02 || simState.activeIntrusion;
                // Restricted hours PIR motion warning
                if (motionDetected && isRestrictedHours && !simState.activeIntrusion && Math.random() < 0.15) {
                    const activeSecAlert = await prisma.alert.findFirst({
                        where: {
                            towerId: tower.id,
                            type: { in: ['INTRUSION', 'UNAUTHORIZED_ACCESS'] },
                            isAcknowledged: false
                        }
                    });
                    if (!activeSecAlert) {
                        await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.INTRUSION, client_1.Severity.MEDIUM, `Intrusion Alert: Passive infrared (PIR) motion sensor triggered inside cabinet enclosure zone during restricted hours.`);
                    }
                }
                // If fuel theft occurred, trigger alert
                if (isTheftOccurring) {
                    await triggerIntrusionAlert(tower.id, tower.siteCode, client_1.AlertType.FUEL_THEFT, client_1.Severity.CRITICAL, `Fuel Theft Detected: Anomalous drop of 12.0% in diesel fuel level detected within 3 seconds while generator is inactive. Tamper alarms triggered.`);
                }
                // 7. Write Telemetry Snapshot to DB
                const telemetry = await prisma.telemetry.create({
                    data: {
                        towerId: tower.id,
                        gridPower: parseFloat(gridPower.toFixed(2)),
                        solarPower: parseFloat(solarPower.toFixed(2)),
                        generatorPower: parseFloat(generatorPower.toFixed(2)),
                        fuelLevel: parseFloat(fuelLevel.toFixed(1)),
                        ambientTemp: parseFloat(ambientTemp.toFixed(1)),
                        equipmentTemp: parseFloat(equipmentTemp.toFixed(1)),
                        humidity: parseFloat((50 + Math.sin((hour / 24) * 2 * Math.PI) * 10 + Math.random() * 2).toFixed(1)),
                        doorStatus,
                        smokeDetected,
                        generatorRunning,
                        motionDetected,
                        batterySoH: parseFloat(simState.batterySoH.toFixed(2))
                    }
                });
                // Determine general status based on operational levels
                let finalStatus = client_1.TowerStatus.ONLINE;
                if (tower.fuelLevel <= 0.0 && !simState.gridUp && solarPower < 2.0) {
                    finalStatus = client_1.TowerStatus.OFFLINE;
                }
                else if (fuelLevel < 10.0 || simState.activeIntrusion) {
                    finalStatus = client_1.TowerStatus.CRITICAL;
                }
                else if (fuelLevel < 25.0 || equipmentTemp > 45.0) {
                    finalStatus = client_1.TowerStatus.WARNING;
                }
                // Update Tower model
                const updatedTower = await prisma.tower.update({
                    where: { id: tower.id },
                    data: {
                        fuelLevel: parseFloat(fuelLevel.toFixed(1)),
                        powerSource: activePowerSource,
                        status: finalStatus
                    }
                });
                // Broadcast status changes
                if (updatedTower.status !== tower.status) {
                    (0, websocket_1.broadcastTowerStatusChange)(tower.id, {
                        oldStatus: tower.status,
                        newStatus: updatedTower.status
                    });
                }
                // Broadcast telemetry update over Socket.IO
                (0, websocket_1.broadcastTelemetryUpdate)(tower.id, telemetry);
            }
        }
        catch (error) {
            console.error('Error in simulator execution loop:', error);
        }
    }, 3000);
}
function stopTelemetrySimulator() {
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
        console.log('Telemetry Simulator stopped.');
    }
}
// Internal helper to insert alerts and trigger WS broadcasts
async function triggerIntrusionAlert(towerId, siteCode, type, severity, message) {
    try {
        const alert = await prisma.alert.create({
            data: {
                towerId,
                type,
                severity,
                message,
                isAcknowledged: false
            },
            include: {
                tower: {
                    select: { siteCode: true, name: true }
                }
            }
        });
        console.log(`[ALERT TRIGGERED] Site: ${siteCode} | Type: ${type} | Msg: ${message}`);
        // Broadcast websocket alert
        (0, websocket_1.broadcastNewAlert)(alert);
    }
    catch (err) {
        console.error('Failed to trigger simulator alert:', err);
    }
}
