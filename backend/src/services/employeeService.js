import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { ensureDefaultCompaniesService } from './companyService.js';

const employeeInclude = {
  company: true,
  employeeCompanies: {
    include: {
      company: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
};

const parseDateField = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} é obrigatório`, 400);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} inválido`, 400);
  }

  return date;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const normalized = Number(value);
  return Number.isNaN(normalized) ? null : normalized;
};

const normalizeCompanyLinks = (data, fallbackCompanyId) => {
  const incomingLinks = Array.isArray(data.companyLinks) ? data.companyLinks : [];

  const companyLinks =
    incomingLinks.length > 0
      ? incomingLinks
      : [
          {
            companyId: data.companyId || fallbackCompanyId,
            registrationNumber: data.registrationNumber || null,
            role: data.role,
            department: data.department,
            admissionDate: data.admissionDate,
            status: data.status || 'ativo',
            contractType: data.contractType || null,
            salaryBase: data.salaryBase ?? null,
            notes: data.companyNotes ?? data.notes ?? null,
            isPrimary: true,
          },
        ];

  if (companyLinks.length === 0) {
    throw new AppError('Informe pelo menos uma empresa vinculada', 400);
  }

  const seenCompanyIds = new Set();

  return companyLinks.map((link, index) => {
    const companyId = Number(link.companyId);

    if (!companyId || Number.isNaN(companyId)) {
      throw new AppError('Empresa inválida no vínculo do colaborador', 400);
    }

    if (seenCompanyIds.has(companyId)) {
      throw new AppError('Não é permitido repetir a mesma empresa no vínculo', 400);
    }

    seenCompanyIds.add(companyId);

    if (!link.role || String(link.role).trim().length < 2) {
      throw new AppError('Cargo é obrigatório em cada vínculo de empresa', 400);
    }

    if (!link.department || String(link.department).trim().length < 2) {
      throw new AppError('Departamento é obrigatório em cada vínculo de empresa', 400);
    }

    const normalizedAdmissionDate = parseDateField(
      link.admissionDate,
      'Data de admissão do vínculo'
    );

    return {
      companyId,
      registrationNumber: normalizeOptionalString(link.registrationNumber),
      role: String(link.role).trim(),
      department: String(link.department).trim(),
      admissionDate: normalizedAdmissionDate,
      status: normalizeOptionalString(link.status) || 'ativo',
      contractType: normalizeOptionalString(link.contractType),
      salaryBase: normalizeOptionalNumber(link.salaryBase),
      notes: normalizeOptionalString(link.notes),
      isPrimary: index === 0,
    };
  });
};

const pickPrimaryLink = (links = []) => {
  return links.find((link) => link.isPrimary) || links[0] || null;
};

const normalizeEmployeeOutput = (employee, selectedCompanyId = null) => {
  const companyLinks = Array.isArray(employee.employeeCompanies)
    ? employee.employeeCompanies.map((link) => ({
        id: link.id,
        companyId: link.companyId,
        companyCode: link.company?.code || '',
        companyName: link.company?.name || '',
        registrationNumber: link.registrationNumber,
        role: link.role,
        department: link.department,
        admissionDate: link.admissionDate,
        status: link.status,
        contractType: link.contractType,
        salaryBase: link.salaryBase,
        notes: link.notes,
        isPrimary: Boolean(link.isPrimary),
      }))
    : [];

  const activeCompanyLink =
    (selectedCompanyId
      ? companyLinks.find((link) => link.companyId === Number(selectedCompanyId))
      : null) || pickPrimaryLink(companyLinks);

  const primaryCompanyLink = pickPrimaryLink(companyLinks);

  return {
    ...employee,
    fullName: employee.name,
    position: activeCompanyLink?.role || employee.role,
    role: activeCompanyLink?.role || employee.role,
    department: activeCompanyLink?.department || employee.department,
    admissionDate: activeCompanyLink?.admissionDate || employee.admissionDate,
    status: activeCompanyLink?.status || employee.status,
    contractType: activeCompanyLink?.contractType || employee.contractType,
    companyId: activeCompanyLink?.companyId || employee.companyId,
    companyName:
      activeCompanyLink?.companyName ||
      primaryCompanyLink?.companyName ||
      employee.company?.name ||
      '',
    companyCode:
      activeCompanyLink?.companyCode ||
      primaryCompanyLink?.companyCode ||
      employee.company?.code ||
      '',
    registrationNumber:
      activeCompanyLink?.registrationNumber ||
      primaryCompanyLink?.registrationNumber ||
      null,
    companyNotes: activeCompanyLink?.notes || primaryCompanyLink?.notes || null,
    companies: companyLinks,
    companiesCount: companyLinks.length,
    isMultiCompany: companyLinks.length > 1,
  };
};

const validateCompaniesExist = async (companyLinks) => {
  const companyIds = companyLinks.map((link) => link.companyId);

  const companies = await prisma.company.findMany({
    where: {
      id: {
        in: companyIds,
      },
    },
  });

  if (companies.length !== companyIds.length) {
    throw new AppError('Uma ou mais empresas selecionadas não existem', 400);
  }
};

const buildLegacyEmployeeSnapshot = (data, primaryLink) => ({
  name: data.name,
  cpf: data.cpf,
  birthDate: parseDateField(data.birthDate, 'Data de nascimento'),
  maritalStatus: data.maritalStatus,
  email: data.email,
  phone: data.phone,
  role: primaryLink.role,
  department: primaryLink.department,
  admissionDate: primaryLink.admissionDate,
  status: primaryLink.status || 'ativo',
  contractType: primaryLink.contractType || normalizeOptionalString(data.contractType),
  shirtSize: normalizeOptionalString(data.shirtSize),
  pantsSize: normalizeOptionalString(data.pantsSize),
  bootSize: normalizeOptionalString(data.bootSize),
  notes: normalizeOptionalString(data.notes),
  companyId: primaryLink.companyId,
});

const syncEmployeeCompanyLinks = async (tx, employeeId, companyLinks) => {
  const existingLinks = await tx.employeeCompany.findMany({
    where: {
      employeeId: Number(employeeId),
    },
  });

  const incomingCompanyIds = companyLinks.map((link) => link.companyId);
  const existingCompanyIds = existingLinks.map((link) => link.companyId);

  for (const existingLink of existingLinks) {
    if (!incomingCompanyIds.includes(existingLink.companyId)) {
      await tx.employeeCompany.delete({
        where: {
          id: existingLink.id,
        },
      });
    }
  }

  for (const link of companyLinks) {
    const existingLink = existingLinks.find(
      (item) => item.companyId === link.companyId
    );

    if (existingLink) {
      await tx.employeeCompany.update({
        where: {
          id: existingLink.id,
        },
        data: {
          registrationNumber: link.registrationNumber,
          role: link.role,
          department: link.department,
          admissionDate: link.admissionDate,
          status: link.status,
          contractType: link.contractType,
          salaryBase: link.salaryBase,
          notes: link.notes,
          isPrimary: link.isPrimary,
        },
      });
    } else {
      await tx.employeeCompany.create({
        data: {
          employeeId: Number(employeeId),
          companyId: link.companyId,
          registrationNumber: link.registrationNumber,
          role: link.role,
          department: link.department,
          admissionDate: link.admissionDate,
          status: link.status,
          contractType: link.contractType,
          salaryBase: link.salaryBase,
          notes: link.notes,
          isPrimary: link.isPrimary,
        },
      });
    }
  }

  if (
    existingCompanyIds.length > 0 &&
    incomingCompanyIds.length === 0
  ) {
    throw new AppError('O colaborador precisa permanecer com pelo menos uma empresa', 400);
  }
};

export const createEmployeeService = async (data, fallbackCompanyId) => {
  await ensureDefaultCompaniesService();

  const companyLinks = normalizeCompanyLinks(data, fallbackCompanyId);
  await validateCompaniesExist(companyLinks);

  const existingEmployee = await prisma.employee.findFirst({
    where: {
      OR: [
        {
          cpf: data.cpf,
        },
        {
          email: data.email,
        },
      ],
    },
    include: employeeInclude,
  });

  const primaryLink = pickPrimaryLink(companyLinks);

  if (!primaryLink) {
    throw new AppError('Não foi possível definir a empresa principal do colaborador', 400);
  }

  const legacySnapshot = buildLegacyEmployeeSnapshot(data, primaryLink);

  if (existingEmployee) {
    const existingCompanyIds = new Set(
      (existingEmployee.employeeCompanies || []).map((link) => link.companyId)
    );

    const missingLinks = companyLinks.filter(
      (link) => !existingCompanyIds.has(link.companyId)
    );

    if (missingLinks.length === 0) {
      throw new AppError(
        'Já existe colaborador com este CPF ou e-mail e com os mesmos vínculos',
        400
      );
    }

    const updatedEmployee = await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: {
          id: existingEmployee.id,
        },
        data: legacySnapshot,
      });

      for (const link of missingLinks) {
        await tx.employeeCompany.create({
          data: {
            employeeId: existingEmployee.id,
            companyId: link.companyId,
            registrationNumber: link.registrationNumber,
            role: link.role,
            department: link.department,
            admissionDate: link.admissionDate,
            status: link.status,
            contractType: link.contractType,
            salaryBase: link.salaryBase,
            notes: link.notes,
            isPrimary: false,
          },
        });
      }

      return tx.employee.findUnique({
        where: {
          id: existingEmployee.id,
        },
        include: employeeInclude,
      });
    });

    return normalizeEmployeeOutput(updatedEmployee, primaryLink.companyId);
  }

  const employee = await prisma.employee.create({
    data: {
      ...legacySnapshot,
      employeeCompanies: {
        create: companyLinks.map((link) => ({
          companyId: link.companyId,
          registrationNumber: link.registrationNumber,
          role: link.role,
          department: link.department,
          admissionDate: link.admissionDate,
          status: link.status,
          contractType: link.contractType,
          salaryBase: link.salaryBase,
          notes: link.notes,
          isPrimary: link.isPrimary,
        })),
      },
    },
    include: employeeInclude,
  });

  return normalizeEmployeeOutput(employee, primaryLink.companyId);
};

export const getAllEmployeesService = async (currentCompanyId, filters = {}) => {
  const scopeAll = filters.scope === 'all';
  const companyFilterId =
    filters.companyId && filters.companyId !== 'Todos'
      ? Number(filters.companyId)
      : null;

  const baseCompanyId = scopeAll ? null : Number(currentCompanyId);
  const where = {};

  if (companyFilterId) {
    where.OR = [
      {
        companyId: companyFilterId,
      },
      {
        employeeCompanies: {
          some: {
            companyId: companyFilterId,
          },
        },
      },
    ];
  } else if (baseCompanyId) {
    where.OR = [
      {
        companyId: baseCompanyId,
      },
      {
        employeeCompanies: {
          some: {
            companyId: baseCompanyId,
          },
        },
      },
    ];
  }

  const employees = await prisma.employee.findMany({
    where,
    include: employeeInclude,
    orderBy: {
      id: 'desc',
    },
  });

  const selectedCompanyId = companyFilterId || baseCompanyId || null;
  let normalizedEmployees = employees.map((employee) =>
    normalizeEmployeeOutput(employee, selectedCompanyId)
  );

  if (filters.companyScope === 'multivinculo') {
    normalizedEmployees = normalizedEmployees.filter(
      (employee) => employee.companiesCount > 1
    );
  }

  return normalizedEmployees;
};

export const getEmployeeByIdService = async (id, currentCompanyId, filters = {}) => {
  const selectedCompanyId = filters.companyId
    ? Number(filters.companyId)
    : Number(currentCompanyId);

  const employee = await prisma.employee.findUnique({
    where: {
      id: Number(id),
    },
    include: employeeInclude,
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  const hasAccess = (employee.employeeCompanies || []).some(
      (link) =>
      link.companyId === Number(currentCompanyId) ||
      filters.scope === 'all'
  );

  if (!hasAccess && employee.companyId !== Number(currentCompanyId) && filters.scope !== 'all') {
    throw new AppError('Funcionário não encontrado', 404);
  }

  return normalizeEmployeeOutput(employee, selectedCompanyId);
};

export const updateEmployeeService = async (id, data, fallbackCompanyId, scope = null) => {
  await ensureDefaultCompaniesService();

  const employee = await prisma.employee.findFirst({
    where:
      scope === 'all'
        ? {
            id: Number(id),
          }
        : {
            id: Number(id),
            OR: [
              {
                companyId: Number(fallbackCompanyId),
              },
              {
                employeeCompanies: {
                  some: {
                    companyId: Number(fallbackCompanyId),
                  },
                },
              },
            ],
          },
    include: employeeInclude,
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  const employeeWithSameData = await prisma.employee.findFirst({
    where: {
      id: {
        not: Number(id),
      },
      OR: [
        {
          cpf: data.cpf,
        },
        {
          email: data.email,
        },
      ],
    },
  });

  if (employeeWithSameData) {
    throw new AppError('Já existe colaborador com este e-mail ou CPF', 400);
  }

  const companyLinks = normalizeCompanyLinks(data, fallbackCompanyId);
  await validateCompaniesExist(companyLinks);

  const primaryLink = pickPrimaryLink(companyLinks);
  const legacySnapshot = buildLegacyEmployeeSnapshot(data, primaryLink);

  const updatedEmployee = await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: {
        id: Number(id),
      },
      data: legacySnapshot,
    });

    await syncEmployeeCompanyLinks(tx, id, companyLinks);

    return tx.employee.findUnique({
      where: {
        id: Number(id),
      },
      include: employeeInclude,
    });
  });

  return normalizeEmployeeOutput(updatedEmployee, primaryLink.companyId);
};

export const deleteEmployeeService = async (id, currentCompanyId, scope = null) => {
  const employee = await prisma.employee.findFirst({
    where:
      scope === 'all'
        ? {
            id: Number(id),
          }
        : {
            id: Number(id),
            OR: [
              {
                companyId: Number(currentCompanyId),
              },
              {
                employeeCompanies: {
                  some: {
                    companyId: Number(currentCompanyId),
                  },
                },
              },
            ],
          },
    include: {
      employeeCompanies: true,
    },
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  await prisma.employee.delete({
    where: {
      id: Number(id),
    },
  });
};
