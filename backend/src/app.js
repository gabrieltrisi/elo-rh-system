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

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 ORIGENS PERMITIDAS FIXAS + ENV
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// 🔥 PERMITE QUALQUER DEPLOY DA VERCEL DO SEU PROJETO
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

// 🔥 CORS CORRIGIDO (SEM QUEBRAR LOCAL)
app.use(
  cors({
    origin(origin, callback) {
      // permite chamadas internas (ex: Postman)
      if (!origin) {
        return callback(null, true);
      }

      // libera localhost + env + vercel
      if (allowedOrigins.includes(origin) || isAllowedVercelOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`❌ CORS bloqueado para origem: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

// 🔥 JSON
app.use(express.json());

// 🔥 ARQUIVOS ESTÁTICOS (UPLOADS)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 🔥 ROTAS BASE
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

// 🔥 ROTAS PRINCIPAIS
app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/vacations', vacationRoutes);
app.use('/certificates', certificateRoutes);
app.use('/uniforms', uniformRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/work-schedules', workScheduleRoutes);
app.use('/documents', documentRoutes);

// 🔥 404
app.use((req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
  });
});

// 🔥 ERRO GLOBAL
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    message: err.message || 'Erro interno do servidor',
  });
});

export default app;
