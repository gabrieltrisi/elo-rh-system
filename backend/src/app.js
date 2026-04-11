import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import vacationRoutes from './routes/vacationRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import uniformRoutes from './routes/uniformRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import workScheduleRoutes from './routes/workScheduleRoutes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

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

app.use((req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
  });
});

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
