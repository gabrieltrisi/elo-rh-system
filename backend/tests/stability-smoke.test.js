import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const readProjectFile = (...segments) =>
  fs.readFileSync(path.join(rootDir, ...segments), 'utf8');

test('backend app can be imported without boot errors', async () => {
  const appModule = await import('../src/app.js');
  assert.ok(appModule.default, 'app export should exist');
});

test('auth controller keeps login safety checks', () => {
  const source = readProjectFile('src', 'controllers', 'authController.js');
  assert.match(source, /user\.status !== 'ATIVO'/);
  assert.match(source, /lastLoginAt: new Date\(\)/);
  assert.match(source, /action: 'LOGIN'/);
});

test('critical routes enforce permission middleware', () => {
  const routeFiles = [
    ['src', 'routes', 'fileRoutes.js', 'documents.read'],
    ['src', 'routes', 'dashboardRoutes.js', 'dashboard.read'],
    ['src', 'routes', 'reportRoutes.js', 'reports.read'],
    ['src', 'routes', 'employeeRoutes.js', 'employees.read'],
  ];

  routeFiles.forEach(([...parts]) => {
    const expectedPermission = parts.pop();
    const source = readProjectFile(...parts);
    assert.match(source, /requirePermission/);
    assert.match(source, new RegExp(expectedPermission.replace('.', '\\.')));
  });
});
