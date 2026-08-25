import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  buildMockJwt,
  defaultUser,
  fulfillJson,
  mockCoreShellApi,
} from './helpers/mockApi.mjs';

test('login, shell navigation and user/report areas stay operational', async ({
  page,
}) => {
  await mockCoreShellApi(page);

  await page.route(`${API_BASE_URL}/auth/login`, async (route) => {
    await fulfillJson(route, {
      token: buildMockJwt(),
      session: {
        id: 101,
        expiresAt: '2099-12-31T23:59:59.000Z',
      },
      user: defaultUser,
    });
  });

  await page.route(`${API_BASE_URL}/users*`, async (route) => {
    await fulfillJson(route, {
      users: [
        {
          id: 10,
          name: 'Larissa Trindade',
          email: 'larissa@nexo.local',
          username: 'larissa',
          role: 'RH',
          status: 'ATIVO',
          companyId: 1,
          employeeId: 3,
          mustChangePassword: false,
          profiles: [{ id: 3, name: 'RH' }],
          employee: {
            id: 3,
            name: 'Larissa Trindade',
            role: 'Gestora RH',
            department: 'Administracao',
          },
          company: {
            id: 1,
            name: 'Nexo Ti',
          },
          lastLoginAt: '2026-04-22T09:00:00.000Z',
          createdAt: '2026-04-10T09:00:00.000Z',
        },
      ],
      summary: {
        total: 1,
        active: 1,
        inactive: 0,
        blocked: 0,
        linkedEmployees: 1,
        unlinkedEmployees: 0,
        neverLoggedIn: 0,
        recentAccess: 1,
        roleDistribution: [{ role: 'RH', count: 1 }],
      },
    });
  });

  await page.route(`${API_BASE_URL}/companies*`, async (route) => {
    await fulfillJson(route, {
      companies: [{ id: 1, name: 'Nexo Ti' }],
    });
  });

  await page.route(`${API_BASE_URL}/employees*`, async (route) => {
    await fulfillJson(route, {
      employees: [
        {
          id: 3,
          name: 'Larissa Trindade',
          role: 'Gestora RH',
          department: 'Administracao',
        },
      ],
    });
  });

  await page.route(`${API_BASE_URL}/profiles*`, async (route) => {
    await fulfillJson(route, {
      profiles: [{ id: 3, name: 'RH', key: 'RH' }],
    });
  });

  await page.route(`${API_BASE_URL}/reports/options*`, async (route) => {
    await fulfillJson(route, {
      options: {
        reportTypes: [{ value: 'employees', label: 'Colaboradores' }],
        employees: [{ id: 3, name: 'Larissa Trindade' }],
        departments: ['Administracao'],
        companies: [{ id: 1, name: 'Nexo Ti' }],
        users: [{ id: 1, name: 'Admin Elo' }],
      },
    });
  });

  await page.route(`${API_BASE_URL}/reports/preview*`, async (route) => {
    await fulfillJson(route, {
      report: {
        reportType: 'employees',
        title: 'Relatorio de colaboradores',
        subtitle: 'Base auditavel do periodo',
        periodLabel: '01/04/2026 a 22/04/2026',
        generatedAt: '2026-04-22T10:00:00.000Z',
        summaryCards: [
          {
            title: 'Registros',
            value: 1,
            subtitle: 'Colaboradores retornados',
          },
        ],
        appliedFilters: [],
        columns: [
          { key: 'name', label: 'Colaborador' },
          { key: 'status', label: 'Status' },
        ],
        rows: [{ name: 'Larissa Trindade', status: 'ATIVO' }],
        tableTitle: 'Preview',
      },
    });
  });

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('admin@elo.local');
  await page.locator('input[name="password"]').fill('123456');
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();

  await expect(
    page.getByRole('heading', { name: /Dashboard estrategico do RH/i })
  ).toBeVisible();
  await expect(page.getByText('Visao Geral')).toBeVisible();

  await page.getByRole('button', { name: /Usuarios/i }).click();
  await expect(
    page.getByRole('heading', { name: /Usuarios|Usuários/i }).first()
  ).toBeVisible();
  await expect(page.getByText('Larissa Trindade').first()).toBeVisible();

  await page.getByRole('button', { name: /Relatorios/i }).click();
  await expect(
    page.getByRole('heading', { name: /Relatorios|Relatórios/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Gerar preview' })
  ).toBeVisible();
});

test('login supports MFA_REQUIRED before entering the shell', async ({
  page,
}) => {
  await mockCoreShellApi(page);

  let loginCalls = 0;

  await page.route(`${API_BASE_URL}/auth/login`, async (route) => {
    loginCalls += 1;

    if (loginCalls === 1) {
      await fulfillJson(route, {
        state: 'MFA_REQUIRED',
        challengeToken: 'challenge-123',
        maskedEmail: 'ad***n@nexo.local',
        expiresAt: '2026-04-24T09:10:00.000Z',
        purpose: 'LOGIN_MFA',
        user: defaultUser,
      });
      return;
    }

    await fulfillJson(route, {
      token: buildMockJwt(),
      session: {
        id: 101,
        expiresAt: '2099-12-31T23:59:59.000Z',
      },
      user: defaultUser,
    });
  });

  await page.route(`${API_BASE_URL}/auth/mfa/verify`, async (route) => {
    await fulfillJson(route, {
      token: buildMockJwt(),
      session: {
        id: 101,
        expiresAt: '2099-12-31T23:59:59.000Z',
      },
      user: defaultUser,
    });
  });

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('admin@elo.local');
  await page.locator('input[name="password"]').fill('123456789012');
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();

  await expect(
    page.getByRole('heading', { name: 'Confirmar codigo' })
  ).toBeVisible();
  await page.getByPlaceholder('000000').fill('123456');
  await page.getByRole('button', { name: 'Confirmar codigo' }).click();

  await expect(
    page.getByRole('heading', { name: /Dashboard estrategico do RH/i })
  ).toBeVisible();
});

test('login shows a stable offline message when backend is unavailable', async ({
  page,
}) => {
  await page.route(`${API_BASE_URL}/auth/login`, async (route) => {
    await route.abort('failed');
  });

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('admin@elo.local');
  await page.locator('input[name="password"]').fill('123456789012');
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();

  await expect(
    page.getByText(/Servidor indisponivel ou conexao instavel/i)
  ).toBeVisible();
});
