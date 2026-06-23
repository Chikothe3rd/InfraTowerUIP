"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const MOCK_USERS = [
    { username: 'operator', password: 'infratel2026', role: 'OPERATOR', userId: 'operator-id-123' },
    { username: 'admin', password: 'infratel2026', role: 'ADMIN', userId: 'admin-id-456' }
];
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = MOCK_USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Sign JWT token
    const token = jsonwebtoken_1.default.sign({ userId: user.userId, username: user.username, role: user.role }, config_1.config.jwtSecret, { expiresIn: '24h' });
    // Log in Audit Trail
    try {
        await prisma.auditLog.create({
            data: {
                userId: user.userId,
                username: user.username,
                role: user.role,
                action: 'LOGIN',
                details: 'User authenticated successfully via mock RBAC login page.'
            }
        });
    }
    catch (err) {
        console.error('Failed to write audit log:', err);
    }
    return res.json({
        token,
        user: {
            userId: user.userId,
            username: user.username,
            role: user.role
        }
    });
});
router.get('/me', auth_1.authenticateJWT, (req, res) => {
    return res.json({ user: req.user });
});
exports.default = router;
