import { getAuditLogsService } from '../auditService.js';
import { buildReportPayload } from './shared.js';

export const buildAuditReport = async (filters, user) => {
  const auditQuery = {
    search: filters.search || undefined,
    module: filters.module || undefined,
    action: filters.status || undefined,
    userId: filters.userId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    limit: 500,
  };

  const result = await getAuditLogsService(auditQuery, user);

  const rows = (result.logs || []).map((item) => ({
    createdAt: item.createdAt,
    user: item.userNameSnapshot || item.userEmailSnapshot || 'Sistema',
    module: item.module,
    action: item.action,
    severity: item.severity,
    entity: `${item.entityType || '-'}${item.entityId ? ` #${item.entityId}` : ''}`,
    summary: item.summary,
  }));

  return buildReportPayload({
    reportType: 'audit',
    title: 'Relatorio de Auditoria',
    subtitle:
      'Trilha de eventos por usuario, modulo, severidade e periodo com foco em governanca.',
    filters,
    summaryCards: [
      {
        title: 'Eventos',
        value: result.summary?.total || 0,
        subtitle: 'Registros auditaveis encontrados',
        tone: 'slate',
      },
      {
        title: 'Criticos',
        value: result.summary?.criticalCount || 0,
        subtitle: 'Eventos de maior severidade no recorte',
        tone: 'rose',
      },
      {
        title: 'Hoje',
        value: result.summary?.todayCount || 0,
        subtitle: 'Acoes registradas no dia corrente',
        tone: 'blue',
      },
      {
        title: 'Modulo dominante',
        value: result.summary?.topModule?.count || 0,
        subtitle: result.summary?.topModule?.module || 'Sem concentracao',
        tone: 'violet',
      },
    ],
    columns: [
      { key: 'createdAt', label: 'Data/Hora', format: 'datetime' },
      { key: 'user', label: 'Usuario' },
      { key: 'module', label: 'Modulo' },
      { key: 'action', label: 'Acao' },
      { key: 'severity', label: 'Severidade' },
      { key: 'entity', label: 'Entidade' },
      { key: 'summary', label: 'Resumo' },
    ],
    rows,
    tableTitle: 'Trilha de auditoria',
    highlights: [
      result.summary?.mostActiveUser?.name
        ? `Usuario mais ativo: ${result.summary.mostActiveUser.name}`
        : 'Sem usuario dominante no recorte',
      result.summary?.topModule?.module
        ? `Modulo com mais eventos: ${result.summary.topModule.module}`
        : 'Sem modulo dominante no recorte',
    ],
  });
};
