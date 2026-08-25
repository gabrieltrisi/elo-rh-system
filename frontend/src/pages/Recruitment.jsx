import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getFileViewUrl } from '../utils/fileUrl';

const stages = [
  {
    value: 'TRIAGEM',
    label: 'Triagem',
    card: 'border-slate-200 bg-slate-50',
    badge: 'border-slate-300 bg-white text-slate-700',
  },
  {
    value: 'ENTREVISTA',
    label: 'Entrevista',
    card: 'border-blue-200 bg-blue-50',
    badge: 'border-blue-200 bg-white text-blue-700',
  },
  {
    value: 'AVALIACAO',
    label: 'Avaliação',
    card: 'border-amber-200 bg-amber-50',
    badge: 'border-amber-200 bg-white text-amber-700',
  },
  {
    value: 'APROVACAO',
    label: 'Aprovação',
    card: 'border-emerald-200 bg-emerald-50',
    badge: 'border-emerald-200 bg-white text-emerald-700',
  },
  {
    value: 'BANCO_TALENTOS',
    label: 'Banco de talentos',
    card: 'border-violet-200 bg-violet-50',
    badge: 'border-violet-200 bg-white text-violet-700',
  },
];

const initialForm = {
  companyId: '',
  fullName: '',
  email: '',
  phone: '',
  vacancyTitle: '',
  stage: 'TRIAGEM',
  source: '',
  score: '',
  summary: '',
  notes: '',
  resume: null,
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const Recruitment = () => {
  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [loadingSupport, setLoadingSupport] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchCompanies();
    fetchCandidates();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoadingSupport(true);
      const response = await api.get('/companies');
      setCompanies(response.data?.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas para recrutamento:', error);
      setCompanies([]);
    } finally {
      setLoadingSupport(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recruitment/candidates');
      setCandidates(response.data?.candidates || []);
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const resetDrawer = () => {
    setEditingCandidate(null);
    setFormData(initialForm);
    setIsDrawerOpen(false);
  };

  const openCreateDrawer = () => {
    setEditingCandidate(null);
    setFormData({
      ...initialForm,
      companyId: String(companies[0]?.id || ''),
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      companyId: String(candidate.company?.id || ''),
      fullName: candidate.fullName || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      vacancyTitle: candidate.vacancyTitle || '',
      stage: candidate.stage || 'TRIAGEM',
      source: candidate.source || '',
      score:
        candidate.score !== null && candidate.score !== undefined
          ? String(candidate.score)
          : '',
      summary: candidate.summary || '',
      notes: candidate.notes || '',
      resume: null,
    });
    setIsDrawerOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] || null;

    setFormData((prev) => ({
      ...prev,
      resume: file,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.companyId || !formData.fullName || !formData.vacancyTitle) {
      alert('Selecione a empresa e preencha nome e vaga do candidato.');
      return;
    }

    try {
      setSaving(true);

      const payload = new FormData();
      payload.append('companyId', formData.companyId);
      payload.append('fullName', formData.fullName);
      payload.append('email', formData.email || '');
      payload.append('phone', formData.phone || '');
      payload.append('vacancyTitle', formData.vacancyTitle);
      payload.append('stage', formData.stage);
      payload.append('source', formData.source || '');
      payload.append('score', formData.score || '');
      payload.append('summary', formData.summary || '');
      payload.append('notes', formData.notes || '');

      if (formData.resume) {
        payload.append('resume', formData.resume);
      }

      if (editingCandidate?.id) {
        await api.put(`/recruitment/candidates/${editingCandidate.id}`, payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/recruitment/candidates', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      await fetchCandidates();
      resetDrawer();
    } catch (error) {
      console.error('Erro ao salvar candidato:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível salvar o candidato.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (candidate) => {
    const confirmDelete = window.confirm(
      `Deseja remover ${candidate.fullName} do pipeline?`
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/recruitment/candidates/${candidate.id}`, {
        params: {
          companyId: candidate.company?.id,
        },
      });
      await fetchCandidates();
    } catch (error) {
      console.error('Erro ao remover candidato:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível remover o candidato.'
      );
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = `
        ${candidate.fullName || ''}
        ${candidate.email || ''}
        ${candidate.phone || ''}
        ${candidate.vacancyTitle || ''}
        ${candidate.source || ''}
        ${candidate.notes || ''}
        ${candidate.summary || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCompany =
        companyFilter === 'Todos' ||
        String(candidate.company?.id || '') === String(companyFilter);

      return matchesSearch && matchesCompany;
    });
  }, [candidates, search, companyFilter]);

  const pipelineColumns = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      items: filteredCandidates.filter((candidate) => candidate.stage === stage.value),
    }));
  }, [filteredCandidates]);

  const stats = useMemo(() => {
    return {
      total: candidates.length,
      interviews: candidates.filter((item) => item.stage === 'ENTREVISTA').length,
      approved: candidates.filter((item) => item.stage === 'APROVACAO').length,
      talentBank: candidates.filter((item) => item.stage === 'BANCO_TALENTOS').length,
      scored: candidates.filter(
        (item) => item.score !== null && item.score !== undefined
      ).length,
    };
  }, [candidates]);

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
                Pipeline preparado para inteligência futura
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Recrutamento e Seleção
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Organize triagem, entrevistas, avaliações e aprovações com base
                profissional já pronta para score, matching e transição futura
                para pré-admissão.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                onClick={openCreateDrawer}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Novo candidato
              </button>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <SummaryCard title='Total' value={stats.total} tone='slate' />
          <SummaryCard title='Entrevistas' value={stats.interviews} tone='blue' />
          <SummaryCard title='Aprovados' value={stats.approved} tone='green' />
          <SummaryCard
            title='Banco de talentos'
            value={stats.talentBank}
            tone='violet'
          />
          <SummaryCard
            title='Com score'
            value={stats.scored}
            tone='amber'
          />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Buscar por candidato, vaga, origem ou contato'
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Empresa
              </label>
              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='Todos'>Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
            Carregando pipeline...
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
            {pipelineColumns.map((column) => (
              <div
                key={column.value}
                className={`rounded-3xl border p-4 shadow-sm ${column.card}`}
              >
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-bold text-slate-800'>
                      {column.label}
                    </h3>
                    <p className='mt-1 text-sm text-slate-500'>
                      {column.items.length} candidato
                      {column.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${column.badge}`}
                  >
                    {column.items.length}
                  </span>
                </div>

                <div className='space-y-3'>
                  {column.items.length === 0 ? (
                    <div className='rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-sm text-slate-500'>
                      Nenhum candidato nesta etapa.
                    </div>
                  ) : (
                    column.items.map((candidate) => (
                      <div
                        key={candidate.id}
                        className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='text-base font-bold text-slate-800'>
                              {candidate.fullName}
                            </p>
                            <p className='mt-1 text-sm text-slate-500'>
                              {candidate.vacancyTitle}
                            </p>
                          </div>

                          {candidate.score !== null && candidate.score !== undefined ? (
                            <span className='rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700'>
                              Score {candidate.score}
                            </span>
                          ) : null}
                        </div>

                        <div className='mt-3 flex flex-wrap gap-2'>
                          <span className='rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                            {candidate.company?.name || 'Sem empresa'}
                          </span>
                          {candidate.source ? (
                            <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700'>
                              {candidate.source}
                            </span>
                          ) : null}
                        </div>

                        <div className='mt-3 space-y-1 text-sm text-slate-600'>
                          <p>{candidate.email || 'E-mail não informado'}</p>
                          <p>{candidate.phone || 'Telefone não informado'}</p>
                        </div>

                        {candidate.summary ? (
                          <div className='mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600'>
                            {candidate.summary}
                          </div>
                        ) : null}

                        <div className='mt-4 flex flex-wrap gap-2'>
                          {candidate.resumeFileUrl ? (
                            <button
                              type='button'
                              onClick={() =>
                                window.open(
                                  getFileViewUrl(
                                    'recruitment',
                                    candidate.resumeFileUrl || candidate.resumeFileName
                                  ),
                                  '_blank'
                                )
                              }
                              className='rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100'
                            >
                              Currículo
                            </button>
                          ) : null}

                          <button
                            type='button'
                            onClick={() => openEditDrawer(candidate)}
                            className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                          >
                            Editar
                          </button>

                          <button
                            type='button'
                            onClick={() => handleDelete(candidate)}
                            className='rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100'
                          >
                            Excluir
                          </button>
                        </div>

                        <p className='mt-3 text-xs text-slate-500'>
                          Atualizado em {formatDate(candidate.updatedAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={resetDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={resetDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700'>
                      Pipeline inteligente
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingCandidate ? 'Editar candidato' : 'Novo candidato'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Estruture o pipeline já preparado para score, matching e
                      futura conversão para pré-admissão.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={resetDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados principais
                      </h3>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Empresa
                        </label>
                        <select
                          name='companyId'
                          value={formData.companyId}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          disabled={loadingSupport}
                        >
                          <option value=''>
                            {loadingSupport ? 'Carregando empresas...' : 'Selecione'}
                          </option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Etapa
                        </label>
                        <select
                          name='stage'
                          value={formData.stage}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {stages.map((stage) => (
                            <option key={stage.value} value={stage.value}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Nome do candidato
                        </label>
                        <input
                          type='text'
                          name='fullName'
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder='Digite o nome completo'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          E-mail
                        </label>
                        <input
                          type='email'
                          name='email'
                          value={formData.email}
                          onChange={handleChange}
                          placeholder='email@exemplo.com'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Telefone
                        </label>
                        <input
                          type='text'
                          name='phone'
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder='(00) 00000-0000'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Vaga
                        </label>
                        <input
                          type='text'
                          name='vacancyTitle'
                          value={formData.vacancyTitle}
                          onChange={handleChange}
                          placeholder='Ex: Técnico de campo'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Origem
                        </label>
                        <input
                          type='text'
                          name='source'
                          value={formData.source}
                          onChange={handleChange}
                          placeholder='Ex: Indicação, LinkedIn, banco interno'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Score inicial
                        </label>
                        <input
                          type='number'
                          min='0'
                          max='100'
                          step='1'
                          name='score'
                          value={formData.score}
                          onChange={handleChange}
                          placeholder='Ex: 82'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Resumo / aderência
                        </label>
                        <textarea
                          name='summary'
                          value={formData.summary}
                          onChange={handleChange}
                          rows='3'
                          placeholder='Resumo do perfil, experiência e potencial de aderência.'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observações estratégicas
                        </label>
                        <textarea
                          name='notes'
                          value={formData.notes}
                          onChange={handleChange}
                          rows='3'
                          placeholder='Feedback de triagem, pontos fortes, riscos e próximos passos.'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Currículo / anexo
                        </label>
                        <input
                          type='file'
                          onChange={handleResumeChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium'
                        />
                        {formData.resume ? (
                          <p className='mt-2 text-xs text-slate-500'>
                            Arquivo selecionado: {formData.resume.name}
                          </p>
                        ) : editingCandidate?.resumeFileName ? (
                          <p className='mt-2 text-xs text-slate-500'>
                            Currículo atual: {editingCandidate.resumeFileName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={resetDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={saving}
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {saving
                      ? editingCandidate
                        ? 'Salvando...'
                        : 'Cadastrando...'
                      : editingCandidate
                        ? 'Salvar alterações'
                        : 'Cadastrar candidato'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const SummaryCard = ({ title, value, tone }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
    </div>
  );
};

export default Recruitment;
