import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_quiz_arena_key_123456',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quizarena',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
