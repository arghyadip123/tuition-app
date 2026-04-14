import dashboardRoutes from './routes/dashboardRoutes.js';
import cors from 'cors';
import express from 'express';
import env from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import authRoutes from './routes/authRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://tuition-app-chi.vercel.app'
    ],
    credentials: true
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
