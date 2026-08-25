export const API_BASE_URL = 'http://localhost:3000';

export const defaultUser = {
  userId: 1,
  companyId: 1,
  name: 'Admin Elo',
  email: 'admin@elo.local',
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

export const defaultDashboardPayload = {
  dashboard: {
    pendingCertificates: 2,
    employees: 12,
    vacations: 1,
    leaves: 1,
    activeLeaves: 1,
    uniformsDelivered: 8,
    stockLow: 1,
    pendingDocuments: 3,
    incompleteOnboardings: 2,
    upcomingVacations: 2,
    returningFromVacation: 1,
    birthdaysThisMonth: 2,
    alerts: [],
    executiveMetrics: {
      riskOperational: { score: 44, level: 'MEDIO', tone: 'amber' },
      criticalPending: { count: 3 },
      complianceRh: { value: 87 },
      slaTreatments: { value: 92 },
    },
    attentionCenter: [],
    trends: [],
    riskByDepartment: [],
    topRiskEmployees: [],
    insights: [],
    quickActionBadges: {
      certificates: 2,
      documents: 3,
      warnings: 1,
    },
  },
};

export const defaultWarningsPayload = {
  warnings: [
    {
      id: 1,
      employeeId: 7,
      type: 'Advertencia escrita',
      title: 'Atraso recorrente',
      warningDate: '2026-04-20T10:00:00.000Z',
      status: 'Registrada',
      description: 'Ocorrencia auditavel',
      employee: {
        id: 7,
        name: 'Gabriel Trisi',
      },
    },
  ],
};

const encodeJwtPart = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString('base64url')
    .replace(/=/g, '');

export const defaultTokenPayload = {
  userId: 1,
  companyId: 1,
  sessionId: 101,
  tokenId: 'playwright-token-id',
  exp: Math.floor(Date.now() / 1000) + 60 * 60,
};

export const buildMockJwt = (payload = defaultTokenPayload) =>
  `${encodeJwtPart({ alg: 'HS256', typ: 'JWT' })}.${encodeJwtPart(payload)}.signature`;

export async function seedAuthenticatedSession(page, user = defaultUser) {
  await page.addInitScript((sessionUser) => {
    window.localStorage.setItem(
      'token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImNvbXBhbnlJZCI6MSwic2Vzc2lvbklkIjoxMDEsInRva2VuSWQiOiJwbGF5d3JpZ2h0LXRva2VuLWlkIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature'
    );
    window.localStorage.setItem('user', JSON.stringify(sessionUser));
    window.localStorage.setItem(
      'session',
      JSON.stringify({
        id: 101,
        expiresAt: '2099-12-31T23:59:59.000Z',
      })
    );
  }, user);
}

export async function fulfillJson(route, payload, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

export async function fulfillText(route, body, contentType = 'text/plain') {
  await route.fulfill({
    status: 200,
    contentType,
    body,
  });
}

export async function mockCoreShellApi(page, options = {}) {
  const dashboardPayload = options.dashboardPayload || defaultDashboardPayload;
  const warningsPayload = options.warningsPayload || defaultWarningsPayload;

  await page.route(`${API_BASE_URL}/dashboard*`, (route) =>
    fulfillJson(route, dashboardPayload)
  );
  await page.route(`${API_BASE_URL}/warnings*`, (route) =>
    fulfillJson(route, warningsPayload)
  );
  await page.route(`${API_BASE_URL}/employees*`, (route) =>
    fulfillJson(route, { employees: [] })
  );
  await page.route(`${API_BASE_URL}/vacations*`, (route) =>
    fulfillJson(route, { vacations: [] })
  );
  await page.route(`${API_BASE_URL}/certificates*`, (route) =>
    fulfillJson(route, { certificates: [] })
  );
  await page.route(`${API_BASE_URL}/documents*`, (route) =>
    fulfillJson(route, { documents: [] })
  );
  await page.route(`${API_BASE_URL}/leaves*`, (route) =>
    fulfillJson(route, { leaves: [] })
  );
  await page.route(`${API_BASE_URL}/suspensions*`, (route) =>
    fulfillJson(route, { suspensions: [] })
  );
  await page.route(`${API_BASE_URL}/onboarding*`, (route) =>
    fulfillJson(route, { onboardings: [] })
  );
  await page.route(`${API_BASE_URL}/uniform-deliveries*`, (route) =>
    fulfillJson(route, { deliveries: [] })
  );
  await page.route(`${API_BASE_URL}/benefits*`, (route) =>
    fulfillJson(route, { benefits: [] })
  );
}

export function parseRoute(route) {
  const request = route.request();
  const url = new URL(request.url());

  return {
    method: request.method(),
    pathname: url.pathname,
    searchParams: url.searchParams,
    request,
    url,
  };
}
