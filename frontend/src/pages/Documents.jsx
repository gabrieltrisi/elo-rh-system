import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';
import { getFileViewUrl } from '../utils/fileUrl';

const initialForm = {
  employeeId: '',
  title: '',
  category: 'Contrato',
  description: '',
  file: null,
};

const Documents = () => {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState('list');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDocuments();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || res.data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const res = await api.get('/documents');
      setDocuments(res.data?.documents || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const openDrawer = () => {
    setFormData(initialForm);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setFormData(initialForm);
    setIsDrawerOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setFormData((prev) => ({
      ...prev,
      file,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !formData.employeeId ||
      !formData.title ||
      !formData.category ||
      !formData.file
    ) {
      alert('Preencha os campos obrigatórios e selecione um arquivo.');
      return;
    }

    try {
      setSaving(true);

      const payload = new FormData();
      payload.append('employeeId', formData.employeeId);
      payload.append('title', formData.title);
      payload.append('category', formData.category);
      payload.append('description', formData.description || '');
      payload.append('file', formData.file);

      await api.post('/documents', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchDocuments();
      closeDrawer();
    } catch (error) {
      console.error('Erro ao cadastrar documento:', error);
      alert(error?.response?.data?.message || 'Erro ao cadastrar documento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Deseja excluir este documento?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/documents/${id}`);
      await fetchDocuments();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      alert(error?.response?.data?.message || 'Erro ao excluir documento.');
    }
  };

  const handleOpenFile = (fileUrl, corporateUrl = '') => {
    const url = corporateUrl || getFileViewUrl('documentation', fileUrl);
    if (!url) return;
    window.open(url, '_blank');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('pt-BR');
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((item) => {
      const employeeName = item.employee?.name || item.employee?.fullName || '';

      const matchesSearch = `
        ${employeeName}
        ${item.title || ''}
        ${item.category || ''}
        ${item.description || ''}
        ${item.fileName || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'Todos' ||
        (item.category || '').toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [documents, search, categoryFilter]);

  const groupedDocuments = useMemo(() => {
    const grouped = filteredDocuments.reduce((acc, item) => {
      const employeeId =
        item.employee?.id || item.employeeId || `sem-colaborador-${item.id}`;
      const employeeName =
        item.employee?.name || item.employee?.fullName || 'Sem colaborador';

      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          employeeName,
          items: [],
        };
      }

      acc[employeeId].items.push(item);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName, 'pt-BR')
    );
  }, [filteredDocuments]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      folders: new Set(
        documents.map(
          (item) =>
            item.employee?.id || item.employeeId || `sem-colaborador-${item.id}`
        )
      ).size,
      contracts: documents.filter((d) => d.category === 'Contrato').length,
      policies: documents.filter((d) => d.category === 'Política interna')
        .length,
      manuals: documents.filter((d) => d.category === 'Manual').length,
    };
  }, [documents]);

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const renderFolderContent = (group) => {
    const isExpanded = Boolean(expandedFolders[group.employeeId]);

    return (
      <div key={group.employeeId} className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <button
          type='button'
          onClick={() => toggleFolder(group.employeeId)}
          className='flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50'
        >
          <div>
            <h3 className='text-xl font-semibold text-slate-800'>
              {group.employeeName}
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              {group.items.length} documento
              {group.items.length > 1 ? 's' : ''} nesta pasta
            </p>
          </div>

          <span className='inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
            {isExpanded ? 'Fechar pasta' : 'Abrir pasta'}
          </span>
        </button>

        {isExpanded ? (
          <div className='border-t border-slate-200'>
            <div className='overflow-x-auto'>
              <table className='min-w-full'>
                <thead className='bg-slate-50'>
                  <tr className='text-left'>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Documento
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Categoria
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Data
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Arquivo
                    </th>
                    <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className='divide-y divide-slate-100'>
                  {group.items.map((item) => (
                    <tr key={item.id} className='hover:bg-slate-50/70'>
                      <td className='px-6 py-5'>
                        <p className='font-semibold text-slate-800'>
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className='mt-1 text-sm text-slate-500'>
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600'>
                        {item.category}
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600'>
                        {formatDate(item.createdAt)}
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600 break-all'>
                        {item.fileName || '-'}
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex flex-wrap items-center justify-center gap-2'>
                          {item.fileUrl ? (
                            <button
                              type='button'
                              onClick={() =>
                                handleOpenFile(item.fileUrl, item.corporateUrl)
                              }
                              className='rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100'
                            >
                              Ver
                            </button>
                          ) : null}

                          <button
                            type='button'
                            onClick={() => handleDelete(item.id)}
                            className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100'
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderOverview = () => {
    if (loadingDocuments) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando documentos...
        </div>
      );
    }

    if (groupedDocuments.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhuma pasta encontrada.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {groupedDocuments.map((group) => {
          const isExpanded = Boolean(expandedFolders[group.employeeId]);

          return (
            <div
              key={group.employeeId}
              className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
            >
              <div className='flex flex-col gap-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h3 className='text-xl font-bold text-slate-800'>
                      {group.employeeName}
                    </h3>
                    <p className='mt-1 text-sm text-slate-500'>
                      {group.items.length} documento
                      {group.items.length > 1 ? 's' : ''} vinculado
                      {group.items.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  <button
                    type='button'
                    onClick={() => toggleFolder(group.employeeId)}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    {isExpanded ? 'Fechar pasta' : 'Abrir pasta'}
                  </button>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Quantidade</p>
                    <p className='mt-1 font-semibold text-slate-800'>
                      {group.items.length} arquivo
                      {group.items.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Último envio</p>
                    <p className='mt-1 font-semibold text-slate-800'>
                      {formatDate(group.items[0]?.createdAt)}
                    </p>
                  </div>
                </div>

                {isExpanded ? (
                  <div className='space-y-3 border-t border-slate-200 pt-4'>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className='rounded-xl border border-slate-200 bg-slate-50 p-4'
                      >
                        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                          <div className='space-y-1'>
                            <p className='text-base font-semibold text-slate-800'>
                              {item.title}
                            </p>
                            <p className='text-sm text-slate-500'>
                              {item.category}
                            </p>
                            <p className='text-sm text-slate-500'>
                              Enviado em {formatDate(item.createdAt)}
                            </p>
                            <p className='break-all text-sm text-slate-600'>
                              {item.fileName || '-'}
                            </p>
                            {item.description ? (
                              <p className='text-sm text-slate-600'>
                                {item.description}
                              </p>
                            ) : null}
                          </div>

                          <div className='flex flex-wrap gap-2'>
                            {item.fileUrl ? (
                              <button
                                type='button'
                                onClick={() =>
                                  handleOpenFile(item.fileUrl, item.corporateUrl)
                                }
                                className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
                              >
                                Ver arquivo
                              </button>
                            ) : null}

                            <button
                              type='button'
                              onClick={() => handleDelete(item.id)}
                              className='rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100'
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                    Clique em <strong>Abrir pasta</strong> para visualizar os
                    documentos deste colaborador.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = () => {
    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Pastas de documentos
          </h3>
        </div>

        {loadingDocuments ? (
          <div className='px-6 py-10 text-slate-500'>
            Carregando documentos...
          </div>
        ) : groupedDocuments.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma pasta encontrada.
          </div>
        ) : (
          <div className='space-y-4 px-6 py-6'>
            {groupedDocuments.map((group) => renderFolderContent(group))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>
              Documentação / Arquivos
            </h1>
            <p className='mt-1 text-slate-500'>
              Organize os documentos em pastas por colaborador para manter a
              visualização limpa e objetiva.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo documento
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de arquivos</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.total}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Pastas</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.folders}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Contratos</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.contracts}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Políticas / Manuais</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.policies + stats.manuals}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                placeholder='Buscar por colaborador, documento ou arquivo'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='Todos'>Todos</option>
                <option value='Contrato'>Contrato</option>
                <option value='Política interna'>Política interna</option>
                <option value='Manual'>Manual</option>
                <option value='Termo'>Termo</option>
              </select>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Visão geral
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('list')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'list' && renderList()}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      Cadastro de documento
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Novo documento
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre um novo arquivo vinculado ao colaborador.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreate}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Colaborador
                      </h3>
                    </div>

                    <select
                      name='employeeId'
                      value={formData.employeeId}
                      onChange={handleChange}
                      className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      disabled={loadingEmployees}
                    >
                      <option value=''>
                        {loadingEmployees
                          ? 'Carregando colaboradores...'
                          : 'Selecione o colaborador'}
                      </option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName || employee.name} —{' '}
                          {employee.department || 'Sem departamento'}
                        </option>
                      ))}
                    </select>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Título
                        </label>
                        <input
                          name='title'
                          value={formData.title}
                          onChange={handleChange}
                          placeholder='Ex: Carteira Nacional de Trânsito'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Categoria
                        </label>
                        <select
                          name='category'
                          value={formData.category}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value='Contrato'>Contrato</option>
                          <option value='Política interna'>
                            Política interna
                          </option>
                          <option value='Manual'>Manual</option>
                          <option value='Termo'>Termo</option>
                        </select>
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Arquivo
                        </label>
                        <input
                          type='file'
                          onChange={handleFileChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium'
                        />
                        {formData.file ? (
                          <p className='mt-2 text-xs text-slate-500'>
                            Arquivo selecionado: {formData.file.name}
                          </p>
                        ) : null}
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Descrição
                        </label>
                        <textarea
                          name='description'
                          value={formData.description}
                          onChange={handleChange}
                          rows='4'
                          placeholder='Observações sobre o documento'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
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
                    onClick={closeDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={saving}
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {saving ? 'Salvando...' : 'Cadastrar documento'}
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

export default Documents;
