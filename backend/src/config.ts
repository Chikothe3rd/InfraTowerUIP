import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env in root
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://infratel:infratel_secret@db:5432/infratel',
  jwtSecret: process.env.JWT_SECRET || 'infratel_secret_token_2026',
  nodeEnv: process.env.NODE_ENV || 'development'
}
