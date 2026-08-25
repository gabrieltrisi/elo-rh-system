import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { buildEmployeeAccessWhere } from '../utils/employeeCompanyAccess.js';

export const getEmployeeHistoryService = async (companyId, id, scope = null) => {
  const employee = await prisma.employee.findFirst({
    where:
      scope === 'all'
        ? {
            id: Number(id),
          }
        : buildEmployeeAccessWhere(id, companyId),
    include: {
      company: true,
      employeeCompanies: {
        include: {
          company: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      vacations: {
        orderBy: { createdAt: 'desc' },
      },
      uniformDeliveries: {
        include: {
          uniformStock: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      certificates: {
        orderBy: { createdAt: 'desc' },
      },
      warnings: {
        orderBy: { createdAt: 'desc' },
      },
      workSchedules: {
        orderBy: { createdAt: 'desc' },
      },
      workScheduleAssignments: {
        include: {
          schedule: {
            include: {
              specialDate: true,
            },
          },
        },
        orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return {
    ...employee,
    workSchedules: [
      ...(employee.workSchedules || []).map((schedule) => ({
        ...schedule,
        name: schedule.name || schedule.scheduleType,
        observations: schedule.notes || schedule.observations || null,
      })),
      ...(employee.workScheduleAssignments || []).map((assignment) => ({
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
        observations:
          assignment.schedule.notes || assignment.schedule.observations || null,
        createdAt: assignment.schedule.createdAt,
        conflictJson: assignment.conflictJson,
      })),
    ],
  };
};
