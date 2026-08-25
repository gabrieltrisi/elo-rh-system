import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  defaultUser,
  fulfillJson,
  mockCoreShellApi,
  seedAuthenticatedSession,
} from './helpers/mockApi.mjs';

test('payroll preview, reports export and audit consultation remain available', async ({
  page,
}) => {
  await seedAuthenticatedSession(page, defaultUser);
  await mockCoreShellApi(page);

  const payrollRun = {
    id: 21,
    month: 4,
    year: 2026,
    referenceLabel: '04/2026',
    status: 'ABERTA',
    totalEmployees: 1,
    totalGross: 5200,
    totalDiscounts: 980,
    totalNet: 4220,
    totalCharges: 1400,
    createdAt: '2026-04-22T09:30:00.000Z',
    employees: [
      {
        id: 301,
        employeeId: 7,
        employeeName: 'Gabriel Trisi',
        role: 'Tecnico N2',
        department: 'Suporte',
        status: 'PROCESSADO',
        grossAmount: 5200,
        discountAmount: 980,
        netAmount: 4220,
        chargesAmount: 1400,
        breakdown: {
          provents: 5200,
          discounts: 980,
          net: 4220,
        },
        movements: [],
      },
    ],
  };

  await page.route(`${API_BASE_URL}/payroll/runs*`, async (route) => {
    await fulfillJson(route, {
      runs: [payrollRun],
      summary: {
        totalRuns: 1,
        openRuns: 1,
        processedRuns: 0,
        closedRuns: 0,
        totalEmployees: 1,
        totalNet: 4220,
      },
    });
  });

  await page.route(`${API_BASE_URL}/payroll/events*`, async (route) => {
    await fulfillJson(route, {
      events: [
        {
          id: 11,
          code: '1001',
          name: 'Salario base',
          type: 'PROVENTO',
          calculationType: 'FIXO',
          isActive: true,
        },
      ],
    });
  });

  await page.route(`${API_BASE_URL}/payroll/runs/21`, async (route) => {
    await fulfillJson(route, {
      run: payrollRun,
    });
  });

  await page.route(`${API_BASE_URL}/payroll/runs/21/payslips/7`, async (route) => {
    await fulfillJson(route, {
      payslip: {
        competence: '04/2026',
        companyName: 'Nexo Ti',
        employee: {
          id: 7,
          name: 'Gabriel Trisi',
          role: 'Tecnico N2',
          department: 'Suporte',
          cpf: '000.000.000-00',
        },
        totals: {
          grossAmount: 5200,
          discountAmount: 980,
          netAmount: 4220,
        },
        provents: [{ code: '1001', name: 'Salario base', totalValue: 5200 }],
        discounts: [{ code: '2001', name: 'INSS', totalValue: 980 }],
        informative: [],
      },
    });
  });

  await page.route(`${API_BASE_URL}/reports/options*`, async (route) => {
    await fulfillJson(route, {
      options: {
        reportTypes: [
          { value: 'payroll', label: 'Folha de Pagamento' },
          { value: 'audit', label: 'Auditoria' },
        ],
        employees: [{ id: 7, name: 'Gabriel Trisi' }],
        departments: ['Suporte'],
        companies: [{ id: 1, name: 'Nexo Ti' }],
        users: [{ id: 1, name: 'Admin Elo' }],
      },
    });
  });

  await page.route(`${API_BASE_URL}/reports/preview*`, async (route) => {
    await fulfillJson(route, {
      report: {
        reportType: 'payroll',
        title: 'Relatorio de folha',
        subtitle: 'Consolidado processado',
        periodLabel: '04/2026',
        generatedAt: '2026-04-22T11:00:00.000Z',
        summaryCards: [
          { title: 'Liquido', value: 4220, subtitle: 'Competencia aberta' },
        ],
        appliedFilters: [],
        columns: [
          { key: 'employeeName', label: 'Colaborador' },
          { key: 'netAmount', label: 'Liquido', format: 'currency' },
        ],
        rows: [{ employeeName: 'Gabriel Trisi', netAmount: 4220 }],
        tableTitle: 'Preview da folha',
      },
    });
  });

  await page.route(`${API_BASE_URL}/reports/export/excel*`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="relatorio.xlsx"',
      },
      body: Buffer.from('excel-mock'),
    });
  });

  await page.route(`${API_BASE_URL}/reports/export/pdf*`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="relatorio.pdf"',
      },
      body: Buffer.from('%PDF-1.4 mock'),
    });
  });

  await page.route(`${API_BASE_URL}/audit*`, async (route) => {
    await fulfillJson(route, {
      logs: [
        {
          id: 1,
          userId: 1,
          userNameSnapshot: 'Admin Elo',
          module: 'payroll',
          action: 'PROCESS',
          entityType: 'payroll_run',
          entityId: 21,
          severity: 'CRITICAL',
          summary: 'Competencia 04/2026 processada',
          createdAt: '2026-04-22T11:05:00.000Z',
        },
      ],
      summary: {
        total: 1,
        criticalCount: 1,
        todayCount: 1,
        topModule: { module: 'payroll', count: 1 },
        mostActiveUser: { name: 'Admin Elo', count: 1 },
      },
    });
  });

  await page.route(`${API_BASE_URL}/storage/settings*`, async (route) => {
    await fulfillJson(route, {
      settings: {
        provider: 'SHAREPOINT',
        syncStatus: 'SYNCED',
      },
    });
  });

  await page.goto('/');

  await page.getByRole('button', { name: /Departamento Pessoal/i }).click();
  await page.getByRole('button', { name: /Folha de Pagamento/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Folha de Pagamento' }).last()
  ).toBeVisible();
  const employeeRow = page.getByRole('row').filter({ hasText: 'Gabriel Trisi' });
  await employeeRow.getByRole('button', { name: 'Holerite' }).click();
  await expect(page.getByText('Preview do holerite', { exact: true })).toBeVisible();
  await page.locator('div.fixed.inset-0').last().click({
    position: { x: 10, y: 10 },
    force: true,
  });

  await page.getByRole('button', { name: /Relatorios/i }).click();
  await expect(
    page.getByRole('heading', { name: /Relatorios|Relatórios/i }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: 'Gerar preview' }).click();
  await expect(page.getByText('Preview antes da exportacao')).toBeVisible();

  const excelDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  await (await excelDownload).cancel();

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  await (await pdfDownload).cancel();

  await page.getByRole('button', { name: /Auditoria/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Central de Auditoria' })
  ).toBeVisible();
  await expect(page.getByText('Competencia 04/2026 processada')).toBeVisible();
});
