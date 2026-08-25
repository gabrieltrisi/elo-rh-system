import prisma from '../../prisma/client.js';
import {
  buildDateRangeFilter,
  buildReportPayload,
  matchesSearch,
} from './shared.js';

export const buildDocumentReport = async (filters) => {
  const dateRange = buildDateRangeFilter(filters.startDate, filters.endDate);

  const documents = await prisma.document.findMany({
    where: {
      companyId: Number(filters.companyId),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.employeeId ? { employeeId: Number(filters.employeeId) } : {}),
      ...(filters.status ? { category: filters.status } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: true,
          role: true,
        },
      },
      candidate: {
        select: {
          id: true,
          fullName: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const storageObjects = await prisma.storageObject.findMany({
    where: {
      companyId: Number(filters.companyId),
      ...(dateRange ? { createdAt: dateRange } : {}),
      module: {
        in: ['documentation', 'admission', 'warnings', 'suspensions', 'leave', 'onboarding', 'payroll', 'benefits'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const rows = documents
    .map((document) => ({
      title: document.title,
      category: document.category,
      collaborator: document.employee?.name || document.candidate?.fullName || 'Sem vinculo',
      department: document.employee?.department || '-',
      role: document.employee?.role || '-',
      module: document.candidateId ? 'preadmission' : 'documents',
      fileName: document.fileName,
      provider: 'LOCAL',
      createdAt: document.createdAt,
      company: document.company?.name || '-',
    }))
    .concat(
      storageObjects.map((item) => ({
        title: item.originalName,
        category: item.entityType || 'Arquivo',
        collaborator: item.employeeId ? `Colaborador #${item.employeeId}` : 'Sem vinculo',
        department: '-',
        role: '-',
        module: item.module,
        fileName: item.fileName,
        provider: item.provider,
        createdAt: item.createdAt,
        company: '-',
      }))
    )
    .filter((item) =>
      matchesSearch(
        `${item.title} ${item.category} ${item.collaborator} ${item.module} ${item.fileName}`,
        filters.search
      )
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const providerBreakdown = rows.reduce((acc, item) => {
    const key = String(item.provider || 'LOCAL').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return buildReportPayload({
    reportType: 'documents',
    title: 'Relatorio de Documentacao',
    subtitle:
      'Uploads, documentos por modulo e rastreabilidade do acervo corporativo.',
    filters,
    summaryCards: [
      {
        title: 'Total de arquivos',
        value: rows.length,
        subtitle: 'Documentos e objetos de storage no recorte',
        tone: 'slate',
      },
      {
        title: 'Uploads no periodo',
        value: rows.filter((item) => item.createdAt).length,
        subtitle: 'Movimentacoes documentais filtradas',
        tone: 'blue',
      },
      {
        title: 'Storage corporativo',
        value:
          (providerBreakdown.SHAREPOINT || 0) + (providerBreakdown.ONEDRIVE || 0),
        subtitle: 'Arquivos ja sincronizados com provider externo',
        tone: 'green',
      },
      {
        title: 'Fallback local',
        value: providerBreakdown.LOCAL || 0,
        subtitle: 'Arquivos ainda mantidos no fluxo local',
        tone: 'amber',
      },
    ],
    columns: [
      { key: 'title', label: 'Documento' },
      { key: 'category', label: 'Categoria' },
      { key: 'collaborator', label: 'Vinculo' },
      { key: 'module', label: 'Modulo' },
      { key: 'provider', label: 'Storage' },
      { key: 'fileName', label: 'Arquivo' },
      { key: 'createdAt', label: 'Upload', format: 'datetime' },
    ],
    rows,
    tableTitle: 'Mapa de documentacao',
    highlights: [
      `${providerBreakdown.SHAREPOINT || 0} arquivo(s) em SharePoint`,
      `${providerBreakdown.ONEDRIVE || 0} arquivo(s) em OneDrive`,
      `${providerBreakdown.LOCAL || 0} arquivo(s) em fallback/local`,
    ],
  });
};
