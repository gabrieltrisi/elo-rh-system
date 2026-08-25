import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const readProjectFile = (...segments) =>
  fs.readFileSync(path.join(rootDir, ...segments), 'utf8');

test('App keeps critical pages wired into the private shell', () => {
  const source = readProjectFile('src', 'App.jsx');

  [
    'Dashboard',
    'Employees',
    'Users',
    'Onboarding',
    'Timesheet',
    'WorkSchedules',
    'Payroll',
    'Reports',
    'Performance',
    'Integrations',
    'SettingsPage',
  ].forEach((pageName) => {
    assert.match(source, new RegExp(pageName));
  });

  assert.match(source, /const Layout = lazy\(\(\) => import\('\.\/components\/Layout'\)\)/);
  assert.match(source, /function RouteElement/);
  assert.match(source, /RouteLoadingFallback/);
});

test('sidebar keeps strategic groups available in the layout', () => {
  const source = readProjectFile('src', 'components', 'Layout.jsx');

  [
    'Administracao',
    'Pessoas',
    'Compliance',
    'Jornada',
    'Departamento Pessoal',
    'Gestao',
    'Configuracoes',
  ].forEach((groupName) => {
    assert.match(source, new RegExp(groupName));
  });

  assert.match(source, /SIDEBAR_COLLAPSED_WIDTH = 70/);
  assert.match(source, /Tooltip/);
  assert.match(source, /logo-symbol\.png/);
});

test('API client resolves backend URL from environment or local fallback', () => {
  const source = readProjectFile('src', 'services', 'api.js');

  assert.match(source, /VITE_API_URL/);
  assert.match(source, /REQUEST_TIMEOUT_MS = 12000/);
  assert.match(source, /method === 'get' && networkFailure/);
  assert.match(source, /ECONNABORTED/);
  assert.match(source, /window\.location\.href = '\/login'/);
  assert.match(source, /resolveApiErrorMessage/);
  assert.match(source, /AUTH_401_CODES/);
  assert.match(source, /setAuthNotice/);
  assert.match(source, /Sua sessao expirou\. Faca login novamente\./);
  assert.doesNotMatch(source, /elo-backend-ajak\.onrender\.com/);
});

test('App shell loads badge counters from dashboard payload without extra warning fetches', () => {
  const source = readProjectFile('src', 'App.jsx');

  assert.match(source, /api\.get\('\/dashboard'\)/);
  assert.match(source, /quickActionBadges\?\.warnings/);
  assert.doesNotMatch(source, /api\.get\('\/warnings'\)/);
});

test('dashboard defers heavy charts until the section enters the viewport', () => {
  const source = readProjectFile('src', 'pages', 'Dashboard.jsx');

  assert.match(source, /const DashboardCharts = lazy/);
  assert.match(source, /function DeferredSection/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /rootMargin = '220px'/);
});
