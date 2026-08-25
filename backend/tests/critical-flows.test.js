import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import AppError from '../src/errors/AppError.js';
import { hasPermission, requirePermission } from '../src/middlewares/authorization.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const readProjectFile = (...segments) =>
  fs.readFileSync(path.join(rootDir, ...segments), 'utf8');

test('hasPermission grants SUPER_ADMIN and explicit permissions', () => {
  assert.equal(hasPermission({ role: 'SUPER_ADMIN', permissions: [] }, 'users.read'), true);
  assert.equal(hasPermission({ role: 'RH', permissions: ['documents.read'] }, 'documents.read'), true);
  assert.equal(hasPermission({ role: 'RH', permissions: [] }, 'documents.read'), false);
});

test('requirePermission blocks unauthorized access with AppError 403', async () => {
  const middleware = requirePermission('users.read');
  const req = {
    user: { role: 'RH', permissions: ['employees.read'] },
    originalUrl: '/users',
    auditContext: {},
  };

  await new Promise((resolve, reject) => {
    middleware(req, {}, (error) => {
      try {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 403);
        assert.match(error.message, /Acesso negado/);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test('requirePermission allows authorized access', async () => {
  const middleware = requirePermission('reports.read', 'reports.export_excel');
  const req = {
    user: {
      role: 'RH',
      permissions: ['reports.read', 'reports.export_excel'],
    },
    originalUrl: '/reports/export/excel',
    auditContext: {},
  };

  await new Promise((resolve, reject) => {
    middleware(req, {}, (error) => {
      try {
        assert.equal(error, undefined);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test('auth flow source supports mfa, generic login errors and session management', () => {
  const source = readProjectFile('src', 'controllers', 'authController.js');
  const routeSource = readProjectFile('src', 'routes', 'authRoutes.js');
  const middlewareSource = readProjectFile(
    'src',
    'middlewares',
    'authMiddleware.js'
  );
  const securityServiceSource = readProjectFile(
    'src',
    'services',
    'authSecurityService.js'
  );
  const permissionsSource = readProjectFile('src', 'utils', 'permissions.js');

  assert.match(source, /if \(user\.status !== 'ATIVO'\)/);
  assert.match(source, /INVALID_LOGIN_MESSAGE/);
  assert.match(source, /action: 'LOGIN'/);
  assert.match(source, /MFA_REQUIRED/);
  assert.match(source, /MFA_SETUP_REQUIRED/);
  assert.match(source, /createUserSessionService/);
  assert.match(source, /registerFailedLoginAttemptService/);
  assert.match(source, /revokeAllUserSessionsService/);
  assert.match(source, /MFA_FAILED/);
  assert.match(source, /consumePasswordResetChallengeService/);
  assert.match(source, /RESET_PASSWORD_REQUEST/);
  assert.match(source, /LOGIN_TEMP_LOCK/);
  assert.match(source, /formatTemporaryLockMessage/);
  assert.match(source, /PUBLIC_REGISTER_DISABLED/);
  assert.match(source, /ALLOW_PUBLIC_REGISTER/);
  assert.match(source, /REGISTER_BLOCKED/);
  assert.match(routeSource, /router\.post\('\/mfa\/verify', verifyMfa\)/);
  assert.match(routeSource, /router\.get\('\/sessions', getSessions\)/);
  assert.match(routeSource, /router\.post\('\/reauthenticate', reauthenticate\)/);
  assert.match(middlewareSource, /touchUserSessionService/);
  assert.match(middlewareSource, /sessionId/);
  assert.match(middlewareSource, /AUTH_SESSION_REVOKED/);
  assert.match(middlewareSource, /AUTH_TOKEN_EXPIRED/);
  assert.match(securityServiceSource, /authChallenge/);
  assert.match(securityServiceSource, /loginAttemptState/);
  assert.match(securityServiceSource, /passwordHistory/);
  assert.match(securityServiceSource, /maxAttempts/);
  assert.match(securityServiceSource, /PASSWORD_RESET/);
  assert.match(securityServiceSource, /createPasswordResetChallengeService/);
  assert.match(securityServiceSource, /formatTemporaryLockMessage/);
  assert.match(securityServiceSource, /clearTemporaryAccessLockService/);
  assert.match(permissionsSource, /security\.read/);
  assert.match(permissionsSource, /security\.sessions\.manage/);
  assert.match(permissionsSource, /users\.security\.read/);
});

test('file routes enforce protected access for view and download flows', () => {
  const source = readProjectFile('src', 'routes', 'fileRoutes.js');

  assert.match(source, /router\.use\(authMiddleware\)/);
  assert.match(source, /requirePermission\('documents\.read'\)/);
  assert.match(source, /router\.get\('\/:module\/:filename', getFile\)/);
  assert.match(source, /router\.get\('\/:module\/view\/:filename', viewFile\)/);
  assert.match(source, /router\.get\('\/:module\/download\/:filename', downloadFile\)/);
});

test('reports service enforces scoped permissions and preview auditing', () => {
  const source = readProjectFile('src', 'services', 'reportService.js');

  assert.match(source, /reportTypeRequiredPermission/);
  assert.match(source, /audit: 'reports\.audit'/);
  assert.match(source, /throw new AppError\(\s*'Voce nao possui permissao para acessar este tipo de relatorio'/);
  assert.match(source, /action: 'VIEW'/);
});

test('time tracking routes expose import preview, confirm and bank hours with permission guards', () => {
  const source = readProjectFile('src', 'modules', 'timeTracking', 'timeTrackingRoutes.js');

  assert.match(source, /requirePermission\('time\.import'\)/);
  assert.match(source, /requirePermission\('time\.review'\)/);
  assert.match(source, /requirePermission\('time\.bank_hours\.read'\)/);
  assert.match(source, /router\.post\(\s*'\/import'/s);
  assert.match(source, /router\.post\(\s*'\/imports\/:id\/confirm'/s);
  assert.match(source, /router\.patch\(\s*'\/imports\/:batchId\/entries\/:entryId\/resolve'/s);
  assert.match(source, /router\.get\(\s*'\/summary'/s);
  assert.match(source, /router\.get\(\s*'\/bank-hours'/s);
});

test('work schedule routes centralize scale permissions, assignments and status transitions', () => {
  const routeSource = readProjectFile('src', 'routes', 'workScheduleRoutes.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'workScheduleController.js'
  );
  const serviceSource = readProjectFile('src', 'services', 'workScheduleService.js');
  const permissionsSource = readProjectFile('src', 'utils', 'permissions.js');

  assert.match(routeSource, /requirePermission\('work_schedules\.read'\)/);
  assert.match(routeSource, /requirePermission\('work_schedules\.create'\)/);
  assert.match(routeSource, /requirePermission\('work_schedules\.update'\)/);
  assert.match(routeSource, /requirePermission\('work_schedules\.publish', 'work_schedules\.cancel'\)/);
  assert.match(routeSource, /requirePermission\('work_schedules\.assign'\)/);
  assert.match(routeSource, /\/:id\/assignments/);
  assert.match(routeSource, /\/:id\/duplicate/);
  assert.match(controllerSource, /module: 'work_schedules'/);
  assert.match(controllerSource, /PUBLICADA: 'PUBLISH'/);
  assert.match(serviceSource, /workScheduleAssignment/);
  assert.match(serviceSource, /buildConflictBundle/);
  assert.match(serviceSource, /VACATION_OVERLAP/);
  assert.match(serviceSource, /SCHEDULE_OVERLAP/);
  assert.match(serviceSource, /ensureSpecialDatesService/);
  assert.match(permissionsSource, /work_schedules\.read/);
  assert.match(permissionsSource, /work_schedules\.assign/);
});

test('trainings routes and service support governed certificates with attachment access', () => {
  const routeSource = readProjectFile(
    'src',
    'modules',
    'trainings',
    'trainingRoutes.js'
  );
  const controllerSource = readProjectFile(
    'src',
    'modules',
    'trainings',
    'trainingController.js'
  );
  const serviceSource = readProjectFile(
    'src',
    'modules',
    'trainings',
    'trainingService.js'
  );
  const permissionsSource = readProjectFile('src', 'utils', 'permissions.js');

  assert.match(routeSource, /requirePermission\('trainings\.read'\)/);
  assert.match(routeSource, /requirePermission\('trainings\.create'\)/);
  assert.match(routeSource, /requirePermission\('trainings\.update'\)/);
  assert.match(routeSource, /requirePermission\('trainings\.files\.read'\)/);
  assert.match(routeSource, /\/:id\/attachment\/view/);
  assert.match(routeSource, /\/:id\/attachment\/download/);
  assert.match(controllerSource, /action: 'UPLOAD'/);
  assert.match(controllerSource, /action: download \? 'DOWNLOAD' : 'VIEW'/);
  assert.match(serviceSource, /registerManagedFileService/);
  assert.match(serviceSource, /validityStatus/);
  assert.match(serviceSource, /getTrainingAttachmentStreamService/);
  assert.match(permissionsSource, /trainings\.files\.read/);
});

test('time tracking service keeps recognition priority, duplicate handling and preview persistence', () => {
  const source = readProjectFile('src', 'modules', 'timeTracking', 'timeTrackingService.js');

  assert.match(source, /employeeCodeSnapshot/);
  assert.match(source, /employeeDocumentSnapshot/);
  assert.match(source, /employeeNameSnapshot/);
  assert.match(source, /Linha duplicada no mesmo arquivo/);
  assert.match(source, /Registro ja importado anteriormente para o mesmo dia/);
  assert.match(source, /PENDENTE_VINCULO/);
  assert.match(source, /status: 'PREVIEW'/);
});

test('payroll processing service protects critical run transitions', () => {
  const source = readProjectFile('src', 'modules', 'payroll', 'payrollService.js');

  assert.match(source, /Nao ha colaboradores carregados nesta competencia/);
  assert.match(source, /status: 'EM_PROCESSAMENTO'/);
  assert.match(source, /status: 'PROCESSADA'/);
  assert.match(source, /Somente competencias processadas podem ser fechadas/);
  assert.match(source, /Somente competencias fechadas podem ser reabertas/);
});

test('audit routes remain protected and centralized', () => {
  const source = readProjectFile('src', 'routes', 'auditRoutes.js');

  assert.match(source, /router\.use\(authMiddleware\)/);
  assert.match(source, /router\.use\(requirePermission\('audit\.read'\)\)/);
});

test('performance routes centralize score, feedback and permission guards', () => {
  const routeSource = readProjectFile(
    'src',
    'modules',
    'performance',
    'performanceRoutes.js'
  );
  const serviceSource = readProjectFile(
    'src',
    'modules',
    'performance',
    'performanceService.js'
  );
  const permissionsSource = readProjectFile('src', 'utils', 'permissions.js');

  assert.match(routeSource, /requirePermission\('performance\.read'\)/);
  assert.match(routeSource, /requirePermission\('performance\.evaluate'\)/);
  assert.match(routeSource, /requirePermission\('performance\.feedback'\)/);
  assert.match(routeSource, /requirePermission\('performance\.external_feedback'\)/);
  assert.match(serviceSource, /DEFAULT_WEIGHTS/);
  assert.match(serviceSource, /getPerformanceWeightsSettingsService/);
  assert.match(serviceSource, /weightsToFactors/);
  assert.match(serviceSource, /timeSummary\.findMany/);
  assert.match(serviceSource, /employeeTraining\.findMany/);
  assert.match(serviceSource, /performancePeerFeedback\.create/);
  assert.match(serviceSource, /buildDistribution/);
  assert.match(serviceSource, /topPerformers/);
  assert.match(serviceSource, /improvedAfterTrainingCount/);
  assert.match(permissionsSource, /performance\.development_plan/);
  assert.match(permissionsSource, /performance\.export/);
  assert.match(permissionsSource, /performance\.pdf\.read/);
});

test('official pdf service supports institutional performance evaluation pdf generation', () => {
  const routeSource = readProjectFile('src', 'routes', 'pdfRoutes.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'pdfController.js'
  );
  const serviceSource = readProjectFile('src', 'services', 'officialPdfService.js');

  assert.match(routeSource, /\/performance\/:employeeId/);
  assert.match(routeSource, /requirePermission\('performance\.read', 'performance\.export'\)/);
  assert.match(controllerSource, /generatePerformanceEvaluationPdf/);
  assert.match(serviceSource, /buildPerformanceEvaluationPdfBuffer/);
  assert.match(serviceSource, /generatePerformanceEvaluationPdfService/);
  assert.match(serviceSource, /module:\s*'performance'/);
  assert.match(serviceSource, /performance_pdf/);
});

test('settings service validates configurable performance weights and keeps secure fallback', () => {
  const settingsSource = readProjectFile('src', 'services', 'settingsService.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'settingsController.js'
  );
  const permissionsSource = readProjectFile('src', 'utils', 'permissions.js');

  assert.match(settingsSource, /PERFORMANCE_WEIGHT_DEFAULTS/);
  assert.match(settingsSource, /normalizePerformanceWeights/);
  assert.match(settingsSource, /A soma dos pesos de desempenho deve ser 100%/);
  assert.match(settingsSource, /getPerformanceWeightsSettingsService/);
  assert.match(controllerSource, /performance:\s*'settings\.performance'/);
  assert.match(permissionsSource, /settings\.performance/);
});

test('settings and login ui expose advanced security controls and mfa verification step', () => {
  const settingsPageSource = readProjectFile(
    '..',
    'frontend',
    'src',
    'pages',
    'SettingsPage.jsx'
  );
  const loginPageSource = readProjectFile(
    '..',
    'frontend',
    'src',
    'pages',
    'Login.jsx'
  );
  const usersPageSource = readProjectFile(
    '..',
    'frontend',
    'src',
    'pages',
    'Users.jsx'
  );

  assert.match(settingsPageSource, /absoluteSessionHours/);
  assert.match(settingsPageSource, /maxLoginAttempts/);
  assert.match(settingsPageSource, /loginLockMinutes/);
  assert.match(settingsPageSource, /mfaRequiredForPrivileged/);
  assert.match(settingsPageSource, /blockCommonPasswords/);
  assert.match(loginPageSource, /MFA_REQUIRED/);
  assert.match(loginPageSource, /\/auth\/mfa\/verify/);
  assert.match(loginPageSource, /Confirmar codigo/);
  assert.match(usersPageSource, /MFA ativo/);
  assert.match(usersPageSource, /Bloqueio temporario/);
});

test('go-live feedback endpoint stays authenticated and audit-backed', () => {
  const routeSource = readProjectFile('src', 'routes', 'feedbackRoutes.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'feedbackController.js'
  );

  assert.match(routeSource, /router\.use\(authMiddleware\)/);
  assert.match(routeSource, /router\.post\('\/', createFeedback\)/);
  assert.match(controllerSource, /module: 'go_live'/);
  assert.match(controllerSource, /entityType: 'internal_feedback'/);
  assert.match(controllerSource, /action: 'CREATE'/);
});

test('user security routes support manual unlock of temporary access blocks', () => {
  const routeSource = readProjectFile('src', 'routes', 'userRoutes.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'userController.js'
  );
  const serviceSource = readProjectFile('src', 'services', 'userService.js');

  assert.match(routeSource, /\/:id\/security\/unlock/);
  assert.match(routeSource, /security\.sessions\.manage/);
  assert.match(controllerSource, /clearUserTemporaryLock/);
  assert.match(controllerSource, /action: 'UNLOCK'/);
  assert.match(serviceSource, /clearUserTemporaryLockByIdService/);
  assert.match(serviceSource, /clearTemporaryAccessLockService/);
});

test('user routes rely on permissions instead of coarse admin-only role gating', () => {
  const routeSource = readProjectFile('src', 'routes', 'userRoutes.js');
  const controllerSource = readProjectFile(
    'src',
    'controllers',
    'userController.js'
  );

  assert.match(routeSource, /router\.use\(authMiddleware\)/);
  assert.match(routeSource, /requirePermission\('users\.read'\)/);
  assert.match(routeSource, /router\.post\('\/', requirePermission\('users\.create'\), createUser\)/);
  assert.doesNotMatch(routeSource, /authorizeRoles\('SUPER_ADMIN', 'ADMIN'\)/);
  assert.match(controllerSource, /module: 'users'/);
  assert.match(controllerSource, /action: 'CREATE'/);
});

test('app exposes lightweight health check and development timing logs', () => {
  const appSource = readProjectFile('src', 'app.js');

  assert.match(appSource, /app\.get\('\/health', async \(req, res\)/);
  assert.match(appSource, /status: 'ok'/);
  assert.match(appSource, /environment: process\.env\.NODE_ENV \|\| 'development'/);
  assert.match(appSource, /uptime: Math\.round\(process\.uptime\(\)\)/);
  assert.match(appSource, /database = 'ok'/);
  assert.match(appSource, /\[API\] \$\{req\.method\} \$\{req\.originalUrl\} -> \$\{res\.statusCode\}/);
});
