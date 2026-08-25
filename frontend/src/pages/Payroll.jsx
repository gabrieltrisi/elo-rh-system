import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const initialRunForm = {
  month: '',
  year: '',
  notes: '',
};

const initialMovementForm = {
  employeeId: '',
  payrollEventId: '',
  quantity: '1',
  unitValue: '',
  totalValue: '',
  notes: '',
  source: 'MANUAL',
};

const runStatusConfig = {
  ABERTA: {
    label: 'Aberta',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  EM_PROCESSAMENTO: {
    label: 'Em processamento',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
  },
  PROCESSADA: {
    label: 'Processada',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  FECHADA: {
    label: 'Fechada',
    badge: 'border border-slate-300 bg-slate-100 text-slate-700',
  },
  REABERTA: {
    label: 'Reaberta',
    badge: 'border border-violet-200 bg-violet-50 text-violet-700',
  },
  ERRO: {
    label: 'Erro',
    badge: 'border border-red-200 bg-red-50 text-red-700',
  },
};

const employeeStatusConfig = {
  PENDENTE: {
    label: 'Pendente',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  PROCESSADO: {
    label: 'Processado',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  INCONSISTENTE: {
    label: 'Inconsistente',
    badge: 'border border-red-200 bg-red-50 text-red-700',
  },
  BLOQUEADO: {
    label: 'Bloqueado',
    badge: 'border border-slate-300 bg-slate-100 text-slate-700',
  },
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
};

const getInitials = (value) =>
  String(value || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'FP';

const StatusBadge = ({ status, configMap }) => {
  const current = configMap[status] || {
    label: status || 'Nao definido',
    badge: 'border border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.badge}`}
    >
      {current.label}
    </span>
  );
};

const SummaryCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

const ActionButton = ({ label, tone = 'slate', onClick, disabled = false }) => {
  const tones = {
    slate:
      'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white',
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:hover:bg-blue-50',
    green:
      'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:hover:bg-emerald-50',
    amber:
      'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:hover:bg-amber-50',
    violet:
      'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:hover:bg-violet-50',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}
    >
      {label}
    </button>
  );
};

const MiniActionButton = ({
  label,
  tone = 'slate',
  onClick,
  disabled = false,
}) => {
  const tones = {
    slate:
      'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white',
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:hover:bg-blue-50',
    red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:hover:bg-red-50',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}
    >
      {label}
    </button>
  );
};

function Payroll() {
  const { hasPermission } = useAuthSession();
  const [runs, setRuns] = useState([]);
  const [summary, setSummary] = useState({
    totalRuns: 0,
    openRuns: 0,
    processedRuns: 0,
    closedRuns: 0,
    totalEmployees: 0,
    totalNet: 0,
  });
  const [events, setEvents] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payslipPreview, setPayslipPreview] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [creatingRun, setCreatingRun] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);
  const [closingRun, setClosingRun] = useState(false);
  const [reopeningRun, setReopeningRun] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [syncingTime, setSyncingTime] = useState(false);
  const [deletingMovementId, setDeletingMovementId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [yearFilter, setYearFilter] = useState('TODOS');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isRunDrawerOpen, setIsRunDrawerOpen] = useState(false);
  const [isMovementDrawerOpen, setIsMovementDrawerOpen] = useState(false);
  const [runForm, setRunForm] = useState(initialRunForm);
  const [movementForm, setMovementForm] = useState(initialMovementForm);
  const [editingMovementId, setEditingMovementId] = useState(null);

  const canReadPayroll = hasPermission('payroll.read');
  const canProcessPayroll = hasPermission('payroll.process');
  const canClosePayroll = hasPermission('payroll.close');
  const canReopenPayroll = hasPermission('payroll.reopen');
  const canReadMovements = hasPermission('payroll.movement.read');
  const canSyncFromTime = hasPermission('payroll.sync_from_time');
  const canReviewAutoEntries = hasPermission('payroll.review_auto_entries');
  const canCreateMovement = hasPermission('payroll.movement.create');
  const canUpdateMovement = hasPermission('payroll.movement.update');
  const canDeleteMovement = hasPermission('payroll.movement.delete');
  const canReadPayslip = hasPermission('payroll.payslip.read');

  useEffect(() => {
    fetchRuns();
    fetchEvents();
  }, [statusFilter, yearFilter]);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId);
    }
  }, [selectedRunId]);

  const fetchRuns = async () => {
    try {
      setLoadingRuns(true);
      const params = {};

      if (statusFilter !== 'TODOS') params.status = statusFilter;
      if (yearFilter !== 'TODOS') params.year = yearFilter;

      const response = await api.get('/payroll/runs', { params });
      const nextRuns = response.data?.runs || [];

      setRuns(nextRuns);
      setSummary(
        response.data?.summary || {
          totalRuns: 0,
          openRuns: 0,
          processedRuns: 0,
          closedRuns: 0,
          totalEmployees: 0,
          totalNet: 0,
        }
      );

      setSelectedRunId((current) => {
        if (current && nextRuns.some((run) => run.id === current)) {
          return current;
        }

        return nextRuns[0]?.id || null;
      });
    } catch (error) {
      console.error('Erro ao carregar competencias da folha:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar as competencias da folha.'
      );
      setRuns([]);
      setSummary({
        totalRuns: 0,
        openRuns: 0,
        processedRuns: 0,
        closedRuns: 0,
        totalEmployees: 0,
        totalNet: 0,
      });
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await api.get('/payroll/events');
      setEvents(response.data?.events || []);
    } catch (error) {
      console.error('Erro ao carregar eventos da folha:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchRunDetails = async (runId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/payroll/runs/${runId}`);
      setSelectedRun(response.data?.run || null);
    } catch (error) {
      console.error('Erro ao carregar detalhe da competencia:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar o detalhe da competencia.'
      );
      setSelectedRun(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const employees = Array.isArray(selectedRun?.employees)
      ? selectedRun.employees
      : [];

    return employees.filter((employee) => {
      const haystack = `
        ${employee.employeeName || ''}
        ${employee.department || ''}
        ${employee.role || ''}
        ${employee.employeeEmail || ''}
      `
        .toLowerCase()
        .trim();

      return haystack.includes(employeeSearch.toLowerCase().trim());
    });
  }, [selectedRun, employeeSearch]);

  const activeRunSummary = useMemo(() => {
    if (!selectedRun) {
      return {
        totalGross: 0,
        totalDiscounts: 0,
        totalNet: 0,
        totalCharges: 0,
        totalEmployees: 0,
        processedEmployees: 0,
        inconsistencyCount: 0,
      };
    }

    return {
      totalGross: Number(selectedRun.totalGross || 0),
      totalDiscounts: Number(selectedRun.totalDiscounts || 0),
      totalNet: Number(selectedRun.totalNet || 0),
      totalCharges: Number(selectedRun.totalCharges || 0),
      totalEmployees: Number(selectedRun.totalEmployees || 0),
      processedEmployees: Number(selectedRun.processedEmployees || 0),
      inconsistencyCount: Number(selectedRun.inconsistencyCount || 0),
    };
  }, [selectedRun]);

  const timeIntegrationSummary = useMemo(() => {
    const employees = Array.isArray(selectedRun?.employees)
      ? selectedRun.employees
      : [];
    const autoMovements = employees.flatMap((employee) =>
      (employee.movements || [])
        .filter(
          (movement) =>
            movement.autoGenerated &&
            movement.source === 'IMPORTADO' &&
            movement.sourceReference?.startsWith('time-summary:')
        )
        .map((movement) => ({
          ...movement,
          employeeName: employee.employeeName,
        }))
    );

    return {
      totalMovements: autoMovements.length,
      affectedEmployees: new Set(autoMovements.map((item) => item.employeeId)).size,
      overtimeHours: autoMovements
        .filter((item) => item.sourceType === 'OVERTIME_50')
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0),
      absenceHours: autoMovements
        .filter((item) => item.sourceType === 'ABSENCE')
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0),
      delayHours: autoMovements
        .filter((item) => item.sourceType === 'DELAY')
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0),
      bankHours: autoMovements
        .filter((item) => item.sourceType === 'BANK_HOURS')
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0),
      totalValue: autoMovements.reduce(
        (acc, item) => acc + Number(item.totalValue || 0),
        0
      ),
    };
  }, [selectedRun]);

  const years = useMemo(() => {
    const values = new Set(runs.map((run) => run.year).filter(Boolean));
    const currentYear = new Date().getFullYear();
    values.add(currentYear);
    values.add(currentYear - 1);

    return Array.from(values).sort((a, b) => b - a);
  }, [runs]);

  const openRunDrawer = () => {
    const now = new Date();

    setRunForm({
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      notes: '',
    });
    setIsRunDrawerOpen(true);
  };

  const closeRunDrawer = () => {
    setRunForm(initialRunForm);
    setIsRunDrawerOpen(false);
  };

  const openMovementDrawer = (employee, movement = null) => {
    setSelectedEmployee(employee);
    setEditingMovementId(movement?.id || null);
    setMovementForm({
      employeeId: String(employee.employeeId),
      payrollEventId: movement?.payrollEventId
        ? String(movement.payrollEventId)
        : '',
      quantity: String(movement?.quantity ?? '1'),
      unitValue:
        movement?.unitValue !== undefined && movement?.unitValue !== null
          ? String(movement.unitValue)
          : '',
      totalValue:
        movement?.totalValue !== undefined && movement?.totalValue !== null
          ? String(movement.totalValue)
          : '',
      notes: movement?.notes || '',
      source: movement?.source || 'MANUAL',
    });
    setIsMovementDrawerOpen(true);
  };

  const closeMovementDrawer = () => {
    setSelectedEmployee(null);
    setEditingMovementId(null);
    setMovementForm(initialMovementForm);
    setIsMovementDrawerOpen(false);
  };

  const handleRunFormChange = (event) => {
    const { name, value } = event.target;

    setRunForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMovementFormChange = (event) => {
    const { name, value } = event.target;

    setMovementForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateRun = async (event) => {
    event.preventDefault();

    if (!runForm.month || !runForm.year) {
      alert('Informe mes e ano da competencia.');
      return;
    }

    try {
      setCreatingRun(true);

      const response = await api.post('/payroll/runs', {
        month: Number(runForm.month),
        year: Number(runForm.year),
        notes: runForm.notes.trim() || null,
      });

      const newRun = response.data?.run;

      closeRunDrawer();
      await fetchRuns();

      if (newRun?.id) {
        setSelectedRunId(newRun.id);
        await fetchRunDetails(newRun.id);
      }
    } catch (error) {
      console.error('Erro ao abrir competencia:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel abrir a competencia da folha.'
      );
    } finally {
      setCreatingRun(false);
    }
  };

  const handleProcessRun = async () => {
    if (!selectedRun?.id) return;

    try {
      setProcessingRun(true);
      await api.post(`/payroll/runs/${selectedRun.id}/process`);
      await fetchRuns();
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao processar competencia:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel processar a competencia.'
      );
    } finally {
      setProcessingRun(false);
    }
  };

  const handleCloseRun = async () => {
    if (!selectedRun?.id) return;

    try {
      setClosingRun(true);
      await api.post(`/payroll/runs/${selectedRun.id}/close`);
      await fetchRuns();
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao fechar competencia:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel fechar a competencia.'
      );
    } finally {
      setClosingRun(false);
    }
  };

  const handleReopenRun = async () => {
    if (!selectedRun?.id) return;

    try {
      setReopeningRun(true);
      await api.post(`/payroll/runs/${selectedRun.id}/reopen`);
      await fetchRuns();
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao reabrir competencia:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel reabrir a competencia.'
      );
    } finally {
      setReopeningRun(false);
    }
  };

  const handleSyncFromTime = async () => {
    if (!selectedRun?.id) return;

    const confirmSync = window.confirm(
      'Sincronizar os dados consolidados da Jornada com esta competencia? Lancamentos automaticos anteriores da Jornada serao substituidos, sem alterar lancamentos manuais.'
    );

    if (!confirmSync) return;

    try {
      setSyncingTime(true);
      const response = await api.post(`/payroll/runs/${selectedRun.id}/sync-time`);
      const summary = response.data?.result?.summary;

      alert(
        `Sincronizacao concluida: ${summary?.createdMovements || 0} lancamento(s) automatico(s) gerado(s).`
      );
      await fetchRuns();
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao sincronizar Jornada com Folha:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel sincronizar a Jornada com a competencia.'
      );
    } finally {
      setSyncingTime(false);
    }
  };

  const handleSaveMovement = async (event) => {
    event.preventDefault();

    if (!selectedRun?.id || !selectedEmployee) {
      alert('Selecione um colaborador da competencia.');
      return;
    }

    if (!movementForm.payrollEventId) {
      alert('Selecione um evento da folha.');
      return;
    }

    try {
      setSavingMovement(true);

      const payload = {
        employeeId: Number(selectedEmployee.employeeId),
        payrollEventId: Number(movementForm.payrollEventId),
        quantity: movementForm.quantity,
        unitValue: movementForm.unitValue,
        totalValue: movementForm.totalValue,
        notes: movementForm.notes.trim() || null,
        source: movementForm.source,
      };

      if (editingMovementId) {
        await api.put(`/payroll/movements/${editingMovementId}`, payload);
      } else {
        await api.post(`/payroll/runs/${selectedRun.id}/movements`, payload);
      }

      closeMovementDrawer();
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao salvar lancamento:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel salvar o lancamento.'
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const handleDeleteMovement = async (movementId) => {
    if (!selectedRun?.id) return;

    try {
      setDeletingMovementId(movementId);
      await api.delete(`/payroll/movements/${movementId}`);
      await fetchRunDetails(selectedRun.id);
    } catch (error) {
      console.error('Erro ao inativar lancamento:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel inativar o lancamento.'
      );
    } finally {
      setDeletingMovementId(null);
    }
  };

  const handleOpenPayslipPreview = async (employee) => {
    if (!selectedRun?.id) return;

    try {
      const response = await api.get(
        `/payroll/runs/${selectedRun.id}/payslips/${employee.employeeId}`
      );

      setPayslipPreview(response.data?.payslip || null);
    } catch (error) {
      console.error('Erro ao carregar preview do holerite:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar o preview do holerite.'
      );
    }
  };

  const renderRunsSidebar = () => {
    if (loadingRuns) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm'>
          Carregando competencias...
        </div>
      );
    }

    if (!runs.length) {
      return (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 shadow-sm'>
          Nenhuma competencia aberta ainda.
        </div>
      );
    }

    return (
      <div className='space-y-3'>
        {runs.map((run) => (
          <button
            key={run.id}
            type='button'
            onClick={() => setSelectedRunId(run.id)}
            className={`w-full rounded-3xl border p-4 text-left shadow-sm transition ${
              selectedRunId === run.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                    selectedRunId === run.id ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  Competencia
                </p>
                <h3 className='mt-2 text-xl font-bold'>{run.referenceLabel}</h3>
                <p
                  className={`mt-1 text-sm ${
                    selectedRunId === run.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {run.employeeEntriesCount} colaborador(es)
                </p>
              </div>

              <StatusBadge status={run.status} configMap={runStatusConfig} />
            </div>

            <div className='mt-4 grid grid-cols-2 gap-3'>
              <div
                className={`rounded-2xl border p-3 ${
                  selectedRunId === run.id
                    ? 'border-slate-700 bg-slate-800/80'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p
                  className={`text-xs ${
                    selectedRunId === run.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Liquido
                </p>
                <p className='mt-1 text-sm font-semibold'>
                  {formatCurrency(run.totalNet)}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 ${
                  selectedRunId === run.id
                    ? 'border-slate-700 bg-slate-800/80'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p
                  className={`text-xs ${
                    selectedRunId === run.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Fechamento
                </p>
                <p className='mt-1 text-sm font-semibold'>
                  {formatDate(run.closedAt || run.processedAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderEmployeeRows = () => {
    if (loadingDetails) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando detalhe da competencia...
        </div>
      );
    }

    if (!selectedRun) {
      return (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500 shadow-sm'>
          Selecione uma competencia para visualizar a operacao da folha.
        </div>
      );
    }

    if (!filteredEmployees.length) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum colaborador encontrado com esse filtro.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <h3 className='text-xl font-semibold text-slate-800'>
                Operacao por colaborador
              </h3>
              <p className='mt-1 text-sm text-slate-500'>
                Controle os lancamentos, reprocessamentos e preview do holerite
                colaborador por colaborador.
              </p>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                Processados
              </p>
              <p className='mt-1 text-lg font-bold text-slate-900'>
                {activeRunSummary.processedEmployees}/{activeRunSummary.totalEmployees}
              </p>
            </div>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Colaborador
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Status
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Proventos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Descontos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Liquido
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Encargos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Lancamentos
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className='align-top hover:bg-slate-50/70'>
                  <td className='px-6 py-5'>
                    <div className='flex items-start gap-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-sm font-bold text-white'>
                        {getInitials(employee.employeeName)}
                      </div>

                      <div>
                        <p className='font-semibold text-slate-800'>
                          {employee.employeeName}
                        </p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {employee.role || 'Sem cargo'} -{' '}
                          {employee.department || 'Sem setor'}
                        </p>
                        {employee.hasInconsistency ? (
                          <p className='mt-2 text-xs font-medium text-red-600'>
                            {employee.inconsistencyNotes || 'Inconsistencia identificada'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className='px-6 py-5'>
                    <StatusBadge
                      status={employee.status}
                      configMap={employeeStatusConfig}
                    />
                  </td>

                  <td className='px-6 py-5 text-sm font-semibold text-emerald-700'>
                    {formatCurrency(employee.grossAmount)}
                  </td>

                  <td className='px-6 py-5 text-sm font-semibold text-rose-700'>
                    {formatCurrency(employee.discountAmount)}
                  </td>

                  <td className='px-6 py-5 text-sm font-semibold text-slate-900'>
                    {formatCurrency(employee.netAmount)}
                  </td>

                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatCurrency(employee.chargesAmount)}
                  </td>

                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {employee.movementCount}
                  </td>

                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {canCreateMovement || canUpdateMovement ? (
                        <MiniActionButton
                          label='Lancamentos'
                          tone='blue'
                          onClick={() => openMovementDrawer(employee)}
                          disabled={selectedRun.status === 'FECHADA'}
                        />
                      ) : null}

                      {canReadPayslip ? (
                        <MiniActionButton
                          label='Holerite'
                          tone='slate'
                          onClick={() => handleOpenPayslipPreview(employee)}
                          disabled={!employee.breakdown}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRunDetailCards = () => {
    return (
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          title='Bruto consolidado'
          value={formatCurrency(activeRunSummary.totalGross)}
          subtitle='Proventos processados na competencia'
          tone='green'
        />
        <SummaryCard
          title='Descontos'
          value={formatCurrency(activeRunSummary.totalDiscounts)}
          subtitle='Descontos consolidados na previa'
          tone='rose'
        />
        <SummaryCard
          title='Liquido'
          value={formatCurrency(activeRunSummary.totalNet)}
          subtitle='Valor liquido da competencia'
          tone='blue'
        />
        <SummaryCard
          title='Encargos estimados'
          value={formatCurrency(activeRunSummary.totalCharges)}
          subtitle='Base estimada para encargos'
          tone='amber'
        />
      </div>
    );
  };

  if (!canReadPayroll) {
    return (
      <div className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
        <div className='max-w-2xl'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-slate-400'>
            Departamento Pessoal
          </p>
          <h1 className='mt-3 text-3xl font-bold text-slate-900'>
            Folha de Pagamento
          </h1>
          <p className='mt-4 text-base text-slate-500'>
            Seu perfil nao possui acesso para consultar a operacao da folha.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-rose-800 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-rose-200'>
                Departamento Pessoal
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Folha de Pagamento
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Abra competencias mensais, carregue colaboradores elegiveis,
                lance eventos e processe a previa da folha com controle de
                fechamento, reabertura e preview premium do holerite.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                type='button'
                onClick={openRunDrawer}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Abrir competencia
              </button>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            title='Competencias'
            value={summary.totalRuns}
            subtitle='Ciclos mensais cadastrados'
            tone='slate'
          />
          <SummaryCard
            title='Em operacao'
            value={summary.openRuns}
            subtitle='Competencias abertas ou reabertas'
            tone='amber'
          />
          <SummaryCard
            title='Processadas'
            value={summary.processedRuns}
            subtitle='Previas prontas para fechamento'
            tone='green'
          />
          <SummaryCard
            title='Liquido consolidado'
            value={formatCurrency(summary.totalNet)}
            subtitle='Soma das competencias listadas'
            tone='blue'
          />
        </div>

        <div className='grid grid-cols-1 gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]'>
          <div className='space-y-5'>
            <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Filtro operacional
                  </p>
                  <h3 className='mt-2 text-xl font-bold text-slate-900'>
                    Competencias
                  </h3>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600'>
                  {loadingEvents ? 'Eventos...' : `${events.length} eventos`}
                </div>
              </div>

              <div className='mt-5 space-y-4'>
                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Todos</option>
                    <option value='ABERTA'>Aberta</option>
                    <option value='PROCESSADA'>Processada</option>
                    <option value='FECHADA'>Fechada</option>
                    <option value='REABERTA'>Reaberta</option>
                  </select>
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Ano
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Todos</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {renderRunsSidebar()}
          </div>

          <div className='space-y-6'>
            {selectedRun ? (
              <div className='rounded-3xl border border-slate-200 bg-white shadow-sm'>
                <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white'>
                  <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                    <div className='max-w-3xl'>
                      <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                        Competencia operacional
                      </p>
                      <div className='mt-3 flex flex-wrap items-center gap-3'>
                        <h2 className='text-3xl font-bold'>
                          {selectedRun.referenceLabel}
                        </h2>
                        <StatusBadge
                          status={selectedRun.status}
                          configMap={runStatusConfig}
                        />
                      </div>
                      <p className='mt-3 text-sm text-slate-300'>
                        Aberta em {formatDateTime(selectedRun.startedAt)} | Ultimo
                        processamento em {formatDateTime(selectedRun.processedAt)}
                      </p>
                      <p className='mt-2 text-sm text-slate-300'>
                        {selectedRun.notes || 'Sem observacoes registradas para esta competencia.'}
                      </p>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                      {canProcessPayroll ? (
                        <ActionButton
                          label={
                            processingRun
                              ? 'Processando...'
                              : selectedRun.status === 'PROCESSADA'
                                ? 'Reprocessar previa'
                                : 'Processar previa'
                          }
                          tone='blue'
                          onClick={handleProcessRun}
                          disabled={!selectedRun.canProcess || processingRun}
                        />
                      ) : null}

                      {canSyncFromTime ? (
                        <ActionButton
                          label={
                            syncingTime
                              ? 'Sincronizando Jornada...'
                              : 'Sincronizar Jornada'
                          }
                          tone='amber'
                          onClick={handleSyncFromTime}
                          disabled={selectedRun.status === 'FECHADA' || syncingTime}
                        />
                      ) : null}

                      {canClosePayroll ? (
                        <ActionButton
                          label={closingRun ? 'Fechando...' : 'Fechar competencia'}
                          tone='green'
                          onClick={handleCloseRun}
                          disabled={!selectedRun.canClose || closingRun}
                        />
                      ) : null}

                      {canReopenPayroll ? (
                        <ActionButton
                          label={
                            reopeningRun ? 'Reabrindo...' : 'Reabrir competencia'
                          }
                          tone='violet'
                          onClick={handleReopenRun}
                          disabled={!selectedRun.canReopen || reopeningRun}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='space-y-6 p-6'>
                  {renderRunDetailCards()}

                  {canReviewAutoEntries || canSyncFromTime ? (
                    <div className='rounded-3xl border border-cyan-200 bg-cyan-50 p-5'>
                      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700'>
                            Automacao Jornada para Folha
                          </p>
                          <h3 className='mt-2 text-xl font-bold text-slate-900'>
                            Dados operacionais refletidos na competencia
                          </h3>
                          <p className='mt-2 text-sm text-cyan-800'>
                            Lancamentos automaticos ficam marcados como origem
                            Jornada e podem ser revisados antes do processamento.
                          </p>
                        </div>

                        <div className='rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-right'>
                          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700'>
                            Status
                          </p>
                          <p className='mt-1 text-sm font-bold text-slate-900'>
                            {timeIntegrationSummary.totalMovements > 0
                              ? 'Sincronizado'
                              : 'Aguardando sincronizacao'}
                          </p>
                        </div>
                      </div>

                      <div className='mt-5 grid grid-cols-1 gap-3 md:grid-cols-5'>
                        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
                          <p className='text-xs text-slate-500'>Lancamentos</p>
                          <p className='mt-1 text-2xl font-bold text-slate-900'>
                            {timeIntegrationSummary.totalMovements}
                          </p>
                        </div>
                        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
                          <p className='text-xs text-slate-500'>Colaboradores</p>
                          <p className='mt-1 text-2xl font-bold text-slate-900'>
                            {timeIntegrationSummary.affectedEmployees}
                          </p>
                        </div>
                        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
                          <p className='text-xs text-slate-500'>Extras</p>
                          <p className='mt-1 text-2xl font-bold text-emerald-700'>
                            {timeIntegrationSummary.overtimeHours.toFixed(2)}h
                          </p>
                        </div>
                        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
                          <p className='text-xs text-slate-500'>Faltas/Atrasos</p>
                          <p className='mt-1 text-2xl font-bold text-rose-700'>
                            {(
                              timeIntegrationSummary.absenceHours +
                              timeIntegrationSummary.delayHours
                            ).toFixed(2)}
                            h
                          </p>
                        </div>
                        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
                          <p className='text-xs text-slate-500'>Reflexo</p>
                          <p className='mt-1 text-lg font-bold text-blue-800'>
                            {formatCurrency(timeIntegrationSummary.totalValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Colaboradores elegiveis</p>
                      <p className='mt-1 text-2xl font-bold text-slate-900'>
                        {activeRunSummary.totalEmployees}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Processados</p>
                      <p className='mt-1 text-2xl font-bold text-emerald-700'>
                        {activeRunSummary.processedEmployees}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Inconsistencias</p>
                      <p className='mt-1 text-2xl font-bold text-red-700'>
                        {activeRunSummary.inconsistencyCount}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Fechamento</p>
                      <p className='mt-1 text-sm font-semibold text-slate-900'>
                        {formatDateTime(
                          selectedRun.closedAt || selectedRun.reopenedAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => setActiveTab('list')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === 'list'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Lista operacional
                </button>

                <button
                  type='button'
                  onClick={() => setActiveTab('preview')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === 'preview'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Visao executiva
                </button>
              </div>
            </div>

            {activeTab === 'preview' && selectedRun ? (
              <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
                <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Prioridade do ciclo
                  </p>
                  <h3 className='mt-3 text-2xl font-bold text-slate-900'>
                    Previa da competencia {selectedRun.referenceLabel}
                  </h3>
                  <p className='mt-3 text-sm text-slate-500'>
                    A folha desta competencia esta em status{' '}
                    <span className='font-semibold text-slate-900'>
                      {runStatusConfig[selectedRun.status]?.label || selectedRun.status}
                    </span>
                    , com {activeRunSummary.processedEmployees} colaborador(es)
                    processado(s) e {activeRunSummary.inconsistencyCount} ponto(s)
                    de atencao operacional.
                  </p>

                  <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='rounded-2xl border border-blue-200 bg-blue-50 p-5'>
                      <p className='text-sm text-blue-700'>Maior saldo liquido</p>
                      <p className='mt-2 text-lg font-bold text-blue-900'>
                        {filteredEmployees[0]?.employeeName || 'Sem processamento'}
                      </p>
                      <p className='mt-1 text-sm text-blue-700'>
                        {formatCurrency(filteredEmployees[0]?.netAmount || 0)}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5'>
                      <p className='text-sm text-amber-700'>Atencao operacional</p>
                      <p className='mt-2 text-lg font-bold text-amber-900'>
                        {activeRunSummary.inconsistencyCount > 0
                          ? `${activeRunSummary.inconsistencyCount} inconsistencia(s)`
                          : 'Competencia consistente'}
                      </p>
                      <p className='mt-1 text-sm text-amber-700'>
                        Reforce a conferencia antes do fechamento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Trilha operacional
                  </p>
                  <h3 className='mt-3 text-xl font-bold text-slate-900'>
                    Fechamento e auditoria
                  </h3>

                  <div className='mt-5 space-y-4'>
                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Aberta em</p>
                      <p className='mt-1 text-sm font-semibold text-slate-900'>
                        {formatDateTime(selectedRun.startedAt)}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Processada em</p>
                      <p className='mt-1 text-sm font-semibold text-slate-900'>
                        {formatDateTime(selectedRun.processedAt)}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Fechada em</p>
                      <p className='mt-1 text-sm font-semibold text-slate-900'>
                        {formatDateTime(selectedRun.closedAt)}
                      </p>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Reaberta em</p>
                      <p className='mt-1 text-sm font-semibold text-slate-900'>
                        {formatDateTime(selectedRun.reopenedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Buscar colaborador
                  </label>
                  <input
                    type='text'
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder='Buscar por nome, cargo, setor ou e-mail'
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  />
                </div>

                <div className='flex items-end justify-end gap-3'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right'>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                      Eventos prontos
                    </p>
                    <p className='mt-1 text-lg font-bold text-slate-900'>
                      {loadingEvents ? '...' : events.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {renderEmployeeRows()}
          </div>
        </div>
      </div>

      {isRunDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeRunDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeRunDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700'>
                      Competencia da folha
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Abrir nova competencia
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      O sistema vai carregar automaticamente os colaboradores
                      elegiveis e preparar a base da operacao mensal.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeRunDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateRun} className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Mes
                        </label>
                        <select
                          name='month'
                          value={runForm.month}
                          onChange={handleRunFormChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value=''>Selecione</option>
                          {Array.from({ length: 12 }, (_, index) => index + 1).map(
                            (month) => (
                              <option key={month} value={month}>
                                {String(month).padStart(2, '0')}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Ano
                        </label>
                        <input
                          type='number'
                          name='year'
                          value={runForm.year}
                          onChange={handleRunFormChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='2026'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observacoes
                        </label>
                        <textarea
                          name='notes'
                          value={runForm.notes}
                          onChange={handleRunFormChange}
                          rows='5'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Ex: ciclo mensal da folha, observacoes de fechamento e conferencias.'
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeRunDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={creatingRun}
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {creatingRun ? 'Abrindo...' : 'Abrir competencia'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMovementDrawerOpen && selectedEmployee && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeMovementDrawer}
          />

          <div className='relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeMovementDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'>
                      Lancamentos da competencia
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {selectedEmployee.employeeName}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre proventos, descontos e ajustes da competencia{' '}
                      {selectedRun?.referenceLabel}.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeMovementDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        {editingMovementId ? 'Editar lancamento' : 'Novo lancamento'}
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione o evento, informe quantidade/valor e deixe a
                        previa pronta para reprocessamento.
                      </p>
                    </div>

                    <form onSubmit={handleSaveMovement} className='space-y-5'>
                      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                        <div className='md:col-span-2'>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Evento da folha
                          </label>
                          <select
                            name='payrollEventId'
                            value={movementForm.payrollEventId}
                            onChange={handleMovementFormChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          >
                            <option value=''>Selecione um evento</option>
                            {events.map((event) => (
                              <option key={event.id} value={event.id}>
                                {event.code} - {event.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Quantidade
                          </label>
                          <input
                            type='number'
                            step='0.01'
                            name='quantity'
                            value={movementForm.quantity}
                            onChange={handleMovementFormChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          />
                        </div>

                        <div>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Valor unitario
                          </label>
                          <input
                            type='number'
                            step='0.01'
                            name='unitValue'
                            value={movementForm.unitValue}
                            onChange={handleMovementFormChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          />
                        </div>

                        <div>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Total
                          </label>
                          <input
                            type='number'
                            step='0.01'
                            name='totalValue'
                            value={movementForm.totalValue}
                            onChange={handleMovementFormChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          />
                        </div>

                        <div>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Origem
                          </label>
                          <select
                            name='source'
                            value={movementForm.source}
                            onChange={handleMovementFormChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          >
                            <option value='MANUAL'>Manual</option>
                            <option value='AUTOMATICO'>Automatico</option>
                            <option value='FIXO'>Fixo</option>
                            <option value='IMPORTADO'>Importado</option>
                          </select>
                        </div>

                        <div className='md:col-span-2'>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>
                            Observacao
                          </label>
                          <textarea
                            name='notes'
                            value={movementForm.notes}
                            onChange={handleMovementFormChange}
                            rows='4'
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            placeholder='Ex: bonus por performance, ajuste manual, reflexo de horas extras.'
                          />
                        </div>
                      </div>

                      <div className='flex justify-end gap-3'>
                        <button
                          type='button'
                          onClick={closeMovementDrawer}
                          className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                        >
                          Cancelar
                        </button>

                        <button
                          type='submit'
                          disabled={savingMovement}
                          className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {savingMovement
                            ? 'Salvando...'
                            : editingMovementId
                              ? 'Salvar lancamento'
                              : 'Adicionar lancamento'}
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5 flex items-center justify-between gap-4'>
                      <div>
                        <h3 className='text-lg font-semibold text-slate-800'>
                          Lancamentos ja registrados
                        </h3>
                        <p className='mt-1 text-sm text-slate-500'>
                          Esses itens entram no reprocessamento da competencia.
                        </p>
                      </div>

                      <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right'>
                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                          Total
                        </p>
                        <p className='mt-1 text-lg font-bold text-slate-900'>
                          {selectedEmployee.movements.length}
                        </p>
                      </div>
                    </div>

                    {selectedEmployee.movements.length === 0 ? (
                      <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500'>
                        Nenhum lancamento manual registrado para este colaborador.
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        {selectedEmployee.movements.map((movement) => (
                          <div
                            key={movement.id}
                            className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                          >
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                              <div>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <p className='text-base font-bold text-slate-900'>
                                    {movement.eventName}
                                  </p>
                                  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                                    {movement.eventCode}
                                  </span>
                                  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                                    {movement.type}
                                  </span>
                                </div>

                                <div className='mt-2 flex flex-wrap gap-4 text-sm text-slate-500'>
                                  <span>Qtd: {movement.quantity}</span>
                                  <span>Unit.: {formatCurrency(movement.unitValue)}</span>
                                  <span>Total: {formatCurrency(movement.totalValue)}</span>
                                  <span>Origem: {movement.source}</span>
                                  {movement.autoGenerated ? (
                                    <span className='rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-700'>
                                      Jornada
                                    </span>
                                  ) : null}
                                </div>

                                {movement.notes ? (
                                  <p className='mt-3 text-sm text-slate-600'>
                                    {movement.notes}
                                  </p>
                                ) : null}
                              </div>

                              <div className='flex flex-wrap gap-2'>
                                {canUpdateMovement ? (
                                  <MiniActionButton
                                    label='Editar'
                                    tone='blue'
                                    onClick={() =>
                                      openMovementDrawer(selectedEmployee, movement)
                                    }
                                    disabled={selectedRun?.status === 'FECHADA'}
                                  />
                                ) : null}

                                {canDeleteMovement ? (
                                  <MiniActionButton
                                    label={
                                      deletingMovementId === movement.id
                                        ? 'Inativando...'
                                        : 'Inativar'
                                    }
                                    tone='red'
                                    onClick={() => handleDeleteMovement(movement.id)}
                                    disabled={
                                      selectedRun?.status === 'FECHADA' ||
                                      deletingMovementId === movement.id
                                    }
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {payslipPreview && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={() => setPayslipPreview(null)}
          />

          <div className='relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl'>
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100'>
                    Preview do holerite
                  </div>
                  <h3 className='text-2xl font-bold'>
                    {payslipPreview.employee.name}
                  </h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    Competencia {payslipPreview.competence} -{' '}
                    {payslipPreview.companyName}
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setPayslipPreview(null)}
                  className='rounded-xl px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='max-h-[80vh] overflow-y-auto px-6 py-6'>
              <div className='grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
                <div className='space-y-4'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                    <p className='text-sm text-slate-500'>Colaborador</p>
                    <p className='mt-1 text-lg font-bold text-slate-900'>
                      {payslipPreview.employee.name}
                    </p>
                    <p className='mt-2 text-sm text-slate-600'>
                      {payslipPreview.employee.role || 'Sem cargo'} -{' '}
                      {payslipPreview.employee.department || 'Sem setor'}
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      CPF: {payslipPreview.employee.cpf || '-'}
                    </p>
                  </div>

                  <div className='grid grid-cols-1 gap-4'>
                    <SummaryCard
                      title='Bruto'
                      value={formatCurrency(
                        payslipPreview.totals.grossAmount
                      )}
                      subtitle='Proventos consolidados'
                      tone='green'
                    />
                    <SummaryCard
                      title='Descontos'
                      value={formatCurrency(
                        payslipPreview.totals.discountAmount
                      )}
                      subtitle='Descontos aplicados'
                      tone='rose'
                    />
                    <SummaryCard
                      title='Liquido'
                      value={formatCurrency(payslipPreview.totals.netAmount)}
                      subtitle='Resultado final da previa'
                      tone='blue'
                    />
                  </div>
                </div>

                <div className='space-y-6'>
                  <div className='rounded-3xl border border-emerald-200 bg-emerald-50 p-5'>
                    <h4 className='text-lg font-bold text-emerald-900'>
                      Proventos
                    </h4>
                    <div className='mt-4 space-y-3'>
                      {payslipPreview.provents.length === 0 ? (
                        <p className='text-sm text-emerald-700'>
                          Nenhum provento identificado na previa.
                        </p>
                      ) : (
                        payslipPreview.provents.map((line, index) => (
                          <div
                            key={`${line.code}-${index}`}
                            className='flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3'
                          >
                            <div>
                              <p className='font-semibold text-slate-900'>
                                {line.name}
                              </p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {line.code} - {line.category}
                              </p>
                            </div>

                            <p className='text-sm font-bold text-emerald-700'>
                              {formatCurrency(line.totalValue)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className='rounded-3xl border border-rose-200 bg-rose-50 p-5'>
                    <h4 className='text-lg font-bold text-rose-900'>Descontos</h4>
                    <div className='mt-4 space-y-3'>
                      {payslipPreview.discounts.length === 0 ? (
                        <p className='text-sm text-rose-700'>
                          Nenhum desconto identificado na previa.
                        </p>
                      ) : (
                        payslipPreview.discounts.map((line, index) => (
                          <div
                            key={`${line.code}-${index}`}
                            className='flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white px-4 py-3'
                          >
                            <div>
                              <p className='font-semibold text-slate-900'>
                                {line.name}
                              </p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {line.code} - {line.category}
                              </p>
                            </div>

                            <p className='text-sm font-bold text-rose-700'>
                              {formatCurrency(line.totalValue)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {payslipPreview.informative.length > 0 ? (
                    <div className='rounded-3xl border border-blue-200 bg-blue-50 p-5'>
                      <h4 className='text-lg font-bold text-blue-900'>
                        Informativos
                      </h4>
                      <div className='mt-4 space-y-3'>
                        {payslipPreview.informative.map((line, index) => (
                          <div
                            key={`${line.code}-${index}`}
                            className='flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-white px-4 py-3'
                          >
                            <div>
                              <p className='font-semibold text-slate-900'>
                                {line.name}
                              </p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {line.code} - {line.category}
                              </p>
                            </div>

                            <p className='text-sm font-bold text-blue-700'>
                              {formatCurrency(line.totalValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Payroll;
