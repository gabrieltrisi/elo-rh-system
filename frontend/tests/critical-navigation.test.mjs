import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const readProjectFile = (...segments) =>
  fs.readFileSync(path.join(rootDir, ...segments), 'utf8');

test('login page keeps auth entrypoints and forgot-password recovery', () => {
  const source = readProjectFile('src', 'pages', 'Login.jsx');

  assert.match(source, /api\.post\('\/auth\/login'/);
  assert.match(source, /api\.post\('\/auth\/mfa\/verify'/);
  assert.match(source, /MFA_REQUIRED/);
  assert.match(source, /MFA_SETUP_REQUIRED/);
  assert.match(source, /Confirmar codigo/);
  assert.match(source, /navigate\('\/forgot-password'\)/);
  assert.match(source, /consumeAuthNotice/);
  assert.match(source, /onLogin\(\{\s*token,\s*user,\s*session\s*\}\)/);
  assert.doesNotMatch(source, /\/auth\/register/);
  assert.doesNotMatch(source, /localStorage\.setItem\('token'/);
});

test('users page stays connected to user, employee, company and profile endpoints', () => {
  const source = readProjectFile('src', 'pages', 'Users.jsx');

  [
    "/users",
    "/companies",
    "/employees",
    "/profiles",
    "/reset-password",
    "/profiles",
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  assert.match(source, /useAuthSession/);
  assert.match(source, /hasPermission\('profiles\.read'\)/);
  assert.match(source, /employeeId:\s*formData\.employeeId \? Number\(formData\.employeeId\) : null/);
  assert.doesNotMatch(source, /\/auth\/register/);
});

test('documents page still renders grouped folders rather than raw file noise', () => {
  const source = readProjectFile('src', 'pages', 'Documents.jsx');

  assert.match(source, /Pastas de documentos/);
  assert.match(source, /Abrir pasta/);
  assert.match(source, /api\.get\('\/documents'/);
});

test('timesheet page wires import preview, confirmation and summary flows', () => {
  const source = readProjectFile('src', 'pages', 'Timesheet.jsx');

  [
    "/time/import",
    "/time/imports",
    "/time/summary",
    "/time/options",
    "/time/imports/${batchId}/confirm",
    "/time/imports/${batchId}/entries/${entryId}/resolve",
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('bank hours page consumes the dedicated bank-hours endpoint', () => {
  const source = readProjectFile('src', 'pages', 'BankHours.jsx');

  assert.match(source, /api\.get\('\/time\/bank-hours'/);
  assert.match(source, /Saldo atual/);
});

test('work schedules page exposes premium scale planning with timeline and assignment actions', () => {
  const source = readProjectFile('src', 'pages', 'WorkSchedules.jsx');

  [
    '/work-schedules',
    '/work-schedules/options',
    '/work-schedules/${scheduleId}',
    '/work-schedules/${scheduleId}/status',
    '/work-schedules/${scheduleId}/duplicate',
    'Nova Escala',
    'Timeline operacional',
    'Colaboradores escalados',
    'Conflitos detectados',
    'Planejamento operacional',
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('payroll page keeps run lifecycle and payslip preview actions connected', () => {
  const source = readProjectFile('src', 'pages', 'Payroll.jsx');

  assert.match(source, /\/payroll\/runs/);
  assert.match(source, /\/payroll\/runs\/\$\{selectedRun\.id\}\/process/);
  assert.match(source, /\/payroll\/runs\/\$\{selectedRun\.id\}\/close/);
  assert.match(source, /\/payroll\/runs\/\$\{selectedRun\.id\}\/reopen/);
  assert.match(source, /\/payroll\/runs\/\$\{selectedRun\.id\}\/payslips\/\$\{employee\.employeeId\}/);
});

test('pdf action pages load pdf helpers only on demand', () => {
  const payslipsSource = readProjectFile('src', 'pages', 'Payslips.jsx');
  const performanceSource = readProjectFile('src', 'pages', 'Performance.jsx');
  const warningsSource = readProjectFile('src', 'pages', 'Warnings.jsx');
  const suspensionsSource = readProjectFile('src', 'pages', 'Suspensions.jsx');

  [payslipsSource, performanceSource, warningsSource, suspensionsSource].forEach(
    (source) => {
      assert.match(source, /await import\(\s*'\.\.\/utils\/pdfActions'/);
      assert.doesNotMatch(
        source,
        /import\s+\{\s*downloadPdfFromEndpoint,\s*openPdfFromEndpoint\s*\}\s+from\s+'..\/utils\/pdfActions'/
      );
    }
  );
});

test('reports page keeps preview and export actions available', () => {
  const source = readProjectFile('src', 'pages', 'Reports.jsx');

  assert.match(source, /api\.get\('\/reports\/options'/);
  assert.match(source, /api\.get\('\/reports\/preview'/);
  assert.match(source, /\/reports\/export\/excel/);
  assert.match(source, /\/reports\/export\/pdf/);
  assert.match(source, /resolveApiErrorMessage/);
  assert.match(source, /Nao foi possivel concluir a operacao/);
  assert.match(source, /Tentar novamente/);
  assert.match(source, /report-skeleton-/);
});

test('audit center remains connected to audit and storage status endpoints', () => {
  const source = readProjectFile('src', 'pages', 'AuditCenter.jsx');

  assert.match(source, /api\.get\('\/audit'/);
  assert.match(source, /api\.get\('\/storage\/settings'/);
  assert.match(source, /Central de Auditoria|Auditoria/);
  assert.match(source, /params\.page = page/);
  assert.match(source, /setPagination/);
});

test('main shell still exposes the critical management modules in navigation', () => {
  const source = readProjectFile('src', 'components', 'Layout.jsx');

  [
    'Usuarios',
    'Perfis e Permissoes',
    'Auditoria',
    'Documentos / Arquivos',
    'Folha de Ponto',
    'Banco de Horas',
    'Escala',
    'Folha de Pagamento',
    'Relatorios',
    'Desempenho',
  ].forEach((label) => {
    assert.match(source, new RegExp(label));
  });

  assert.match(source, /lazy\(\(\) => import\('\.\/help\/FloatingAssistant'\)\)/);
  assert.match(source, /lazy\(\(\) => import\('\.\/help\/PageHelpCard'\)\)/);
  assert.match(source, /<Suspense fallback=\{null\}>/);
});

test('trainings page focuses on certificates, expiry and governed attachments', () => {
  const source = readProjectFile('src', 'pages', 'Trainings.jsx');

  [
    '/trainings',
    '/trainings/',
    'Gestao de certificados',
    'Novo certificado',
    'Validade',
    'Vencendo em breve',
    '/attachment/view',
    '/attachment/download',
    'Certificados e capacitacoes',
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('performance page consumes backend score and feedback endpoints', () => {
  const source = readProjectFile('src', 'pages', 'Performance.jsx');

  [
    '/performance/options',
    '/performance',
    '/performance/evaluations',
    '/performance/peer-feedback',
    '/performance/external-feedback',
    'performance.read',
    'performance.evaluate',
    'Dashboard Executivo de Desempenho',
    'Distribuicao por classificacao',
    'Melhores desempenhos',
    'Quem mais evoluiu',
    'Treinamentos e impacto na evolucao',
    '/pdf/performance/',
    'Gerar PDF',
    'Baixar PDF',
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('settings page exposes premium performance weight controls inside configuration hub', () => {
  const source = readProjectFile('src', 'pages', 'SettingsPage.jsx');

  [
    'settings.performance',
    'PerformanceWeightField',
    'Pontualidade',
    'Assiduidade',
    'Comportamento / postura',
    'Feedback interno',
    'Feedback externo',
    'Treinamentos',
    "saveSection('performance')",
    'A distribuicao precisa fechar exatamente em 100%',
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('settings page also exposes advanced security policy controls', () => {
  const source = readProjectFile('src', 'pages', 'SettingsPage.jsx');

  [
    'absoluteSessionHours',
    'maxLoginAttempts',
    'loginLockMinutes',
    'reauthWindowMinutes',
    'mfaRequiredForPrivileged',
    'mfaOptionalForRh',
    'blockCommonPasswords',
    "saveSection('security')",
  ].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('users page exposes security indicators for mfa and active sessions', () => {
  const source = readProjectFile('src', 'pages', 'Users.jsx');

  ['MFA ativo', 'Bloqueio temporario', 'Desbloquear', 'security/unlock'].forEach((snippet) => {
    assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('help center includes go-live checklist and pilot readiness content', () => {
  const helpSource = readProjectFile('src', 'pages', 'HelpCenter.jsx');
  const readinessSource = readProjectFile('src', 'data', 'goLiveReadiness.js');
  const helpContentSource = readProjectFile('src', 'data', 'helpContent.js');

  assert.match(helpSource, /goLiveReadiness/);
  assert.match(readinessSource, /Go-live interno controlado/);
  assert.match(readinessSource, /RH 1/);
  assert.match(readinessSource, /RH 2/);
  assert.match(readinessSource, /CEO/);
  assert.match(helpContentSource, /page: 'workSchedules'/);
  assert.match(helpContentSource, /Planeje quem trabalha, quando trabalha e em qual operacao/);
});

test('floating assistant can register go-live feedback through backend', () => {
  const source = readProjectFile(
    'src',
    'components',
    'help',
    'FloatingAssistant.jsx'
  );

  assert.match(source, /api\.post\('\/feedback'/);
  assert.match(source, /Feedback do go-live/);
  assert.match(source, /Registrar feedback/);
});
