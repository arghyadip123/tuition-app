import dotenv from 'dotenv';

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'development-secret'
};

if (!env.databaseUrl) {
  console.warn('DATABASE_URL is not set. Configure backend/.env before starting the API.');
}

export default env;

