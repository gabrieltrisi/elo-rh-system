import prisma from '../../prisma/client.js';
import {
  buildDateRangeFilter,
  buildReportPayload,
  employeeBaseSelect,
  matchesDepartment,
  matchesSearch,
  matchesStatus,
  resolvePrimaryCompanyLink,
} from './shared.js';

export const buildEmployeeReport = async (filters) => {
  const admissionDateFilter = buildDateRangeFilter(filters.startDate, filters.endDate);

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { companyId: Number(filters.companyId) },
        {
          employeeCompanies: {
            some: {
              companyId: Number(filters.companyId),
            },
          },
        },
      ],
      ...(filters.employeeId
        ? {
            id: Number(filters.employeeId),
          }
        : {}),
      ...(admissionDateFilter
        ? {
            OR: [
              {
                admissionDate: admissionDateFilter,
              },
              {
                employeeCompanies: {
                  some: {
                    companyId: Number(filters.companyId),
                    admissionDate: admissionDateFilter,
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: employeeBaseSelect,
    orderBy: {
      name: 'asc',
    },
  });

  const filteredEmployees = employees.filter((employee) => {
    const companies = (employee.employeeCompanies || [])
      .map((item) => item.company?.name)
      .filter(Boolean)
      .join(' ');

    return (
      matchesDepartment(employee, filters.department) &&
      matchesStatus(employee, filters.status) &&
      matchesSearch(
        `${employee.name} ${employee.email} ${employee.cpf} ${employee.role} ${employee.department} ${companies}`,
        filters.search
      )
    );
  });

  const rows = filteredEmployees.map((employee) => {
    const primaryLink = resolvePrimaryCompanyLink(employee, filters.companyId);
    const companyLabels = (employee.employeeCompanies || [])
      .map((item) => item.company?.name)
      .filter(Boolean);

    return {
      collaborator: employee.name,
      cpf: employee.cpf,
      email: employee.email,
      company:
        primaryLink?.company?.name ||
        companyLabels[0] ||
        'Sem empresa vinculada',
      companies: companyLabels.join(', ') || '-',
      department:
        primaryLink?.department || employee.department || 'Nao informado',
      role: primaryLink?.role || employee.role || 'Nao informado',
      status: primaryLink?.status || employee.status || '-',
      admissionDate:
        primaryLink?.admissionDate || employee.admissionDate || employee.createdAt,
      isMultiCompany: companyLabels.length > 1 ? 'Sim' : 'Nao',
    };
  });

  const activeCount = rows.filter((item) =>
    String(item.status).toLowerCase().includes('ativo')
  ).length;

  const inactiveCount = rows.length - activeCount;
  const multiCompanyCount = rows.filter(
    (item) => item.isMultiCompany === 'Sim'
  ).length;

  return buildReportPayload({
    reportType: 'employees',
    title: 'Relatorio Geral de Colaboradores',
    subtitle:
      'Leitura executiva da base de colaboradores, admissoes e distribuicao por empresa.',
    filters,
    summaryCards: [
      {
        title: 'Total de colaboradores',
        value: rows.length,
        subtitle: 'Base filtrada para o periodo/escopo selecionado',
        tone: 'slate',
      },
      {
        title: 'Ativos',
        value: activeCount,
        subtitle: 'Colaboradores em operacao no recorte atual',
        tone: 'green',
      },
      {
        title: 'Inativos',
        value: inactiveCount,
        subtitle: 'Registros fora de operacao ou sem status ativo',
        tone: 'amber',
      },
      {
        title: 'Multivinculo',
        value: multiCompanyCount,
        subtitle: 'Pessoas com atuacao em mais de uma empresa',
        tone: 'violet',
      },
    ],
    columns: [
      { key: 'collaborator', label: 'Colaborador' },
      { key: 'cpf', label: 'CPF' },
      { key: 'email', label: 'E-mail' },
      { key: 'company', label: 'Empresa' },
      { key: 'department', label: 'Departamento' },
      { key: 'role', label: 'Cargo' },
      { key: 'status', label: 'Status' },
      { key: 'admissionDate', label: 'Admissao', format: 'date' },
      { key: 'isMultiCompany', label: 'Multiempresa' },
    ],
    rows,
    tableTitle: 'Base de colaboradores',
    highlights: [
      `${activeCount} colaborador(es) ativos no recorte selecionado`,
      `${multiCompanyCount} pessoa(s) com atuacao em mais de uma empresa`,
    ],
  });
};
