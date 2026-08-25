import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  defaultUser,
  fulfillJson,
  mockCoreShellApi,
  parseRoute,
  seedAuthenticatedSession,
} from './helpers/mockApi.mjs';

test('documents upload/view and jornada import/bank hours stay usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__lastOpenedUrl = null;
    const originalOpen = window.open.bind(window);
    window.open = (...args) => {
      window.__lastOpenedUrl = args[0] ?? null;
      return null;
    };
    window.__restoreOpen = () => {
      window.open = originalOpen;
    };
  });

  await seedAuthenticatedSession(page, defaultUser);
  await mockCoreShellApi(page);

  let documents = [
    {
      id: 1,
      title: 'Contrato social',
      category: 'Contrato',
      description: 'Documento auditavel',
      fileName: 'contrato-social.pdf',
      fileUrl: '/uploads/documentation/contrato-social.pdf',
      employeeId: 7,
      employee: {
        id: 7,
        name: 'Gabriel Trisi',
      },
      createdAt: '2026-04-20T10:00:00.000Z',
    },
  ];

  let importedBatch = {
    id: 99,
    source: 'MYAHGORA',
    status: 'PREVIEW',
    originalName: 'jornada-abril.xlsx',
    totalRows: 2,
    validRows: 1,
    invalidRows: 0,
    duplicateRows: 0,
    pendingRows: 1,
    recognizedEmployees: 1,
    createdAt: '2026-04-22T10:10:00.000Z',
    previewSample: [
      {
        id: 501,
        sourceRowNumber: 2,
        employeeNameSnapshot: 'Gabriel Trisi',
        validationStatus: 'VALIDO',
        workDate: '2026-04-21T00:00:00.000Z',
        workedMinutes: 480,
        overtimeMinutes: 30,
        validationErrors: [],
      },
    ],
  };

  await page.route(`${API_BASE_URL}/employees*`, async (route) => {
    await fulfillJson(route, {
      employees: [{ id: 7, name: 'Gabriel Trisi', department: 'Suporte' }],
    });
  });

  await page.route(`${API_BASE_URL}/documents*`, async (route) => {
    const { method } = parseRoute(route);

    if (method === 'GET') {
      await fulfillJson(route, { documents });
      return;
    }

    if (method === 'POST') {
      documents = [
        ...documents,
        {
          id: 2,
          title: 'Foto cracha',
          category: 'Manual',
          description: '',
          fileName: 'foto-cracha.png',
          fileUrl: '/uploads/documentation/foto-cracha.png',
          employeeId: 7,
          employee: {
            id: 7,
            name: 'Gabriel Trisi',
          },
          createdAt: '2026-04-22T10:15:00.000Z',
        },
      ];

      await fulfillJson(
        route,
        {
          message: 'Documento cadastrado com sucesso',
        },
        201
      );
      return;
    }

    await fulfillJson(route, { message: 'Metodo nao suportado no mock' }, 405);
  });

  await page.route(`${API_BASE_URL}/time/options*`, async (route) => {
    await fulfillJson(route, {
      employees: [{ id: 7, name: 'Gabriel Trisi' }],
      departments: ['Suporte'],
      sources: [{ value: 'MYAHGORA', label: 'MyAhgora / TOTVS' }],
    });
  });

  await page.route(`${API_BASE_URL}/time/summary*`, async (route) => {
    await fulfillJson(route, {
      summaries: [
        {
          id: 1,
          employeeId: 7,
          employeeName: 'Gabriel Trisi',
          department: 'Suporte',
          workedMinutes: 480,
          overtimeMinutes: 30,
          delayMinutes: 5,
          absenceMinutes: 0,
          bankHoursMinutes: 25,
        },
      ],
      summary: {
        totalEmployees: 1,
        totalWorkedMinutes: 480,
        totalOvertimeMinutes: 30,
        totalDelayMinutes: 5,
        totalAbsenceMinutes: 0,
        totalBankHoursMinutes: 25,
        pendingLinks: importedBatch.pendingRows,
        recognizedEmployees: 1,
        importedRows: importedBatch.validRows,
        lastImportAt: importedBatch.createdAt,
      },
    });
  });

  await page.route(`${API_BASE_URL}/time/imports*`, async (route) => {
    const { method } = parseRoute(route);

    if (method === 'GET') {
      await fulfillJson(route, {
        batches: [importedBatch],
        summary: {
          totalBatches: 1,
          importedBatches: importedBatch.status === 'IMPORTADO' ? 1 : 0,
          previewBatches: importedBatch.status === 'PREVIEW' ? 1 : 0,
          pendingRows: importedBatch.pendingRows,
          invalidRows: importedBatch.invalidRows,
          lastImportAt: importedBatch.createdAt,
        },
      });
      return;
    }

    if (method === 'POST') {
      importedBatch = {
        ...importedBatch,
        status: 'IMPORTADO',
        pendingRows: 0,
      };

      await fulfillJson(route, {
        batch: importedBatch,
        message: 'Importacao confirmada e consolidada com sucesso',
      });
      return;
    }

    await fulfillJson(route, { message: 'Metodo nao suportado no mock' }, 405);
  });

  await page.route(`${API_BASE_URL}/time/imports/99/confirm`, async (route) => {
    importedBatch = {
      ...importedBatch,
      status: 'IMPORTADO',
      pendingRows: 0,
    };

    await fulfillJson(route, {
      batch: importedBatch,
      message: 'Importacao confirmada e consolidada com sucesso',
    });
  });

  await page.route(`${API_BASE_URL}/time/imports/99`, async (route) => {
    await fulfillJson(route, {
      batch: {
        ...importedBatch,
        entries: importedBatch.previewSample || [],
      },
    });
  });

  await page.route(`${API_BASE_URL}/time/import`, async (route) => {
    await fulfillJson(
      route,
      {
        batch: importedBatch,
        message: 'Previa da importacao gerada com sucesso',
      },
      201
    );
  });

  await page.route(`${API_BASE_URL}/time/bank-hours*`, async (route) => {
    await fulfillJson(route, {
      balances: [
        {
          id: 1,
          employeeId: 7,
          employeeName: 'Gabriel Trisi',
          department: 'Suporte',
          openingBalanceMinutes: 60,
          creditMinutes: 30,
          debitMinutes: 5,
          closingBalanceMinutes: 85,
        },
      ],
      summary: {
        totalEmployees: 1,
        totalCreditsMinutes: 30,
        totalDebitsMinutes: 5,
        totalClosingBalanceMinutes: 85,
        positiveBalances: 1,
        negativeBalances: 0,
      },
    });
  });

  await page.goto('/');

  await page.getByRole('button', { name: /Documentos \/ Arquivos/i }).click();
  await expect(page.getByText('Pastas de documentos')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir pasta' }).first().click();
  const contractRow = page.getByRole('row').filter({ hasText: 'Contrato social' });
  await expect(contractRow).toBeVisible();
  await contractRow.getByRole('button', { name: 'Ver' }).click({ force: true });
  await expect
    .poll(() => page.evaluate(() => window.__lastOpenedUrl))
    .toMatch(/files\/documentation\/view\//);

  await page.getByRole('button', { name: /\+ Novo documento/i }).click();
  await page.locator('input[name="title"]').fill('Foto cracha');
  await page.locator('select[name="category"]').selectOption('Manual');
  await page.locator('select[name="employeeId"]').selectOption('7');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'foto-cracha.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png-mock'),
  });
  await page.getByRole('button', { name: 'Cadastrar documento' }).click();
  await expect(page.getByText('2 documentos nesta pasta')).toBeVisible();

  await page.getByRole('button', { name: /Jornada/i }).click();
  await page.getByRole('button', { name: /Folha de Ponto/i }).click();
  await expect(
    page.getByRole('button', { name: /Importar relat[oó]rio/i }).first()
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Importar relat[oó]rio/i })
    .first()
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'jornada-abril.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('xlsx-mock'),
  });
  await page.getByRole('button', { name: /Gerar pr[ée]via/i }).click();
  await expect(page.getByText(/Amostra da importa[cç][aã]o/i)).toBeVisible();
  await page.getByRole('button', { name: /Confirmar importa[cç][aã]o/i }).click();
  await expect(
    page.getByRole('button', { name: /Confirmar importa[cç][aã]o/i })
  ).toHaveCount(0);

  await page.getByRole('button', { name: /Banco de Horas/i }).click();
  await expect(page.getByRole('heading', { name: 'Banco de Horas' })).toBeVisible();
  await expect(page.getByText('Gabriel Trisi')).toBeVisible();
});
