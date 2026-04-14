import prisma from '../prisma/client.js';

const normalizeEmployeeName = (employee) => {
  return employee?.name || employee?.fullName || 'Colaborador';
};

const differenceInDays = (dateA, dateB) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());

  return Math.floor((utcA - utcB) / msPerDay);
};

export const getDashboardService = async (companyId) => {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });

  const vacations = await prisma.vacation.findMany({
    where: {
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  const leaves = await prisma.employeeLeave.findMany({
    where: {
      companyId,
    },
    include: {
      employee: true,
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  const pendingCertificates = await prisma.certificate.count({
    where: {
      employee: {
        companyId,
      },
      status: 'PENDENTE',
    },
  });

  const certificatesPendingList = await prisma.certificate.findMany({
    where: {
      employee: {
        companyId,
      },
      status: 'PENDENTE',
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  const uniformsDelivered = await prisma.uniformControl.count({
    where: {
      employee: {
        companyId,
      },
    },
  });

  const stockLow = await prisma.uniformStock.count({
    where: {
      companyId,
      availableQuantity: {
        lte: 2,
      },
    },
  });

  const today = new Date();
  const alerts = [];

  const upcomingVacations = [];
  const returningFromVacation = [];
  const birthdaysThisMonth = [];
  const activeLeaves = [];
  const returningFromLeave = [];

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

  if (stockLow > 0) {
    alerts.push({
      id: 'uniform-stock-low',
      type: 'uniform_stock_low',
      priority: stockLow >= 3 ? 'medium' : 'low',
      title: 'Estoque baixo',
      description: `${stockLow} item(ns) de fardamento com estoque crítico`,
      page: 'uniforms',
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

  const summary = {
    employees: employees.length,
    vacations: vacations.length,
    leaves: leaves.length,
    activeLeaves: activeLeaves.length,
    uniformsDelivered,
    stockLow,
    pendingCertificates,
    upcomingVacations: upcomingVacations.length,
    returningFromVacation: returningFromVacation.length,
    birthdaysThisMonth: birthdaysThisMonth.length,
  };

  return {
    ...summary,
    alerts,
    pendingCertificatesList: certificatesPendingList.map((item) => ({
      id: item.id,
      employeeId: item.employeeId,
      employeeName: normalizeEmployeeName(item.employee),
      title: item.title,
      status: item.status,
      createdAt: item.createdAt,
    })),
  };
};
