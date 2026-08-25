import prisma from '../prisma/client.js';
import { buildEmployeeRelationCompanyWhere } from '../utils/employeeCompanyAccess.js';

const normalizeEmployeeName = (employee) => {
  return employee?.name || employee?.fullName || 'Colaborador';
};

const getEmployeeDepartment = (employee) => {
  return employee?.department || 'Sem setor';
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const safePercentage = (value, total, fallback = 100) => {
  if (!total) return fallback;
  return Math.round((value / total) * 100);
};

const differenceInDays = (dateA, dateB) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());

  return Math.floor((utcA - utcB) / msPerDay);
};

const getMonthBoundaries = () => {
  const today = new Date();
  const startOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const startOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
  const startOfPreviousMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
    0,
    0,
    0,
    0
  );

  return {
    today,
    startOfCurrentMonth,
    startOfNextMonth,
    startOfPreviousMonth,
  };
};

const countItemsByPeriod = (items, dateSelector, start, end) => {
  return items.filter((item) => {
    const rawDate = dateSelector(item);

    if (!rawDate) return false;

    const parsed = new Date(rawDate);

    if (Number.isNaN(parsed.getTime())) return false;

    return parsed >= start && parsed < end;
  }).length;
};

const getTrend = (current, previous, label) => {
  if (!previous && !current) {
    return {
      key: label,
      label,
      current,
      previous,
      delta: 0,
      direction: 'neutral',
      summary: 'Sem variação registrada',
      insufficientData: true,
    };
  }

  if (!previous) {
    return {
      key: label,
      label,
      current,
      previous,
      delta: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'neutral',
      summary:
        current > 0
          ? 'Primeiros registros neste período'
          : 'Sem movimentação registrada',
      insufficientData: false,
    };
  }

  const delta = Math.round(((current - previous) / previous) * 100);

  return {
    key: label,
    label,
    current,
    previous,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    summary:
      delta > 0
        ? `Alta de ${Math.abs(delta)}% vs período anterior`
        : delta < 0
          ? `Queda de ${Math.abs(delta)}% vs período anterior`
          : 'Estável em relação ao período anterior',
    insufficientData: false,
  };
};

const getRiskLevel = (score) => {
  if (score >= 70) {
    return { label: 'ALTO', tone: 'red' };
  }

  if (score >= 40) {
    return { label: 'MÉDIO', tone: 'amber' };
  }

  return { label: 'BAIXO', tone: 'emerald' };
};

export const getDashboardService = async (companyId) => {
  const employeeCompanyWhere = buildEmployeeRelationCompanyWhere(companyId);
  const { today, startOfCurrentMonth, startOfNextMonth, startOfPreviousMonth } =
    getMonthBoundaries();

  const [
    employees,
    vacations,
    leaves,
    suspensions,
    certificates,
    warnings,
    documents,
    onboardings,
    uniformsDelivered,
    stockLow,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          {
            companyId,
          },
          {
            employeeCompanies: {
              some: {
                companyId,
              },
            },
          },
        ],
      },
      orderBy: { name: 'asc' },
    }),
    prisma.vacation.findMany({
      where: {
        employee: employeeCompanyWhere,
      },
      include: {
        employee: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    }),
    prisma.employeeLeave.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    }),
    prisma.suspension.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    }),
    prisma.certificate.findMany({
      where: {
        employee: employeeCompanyWhere,
      },
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.warning.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        warningDate: 'desc',
      },
    }),
    prisma.document.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.onboarding.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    }),
    prisma.uniformDelivery.count({
      where: {
        employee: {
          ...employeeCompanyWhere,
        },
      },
    }),
    prisma.uniformStock.count({
      where: {
        companyId,
        availableQuantity: {
          lte: 2,
        },
      },
    }),
  ]);

  const alerts = [];
  const upcomingVacations = [];
  const returningFromVacation = [];
  const birthdaysThisMonth = [];
  const activeLeaves = [];
  const returningFromLeave = [];
  const activeSuspensions = [];
  const endingSuspensions = [];

  const pendingCertificatesList = certificates
    .filter((item) => String(item.status || '').toUpperCase() === 'PENDENTE')
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      employeeId: item.employeeId,
      employeeName: normalizeEmployeeName(item.employee),
      title: item.title,
      status: item.status,
      createdAt: item.createdAt,
    }));

  const pendingCertificates = pendingCertificatesList.length;

  const pendingDocumentsList = documents.filter((doc) => {
    const status = String(doc.status || '')
      .trim()
      .toUpperCase();

    return [
      'PENDENTE',
      'PENDENTE_ENVIO',
      'PENDENTE_VALIDACAO',
      'PENDENTE_VALIDADOR',
    ].includes(status);
  });

  const incompleteOnboardings = onboardings.filter((item) => {
    if (item.completedAt) return false;

    const normalizedStatus = String(item.status || '').toUpperCase();

    return normalizedStatus !== 'CONCLUIDO' && normalizedStatus !== 'CONCLUÍDO';
  });

  const recentWarnings = warnings.filter((item) => {
    if (!item.warningDate) return false;

    const warningDate = new Date(item.warningDate);

    if (Number.isNaN(warningDate.getTime())) return false;

    return differenceInDays(today, warningDate) <= 30;
  });

  for (const vacation of vacations) {
    const employeeName = normalizeEmployeeName(vacation.employee);

    if (!vacation.startDate || !vacation.endDate) continue;

    const startDate = new Date(vacation.startDate);
    const endDate = new Date(vacation.endDate);

    const daysUntilStart = differenceInDays(startDate, today);
    const daysUntilEnd = differenceInDays(endDate, today);

    if (daysUntilStart >= 0 && daysUntilStart <= 30) {
      upcomingVacations.push({
        id: vacation.id,
        employeeId: vacation.employeeId,
        employeeName,
        startDate,
        daysUntilStart,
      });
    }

    if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
      returningFromVacation.push({
        id: vacation.id,
        employeeId: vacation.employeeId,
        employeeName,
        endDate,
        daysUntilEnd,
      });
    }
  }

  for (const leave of leaves) {
    const employeeName = normalizeEmployeeName(leave.employee);

    if (!leave.startDate || !leave.endDate) continue;

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      continue;
    }

    const isActive = today >= startDate && today <= endDate;
    const daysUntilEnd = differenceInDays(endDate, today);

    if (isActive) {
      activeLeaves.push({
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName,
        type: leave.type,
        endDate,
      });
    }

    if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
      returningFromLeave.push({
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName,
        type: leave.type,
        endDate,
        daysUntilEnd,
      });
    }
  }

  for (const suspension of suspensions) {
    const employeeName = normalizeEmployeeName(suspension.employee);

    if (!suspension.startDate) continue;

    const startDate = new Date(suspension.startDate);
    const endDate = suspension.endDate ? new Date(suspension.endDate) : null;

    if (Number.isNaN(startDate.getTime())) {
      continue;
    }

    const normalizedStatus = String(suspension.status || '').toLowerCase();
    const statusSaysActive =
      normalizedStatus === 'ativa' || normalizedStatus === 'registrada';

    const isActiveByDate =
      endDate && !Number.isNaN(endDate.getTime())
        ? today >= startDate && today <= endDate
        : today >= startDate;

    const isActive = statusSaysActive || isActiveByDate;

    if (isActive) {
      activeSuspensions.push({
        id: suspension.id,
        employeeId: suspension.employeeId,
        employeeName,
        title: suspension.title,
        endDate,
        status: suspension.status,
      });
    }

    if (endDate && !Number.isNaN(endDate.getTime())) {
      const daysUntilEnd = differenceInDays(endDate, today);

      if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
        endingSuspensions.push({
          id: suspension.id,
          employeeId: suspension.employeeId,
          employeeName,
          title: suspension.title,
          endDate,
          daysUntilEnd,
        });
      }
    }
  }

  for (const employee of employees) {
    if (!employee.birthDate) continue;

    const birthDate = new Date(employee.birthDate);

    if (Number.isNaN(birthDate.getTime())) continue;

    if (birthDate.getMonth() === today.getMonth()) {
      birthdaysThisMonth.push({
        employeeId: employee.id,
        employeeName: normalizeEmployeeName(employee),
        day: birthDate.getDate(),
      });
    }
  }

  upcomingVacations
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart)
    .slice(0, 5)
    .forEach((item) => {
      alerts.push({
        id: `vacation-upcoming-${item.id}`,
        type: 'vacation_upcoming',
        priority: item.daysUntilStart <= 7 ? 'high' : 'medium',
        title: 'Férias próximas',
        description:
          item.daysUntilStart === 0
            ? `${item.employeeName} inicia férias hoje`
            : `${item.employeeName} inicia férias em ${item.daysUntilStart} dia(s)`,
        employeeId: item.employeeId,
        page: 'vacations',
        tone: item.daysUntilStart <= 7 ? 'red' : 'amber',
      });
    });

  returningFromVacation
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)
    .slice(0, 5)
    .forEach((item) => {
      alerts.push({
        id: `vacation-return-${item.id}`,
        type: 'vacation_return',
        priority: item.daysUntilEnd <= 2 ? 'high' : 'medium',
        title: 'Retorno de férias',
        description:
          item.daysUntilEnd === 0
            ? `${item.employeeName} retorna de férias hoje`
            : `${item.employeeName} retorna de férias em ${item.daysUntilEnd} dia(s)`,
        employeeId: item.employeeId,
        page: 'vacations',
        tone: item.daysUntilEnd <= 2 ? 'red' : 'blue',
      });
    });

  if (activeLeaves.length > 0) {
    alerts.push({
      id: 'leaves-active',
      type: 'leave_active',
      priority: activeLeaves.length >= 3 ? 'high' : 'medium',
      title: 'Afastamentos ativos',
      description: `${activeLeaves.length} colaborador(es) estão afastados no momento`,
      page: 'leave',
      tone: activeLeaves.length >= 3 ? 'red' : 'amber',
    });
  }

  returningFromLeave
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)
    .slice(0, 5)
    .forEach((item) => {
      alerts.push({
        id: `leave-return-${item.id}`,
        type: 'leave_return',
        priority: item.daysUntilEnd <= 2 ? 'high' : 'medium',
        title: 'Retorno de afastamento',
        description:
          item.daysUntilEnd === 0
            ? `${item.employeeName} retorna de afastamento hoje`
            : `${item.employeeName} retorna de afastamento em ${item.daysUntilEnd} dia(s)`,
        employeeId: item.employeeId,
        page: 'leave',
        tone: item.daysUntilEnd <= 2 ? 'red' : 'blue',
      });
    });

  if (activeSuspensions.length > 0) {
    alerts.push({
      id: 'suspensions-active',
      type: 'suspension_active',
      priority: activeSuspensions.length >= 2 ? 'high' : 'medium',
      title: 'Suspensões ativas',
      description: `${activeSuspensions.length} colaborador(es) com suspensão em andamento`,
      page: 'suspensions',
      tone: activeSuspensions.length >= 2 ? 'red' : 'amber',
    });
  }

  endingSuspensions
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)
    .slice(0, 5)
    .forEach((item) => {
      alerts.push({
        id: `suspension-ending-${item.id}`,
        type: 'suspension_ending',
        priority: item.daysUntilEnd <= 2 ? 'high' : 'medium',
        title: 'Término de suspensão',
        description:
          item.daysUntilEnd === 0
            ? `${item.employeeName} encerra suspensão hoje`
            : `${item.employeeName} encerra suspensão em ${item.daysUntilEnd} dia(s)`,
        employeeId: item.employeeId,
        page: 'suspensions',
        tone: item.daysUntilEnd <= 2 ? 'red' : 'blue',
      });
    });

  if (pendingCertificates > 0) {
    alerts.push({
      id: 'certificates-pending',
      type: 'certificate_pending',
      priority: pendingCertificates >= 3 ? 'high' : 'medium',
      title: 'Atestados pendentes',
      description: `${pendingCertificates} atestado(s) aguardando análise da gestão`,
      page: 'certificates',
      tone: pendingCertificates >= 3 ? 'red' : 'amber',
    });
  }

  if (pendingDocumentsList.length > 0) {
    alerts.push({
      id: 'documents-pending',
      type: 'documents_pending',
      priority: pendingDocumentsList.length >= 3 ? 'high' : 'medium',
      title: 'Pendências documentais',
      description: `${pendingDocumentsList.length} documento(s) aguardando revisão ou envio`,
      page: 'documents',
      tone: pendingDocumentsList.length >= 3 ? 'red' : 'amber',
    });
  }

  if (stockLow > 0) {
    alerts.push({
      id: 'uniform-stock-low',
      type: 'uniform_stock_low',
      priority: stockLow >= 3 ? 'medium' : 'low',
      title: 'Estoque baixo',
      description: `${stockLow} item(ns) de fardamento com estoque crítico`,
      page: 'stock',
      tone: 'amber',
    });
  }

  birthdaysThisMonth
    .sort((a, b) => a.day - b.day)
    .slice(0, 3)
    .forEach((item) => {
      alerts.push({
        id: `birthday-${item.employeeId}`,
        type: 'birthday_month',
        priority: 'low',
        title: 'Aniversariante do mês',
        description: `${item.employeeName} faz aniversário no dia ${String(
          item.day
        ).padStart(2, '0')}`,
        employeeId: item.employeeId,
        page: 'employees',
        tone: 'blue',
      });
    });

  const documentsRegularRate = safePercentage(
    documents.length - pendingDocumentsList.length,
    documents.length,
    100
  );
  const certificateReviewRate = safePercentage(
    certificates.length - pendingCertificates,
    certificates.length,
    100
  );
  const onboardingComplianceRate = safePercentage(
    onboardings.length - incompleteOnboardings.length,
    onboardings.length,
    100
  );

  const complianceRh = Math.round(
    (documentsRegularRate + certificateReviewRate + onboardingComplianceRate) / 3
  );

  const treatmentQueue = [
    ...pendingCertificatesList.map((item) => ({
      createdAt: item.createdAt,
    })),
    ...pendingDocumentsList.map((item) => ({
      createdAt: item.createdAt,
    })),
  ];

  const itemsWithinSla = treatmentQueue.filter((item) => {
    if (!item.createdAt) return false;

    const createdAt = new Date(item.createdAt);

    if (Number.isNaN(createdAt.getTime())) return false;

    return differenceInDays(today, createdAt) <= 7;
  }).length;

  const slaTreatments = safePercentage(itemsWithinSla, treatmentQueue.length, 100);

  const riskScoreBase =
    pendingCertificates * 6 +
    pendingDocumentsList.length * 5 +
    activeLeaves.length * 9 +
    activeSuspensions.length * 12 +
    incompleteOnboardings.length * 7 +
    stockLow * 4 +
    recentWarnings.length * 4;

  const riskScore = clamp(
    Math.round((riskScoreBase / Math.max(employees.length || 1, 1)) * 10),
    0,
    100
  );
  const riskLevel = getRiskLevel(riskScore);

  const trendDefinitions = [
    {
      key: 'certificates',
      label: 'Atestados',
      current: countItemsByPeriod(
        certificates,
        (item) => item.startDate || item.createdAt,
        startOfCurrentMonth,
        startOfNextMonth
      ),
      previous: countItemsByPeriod(
        certificates,
        (item) => item.startDate || item.createdAt,
        startOfPreviousMonth,
        startOfCurrentMonth
      ),
    },
    {
      key: 'warnings',
      label: 'Advertências',
      current: countItemsByPeriod(
        warnings,
        (item) => item.warningDate || item.createdAt,
        startOfCurrentMonth,
        startOfNextMonth
      ),
      previous: countItemsByPeriod(
        warnings,
        (item) => item.warningDate || item.createdAt,
        startOfPreviousMonth,
        startOfCurrentMonth
      ),
    },
    {
      key: 'leaves',
      label: 'Afastamentos',
      current: countItemsByPeriod(
        leaves,
        (item) => item.startDate || item.createdAt,
        startOfCurrentMonth,
        startOfNextMonth
      ),
      previous: countItemsByPeriod(
        leaves,
        (item) => item.startDate || item.createdAt,
        startOfPreviousMonth,
        startOfCurrentMonth
      ),
    },
    {
      key: 'documents',
      label: 'Pendências documentais',
      current: countItemsByPeriod(
        pendingDocumentsList,
        (item) => item.createdAt,
        startOfCurrentMonth,
        startOfNextMonth
      ),
      previous: countItemsByPeriod(
        pendingDocumentsList,
        (item) => item.createdAt,
        startOfPreviousMonth,
        startOfCurrentMonth
      ),
    },
  ];

  const trends = trendDefinitions.map((item) =>
    getTrend(item.current, item.previous, item.label)
  );

  const employeeRiskMap = new Map();
  const departmentRiskMap = new Map();

  const addRisk = (employee, increment, moduleLabel) => {
    if (!employee?.id) return;

    const employeeName = normalizeEmployeeName(employee);
    const departmentName = getEmployeeDepartment(employee);

    if (!employeeRiskMap.has(employee.id)) {
      employeeRiskMap.set(employee.id, {
        employeeId: employee.id,
        name: employeeName,
        department: departmentName,
        score: 0,
        modules: new Set(),
      });
    }

    const employeeEntry = employeeRiskMap.get(employee.id);
    employeeEntry.score += increment;
    employeeEntry.modules.add(moduleLabel);

    if (!departmentRiskMap.has(departmentName)) {
      departmentRiskMap.set(departmentName, {
        department: departmentName,
        score: 0,
        employees: new Set(),
      });
    }

    const departmentEntry = departmentRiskMap.get(departmentName);
    departmentEntry.score += increment;
    departmentEntry.employees.add(employee.id);
  };

  certificates.forEach((item) => {
    addRisk(
      item.employee,
      String(item.status || '').toUpperCase() === 'PENDENTE' ? 4 : 1,
      'Atestados'
    );
  });

  warnings.forEach((item) => addRisk(item.employee, 6, 'Advertências'));
  leaves.forEach((item) => addRisk(item.employee, 8, 'Afastamentos'));
  suspensions.forEach((item) => addRisk(item.employee, 10, 'Suspensões'));
  pendingDocumentsList.forEach((item) => addRisk(item.employee, 4, 'Documentos'));
  incompleteOnboardings.forEach((item) => addRisk(item.employee, 5, 'Onboarding'));

  const topRiskEmployees = Array.from(employeeRiskMap.values())
    .map((item) => {
      const level = getRiskLevel(clamp(item.score * 3, 0, 100));

      return {
        employeeId: item.employeeId,
        name: item.name,
        department: item.department,
        score: item.score,
        level: level.label,
        tone: level.tone,
        modules: Array.from(item.modules),
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);

  const riskByDepartment = Array.from(departmentRiskMap.values())
    .map((item) => {
      const normalizedScore = clamp(item.score * 2, 0, 100);
      const level = getRiskLevel(normalizedScore);

      return {
        department: item.department,
        score: normalizedScore,
        rawScore: item.score,
        employeeCount: item.employees.size,
        level: level.label,
        tone: level.tone,
      };
    })
    .sort((a, b) => b.score - a.score || a.department.localeCompare(b.department))
    .slice(0, 6);

  const dominantTrend = [...trends].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta)
  )[0];
  const dominantPending = [
    {
      label: 'documentação',
      value: pendingDocumentsList.length,
    },
    {
      label: 'onboarding',
      value: incompleteOnboardings.length,
    },
    {
      label: 'atestados',
      value: pendingCertificates,
    },
    {
      label: 'afastamentos',
      value: activeLeaves.length,
    },
  ].sort((a, b) => b.value - a.value)[0];

  const highestRiskDepartment = riskByDepartment[0];
  const nextCriticalEvent = upcomingVacations
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart)[0];

  const insights = [
    {
      id: 'dominant-occurrence',
      title: 'Concentração dominante',
      description: dominantTrend
        ? `${dominantTrend.label} é o indicador com maior oscilação recente.`
        : 'O sistema ainda não tem histórico suficiente para apontar oscilações.',
      tone: dominantTrend?.direction === 'up' ? 'amber' : 'blue',
    },
    {
      id: 'risk-department',
      title: 'Setor com maior exposição',
      description: highestRiskDepartment
        ? `${highestRiskDepartment.department} aparece com risco ${highestRiskDepartment.level.toLowerCase()} no momento.`
        : 'Sem setor crítico identificado no momento.',
      tone: highestRiskDepartment?.tone || 'emerald',
    },
    {
      id: 'dominant-pending',
      title: 'Pendência dominante',
      description:
        dominantPending && dominantPending.value > 0
          ? `${dominantPending.value} ocorrência(s) concentradas em ${dominantPending.label}.`
          : 'Fila operacional equilibrada entre os módulos monitorados.',
      tone: dominantPending?.value > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'next-critical-event',
      title: 'Próximo evento crítico',
      description: nextCriticalEvent
        ? nextCriticalEvent.daysUntilStart === 0
          ? `${nextCriticalEvent.employeeName} inicia férias hoje.`
          : `${nextCriticalEvent.employeeName} inicia férias em ${nextCriticalEvent.daysUntilStart} dia(s).`
        : 'Nenhum evento crítico previsto para os próximos dias.',
      tone:
        nextCriticalEvent && nextCriticalEvent.daysUntilStart <= 7
          ? 'red'
          : 'blue',
    },
  ];

  const attentionCenter = [
    {
      id: 'active-leaves',
      label: 'Afastamentos ativos',
      value: activeLeaves.length,
      description:
        activeLeaves.length > 0
          ? `${activeLeaves.length} colaborador(es) afastados agora`
          : 'Nenhum afastamento ativo no momento',
      page: 'leave',
      tone: activeLeaves.length > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'upcoming-vacations',
      label: 'Férias próximas',
      value: upcomingVacations.length,
      description:
        upcomingVacations.length > 0
          ? `${upcomingVacations.length} início(s) previstos em até 30 dias`
          : 'Agenda de férias sob controle',
      page: 'vacations',
      tone: upcomingVacations.length > 0 ? 'blue' : 'emerald',
    },
    {
      id: 'pending-documents',
      label: 'Pendências documentais',
      value: pendingDocumentsList.length,
      description:
        pendingDocumentsList.length > 0
          ? `${pendingDocumentsList.length} item(ns) exigem revisão`
          : 'Documentação regularizada',
      page: 'documents',
      tone: pendingDocumentsList.length > 0 ? 'red' : 'emerald',
    },
    {
      id: 'incomplete-onboarding',
      label: 'Onboarding incompleto',
      value: incompleteOnboardings.length,
      description:
        incompleteOnboardings.length > 0
          ? `${incompleteOnboardings.length} jornada(s) ainda sem conclusão`
          : 'Fluxos de integração em dia',
      page: 'onboarding',
      tone: incompleteOnboardings.length > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'recent-warnings',
      label: 'Advertências recentes',
      value: recentWarnings.length,
      description:
        recentWarnings.length > 0
          ? `${recentWarnings.length} ocorrência(s) nos últimos 30 dias`
          : 'Sem novas advertências recentes',
      page: 'warnings',
      tone: recentWarnings.length > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'pending-certificates',
      label: 'Atestados pendentes',
      value: pendingCertificates,
      description:
        pendingCertificates > 0
          ? `${pendingCertificates} item(ns) aguardando análise`
          : 'Fila médica sem pendências',
      page: 'certificates',
      tone: pendingCertificates > 0 ? 'red' : 'emerald',
    },
  ];

  const quickActionBadges = {
    employees: employees.length,
    certificates: pendingCertificates,
    warnings: recentWarnings.length,
    leave: activeLeaves.length,
    vacations: upcomingVacations.length,
    documents: pendingDocumentsList.length,
    onboarding: incompleteOnboardings.length,
  };

  const summary = {
    employees: employees.length,
    vacations: vacations.length,
    leaves: leaves.length,
    activeLeaves: activeLeaves.length,
    suspensions: suspensions.length,
    activeSuspensions: activeSuspensions.length,
    uniformsDelivered,
    stockLow,
    pendingCertificates,
    pendingDocuments: pendingDocumentsList.length,
    incompleteOnboardings: incompleteOnboardings.length,
    upcomingVacations: upcomingVacations.length,
    returningFromVacation: returningFromVacation.length,
    birthdaysThisMonth: birthdaysThisMonth.length,
  };

  return {
    ...summary,
    alerts,
    pendingCertificatesList,
    executiveMetrics: {
      riskOperational: {
        score: riskScore,
        level: riskLevel.label,
        tone: riskLevel.tone,
      },
      criticalPending: {
        count:
          pendingCertificates +
          pendingDocumentsList.length +
          incompleteOnboardings.length +
          activeLeaves.length,
      },
      complianceRh: {
        value: complianceRh,
      },
      slaTreatments: {
        value: slaTreatments,
      },
    },
    attentionCenter,
    trends,
    riskByDepartment,
    topRiskEmployees,
    insights,
    quickActionBadges,
  };
};
