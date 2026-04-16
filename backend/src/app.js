import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import vacationRoutes from './routes/vacationRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import uniformRoutes from './routes/uniformRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import workScheduleRoutes from './routes/workScheduleRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import warningRoutes from './routes/warningRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import suspensionRoutes from './routes/suspensionRoutes.js';
import benefitRoutes from './routes/benefitRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import admissionRoutes from './modules/admission/admissionRoutes.js';

const app = express();

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

      console.warn(`❌ CORS bloqueado para origem: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('API Elo System rodando 🚀');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API online',
    timestamp: new Date().toISOString(),
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
app.use('/warnings', warningRoutes);
app.use('/leaves', leaveRoutes);
app.use('/suspensions', suspensionRoutes);
app.use('/benefits', benefitRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/admission', admissionRoutes);

app.use((req, res) => {
  return res.status(404).json({
    message: 'Rota não encontrada',
  });
});

app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    message: err.message || 'Erro interno do servidor',
  });
});

export default app;
