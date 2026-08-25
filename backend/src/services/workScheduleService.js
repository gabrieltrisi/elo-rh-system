import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import {
  buildEmployeeAccessWhere,
  buildEmployeeRelationCompanyWhere,
} from '../utils/employeeCompanyAccess.js';

const SCHEDULE_TYPES = [
  'FERIADO',
  'EVENTO',
  'PLANTAO',
  'ESCALA_FIXA',
  'ESCALA_EXTRA',
  'FINAL_DE_SEMANA',
  'CLIENTE',
  'OUTRO',
];

const SCHEDULE_STATUSES = ['RASCUNHO', 'PUBLICADA', 'CANCELADA', 'CONCLUIDA'];
const ASSIGNMENT_STATUSES = [
  'ESCALADO',
  'CONFIRMADO',
  'AUSENTE',
  'SUBSTITUIDO',
  'CANCELADO',
];

const SPECIAL_DATE_TYPE_LABELS = {
  FERIADO: 'Feriado',
  EVENTO: 'Evento',
  OPERACAO: 'Operacao',
};

const scheduleInclude = {
  employee: {
    select: {
      id: true,
      name: true,
      department: true,
      role: true,
      status: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  specialDate: true,
  assignments: {
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: true,
          role: true,
          status: true,
        },
      },
    },
    orderBy: [{ workDate: 'asc' }, { startTime: 'asc' }],
  },
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Data invalida para a escala', 400);
  }
  return parsed;
};

const normalizeTime = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) {
    throw new AppError('Horario invalido informado na escala', 400);
  }
  return normalized;
};

const timeToMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const hasTimeOverlap = (entryA, entryB) => {
  const startA = timeToMinutes(entryA.startTime);
  const endA = timeToMinutes(entryA.endTime);
  const startB = timeToMinutes(entryB.startTime);
  const endB = timeToMinutes(entryB.endTime);

  if (
    startA === null ||
    endA === null ||
    startB === null ||
    endB === null ||
    endA <= startA ||
    endB <= startB
  ) {
    return false;
  }

  return startA < endB && startB < endA;
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const getEasterSunday = (year) => {
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const leapCorrection = Math.floor(century / 4);
  const remainderCentury = century % 4;
  const correction = Math.floor((century + 8) / 25);
  const moonCorrection = Math.floor((century - correction + 1) / 3);
  const goldenNumber =
    (19 * (year % 19) + century - leapCorrection - moonCorrection + 15) % 30;
  const yearLeap = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekday =
    (32 +
      2 * remainderCentury +
      2 * yearLeap -
      goldenNumber -
      yearRemainder) %
    7;
  const monthOffset = Math.floor((year % 19 + 11 * goldenNumber + 22 * weekday) / 451);
  const month = Math.floor((goldenNumber + weekday - 7 * monthOffset + 114) / 31);
  const day = ((goldenNumber + weekday - 7 * monthOffset + 114) % 31) + 1;

  return new Date(year, month - 1, day);
};

const buildSpecialDateSuggestions = (year) => {
  const easter = getEasterSunday(year);
  const carnival = new Date(easter);
  carnival.setDate(carnival.getDate() - 47);

  return [
    {
      name: 'Ano Novo',
      date: new Date(year, 0, 1),
      type: 'FERIADO',
      isRecurring: true,
      notes: 'Data especial recorrente para planejamento operacional.',
    },
    {
      name: 'Carnaval',
      date: carnival,
      type: 'EVENTO',
      isRecurring: true,
      notes: 'Data movel sugerida para operacoes especiais.',
    },
    {
      name: 'Sao Joao',
      date: new Date(year, 5, 24),
      type: 'EVENTO',
      isRecurring: true,
      notes: 'Base inicial para operacoes regionais e datas internas.',
    },
    {
      name: 'Natal',
      date: new Date(year, 11, 25),
      type: 'FERIADO',
      isRecurring: true,
      notes: 'Data especial recorrente para planejamento de equipe.',
    },
  ];
};

const ensureSpecialDatesService = async (companyId) => {
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  const existing = await prisma.workSpecialDate.findMany({
    where: { companyId: Number(companyId) },
  });

  for (const year of years) {
    for (const suggestion of buildSpecialDateSuggestions(year)) {
      const alreadyExists = existing.some(
        (item) =>
          item.name === suggestion.name &&
          item.type === suggestion.type &&
          startOfDay(item.date).getTime() === startOfDay(suggestion.date).getTime()
      );

      if (!alreadyExists) {
        const created = await prisma.workSpecialDate.create({
          data: {
            companyId: Number(companyId),
            name: suggestion.name,
            date: suggestion.date,
            type: suggestion.type,
            isRecurring: suggestion.isRecurring,
            notes: suggestion.notes,
          },
        });

        existing.push(created);
      }
    }
  }

  return existing.sort((left, right) => left.date - right.date);
};

const validateEmployeeAccess = async (employeeIds, companyId) => {
  const uniqueEmployeeIds = [...new Set(employeeIds.map(Number))];

  if (!uniqueEmployeeIds.length) {
    return [];
  }

  const employees = await prisma.employee.findMany({
    where: {
      id: { in: uniqueEmployeeIds },
      ...buildEmployeeRelationCompanyWhere(companyId),
    },
    select: {
      id: true,
      name: true,
      department: true,
      role: true,
      status: true,
    },
  });

  if (employees.length !== uniqueEmployeeIds.length) {
    throw new AppError(
      'Um ou mais colaboradores informados nao pertencem a esta empresa',
      400
    );
  }

  return employees;
};

const buildScheduleCompanyWhere = (companyId) => ({
  OR: [
    { companyId: Number(companyId) },
    {
      employee: {
        is: buildEmployeeRelationCompanyWhere(companyId),
      },
    },
  ],
});

const buildConflictBundle = async ({
  companyId,
  scheduleId = null,
  assignments,
}) => {
  if (!assignments.length) {
    return [];
  }

  const employeeIds = [...new Set(assignments.map((assignment) => Number(assignment.employeeId)))];
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      ...buildEmployeeRelationCompanyWhere(companyId),
    },
    select: {
      id: true,
      status: true,
      vacations: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      employeeLeaves: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          type: true,
        },
      },
      suspensions: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          title: true,
        },
      },
    },
  });

  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const minDate = assignments.reduce(
    (currentMin, assignment) =>
      assignment.workDate < currentMin ? assignment.workDate : currentMin,
    assignments[0].workDate
  );
  const maxDate = assignments.reduce(
    (currentMax, assignment) =>
      assignment.workDate > currentMax ? assignment.workDate : currentMax,
    assignments[0].workDate
  );

  const persistedAssignments = await prisma.workScheduleAssignment.findMany({
    where: {
      employeeId: { in: employeeIds },
      workDate: {
        gte: startOfDay(minDate),
        lte: endOfDay(maxDate),
      },
      ...(scheduleId ? { scheduleId: { not: Number(scheduleId) } } : {}),
      schedule: {
        isDeleted: false,
        ...buildScheduleCompanyWhere(companyId),
      },
    },
    include: {
      schedule: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return assignments.map((assignment, index) => {
    const employee = employeeMap.get(Number(assignment.employeeId));
    const currentDateStart = startOfDay(assignment.workDate);
    const currentDateEnd = endOfDay(assignment.workDate);
    const conflicts = [];

    if (!employee) {
      conflicts.push({
        code: 'EMPLOYEE_NOT_FOUND',
        severity: 'critical',
        message: 'Colaborador nao localizado para esta empresa.',
      });
      return conflicts;
    }

    if (String(employee.status || '').toLowerCase() !== 'ativo') {
      conflicts.push({
        code: 'EMPLOYEE_INACTIVE',
        severity: 'warning',
        message: 'Colaborador esta inativo e precisa de revisao antes da publicacao.',
      });
    }

    if (
      employee.vacations.some(
        (vacation) =>
          String(vacation.status || '').toUpperCase() !== 'CANCELADA' &&
          vacation.startDate <= currentDateEnd &&
          vacation.endDate >= currentDateStart
      )
    ) {
      conflicts.push({
        code: 'VACATION_OVERLAP',
        severity: 'warning',
        message: 'Colaborador esta em ferias na data escalada.',
      });
    }

    if (
      employee.employeeLeaves.some(
        (leave) =>
          !['ENCERRADO', 'CANCELADO', 'FINALIZADO'].includes(
            String(leave.status || '').toUpperCase()
          ) &&
          leave.startDate <= currentDateEnd &&
          leave.endDate >= currentDateStart
      )
    ) {
      conflicts.push({
        code: 'LEAVE_OVERLAP',
        severity: 'warning',
        message: 'Colaborador esta afastado na data escalada.',
      });
    }

    if (
      employee.suspensions.some((suspension) => {
        const suspensionEnd = suspension.endDate || suspension.startDate;
        return (
          !['CANCELADA', 'FINALIZADA'].includes(
            String(suspension.status || '').toUpperCase()
          ) &&
          suspension.startDate <= currentDateEnd &&
          suspensionEnd >= currentDateStart
        );
      })
    ) {
      conflicts.push({
        code: 'SUSPENSION_OVERLAP',
        severity: 'warning',
        message: 'Colaborador possui suspensao no periodo escalado.',
      });
    }

    const overlapInsidePayload = assignments.some((otherAssignment, otherIndex) => {
      if (otherIndex === index) return false;
      return (
        Number(otherAssignment.employeeId) === Number(assignment.employeeId) &&
        startOfDay(otherAssignment.workDate).getTime() === currentDateStart.getTime() &&
        hasTimeOverlap(assignment, otherAssignment)
      );
    });

    if (overlapInsidePayload) {
      conflicts.push({
        code: 'INTERNAL_OVERLAP',
        severity: 'critical',
        message: 'Colaborador esta com horarios sobrepostos dentro da mesma escala.',
      });
    }

    const overlapPersisted = persistedAssignments.some((persisted) => {
      return (
        Number(persisted.employeeId) === Number(assignment.employeeId) &&
        startOfDay(persisted.workDate).getTime() === currentDateStart.getTime() &&
        !['CANCELADO', 'CANCELADA'].includes(
          String(persisted.status || '').toUpperCase()
        ) &&
        hasTimeOverlap(assignment, persisted)
      );
    });

    if (overlapPersisted) {
      const related = persistedAssignments.find(
        (persisted) =>
          Number(persisted.employeeId) === Number(assignment.employeeId) &&
          startOfDay(persisted.workDate).getTime() === currentDateStart.getTime() &&
          hasTimeOverlap(assignment, persisted)
      );

      conflicts.push({
        code: 'SCHEDULE_OVERLAP',
        severity: 'warning',
        message: `Colaborador ja possui escala no horario informado (${related?.schedule?.name || 'outra escala'}).`,
      });
    }

    return conflicts;
  });
};

const buildAssignmentCreateInput = (assignment) => ({
  employeeId: Number(assignment.employeeId),
  workDate: startOfDay(assignment.workDate),
  startTime: normalizeTime(assignment.startTime),
  endTime: normalizeTime(assignment.endTime),
  breakMinutes:
    assignment.breakMinutes === undefined || assignment.breakMinutes === null
      ? null
      : Number(assignment.breakMinutes),
  roleNote: normalizeText(assignment.roleNote),
  status: normalizeText(assignment.status) || 'ESCALADO',
});

const serializeSchedule = (schedule) => {
  const assignments = (schedule.assignments || []).map((assignment) => ({
    ...assignment,
    conflicts: Array.isArray(assignment.conflictJson) ? assignment.conflictJson : [],
  }));

  const uniqueEmployees = uniqueById(assignments.map((assignment) => assignment.employee));
  const conflictsCount = assignments.reduce(
    (total, assignment) =>
      total + (Array.isArray(assignment.conflictJson) ? assignment.conflictJson.length : 0),
    0
  );

  return {
    ...schedule,
    notes: schedule.notes || schedule.observations || null,
    assignments,
    employeesCount: uniqueEmployees.length,
    assignmentsCount: assignments.length,
    conflictsCount,
    hasConflicts: conflictsCount > 0,
  };
};

const buildTimeline = (schedules) => {
  const timelineMap = new Map();

  schedules.forEach((schedule) => {
    (schedule.assignments || []).forEach((assignment) => {
      const key = startOfDay(assignment.workDate).toISOString();
      const current = timelineMap.get(key) || {
        date: key,
        schedules: [],
        employeesCount: 0,
      };

      current.schedules.push({
        id: schedule.id,
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        status: schedule.status,
        location: schedule.location,
        clientName: schedule.clientName,
        employeesCount: schedule.employeesCount,
      });
      current.employeesCount += 1;
      timelineMap.set(key, current);
    });
  });

  return [...timelineMap.values()]
    .map((day) => ({
      ...day,
      schedules: uniqueById(day.schedules),
    }))
    .sort((left, right) => new Date(left.date) - new Date(right.date));
};

const buildSummary = (schedules) => {
  const today = startOfDay(new Date());
  const allAssignments = schedules.flatMap((schedule) => schedule.assignments || []);
  const uniqueEmployees = uniqueById(allAssignments.map((assignment) => assignment.employee));
  const activeSchedules = schedules.filter((schedule) =>
    ['RASCUNHO', 'PUBLICADA'].includes(String(schedule.status || '').toUpperCase())
  ).length;
  const upcomingSchedules = schedules.filter((schedule) => {
    const scheduleStart = schedule.startDate ? startOfDay(schedule.startDate) : null;
    return scheduleStart && scheduleStart >= today;
  }).length;
  const holidaySchedules = schedules.filter(
    (schedule) => String(schedule.scheduleType || '').toUpperCase() === 'FERIADO'
  ).length;
  const monthReference = new Date();
  const currentMonth = monthReference.getMonth();
  const currentYear = monthReference.getFullYear();
  const dutySchedules = schedules.filter((schedule) => {
    if (String(schedule.scheduleType || '').toUpperCase() !== 'PLANTAO') return false;
    if (!schedule.startDate) return false;
    const startDate = new Date(schedule.startDate);
    return (
      startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear
    );
  }).length;
  const conflictsDetected = schedules.reduce(
    (total, schedule) => total + (schedule.conflictsCount || 0),
    0
  );

  return {
    activeSchedules,
    upcomingSchedules,
    employeesScheduled: uniqueEmployees.length,
    holidaySchedules,
    conflictsDetected,
    dutySchedules,
  };
};

const buildFiltersWhere = (query, companyId) => {
  const where = {
    isDeleted: false,
    ...buildScheduleCompanyWhere(companyId),
  };

  if (query.search) {
    const search = String(query.search).trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      {
        assignments: {
          some: {
            employee: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  if (query.type && query.type !== 'TODOS') {
    where.scheduleType = String(query.type);
  }

  if (query.status && query.status !== 'TODOS') {
    where.status = String(query.status);
  }

  if (query.clientName && query.clientName !== 'TODOS') {
    where.clientName = String(query.clientName);
  }

  if (query.specialDateId && query.specialDateId !== 'TODOS') {
    where.specialDateId = Number(query.specialDateId);
  }

  const assignmentFilters = {};

  if (query.employeeId && query.employeeId !== 'TODOS') {
    assignmentFilters.employeeId = Number(query.employeeId);
  }

  if (query.department && query.department !== 'TODOS') {
    assignmentFilters.employee = {
      is: {
        department: String(query.department),
      },
    };
  }

  if (query.startDate || query.endDate || query.month || query.year) {
    let rangeStart = query.startDate ? startOfDay(query.startDate) : null;
    let rangeEnd = query.endDate ? endOfDay(query.endDate) : null;

    if (!rangeStart && query.month && query.year) {
      rangeStart = new Date(Number(query.year), Number(query.month) - 1, 1);
      rangeEnd = endOfDay(new Date(Number(query.year), Number(query.month), 0));
    }

    assignmentFilters.workDate = {};
    if (rangeStart) assignmentFilters.workDate.gte = rangeStart;
    if (rangeEnd) assignmentFilters.workDate.lte = rangeEnd;
  }

  if (Object.keys(assignmentFilters).length) {
    where.assignments = { some: assignmentFilters };
  }

  return where;
};

const getScheduleByIdInternal = async (scheduleId, companyId) => {
  const schedule = await prisma.workSchedule.findFirst({
    where: {
      id: Number(scheduleId),
      isDeleted: false,
      ...buildScheduleCompanyWhere(companyId),
    },
    include: scheduleInclude,
  });

  if (!schedule) {
    throw new AppError('Escala nao encontrada', 404);
  }

  return serializeSchedule(schedule);
};

const saveAssignmentsForSchedule = async ({ tx, scheduleId, assignments, companyId }) => {
  const normalizedAssignments = assignments.map(buildAssignmentCreateInput);
  const conflicts = await buildConflictBundle({
    companyId,
    scheduleId,
    assignments: normalizedAssignments,
  });

  await tx.workScheduleAssignment.deleteMany({
    where: { scheduleId: Number(scheduleId) },
  });

  if (!normalizedAssignments.length) {
    return [];
  }

  await tx.workScheduleAssignment.createMany({
    data: normalizedAssignments.map((assignment, index) => ({
      ...assignment,
      scheduleId: Number(scheduleId),
      conflictJson: conflicts[index] || [],
    })),
  });

  return conflicts;
};

export const getWorkScheduleOptionsService = async (companyId) => {
  const [employees, specialDates, schedules] = await Promise.all([
    prisma.employee.findMany({
      where: buildEmployeeRelationCompanyWhere(companyId),
      select: {
        id: true,
        name: true,
        department: true,
        role: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    }),
    ensureSpecialDatesService(companyId),
    prisma.workSchedule.findMany({
      where: {
        isDeleted: false,
        ...buildScheduleCompanyWhere(companyId),
      },
      select: {
        clientName: true,
      },
    }),
  ]);

  return {
    employees,
    departments: [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(),
    scheduleTypes: SCHEDULE_TYPES,
    statuses: SCHEDULE_STATUSES,
    assignmentStatuses: ASSIGNMENT_STATUSES,
    specialDates: specialDates.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      typeLabel: SPECIAL_DATE_TYPE_LABELS[item.type] || item.type,
      date: item.date,
      isRecurring: item.isRecurring,
    })),
    clients: [...new Set(schedules.map((item) => item.clientName).filter(Boolean))].sort(),
  };
};

export const createWorkScheduleService = async (data, companyId, user) => {
  await validateEmployeeAccess(
    data.assignments.map((assignment) => assignment.employeeId),
    companyId
  );

  const schedule = await prisma.$transaction(async (tx) => {
    const createdSchedule = await tx.workSchedule.create({
      data: {
        companyId: Number(companyId),
        createdByUserId: Number(user?.userId || user?.id || 0) || null,
        name: data.name,
        scheduleType: data.scheduleType,
        status: normalizeText(data.status) || 'RASCUNHO',
        startDate: normalizeDate(data.startDate),
        endDate: normalizeDate(data.endDate),
        defaultStartTime: normalizeTime(data.defaultStartTime),
        defaultEndTime: normalizeTime(data.defaultEndTime),
        breakMinutes:
          data.breakMinutes === undefined || data.breakMinutes === null
            ? null
            : Number(data.breakMinutes),
        location: normalizeText(data.location),
        clientName: normalizeText(data.clientName),
        notes: normalizeText(data.notes),
        observations: normalizeText(data.observations) || normalizeText(data.notes),
        specialDateId:
          data.specialDateId === undefined || data.specialDateId === null
            ? null
            : Number(data.specialDateId),
      },
      include: scheduleInclude,
    });

    await saveAssignmentsForSchedule({
      tx,
      scheduleId: createdSchedule.id,
      assignments: data.assignments,
      companyId,
    });

    return tx.workSchedule.findUnique({
      where: { id: createdSchedule.id },
      include: scheduleInclude,
    });
  });

  return serializeSchedule(schedule);
};

export const getAllWorkSchedulesService = async (query, companyId) => {
  const schedules = await prisma.workSchedule.findMany({
    where: buildFiltersWhere(query, companyId),
    include: scheduleInclude,
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });

  const serializedSchedules = schedules.map(serializeSchedule);

  return {
    schedules: serializedSchedules,
    summary: buildSummary(serializedSchedules),
    timeline: buildTimeline(serializedSchedules),
  };
};

export const getWorkScheduleByIdService = async (id, companyId) =>
  getScheduleByIdInternal(id, companyId);

export const getWorkScheduleByEmployeeService = async (employeeId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: buildEmployeeAccessWhere(employeeId, companyId),
  });

  if (!employee) {
    throw new AppError('Colaborador nao encontrado', 404);
  }

  const assignments = await prisma.workScheduleAssignment.findMany({
    where: {
      employeeId: Number(employeeId),
      schedule: {
        isDeleted: false,
        ...buildScheduleCompanyWhere(companyId),
      },
    },
    include: {
      schedule: {
        include: {
          specialDate: true,
        },
      },
    },
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
  });

  return assignments.map((assignment) => ({
    id: assignment.schedule.id,
    assignmentId: assignment.id,
    name: assignment.schedule.name,
    scheduleType: assignment.schedule.scheduleType,
    status: assignment.schedule.status,
    workDate: assignment.workDate,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    breakMinutes: assignment.breakMinutes,
    roleNote: assignment.roleNote,
    assignmentStatus: assignment.status,
    location: assignment.schedule.location,
    clientName: assignment.schedule.clientName,
    specialDate: assignment.schedule.specialDate,
    notes: assignment.schedule.notes || assignment.schedule.observations,
    createdAt: assignment.schedule.createdAt,
    conflictJson: assignment.conflictJson,
  }));
};

export const updateWorkScheduleService = async (id, data, companyId) => {
  const before = await getScheduleByIdInternal(id, companyId);

  await validateEmployeeAccess(
    data.assignments.map((assignment) => assignment.employeeId),
    companyId
  );

  const schedule = await prisma.$transaction(async (tx) => {
    await tx.workSchedule.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        scheduleType: data.scheduleType,
        status: normalizeText(data.status) || before.status,
        startDate: normalizeDate(data.startDate),
        endDate: normalizeDate(data.endDate),
        defaultStartTime: normalizeTime(data.defaultStartTime),
        defaultEndTime: normalizeTime(data.defaultEndTime),
        breakMinutes:
          data.breakMinutes === undefined || data.breakMinutes === null
            ? null
            : Number(data.breakMinutes),
        location: normalizeText(data.location),
        clientName: normalizeText(data.clientName),
        notes: normalizeText(data.notes),
        observations: normalizeText(data.observations) || normalizeText(data.notes),
        specialDateId:
          data.specialDateId === undefined || data.specialDateId === null
            ? null
            : Number(data.specialDateId),
      },
    });

    await saveAssignmentsForSchedule({
      tx,
      scheduleId: id,
      assignments: data.assignments,
      companyId,
    });

    return tx.workSchedule.findUnique({
      where: { id: Number(id) },
      include: scheduleInclude,
    });
  });

  return {
    before,
    schedule: serializeSchedule(schedule),
  };
};

export const updateWorkScheduleStatusService = async (id, status, companyId) => {
  const before = await getScheduleByIdInternal(id, companyId);
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (!SCHEDULE_STATUSES.includes(normalizedStatus)) {
    throw new AppError('Status de escala invalido', 400);
  }

  const schedule = await prisma.workSchedule.update({
    where: { id: Number(id) },
    data: {
      status: normalizedStatus,
    },
    include: scheduleInclude,
  });

  return {
    before,
    schedule: serializeSchedule(schedule),
  };
};

export const addWorkScheduleAssignmentService = async (
  scheduleId,
  payload,
  companyId
) => {
  const baseSchedule = await getScheduleByIdInternal(scheduleId, companyId);
  await validateEmployeeAccess([payload.employeeId], companyId);

  const createdAssignmentInput = buildAssignmentCreateInput(payload);
  const conflicts = await buildConflictBundle({
    companyId,
    scheduleId,
    assignments: [createdAssignmentInput],
  });

  await prisma.workScheduleAssignment.create({
    data: {
      scheduleId: Number(scheduleId),
      ...createdAssignmentInput,
      conflictJson: conflicts[0] || [],
    },
  });

  return {
    before: baseSchedule,
    schedule: await getScheduleByIdInternal(scheduleId, companyId),
  };
};

export const updateWorkScheduleAssignmentService = async (
  scheduleId,
  assignmentId,
  payload,
  companyId
) => {
  const before = await getScheduleByIdInternal(scheduleId, companyId);
  await validateEmployeeAccess([payload.employeeId], companyId);

  const normalizedAssignment = buildAssignmentCreateInput(payload);
  const conflicts = await buildConflictBundle({
    companyId,
    scheduleId,
    assignments: [normalizedAssignment],
  });

  await prisma.workScheduleAssignment.update({
    where: { id: Number(assignmentId) },
    data: {
      ...normalizedAssignment,
      conflictJson: conflicts[0] || [],
    },
  });

  return {
    before,
    schedule: await getScheduleByIdInternal(scheduleId, companyId),
  };
};

export const deleteWorkScheduleAssignmentService = async (
  scheduleId,
  assignmentId,
  companyId
) => {
  const before = await getScheduleByIdInternal(scheduleId, companyId);

  await prisma.workScheduleAssignment.delete({
    where: { id: Number(assignmentId) },
  });

  return {
    before,
    schedule: await getScheduleByIdInternal(scheduleId, companyId),
  };
};

export const duplicateWorkScheduleService = async (id, companyId, user) => {
  const source = await getScheduleByIdInternal(id, companyId);

  const duplicated = await createWorkScheduleService(
    {
      name: `${source.name} (copia)`,
      scheduleType: source.scheduleType,
      status: 'RASCUNHO',
      startDate: source.startDate || new Date(),
      endDate: source.endDate || source.startDate || new Date(),
      defaultStartTime: source.defaultStartTime,
      defaultEndTime: source.defaultEndTime,
      breakMinutes: source.breakMinutes,
      location: source.location,
      clientName: source.clientName,
      notes: source.notes,
      observations: source.observations,
      specialDateId: source.specialDateId,
      assignments: (source.assignments || []).map((assignment) => ({
        employeeId: assignment.employeeId,
        workDate: assignment.workDate,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        breakMinutes: assignment.breakMinutes,
        roleNote: assignment.roleNote,
        status: 'ESCALADO',
      })),
    },
    companyId,
    user
  );

  return {
    before: source,
    schedule: duplicated,
  };
};

export const deleteWorkScheduleService = async (id, companyId) => {
  const before = await getScheduleByIdInternal(id, companyId);

  await prisma.workSchedule.update({
    where: { id: Number(id) },
    data: {
      isDeleted: true,
      status: 'CANCELADA',
    },
  });

  return {
    before,
  };
};
