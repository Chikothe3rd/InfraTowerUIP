"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env in root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.config = {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://infratel:infratel_secret@db:5432/infratel',
    jwtSecret: process.env.JWT_SECRET || 'infratel_secret_token_2026',
    nodeEnv: process.env.NODE_ENV || 'development'
};
