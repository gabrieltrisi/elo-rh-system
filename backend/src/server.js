import app from './app.js';
import prisma from './prisma/client.js';
import { processScheduledOnboardings } from './services/onboardingAutomationService.js';
import { ensureDefaultCompaniesService } from './services/companyService.js';

const PORT = process.env.PORT || 3000;
const ONBOARDING_SCHEDULER_INTERVAL_MS = 60 * 1000;

const getSafeDatabaseInfo = async () => {
  const rawUrl = String(process.env.DATABASE_URL || '').trim();

  if (!rawUrl) {
    return {
      provider: 'unknown',
      host: 'unknown',
      port: 'unknown',
      database: 'unknown',
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const [currentDatabase] = await prisma.$queryRawUnsafe(
      'SELECT current_database() AS db, inet_server_addr()::text AS host, inet_server_port() AS port'
    );

    return {
      provider: parsed.protocol.replace(':', ''),
      host: currentDatabase?.host || parsed.hostname || 'unknown',
      port: String(currentDatabase?.port || parsed.port || 'unknown'),
      database:
        currentDatabase?.db || parsed.pathname.replace(/^\//, '') || 'unknown',
    };
  } catch (error) {
    return {
      provider: 'unknown',
      host: 'unknown',
      port: 'unknown',
      database: 'unknown',
      note: 'database metadata unavailable',
    };
  }
};

const runOnboardingScheduler = async () => {
  try {
    const result = await processScheduledOnboardings();

    if (result.processed > 0) {
      console.log(
        `[onboarding-scheduler] ${result.processed} onboarding(s) processado(s).`
      );
    }
  } catch (error) {
    console.error('[onboarding-scheduler] erro:', error);
  }
};

const startServer = async () => {
  try {
    await ensureDefaultCompaniesService();
  } catch (error) {
    console.error('[bootstrap-companies] erro:', error);
  }

  const dbInfo = await getSafeDatabaseInfo();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(
      `Connected to DB: ${dbInfo.provider}://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`
    );
    runOnboardingScheduler();
    setInterval(runOnboardingScheduler, ONBOARDING_SCHEDULER_INTERVAL_MS);
  });
};

startServer();
