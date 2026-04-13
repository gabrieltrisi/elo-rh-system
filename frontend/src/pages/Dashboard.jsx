import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CalendarDays, BellRing } from 'lucide-react';

function Dashboard({ onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);

  const [certificates, setCertificates] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [leave, setLeave] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [uniforms, setUniforms] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [filter, setFilter] = useState('atestados');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState({
    employees: 0,
    vacations: 0,
    uniformsDelivered: 0,
    stockLow: 0,
    pendingCertificates: 0,
    upcomingVacations: 0,
    returningFromVacation: 0,
    birthdaysThisMonth: 0,
    alerts: [],
  });

  useEffect(() => {
    fetchData();
    loadLocal();
  }, []);

  const fetchData = async () => {
    try {
      const [emp, vac, dash] = await Promise.all([
        api.get('/employees'),
        api.get('/vacations'),
        api.get('/dashboard'),
      ]);

      setEmployees(emp.data.employees || []);
      setVacations(vac.data.vacations || []);
      setDashboardSummary(
        dash.data.dashboard || {
          employees: 0,
          vacations: 0,
          uniformsDelivered: 0,
          stockLow: 0,
          pendingCertificates: 0,
          upcomingVacations: 0,
          returningFromVacation: 0,
          birthdaysThisMonth: 0,
          alerts: [],
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadLocal = () => {
    setCertificates(JSON.parse(localStorage.getItem('certificates')) || []);
    setWarnings(JSON.parse(localStorage.getItem('warnings')) || []);
    setSuspensions(JSON.parse(localStorage.getItem('suspensions')) || []);
    setLeave(JSON.parse(localStorage.getItem('leave')) || []);
    setOnboarding(JSON.parse(localStorage.getItem('onboarding')) || []);
    setUniforms(JSON.parse(localStorage.getItem('uniforms')) || []);

    const documentKeys = ['documents', 'employeeDocuments', 'documentHistory'];
    let foundDocuments = [];

    for (const key of documentKeys) {
      const saved = localStorage.getItem(key);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed) && parsed.length > 0) {
            foundDocuments = parsed;
            break;
          }
        } catch (error) {
          console.error(`Erro ao ler ${key} do localStorage:`, error);
        }
      }
    }

    setDocuments(foundDocuments);
  };

  const generatePDF = async () => {
    try {
      setGeneratingPdf(true);

      const element = document.getElementById('dashboard-report');

      if (!element) {
        alert('Não foi possível localizar o dashboard para exportação.');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;

      const imgWidth = pageWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 5;

      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 10;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 5;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 10;
      }

      pdf.save('relatorio-dashboard-rh.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Veja o console do navegador.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const pendingDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const status = String(doc?.status || '')
        .trim()
        .toUpperCase();

      return [
        'PENDENTE',
        'PENDENTE_ENVIO',
        'PENDENTE_VALIDACAO',
        'PENDENTE_VALIDADOR',
      ].includes(status);
    });
  }, [documents]);

  const activeLeave = useMemo(() => {
    const today = new Date();

    return leave.filter((item) => {
      const startRaw = item.startDate || item.initialDate || item.dateStart;
      const endRaw = item.endDate || item.finalDate || item.dateEnd;

      if (!startRaw || !endRaw) return false;

      const startDate = new Date(startRaw);
      const endDate = new Date(endRaw);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return false;
      }

      return today >= startDate && today <= endDate;
    });
  }, [leave]);

  const leaveReturningSoon = useMemo(() => {
    const today = new Date();

    return leave
      .map((item) => {
        const endRaw = item.endDate || item.finalDate || item.dateEnd;
        if (!endRaw) return null;

        const endDate = new Date(endRaw);
        if (Number.isNaN(endDate.getTime())) return null;

        const msPerDay = 1000 * 60 * 60 * 24;
        const diff = Math.ceil((endDate - today) / msPerDay);

        return {
          ...item,
          daysUntilReturn: diff,
        };
      })
      .filter(
        (item) => item && item.daysUntilReturn >= 0 && item.daysUntilReturn <= 7
      )
      .sort((a, b) => a.daysUntilReturn - b.daysUntilReturn);
  }, [leave]);

  const upcomingVacationItems = useMemo(() => {
    const today = new Date();

    return vacations
      .map((item) => {
        const startDate = new Date(item.startDate);

        if (Number.isNaN(startDate.getTime())) return null;

        const msPerDay = 1000 * 60 * 60 * 24;
        const diff = Math.ceil((startDate - today) / msPerDay);

        return {
          ...item,
          daysUntilStart: diff,
          employeeLabel:
            item.employee?.name || item.employee?.fullName || 'Colaborador',
        };
      })
      .filter(
        (item) => item && item.daysUntilStart >= 0 && item.daysUntilStart <= 15
      )
      .sort((a, b) => a.daysUntilStart - b.daysUntilStart)
      .slice(0, 3);
  }, [vacations]);

  const upcomingDocumentItems = useMemo(() => {
    return pendingDocuments.slice(0, 2).map((item, index) => ({
      id: item.id || `doc-${index}`,
      title: item.title || item.documentName || 'Documento pendente',
      employeeLabel:
        item.employeeName || item.fullName || item.employee || 'Colaborador',
      type: 'document',
    }));
  }, [pendingDocuments]);

  const nextEvents = useMemo(() => {
    const events = [];

    upcomingVacationItems.forEach((item, index) => {
      events.push({
        id: `vac-${item.id || index}`,
        title:
          item.daysUntilStart === 0
            ? `${item.employeeLabel} inicia férias hoje`
            : `${item.employeeLabel} inicia férias em ${item.daysUntilStart} dia(s)`,
        subtitle: item.acquisitionPeriod || 'Férias programadas',
        tone: item.daysUntilStart <= 3 ? 'blue' : 'slate',
      });
    });

    leaveReturningSoon.slice(0, 2).forEach((item, index) => {
      const employeeName =
        item.employeeName || item.fullName || item.employee || 'Colaborador';

      events.push({
        id: `leave-${index}`,
        title:
          item.daysUntilReturn === 0
            ? `${employeeName} retorna hoje`
            : `${employeeName} retorna em ${item.daysUntilReturn} dia(s)`,
        subtitle: 'Retorno de afastamento',
        tone: item.daysUntilReturn <= 2 ? 'amber' : 'slate',
      });
    });

    upcomingDocumentItems.forEach((item) => {
      events.push({
        id: item.id,
        title: `${item.employeeLabel} possui pendência documental`,
        subtitle: item.title,
        tone: 'red',
      });
    });

    return events.slice(0, 3);
  }, [upcomingVacationItems, leaveReturningSoon, upcomingDocumentItems]);

  const smartFrontendAlerts = useMemo(() => {
    const extraAlerts = [];

    if (activeLeave.length > 0) {
      extraAlerts.push({
        id: 'active-leave-alert',
        type: 'leave_active',
        priority: activeLeave.length >= 2 ? 'high' : 'medium',
        title: 'Afastamentos em andamento',
        description: `${activeLeave.length} colaborador(es) estão afastados/licença neste momento`,
        page: 'leave',
        tone: activeLeave.length >= 2 ? 'red' : 'amber',
      });
    }

    leaveReturningSoon.slice(0, 3).forEach((item, index) => {
      const employeeName =
        item.employeeName || item.fullName || item.employee || 'Colaborador';

      extraAlerts.push({
        id: `leave-return-${index}`,
        type: 'leave_return',
        priority: item.daysUntilReturn <= 2 ? 'high' : 'medium',
        title: 'Retorno de afastamento',
        description:
          item.daysUntilReturn === 0
            ? `${employeeName} retorna de afastamento hoje`
            : `${employeeName} retorna de afastamento em ${item.daysUntilReturn} dia(s)`,
        page: 'leave',
        tone: item.daysUntilReturn <= 2 ? 'red' : 'blue',
      });
    });

    if (pendingDocuments.length > 0) {
      extraAlerts.push({
        id: 'pending-documents-alert',
        type: 'documents_pending',
        priority: pendingDocuments.length >= 3 ? 'high' : 'medium',
        title: 'Documentos pendentes',
        description: `${pendingDocuments.length} documento(s) aguardando envio ou validação`,
        page: 'documents',
        tone: pendingDocuments.length >= 3 ? 'red' : 'amber',
      });
    }

    return extraAlerts;
  }, [activeLeave, leaveReturningSoon, pendingDocuments]);

  const stats = {
    employees: dashboardSummary.employees || employees.length,
    certificates: dashboardSummary.pendingCertificates || certificates.length,
    vacations: dashboardSummary.vacations || vacations.length,
    warnings: warnings.length,
    suspensions: suspensions.length,
    leave: leave.length,
    activeLeave: activeLeave.length,
    onboarding: onboarding.length,
    uniforms: uniforms.length,
    documents: documents.length,
    pendingDocuments: pendingDocuments.length,
    upcomingVacations: dashboardSummary.upcomingVacations || 0,
    returningFromVacation: dashboardSummary.returningFromVacation || 0,
    stockLow: dashboardSummary.stockLow || 0,
  };

  const ranking = useMemo(() => {
    const map = {};

    const add = (name, field) => {
      if (!name) return;
      if (!map[name]) map[name] = { name };
      map[name][field] = (map[name][field] || 0) + 1;
    };

    certificates.forEach((c) => add(c.employeeName, 'atestados'));
    warnings.forEach((w) => add(w.employeeName, 'advertencias'));
    suspensions.forEach((s) => add(s.employeeName, 'suspensoes'));
    leave.forEach((l) =>
      add(l.employeeName || l.fullName || l.employee, 'afastamentos')
    );
    onboarding.forEach((o) => add(o.employeeName, 'onboarding'));
    uniforms.forEach((u) => add(u.employeeName, 'fardamento'));

    vacations.forEach((v) => {
      add(v.employee?.name || v.employee?.fullName, 'ferias');
    });

    return Object.values(map);
  }, [
    certificates,
    warnings,
    suspensions,
    leave,
    onboarding,
    uniforms,
    vacations,
  ]);

  const chartData = ranking.map((r) => {
    const rawValue =
      filter === 'atestados'
        ? r.atestados || 0
        : filter === 'advertencias'
          ? r.advertencias || 0
          : filter === 'ferias'
            ? r.ferias || 0
            : filter === 'suspensoes'
              ? r.suspensoes || 0
              : filter === 'afastamentos'
                ? r.afastamentos || 0
                : filter === 'onboarding'
                  ? r.onboarding || 0
                  : r.fardamento || 0;

    return {
      name: r.name,
      rawValue,
      value: rawValue === 0 ? 0.1 : rawValue,
    };
  });

  const monthlyData = useMemo(() => {
    const months = [
      { name: 'Jan', value: 0 },
      { name: 'Fev', value: 0 },
      { name: 'Mar', value: 0 },
      { name: 'Abr', value: 0 },
      { name: 'Mai', value: 0 },
      { name: 'Jun', value: 0 },
      { name: 'Jul', value: 0 },
      { name: 'Ago', value: 0 },
      { name: 'Set', value: 0 },
      { name: 'Out', value: 0 },
      { name: 'Nov', value: 0 },
      { name: 'Dez', value: 0 },
    ];

    certificates.forEach((c) => {
      if (!c.date) return;
      const d = new Date(c.date);
      if (Number.isNaN(d.getTime())) return;
      months[d.getMonth()].value += 1;
    });

    return months.map((item) => ({
      ...item,
      plotValue: item.value === 0 ? 0.1 : item.value,
    }));
  }, [certificates]);

  const riskData = useMemo(() => {
    const map = {};

    const add = (name, value) => {
      if (!name) return;
      if (!map[name]) map[name] = 0;
      map[name] += value;
    };

    certificates.forEach((c) => add(c.employeeName, 1));
    warnings.forEach((w) => add(w.employeeName, 2));
    suspensions.forEach((s) => add(s.employeeName, 3));
    leave.forEach((l) => add(l.employeeName || l.fullName || l.employee, 2));

    return Object.entries(map).map(([name, score]) => {
      let level = 'BAIXO';
      let color = 'green';

      if (score >= 6) {
        level = 'ALTO';
        color = 'red';
      } else if (score >= 3) {
        level = 'MÉDIO';
        color = 'yellow';
      }

      return { name, score, level, color };
    });
  }, [certificates, warnings, suspensions, leave]);

  const topCritical = [...riskData]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const alerts = [...(dashboardSummary.alerts || []), ...smartFrontendAlerts];

  const quickActions = [
    {
      title: 'Colaboradores',
      subtitle: 'Equipe e cadastro',
      icon: '👥',
      page: 'employees',
    },
    {
      title: 'Atestados',
      subtitle: 'Pendências médicas',
      icon: '🩺',
      page: 'certificates',
    },
    {
      title: 'Advertências',
      subtitle: 'Ocorrências internas',
      icon: '⚠️',
      page: 'warnings',
    },
    {
      title: 'Férias',
      subtitle: 'Planejamento',
      icon: '🌴',
      page: 'vacations',
    },
    {
      title: 'Documentos',
      subtitle: 'Arquivos e contratos',
      icon: '📂',
      page: 'documents',
    },
    {
      title: 'Benefícios',
      subtitle: 'VT, VR e plano',
      icon: '🎁',
      page: 'benefits',
    },
  ];

  return (
    <div className='space-y-8'>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-8 text-white shadow-xl xl:flex-1'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-blue-200'>
                Painel inteligente
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Dashboard estratégico do RH
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Visualize indicadores, riscos, movimentações e alertas
                inteligentes para apoiar a gestão no dia a dia.
              </p>
            </div>

            <div className='flex flex-wrap gap-3 xl:max-w-[760px] xl:justify-end'>
              {[
                { label: 'Colaboradores', page: 'employees' },
                { label: 'Atestados', page: 'certificates' },
                { label: 'Advertências', page: 'warnings' },
                { label: 'Férias', page: 'vacations' },
                { label: 'Documentos', page: 'documents' },
              ].map((btn) => (
                <button
                  key={btn.page}
                  onClick={() => onNavigate(btn.page)}
                  className='rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/20'
                >
                  {btn.label}
                </button>
              ))}

              <button
                onClick={generatePDF}
                disabled={generatingPdf}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {generatingPdf ? 'Gerando PDF...' : '📄 Exportar PDF'}
              </button>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 md:flex-row xl:flex-col'>
          <button
            type='button'
            onClick={() => onNavigate('calendar')}
            className='flex min-w-[220px] items-center gap-4 rounded-3xl border border-blue-100 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
          >
            <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm'>
              <CalendarDays className='h-7 w-7' />
            </div>

            <div className='text-left'>
              <p className='text-lg font-semibold text-slate-900'>Calendário</p>
              <p className='text-sm text-slate-500'>Google / Outlook</p>
            </div>
          </button>

          <button
            type='button'
            onClick={() => onNavigate('calendar')}
            className='min-w-[220px] rounded-3xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
          >
            <div className='flex items-start gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700'>
                <BellRing className='h-7 w-7' />
              </div>

              <div className='min-w-0 flex-1'>
                <p className='text-lg font-semibold text-slate-900'>
                  Próximos eventos
                </p>
                <p className='text-sm text-slate-500'>Agenda operacional</p>

                <div className='mt-3 space-y-2'>
                  {nextEvents.length === 0 ? (
                    <div className='rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500'>
                      Sem eventos programados no momento
                    </div>
                  ) : (
                    nextEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-2xl border px-3 py-2 ${getEventClasses(
                          event.tone
                        )}`}
                      >
                        <p className='text-sm font-semibold'>{event.title}</p>
                        <p className='mt-0.5 text-xs opacity-80'>
                          {event.subtitle}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div id='dashboard-report' className='space-y-8'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <StatsCard
            title='Colaboradores'
            value={stats.employees}
            subtitle='Base ativa do sistema'
            tone='blue'
          />
          <StatsCard
            title='Atestados pendentes'
            value={stats.certificates}
            subtitle='Aguardando análise'
            tone='amber'
          />
          <StatsCard
            title='Férias próximas'
            value={stats.upcomingVacations}
            subtitle='Início em até 30 dias'
            tone='green'
          />
          <StatsCard
            title='Estoque crítico'
            value={stats.stockLow}
            subtitle='Itens com baixo estoque'
            tone='red'
          />
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <MiniAlertCard
            title='Retornos de férias'
            value={stats.returningFromVacation}
            subtitle='Próximos 7 dias'
            tone='blue'
          />
          <MiniAlertCard
            title='Afastamentos ativos'
            value={stats.activeLeave}
            subtitle='Licenças em andamento'
            tone='amber'
          />
          <MiniAlertCard
            title='Docs pendentes'
            value={stats.pendingDocuments}
            subtitle='Aguardando ação'
            tone='red'
          />
          <MiniAlertCard
            title='Férias cadastradas'
            value={stats.vacations}
            subtitle='Total no sistema'
            tone='green'
          />
        </div>

        <div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='text-xl font-bold text-slate-900'>
                  Indicadores por colaborador
                </h2>
                <p className='mt-1 text-sm text-slate-500'>
                  Compare a incidência por módulo selecionado.
                </p>
              </div>

              <div className='flex flex-wrap gap-2'>
                <FilterBtn
                  label='Atestados'
                  value='atestados'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Advertências'
                  value='advertencias'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Férias'
                  value='ferias'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Suspensões'
                  value='suspensoes'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Afastamentos'
                  value='afastamentos'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Onboarding'
                  value='onboarding'
                  filter={filter}
                  setFilter={setFilter}
                />
                <FilterBtn
                  label='Fardamento'
                  value='fardamento'
                  filter={filter}
                  setFilter={setFilter}
                />
              </div>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) =>
                      props?.payload?.rawValue ?? 0
                    }
                  />
                  <Bar dataKey='value' fill='#2563eb' radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='space-y-6'>
            <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
              <h2 className='text-xl font-bold text-slate-900'>
                Previsão de risco
              </h2>
              <p className='mt-1 text-sm text-slate-500'>
                Score automático com base nas ocorrências registradas.
              </p>

              <div className='mt-5 space-y-3'>
                {riskData.length === 0 ? (
                  <p className='text-sm text-slate-500'>
                    Ainda não há dados suficientes para análise de risco.
                  </p>
                ) : (
                  riskData.map((item, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'
                    >
                      <span className='font-medium text-slate-800'>
                        {item.name}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.color === 'red'
                            ? 'bg-red-100 text-red-600'
                            : item.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.level} ({item.score})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className='rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm'>
              <h2 className='text-xl font-bold text-red-600'>
                Colaboradores críticos
              </h2>
              <p className='mt-1 text-sm text-red-500'>
                Priorize acompanhamento desses casos.
              </p>

              <div className='mt-4 space-y-3'>
                {topCritical.length === 0 ? (
                  <p className='text-sm text-red-500'>
                    Nenhum colaborador crítico no momento.
                  </p>
                ) : (
                  topCritical.map((c, i) => (
                    <div
                      key={i}
                      className='rounded-2xl border border-red-200 bg-white px-4 py-3 text-red-600'
                    >
                      <span className='font-semibold'>{c.name}</span>{' '}
                      <span className='text-sm'>(Score: {c.score})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[1fr_1fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-bold text-slate-900'>
              Evolução mensal de atestados
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Volume registrado mês a mês.
            </p>

            <div className='mt-4' style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={monthlyData}>
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) =>
                      props?.payload?.value ?? 0
                    }
                  />
                  <Bar
                    dataKey='plotValue'
                    fill='#22c55e'
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-bold text-slate-900'>
              Alertas inteligentes
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Pendências e eventos importantes para otimizar o tempo da gestão.
            </p>

            <div className='mt-5 space-y-3'>
              {alerts.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Nenhum alerta relevante no momento.
                </div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => alert.page && onNavigate(alert.page)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:scale-[1.01] ${getAlertClasses(
                      alert.tone
                    )}`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-sm font-bold'>{alert.title}</p>
                        <p className='mt-1 text-sm opacity-90'>
                          {alert.description}
                        </p>
                      </div>

                      <span className='rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide'>
                        {alert.priority}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h2 className='text-xl font-bold text-slate-900'>Ações rápidas</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Acesse os principais módulos do sistema.
          </p>

          <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {quickActions.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className='group rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
              >
                <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white transition group-hover:bg-blue-600'>
                  {item.icon}
                </div>

                <h3 className='text-lg font-bold text-slate-900'>
                  {item.title}
                </h3>
                <p className='mt-1 text-sm text-slate-500'>{item.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, tone }) {
  const tones = {
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    amber: 'from-amber-50 to-amber-100 text-amber-700',
    green: 'from-emerald-50 to-emerald-100 text-emerald-700',
    red: 'from-red-50 to-red-100 text-red-700',
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br p-6 shadow-sm ${tones[tone]}`}
    >
      <p className='text-sm font-medium opacity-80'>{title}</p>
      <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
      <p className='mt-2 text-sm opacity-80'>{subtitle}</p>
    </div>
  );
}

function MiniAlertCard({ title, value, subtitle, tone }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm font-medium opacity-80'>{title}</p>
      <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
      <p className='mt-2 text-sm opacity-80'>{subtitle}</p>
    </div>
  );
}

function FilterBtn({ label, value, filter, setFilter }) {
  return (
    <button
      onClick={() => setFilter(value)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        filter === value
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function getAlertClasses(tone) {
  if (tone === 'red') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (tone === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (tone === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function getEventClasses(tone) {
  if (tone === 'red') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (tone === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (tone === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default Dashboard;
