import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const initialFilters = {
  employeeId: '',
  department: '',
  classification: '',
  trainingStatus: '',
  periodStart: firstDayOfMonth.toISOString().slice(0, 10),
  periodEnd: today.toISOString().slice(0, 10),
};

const initialEvaluationForm = {
  efficiencyScore: 80,
  behaviorScore: 80,
  managerScore: 80,
  notes: '',
  strengths: '',
  attentionPoints: '',
  developmentPlan: '',
  recommendation: '',
};

const initialPeerForm = {
  reviewerEmployeeId: '',
  score: 4,
  category: 'RELACIONAMENTO',
  comment: '',
};

const initialExternalForm = {
  companyName: '',
  score: 4,
  serviceContext: '',
  comment: '',
  feedbackDate: today.toISOString().slice(0, 10),
};

const classificationConfig = {
  EXCELENTE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  BOM: 'border-blue-200 bg-blue-50 text-blue-800',
  ATENCAO: 'border-amber-200 bg-amber-50 text-amber-800',
  CRITICO: 'border-rose-200 bg-rose-50 text-rose-800',
};

const rankingTone = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const formatMinutes = (minutes = 0) => {
  const signal = minutes < 0 ? '-' : '';
  const absolute = Math.abs(Number(minutes || 0));
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `${signal}${hours}h${String(mins).padStart(2, '0')}`;
};

const formatScore = (value = 0) => Number(value || 0).toFixed(1);

function Performance() {
  const { hasPermission } = useAuthSession();
  const [options, setOptions] = useState({
    employees: [],
    departments: [],
    classifications: [],
    trainingStatuses: [],
  });
  const [filters, setFilters] = useState(initialFilters);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState('evaluation');
  const [evaluationForm, setEvaluationForm] = useState(initialEvaluationForm);
  const [peerForm, setPeerForm] = useState(initialPeerForm);
  const [externalForm, setExternalForm] = useState(initialExternalForm);
  const [pdfActionKey, setPdfActionKey] = useState(null);

  const canRead = hasPermission('performance.read');
  const canExport = hasPermission('performance.export');
  const canReadPdf = hasPermission('performance.pdf.read');
  const canEvaluate = hasPermission('performance.evaluate');
  const canFeedback = hasPermission('performance.feedback');
  const canExternalFeedback = hasPermission('performance.external_feedback');

  const employees = options.employees || [];
  const departments = options.departments || [];
  const classifications = options.classifications || [];
  const trainingStatuses = options.trainingStatuses || [];
  const selectedEmployeeId =
    filters.employeeId || employees[0]?.id || performance?.profile?.employee?.id || '';
  const profile = performance?.profile;
  const score = profile?.score;
  const executive = performance?.executive;
  const summary = performance?.summary;

  useEffect(() => {
    if (canRead) {
      fetchOptions();
    }
  }, [canRead]);

  useEffect(() => {
    if (canRead && employees.length) {
      fetchPerformance();
    }
  }, [
    canRead,
    employees.length,
    filters.employeeId,
    filters.department,
    filters.classification,
    filters.trainingStatus,
    filters.periodStart,
    filters.periodEnd,
  ]);

  const fetchOptions = async () => {
    try {
      const response = await api.get('/performance/options');
      const nextOptions = response.data?.options || {
        employees: [],
        departments: [],
        classifications: [],
        trainingStatuses: [],
      };

      setOptions(nextOptions);

      if (!filters.employeeId && nextOptions.employees?.[0]?.id) {
        setFilters((prev) => ({
          ...prev,
          employeeId: String(nextOptions.employees[0].id),
        }));
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel carregar opcoes de desempenho.'
      );
    }
  };

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/performance', {
        params: {
          ...filters,
          employeeId: selectedEmployeeId,
        },
      });
      setPerformance(response.data?.performance || null);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel carregar o dashboard de desempenho.'
      );
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEvaluationChange = (event) => {
    const { name, value } = event.target;
    setEvaluationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePeerChange = (event) => {
    const { name, value } = event.target;
    setPeerForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExternalChange = (event) => {
    const { name, value } = event.target;
    setExternalForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const commonPayload = () => ({
    employeeId: Number(selectedEmployeeId),
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
  });

  const submitEvaluation = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post('/performance/evaluations', {
        ...commonPayload(),
        ...evaluationForm,
      });
      toast.success('Avaliacao registrada com sucesso.');
      setEvaluationForm(initialEvaluationForm);
      await fetchPerformance();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel salvar a avaliacao.'
      );
    } finally {
      setSaving(false);
    }
  };

  const submitPeerFeedback = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post('/performance/peer-feedback', {
        ...commonPayload(),
        ...peerForm,
      });
      toast.success('Feedback interno registrado.');
      setPeerForm(initialPeerForm);
      await fetchPerformance();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel registrar feedback interno.'
      );
    } finally {
      setSaving(false);
    }
  };

  const submitExternalFeedback = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post('/performance/external-feedback', {
        ...commonPayload(),
        ...externalForm,
      });
      toast.success('Feedback externo registrado.');
      setExternalForm(initialExternalForm);
      await fetchPerformance();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel registrar feedback externo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePerformancePdf = async (mode = 'view') => {
    if (!selectedEmployeeId) return;

    const actionKey = `${mode}-${selectedEmployeeId}`;

    try {
      setPdfActionKey(actionKey);
      const { downloadPdfFromEndpoint, openPdfFromEndpoint } = await import(
        '../utils/pdfActions'
      );
      const response = await api.post(`/pdf/performance/${selectedEmployeeId}`, {
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd,
      });
      const pdf = response.data?.pdf;

      if (!pdf) {
        throw new Error('PDF nao retornado pelo servidor.');
      }

      if (mode === 'download') {
        await downloadPdfFromEndpoint(
          pdf.downloadUrl,
          `avaliacao-desempenho-${profile?.employee?.name || selectedEmployeeId}.pdf`
        );
        return;
      }

      await openPdfFromEndpoint(pdf.viewUrl);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Nao foi possivel gerar o PDF oficial de desempenho.'
      );
    } finally {
      setPdfActionKey(null);
    }
  };

  const criteria = useMemo(
    () => [
      ['Pontualidade', score?.criteria?.punctuality, 'Chegada, regularidade e atrasos'],
      ['Assiduidade', score?.criteria?.attendance, 'Constancia, faltas e presenca'],
      ['Eficiencia', score?.criteria?.efficiency, 'Entrega e execucao avaliadas pela gestora'],
      ['Comportamento', score?.criteria?.behavior, 'Postura, responsabilidade e disciplina'],
      ['Feedback interno', score?.criteria?.peerFeedback, 'Percepcao dos colegas'],
      ['Feedback externo', score?.criteria?.externalFeedback, 'Leitura de clientes e empresas'],
      ['Treinamentos', score?.criteria?.trainings, 'Capacitacao e aderencia ao plano'],
    ],
    [score]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: 'Media geral',
        value: formatScore(summary?.averageScore || 0),
        helper: 'Leitura executiva do periodo selecionado',
      },
      {
        label: 'Total de avaliacoes',
        value: summary?.totalEvaluations || 0,
        helper: 'Registros gerenciais consolidados no periodo',
      },
      {
        label: 'Excelente',
        value: summary?.excellentCount || 0,
        helper: 'Colaboradores no topo de performance',
      },
      {
        label: 'Bom',
        value: summary?.goodCount || 0,
        helper: 'Base saudavel e estavel de desempenho',
      },
      {
        label: 'Atencao',
        value: summary?.attentionBucketCount || 0,
        helper: 'Colaboradores que pedem acompanhamento',
      },
      {
        label: 'Critico',
        value: summary?.criticalCount || 0,
        helper: 'Casos que precisam de acao imediata',
      },
      {
        label: 'Avaliacoes pendentes',
        value: summary?.pendingEvaluations || 0,
        helper: 'Colaboradores do escopo sem registro formal',
      },
      {
        label: 'Treinamentos pendentes relevantes',
        value: summary?.pendingRelevantTrainings || 0,
        helper: 'Pendencias ligadas a nota abaixo do ideal',
      },
    ],
    [summary]
  );

  if (!canRead) {
    return (
      <div className='rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm'>
        Voce nao possui permissao para acessar o modulo de Desempenho.
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <section className='overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl'>
        <div className='grid gap-8 p-8 xl:grid-cols-[1.1fr_0.9fr]'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200'>
              Gestao de pessoas
            </p>
            <h2 className='mt-4 text-4xl font-black tracking-tight'>
              Dashboard Executivo de Desempenho
            </h2>
            <p className='mt-4 max-w-3xl text-lg leading-8 text-slate-200'>
              Leia desempenho com foco gerencial: media do periodo, distribuicao
              de notas, rankings, evolucao e impacto dos treinamentos, sem tirar
              o backend do papel de fonte unica da verdade.
            </p>
          </div>

          <div className='grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm sm:grid-cols-2'>
            <HeroMetric label='Colaboradores no escopo' value={summary?.employeesInScope || 0} />
            <HeroMetric label='Media geral' value={formatScore(summary?.averageScore || 0)} />
            <HeroMetric label='Em atencao' value={summary?.attentionCount || 0} />
            <HeroMetric
              label='Evoluiram com treinamento'
              value={summary?.improvedAfterTrainingCount || 0}
            />
          </div>
        </div>
      </section>

      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <label className='block xl:col-span-2'>
            <span className='text-sm font-semibold text-slate-800'>
              Colaborador em foco
            </span>
            <select
              name='employeeId'
              value={String(selectedEmployeeId)}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.department}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>Setor</span>
            <select
              name='department'
              value={filters.department}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            >
              <option value=''>Todos os setores</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>
              Classificacao
            </span>
            <select
              name='classification'
              value={filters.classification}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            >
              {classifications.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>
              Treinamentos
            </span>
            <select
              name='trainingStatus'
              value={filters.trainingStatus}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            >
              {trainingStatuses.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>
              Data inicial
            </span>
            <input
              type='date'
              name='periodStart'
              value={filters.periodStart}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            />
          </label>

          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>
              Data final
            </span>
            <input
              type='date'
              name='periodEnd'
              value={filters.periodEnd}
              onChange={handleFilterChange}
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100'
            />
          </label>
        </div>
      </section>

      {loading ? (
        <div className='rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm'>
          Carregando dashboard executivo de desempenho...
        </div>
      ) : !performance ? (
        <div className='rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500'>
          Nao foi possivel consolidar o modulo de desempenho para os filtros atuais.
        </div>
      ) : (
        <>
          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {summaryCards.map((card) => (
              <ExecutiveCard
                key={card.label}
                label={card.label}
                value={card.value}
                helper={card.helper}
              />
            ))}
          </section>

          <section className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
            <Panel title='Distribuicao por classificacao'>
              <div className='space-y-4'>
                {(executive?.distribution || []).map((item) => (
                  <DistributionRow key={item.classification} item={item} />
                ))}
                {!executive?.distribution?.length ? (
                  <EmptyText text='Sem distribuicao disponivel para o periodo.' />
                ) : null}
              </div>
            </Panel>

            <Panel title='Evolucao media no tempo'>
              <TrendBars
                items={executive?.evolution?.overall || []}
                valueKey='averageScore'
                emptyText='Ainda nao ha serie historica suficiente para comparacao.'
              />
            </Panel>
          </section>

          <section className='grid gap-6 xl:grid-cols-3'>
            <RankingPanel
              title='Melhores desempenhos'
              eyebrow='Ranking premium'
              items={executive?.rankings?.topPerformers || []}
              emptyText='Sem destaques no periodo.'
              renderMeta={(item) => `${item.department} - nota ${formatScore(item.finalScore)}`}
              renderBadge={(item) => item.classification}
              badgeTone={(item) => item.classificationTone}
            />

            <RankingPanel
              title='Quem mais evoluiu'
              eyebrow='Comparacao recente'
              items={executive?.rankings?.mostImproved || []}
              emptyText='Ainda nao ha historico suficiente para identificar evolucao.'
              renderMeta={(item) => `${item.department} - ganho de ${formatScore(item.deltaFromPrevious)} pontos`}
              renderBadge={(item) => `+${formatScore(item.deltaFromPrevious)}`}
              badgeTone={() => 'green'}
            />

            <RankingPanel
              title='Maior atencao'
              eyebrow='Risco gerencial'
              items={executive?.rankings?.attentionList || []}
              emptyText='Nenhum colaborador em atencao para os filtros atuais.'
              renderMeta={(item) =>
                `${item.department} - atrasos ${formatMinutes(item.delayMinutes)} - faltas ${formatMinutes(item.absenceMinutes)}`
              }
              renderBadge={(item) => item.classification}
              badgeTone={(item) => item.classificationTone}
            />
          </section>

          <section className='grid gap-6 xl:grid-cols-[1fr_1fr]'>
            <Panel title='Leitura por criterio'>
              <div className='space-y-4'>
                {(executive?.evolution?.criteria || []).map((criterion) => (
                  <CriteriaAverageRow key={criterion.key} criterion={criterion} />
                ))}
              </div>
            </Panel>

            <Panel title='Treinamentos e impacto na evolucao'>
              <div className='grid gap-4 md:grid-cols-2'>
                <InsightCard
                  label='Pendencias relevantes'
                  value={summary?.pendingRelevantTrainings || 0}
                  helper='Colaboradores com nota baixa e treinamento pendente'
                />
                <InsightCard
                  label='Melhoraram apos treinamento'
                  value={summary?.improvedAfterTrainingCount || 0}
                  helper='Casos com ganho de score apos capacitacao'
                />
              </div>

              <div className='mt-5 space-y-3'>
                <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-400'>
                  Categorias de treinamento mais associadas a boa performance
                </p>
                {(executive?.trainingInsights?.topTrainingCategories || []).length ? (
                  executive.trainingInsights.topTrainingCategories.map((item) => (
                    <div
                      key={item.category}
                      className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <div>
                        <p className='font-bold text-slate-900'>{item.category}</p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {item.employees} colaborador(es) com essa capacitacao
                        </p>
                      </div>
                      <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700'>
                        media {formatScore(item.averageScore)}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyText text='Sem relacao forte entre treinamentos e performance no periodo.' />
                )}
              </div>
            </Panel>
          </section>

          <section className='grid gap-6 xl:grid-cols-[1fr_1fr]'>
            <Panel title='Setores com melhor media'>
              <div className='space-y-3'>
                {(executive?.rankings?.departments || []).length ? (
                  executive.rankings.departments.map((department) => (
                    <div
                      key={department.department}
                      className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <div>
                        <p className='font-bold text-slate-900'>{department.department}</p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {department.employees} colaborador(es) considerados
                        </p>
                      </div>
                      <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700'>
                        media {formatScore(department.averageScore)}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyText text='Ainda nao foi possivel consolidar ranking por setor.' />
                )}
              </div>
            </Panel>

            <Panel title='Colaboradores com treinamento pendente e nota baixa'>
              <div className='space-y-3'>
                {(executive?.trainingInsights?.lowScorePendingTraining || []).length ? (
                  executive.trainingInsights.lowScorePendingTraining.map((item) => (
                    <div
                      key={item.employeeId}
                      className='rounded-2xl border border-amber-200 bg-amber-50 p-4'
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='font-bold text-slate-900'>{item.name}</p>
                          <p className='mt-1 text-sm text-slate-600'>
                            {item.department} - {item.pendingTrainings} treinamento(s) pendente(s)
                          </p>
                        </div>
                        <span className='rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-700'>
                          nota {formatScore(item.finalScore)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyText text='Nenhum colaborador combina baixa nota com treinamento pendente no periodo.' />
                )}
              </div>
            </Panel>
          </section>

          {profile ? (
            <>
              <section className='grid gap-5 xl:grid-cols-[0.92fr_1.08fr]'>
                <div className='overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm'>
                  <div className='bg-slate-950 p-7 text-white'>
                    <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200'>
                      Painel individual
                    </p>
                    <h3 className='mt-3 text-3xl font-black'>
                      {profile.employee.name}
                    </h3>
                    <p className='mt-2 text-sm text-slate-300'>
                      {profile.employee.role} - {profile.employee.department}
                    </p>
                  </div>

                  <div className='p-7'>
                    <div className='flex items-end justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold text-slate-500'>
                          Nota final ponderada
                        </p>
                        <p className='mt-2 text-6xl font-black text-slate-950'>
                          {formatScore(score.finalScore)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-4 py-2 text-sm font-black ${
                          classificationConfig[score.classification] ||
                          classificationConfig.ATENCAO
                        }`}
                      >
                        {score.classification}
                      </span>
                    </div>

                    {canExport || canReadPdf ? (
                      <div className='mt-5 flex flex-wrap gap-3'>
                        {canExport ? (
                          <ActionButton
                            label={
                              pdfActionKey === `view-${selectedEmployeeId}`
                                ? 'Gerando PDF...'
                                : 'Gerar PDF'
                            }
                            tone='violet'
                            onClick={() => handlePerformancePdf('view')}
                          />
                        ) : null}
                        {canReadPdf ? (
                          <ActionButton
                            label={
                              pdfActionKey === `download-${selectedEmployeeId}`
                                ? 'Baixando PDF...'
                                : 'Baixar PDF'
                            }
                            tone='slate'
                            onClick={() => handlePerformancePdf('download')}
                          />
                        ) : null}
                      </div>
                    ) : null}

                    <div className='mt-6 grid gap-3 sm:grid-cols-2'>
                      <MiniStat label='Atrasos' value={formatMinutes(score.operationalBase.delayMinutes)} />
                      <MiniStat label='Faltas' value={formatMinutes(score.operationalBase.absenceMinutes)} />
                      <MiniStat label='Extras' value={formatMinutes(score.operationalBase.overtimeMinutes)} />
                      <MiniStat
                        label='Treinamentos'
                        value={`${score.operationalBase.completedTrainings}/${score.operationalBase.trainingCount}`}
                      />
                    </div>
                  </div>
                </div>

                <Panel title='Criterios avaliados'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    {criteria.map(([label, value, description]) => (
                      <CriterionCard
                        key={label}
                        label={label}
                        value={value || 0}
                        description={description}
                      />
                    ))}
                  </div>
                </Panel>
              </section>

              <section className='grid gap-6 xl:grid-cols-[1fr_0.95fr]'>
                <div className='space-y-6'>
                  <Panel title='Evolucao do colaborador no tempo'>
                    <TrendBars
                      items={executive?.evolution?.selectedEmployee || []}
                      valueKey='averageScore'
                      emptyText='Ainda nao ha historico suficiente para este colaborador.'
                    />
                  </Panel>

                  <Panel title='Treinamentos conectados ao desempenho'>
                    <div className='grid gap-3'>
                      {profile.trainings.length ? (
                        profile.trainings.slice(0, 6).map((training) => (
                          <div
                            key={training.id}
                            className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'
                          >
                            <div>
                              <p className='font-bold text-slate-900'>
                                {training.title}
                              </p>
                              <p className='mt-1 text-sm text-slate-500'>
                                {training.category} - {formatDate(training.completedAt)}
                              </p>
                            </div>
                            <div className='flex flex-col items-end gap-2'>
                              <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600'>
                                {training.label || training.status}
                              </span>
                              <span className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                {training.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyText text='Nenhum treinamento vinculado ao colaborador.' />
                      )}
                    </div>
                  </Panel>

                  <Panel title='Linha do tempo de evolucao'>
                    <div className='space-y-3'>
                      {profile.timeline.length ? (
                        profile.timeline.slice(0, 8).map((item) => (
                          <div
                            key={item.id}
                            className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p className='text-xs font-bold uppercase tracking-[0.18em] text-slate-400'>
                                  {item.type}
                                </p>
                                <p className='mt-1 font-bold text-slate-900'>
                                  {item.title}
                                </p>
                                <p className='mt-1 text-sm leading-6 text-slate-600'>
                                  {item.description}
                                </p>
                              </div>
                              <span className='shrink-0 text-xs font-semibold text-slate-400'>
                                {formatDate(item.date)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyText text='Sem eventos no periodo selecionado.' />
                      )}
                    </div>
                  </Panel>
                </div>

                <div className='space-y-6'>
                  <Panel title='Plano de desenvolvimento'>
                    {profile.developmentPlan ? (
                      <div className='grid gap-3'>
                        <InfoBlock
                          label='Pontos fortes'
                          value={profile.developmentPlan.strengths}
                        />
                        <InfoBlock
                          label='Pontos de atencao'
                          value={profile.developmentPlan.attentionPoints}
                        />
                        <InfoBlock
                          label='Plano'
                          value={profile.developmentPlan.developmentPlan}
                        />
                        <InfoBlock
                          label='Recomendacao'
                          value={profile.developmentPlan.recommendation}
                        />
                      </div>
                    ) : (
                      <EmptyText text='Nenhum plano registrado. Use a avaliacao da gestora para criar um plano de evolucao.' />
                    )}
                  </Panel>

                  <Panel title='Feedbacks recentes'>
                    <div className='space-y-3'>
                      {[...profile.peerFeedbacks, ...profile.externalFeedbacks]
                        .slice(0, 6)
                        .map((feedback) => (
                          <div
                            key={`${feedback.companyName || feedback.reviewerName || feedback.category || 'feedback'}-${feedback.id}`}
                            className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                          >
                            <p className='font-bold text-slate-900'>
                              {feedback.companyName ||
                                feedback.reviewerName ||
                                feedback.category}
                            </p>
                            <p className='mt-1 text-sm text-slate-500'>
                              Nota {feedback.score}/5
                            </p>
                            <p className='mt-2 text-sm leading-6 text-slate-600'>
                              {feedback.comment ||
                                feedback.serviceContext ||
                                'Sem comentario.'}
                            </p>
                          </div>
                        ))}
                      {!profile.peerFeedbacks.length &&
                      !profile.externalFeedbacks.length ? (
                        <EmptyText text='Nenhum feedback registrado no periodo.' />
                      ) : null}
                    </div>
                  </Panel>
                </div>
              </section>
            </>
          ) : null}

          <section className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.22em] text-slate-400'>
                  Registro gerencial
                </p>
                <h3 className='mt-2 text-2xl font-black text-slate-950'>
                  Avaliacoes e feedbacks
                </h3>
              </div>
              <div className='flex flex-wrap gap-2'>
                <TabButton
                  active={activeForm === 'evaluation'}
                  onClick={() => setActiveForm('evaluation')}
                >
                  Avaliacao da gestora
                </TabButton>
                <TabButton
                  active={activeForm === 'peer'}
                  onClick={() => setActiveForm('peer')}
                >
                  Feedback interno
                </TabButton>
                <TabButton
                  active={activeForm === 'external'}
                  onClick={() => setActiveForm('external')}
                >
                  Feedback externo
                </TabButton>
              </div>
            </div>

            <div className='mt-6'>
              {activeForm === 'evaluation' ? (
                <EvaluationForm
                  disabled={!canEvaluate || saving}
                  form={evaluationForm}
                  onChange={handleEvaluationChange}
                  onSubmit={submitEvaluation}
                />
              ) : null}

              {activeForm === 'peer' ? (
                <PeerForm
                  disabled={!canFeedback || saving}
                  form={peerForm}
                  employees={employees.filter(
                    (employee) => String(employee.id) !== String(selectedEmployeeId)
                  )}
                  onChange={handlePeerChange}
                  onSubmit={submitPeerFeedback}
                />
              ) : null}

              {activeForm === 'external' ? (
                <ExternalForm
                  disabled={!canExternalFeedback || saving}
                  form={externalForm}
                  onChange={handleExternalChange}
                  onSubmit={submitExternalFeedback}
                />
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/10 p-4'>
      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100'>
        {label}
      </p>
      <p className='mt-2 text-3xl font-black text-white'>{value}</p>
    </div>
  );
}

function ExecutiveCard({ label, value, helper }) {
  return (
    <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
      <p className='text-xs font-bold uppercase tracking-[0.18em] text-slate-400'>
        {label}
      </p>
      <p className='mt-3 text-4xl font-black text-slate-950'>{value}</p>
      <p className='mt-3 text-sm leading-6 text-slate-500'>{helper}</p>
    </div>
  );
}

function ActionButton({ label, tone = 'blue', onClick }) {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function DistributionRow({ item }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <span className='font-bold text-slate-900'>{item.classification}</span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            rankingTone[item.tone] || rankingTone.slate
          }`}
        >
          {item.count} colaborador(es)
        </span>
      </div>
      <div className='mt-3 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-slate-900'
          style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%` }}
        />
      </div>
      <p className='mt-2 text-sm text-slate-500'>{item.percentage}% do escopo atual</p>
    </div>
  );
}

function TrendBars({ items, valueKey, emptyText }) {
  if (!items.length) {
    return <EmptyText text={emptyText} />;
  }

  return (
    <div className='space-y-4'>
      {items.map((item) => (
        <div key={item.monthKey || item.label} className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
          <div className='flex items-center justify-between gap-3'>
            <span className='font-bold text-slate-900'>{item.label}</span>
            <span className='text-sm font-semibold text-slate-500'>
              {formatScore(item[valueKey])}
            </span>
          </div>
          <div className='mt-3 h-2 rounded-full bg-slate-200'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500'
              style={{ width: `${Math.min(Math.max(item[valueKey], 0), 100)}%` }}
            />
          </div>
          {item.evaluations ? (
            <p className='mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>
              {item.evaluations} avaliacao(oes)
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RankingPanel({
  title,
  eyebrow,
  items,
  emptyText,
  renderMeta,
  renderBadge,
  badgeTone,
}) {
  return (
    <Panel title={title}>
      <p className='mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400'>
        {eyebrow}
      </p>
      <div className='space-y-3'>
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${title}-${item.employeeId || item.department || index}`}
              className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'
            >
              <div className='min-w-0'>
                <p className='font-bold text-slate-900'>
                  {index + 1}. {item.name || item.department}
                </p>
                <p className='mt-1 text-sm leading-6 text-slate-500'>
                  {renderMeta(item)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                  rankingTone[badgeTone(item)] || rankingTone.slate
                }`}
              >
                {renderBadge(item)}
              </span>
            </div>
          ))
        ) : (
          <EmptyText text={emptyText} />
        )}
      </div>
    </Panel>
  );
}

function CriteriaAverageRow({ criterion }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <span className='font-bold text-slate-900'>{criterion.label}</span>
        <span className='text-sm font-semibold text-slate-500'>
          {formatScore(criterion.averageScore)}
        </span>
      </div>
      <div className='mt-3 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600'
          style={{
            width: `${Math.min(Math.max(criterion.averageScore, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function InsightCard({ label, value, helper }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-slate-400'>
        {label}
      </p>
      <p className='mt-2 text-3xl font-black text-slate-950'>{value}</p>
      <p className='mt-2 text-sm leading-6 text-slate-500'>{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>
        {label}
      </p>
      <p className='mt-2 text-lg font-black text-slate-950'>{value}</p>
    </div>
  );
}

function CriterionCard({ label, value, description }) {
  return (
    <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='font-black text-slate-950'>{label}</p>
          <p className='mt-1 text-sm leading-6 text-slate-500'>{description}</p>
        </div>
        <span className='text-2xl font-black text-slate-950'>
          {formatScore(value)}
        </span>
      </div>
      <div className='mt-4 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600'
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm'>
      <p className='text-xs font-bold uppercase tracking-[0.22em] text-slate-400'>
        {title}
      </p>
      <div className='mt-5'>{children}</div>
    </section>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-slate-400'>
        {label}
      </p>
      <p className='mt-2 text-sm leading-6 text-slate-700'>
        {value || 'Ainda nao informado.'}
      </p>
    </div>
  );
}

function EmptyText({ text }) {
  return (
    <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500'>
      {text}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
        active
          ? 'bg-slate-950 text-white'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function ScoreInput({ label, name, value, onChange, disabled }) {
  return (
    <label className='block'>
      <span className='text-sm font-semibold text-slate-700'>{label}</span>
      <input
        type='number'
        min='0'
        max='100'
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
      />
    </label>
  );
}

function EvaluationForm({ form, onChange, onSubmit, disabled }) {
  return (
    <form onSubmit={onSubmit} className='grid gap-4 lg:grid-cols-3'>
      <ScoreInput
        label='Eficiencia'
        name='efficiencyScore'
        value={form.efficiencyScore}
        onChange={onChange}
        disabled={disabled}
      />
      <ScoreInput
        label='Postura / comportamento'
        name='behaviorScore'
        value={form.behaviorScore}
        onChange={onChange}
        disabled={disabled}
      />
      <ScoreInput
        label='Nota gerencial'
        name='managerScore'
        value={form.managerScore}
        onChange={onChange}
        disabled={disabled}
      />
      <TextArea
        label='Observacoes'
        name='notes'
        value={form.notes}
        onChange={onChange}
        disabled={disabled}
      />
      <TextArea
        label='Pontos fortes'
        name='strengths'
        value={form.strengths}
        onChange={onChange}
        disabled={disabled}
      />
      <TextArea
        label='Pontos de atencao'
        name='attentionPoints'
        value={form.attentionPoints}
        onChange={onChange}
        disabled={disabled}
      />
      <TextArea
        label='Plano de desenvolvimento'
        name='developmentPlan'
        value={form.developmentPlan}
        onChange={onChange}
        disabled={disabled}
        wide
      />
      <TextArea
        label='Recomendacao'
        name='recommendation'
        value={form.recommendation}
        onChange={onChange}
        disabled={disabled}
      />
      <SubmitButton disabled={disabled}>Registrar avaliacao</SubmitButton>
    </form>
  );
}

function PeerForm({ form, employees, onChange, onSubmit, disabled }) {
  return (
    <form onSubmit={onSubmit} className='grid gap-4 lg:grid-cols-3'>
      <label className='block'>
        <span className='text-sm font-semibold text-slate-700'>
          Avaliador interno
        </span>
        <select
          name='reviewerEmployeeId'
          value={form.reviewerEmployeeId}
          onChange={onChange}
          disabled={disabled}
          className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
        >
          <option value=''>Nao informado</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>
      <RatingInput
        name='score'
        value={form.score}
        onChange={onChange}
        disabled={disabled}
      />
      <label className='block'>
        <span className='text-sm font-semibold text-slate-700'>Categoria</span>
        <input
          name='category'
          value={form.category}
          onChange={onChange}
          disabled={disabled}
          className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
        />
      </label>
      <TextArea
        label='Comentario'
        name='comment'
        value={form.comment}
        onChange={onChange}
        disabled={disabled}
        wide
      />
      <SubmitButton disabled={disabled}>Registrar feedback interno</SubmitButton>
    </form>
  );
}

function ExternalForm({ form, onChange, onSubmit, disabled }) {
  return (
    <form onSubmit={onSubmit} className='grid gap-4 lg:grid-cols-3'>
      <label className='block'>
        <span className='text-sm font-semibold text-slate-700'>
          Empresa / cliente
        </span>
        <input
          name='companyName'
          value={form.companyName}
          onChange={onChange}
          disabled={disabled}
          className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
        />
      </label>
      <RatingInput
        name='score'
        value={form.score}
        onChange={onChange}
        disabled={disabled}
      />
      <label className='block'>
        <span className='text-sm font-semibold text-slate-700'>Data</span>
        <input
          type='date'
          name='feedbackDate'
          value={form.feedbackDate}
          onChange={onChange}
          disabled={disabled}
          className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
        />
      </label>
      <TextArea
        label='Contexto do servico'
        name='serviceContext'
        value={form.serviceContext}
        onChange={onChange}
        disabled={disabled}
      />
      <TextArea
        label='Comentario'
        name='comment'
        value={form.comment}
        onChange={onChange}
        disabled={disabled}
        wide
      />
      <SubmitButton disabled={disabled}>Registrar feedback externo</SubmitButton>
    </form>
  );
}

function RatingInput({ name, value, onChange, disabled }) {
  return (
    <label className='block'>
      <span className='text-sm font-semibold text-slate-700'>Nota 1 a 5</span>
      <input
        type='number'
        min='1'
        max='5'
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
      />
    </label>
  );
}

function TextArea({ label, name, value, onChange, disabled, wide }) {
  return (
    <label className={`block ${wide ? 'lg:col-span-2' : ''}`}>
      <span className='text-sm font-semibold text-slate-700'>{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows='4'
        className='mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60'
      />
    </label>
  );
}

function SubmitButton({ disabled, children }) {
  return (
    <div className='flex items-end'>
      <button
        type='submit'
        disabled={disabled}
        className='w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {children}
      </button>
    </div>
  );
}

export default Performance;
