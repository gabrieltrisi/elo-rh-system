import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma/client.js';

import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import vacationRoutes from './routes/vacationRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import uniformRoutes from './routes/uniformRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import workScheduleRoutes from './routes/workScheduleRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import warningRoutes from './routes/warningRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import suspensionRoutes from './routes/suspensionRoutes.js';
import benefitRoutes from './routes/benefitRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import uniformStockRoutes from './routes/uniformStockRoutes.js';
import uniformDeliveryRoutes from './routes/uniformDeliveryRoutes.js';
import admissionRoutes from './modules/admission/admissionRoutes.js';
import trainingRoutes from './modules/trainings/trainingRoutes.js';
import recruitmentRoutes from './modules/recruitment/recruitmentRoutes.js';
import payrollRoutes from './modules/payroll/payrollRoutes.js';
import timeTrackingRoutes from './modules/timeTracking/timeTrackingRoutes.js';
import performanceRoutes from './modules/performance/performanceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import auditContextMiddleware from './middlewares/auditContext.js';

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedVercelOrigin = (origin) => {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === 'elo-rh-system.vercel.app' ||
      hostname.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || isAllowedVercelOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS bloqueado para origem: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(auditContextMiddleware);

if (isDevelopment) {
  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.info(
        `[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
      );
    });

    next();
  });
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('API Elo System rodando');
});

app.get('/health', async (req, res) => {
  let database = 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'ok';
  } catch {
    database = 'error';
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.round(process.uptime()),
    database,
  });
});

app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/vacations', vacationRoutes);
app.use('/certificates', certificateRoutes);
app.use('/uniforms', uniformRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/work-schedules', workScheduleRoutes);
app.use('/documents', documentRoutes);
app.use('/files', fileRoutes);
app.use('/companies', companyRoutes);
app.use('/users', userRoutes);
app.use('/profiles', profileRoutes);
app.use('/warnings', warningRoutes);
app.use('/leaves', leaveRoutes);
app.use('/suspensions', suspensionRoutes);
app.use('/benefits', benefitRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/uniform-stock', uniformStockRoutes);
app.use('/uniform-deliveries', uniformDeliveryRoutes);
app.use('/admission', admissionRoutes);
app.use('/trainings', trainingRoutes);
app.use('/recruitment', recruitmentRoutes);
app.use('/payroll', payrollRoutes);
app.use('/time', timeTrackingRoutes);
app.use('/performance', performanceRoutes);
app.use('/audit', auditRoutes);
app.use('/integrations', integrationRoutes);
app.use('/storage', storageRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingsRoutes);
app.use('/pdf', pdfRoutes);
app.use('/feedback', feedbackRoutes);

app.use((req, res) => {
  return res.status(404).json({
    message: 'Rota nao encontrada',
  });
});

app.use((err, req, res, next) => {
  if (isDevelopment) {
    console.error('Erro na aplicacao:', err);
  } else {
    console.error('Erro na aplicacao:', {
      message: err?.message,
      statusCode: err?.statusCode,
      path: req?.originalUrl,
      method: req?.method,
      requestId: req?.auditContext?.requestId,
    });
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    message: err.message || 'Erro interno do servidor',
  });
});

export default app;
