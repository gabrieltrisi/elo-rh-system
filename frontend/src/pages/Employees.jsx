import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const shirtSizeOptions = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const pantsSizeOptions = ['36', '38', '40', '42', '44', '46', '48'];
const bootSizeOptions = [
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
];

const contractTypeOptions = [
  'CLT',
  'TERCEIRIZADO',
  'ESTAGIO',
  'JOVEM_APRENDIZ',
  'PJ',
  'TEMPORARIO',
  'INTERMITENTE',
  'AUTONOMO',
];

const createEmptyCompanyLink = (companyId = '') => ({
  companyId: companyId ? String(companyId) : '',
  registrationNumber: '',
  role: '',
  department: '',
  admissionDate: '',
  status: 'ativo',
  contractType: 'CLT',
  salaryBase: '',
  notes: '',
});

const createInitialForm = () => ({
  fullName: '',
  cpf: '',
  birthDate: '',
  maritalStatus: '',
  email: '',
  phone: '',
  shirtSize: '',
  pantsSize: '',
  bootSize: '',
  notes: '',
  companyLinks: [],
});

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [companyFilter, setCompanyFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('name-asc');
  const [activeTab, setActiveTab] = useState('list');
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [uniformHistory, setUniformHistory] = useState([]);
  const [certificatesHistory, setCertificatesHistory] = useState([]);
  const [warningsHistory, setWarningsHistory] = useState([]);
  const [workSchedulesHistory, setWorkSchedulesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [historyTab, setHistoryTab] = useState('summary');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [companyFilter]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await api.get('/companies');
      setCompanies(response.data?.companies || []);
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        scope: 'all',
      };

      if (companyFilter === 'Multivínculo') {
        params.companyScope = 'multivinculo';
      } else if (companyFilter !== 'Todos') {
        params.companyId = companyFilter;
      }

      const response = await api.get('/employees', { params });

      setEmployees(response.data?.employees || response.data || []);
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
      setError(
        err.response?.data?.message ||
          'Não foi possível carregar os colaboradores.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeHistory = async (employeeId) => {
    try {
      setHistoryLoading(true);

      const response = await api.get(`/employees/${employeeId}/history`, {
        params: { scope: 'all' },
      });
      const employeeHistory = response.data?.employee;

      setUniformHistory(
        (employeeHistory?.uniformDeliveries || []).map((item) => ({
          id: item.id,
          employeeId: item.employeeId,
          employeeName: employeeHistory?.name || employeeHistory?.fullName || '',
          sector: item.uniformStock?.sector || '',
          itemLabel: [
            item.uniformStock?.itemName || 'Item',
            item.uniformStock?.color || '',
            item.uniformStock?.size || '',
          ]
            .filter(Boolean)
            .join(' '),
          quantity: Number(item.quantity || 0),
          date: item.deliveryDate || item.createdAt || '',
          notes: item.notes || '',
        }))
      );

      setCertificatesHistory(employeeHistory?.certificates || []);
      setWarningsHistory(employeeHistory?.warnings || []);
      setWorkSchedulesHistory(employeeHistory?.workSchedules || []);
    } catch (error) {
      console.error('Erro ao buscar histórico do colaborador:', error);
      setUniformHistory([]);
      setCertificatesHistory([]);
      setWarningsHistory([]);
      setWorkSchedulesHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getEmployeeName = (employee) =>
    employee?.fullName || employee?.name || '-';

  const getEmployeeCompanies = (employee) =>
    Array.isArray(employee?.companies) ? employee.companies : [];

  const getPrimaryCompany = (employee) =>
    getEmployeeCompanies(employee).find((company) => company.isPrimary) ||
    getEmployeeCompanies(employee)[0] ||
    null;

  const getEmployeeRole = (employee) =>
    getPrimaryCompany(employee)?.role || employee?.position || employee?.role || '-';

  const getEmployeeDepartment = (employee) =>
    getPrimaryCompany(employee)?.department || employee?.department || '-';

  const getEmployeeAdmissionDate = (employee) =>
    getPrimaryCompany(employee)?.admissionDate || employee?.admissionDate || '';

  const getEmployeeStatus = (employee) =>
    getPrimaryCompany(employee)?.status || employee?.status || 'ativo';

  const getEmployeeRegistrationNumber = (employee) =>
    getPrimaryCompany(employee)?.registrationNumber || employee?.registrationNumber || '-';

  const getEmployeeContractType = (employee) =>
    getPrimaryCompany(employee)?.contractType || employee?.contractType || '-';

  const getEmployeeShirtSize = (employee) =>
    employee?.shirtSize || employee?.uniformSize || '-';

  const getEmployeePantsSize = (employee) =>
    employee?.pantsSize || employee?.uniformPantsSize || '-';

  const getEmployeeBootSize = (employee) =>
    employee?.bootSize || employee?.uniformBootSize || '-';

  const departments = useMemo(() => {
    return [
      'Todos',
      ...new Set(
        employees
          .flatMap((employee) =>
            getEmployeeCompanies(employee).map((company) => company.department || '')
          )
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => {
      if (a === 'Todos') return -1;
      if (b === 'Todos') return 1;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [employees]);

  const companyFilterOptions = useMemo(() => {
    return [
      { value: 'Todos', label: 'Todos' },
      ...companies.map((company) => ({
        value: String(company.id),
        label: company.name,
      })),
      { value: 'Multivínculo', label: 'Ambos / multivínculo' },
    ];
  }, [companies]);

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((employee) => {
      const companyNames = getEmployeeCompanies(employee)
        .map((company) => company.companyName)
        .join(' ');

      const textMatch = `
        ${employee.fullName || ''}
        ${employee.name || ''}
        ${employee.cpf || ''}
        ${employee.birthDate || ''}
        ${employee.maritalStatus || ''}
        ${employee.email || ''}
        ${employee.phone || ''}
        ${getEmployeeRole(employee)}
        ${getEmployeeDepartment(employee)}
        ${getEmployeeStatus(employee)}
        ${companyNames}
        ${getEmployeeRegistrationNumber(employee)}
        ${getEmployeeContractType(employee)}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const departmentMatch =
        departmentFilter === 'Todos' ||
        getEmployeeCompanies(employee).some(
          (company) =>
            String(company.department || '').toLowerCase() ===
            departmentFilter.toLowerCase()
        );

      const statusMatch =
        statusFilter === 'Todos' ||
        getEmployeeCompanies(employee).some(
          (company) =>
            String(company.status || '').toLowerCase() === statusFilter.toLowerCase()
        );

      return textMatch && departmentMatch && statusMatch;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return getEmployeeName(a).localeCompare(getEmployeeName(b), 'pt-BR');
      }

      if (sortBy === 'name-desc') {
        return getEmployeeName(b).localeCompare(getEmployeeName(a), 'pt-BR');
      }

      if (sortBy === 'admission-newest') {
        return (
          new Date(getEmployeeAdmissionDate(b) || 0) -
          new Date(getEmployeeAdmissionDate(a) || 0)
        );
      }

      if (sortBy === 'admission-oldest') {
        return (
          new Date(getEmployeeAdmissionDate(a) || 0) -
          new Date(getEmployeeAdmissionDate(b) || 0)
        );
      }

      if (sortBy === 'companies-desc') {
        return getEmployeeCompanies(b).length - getEmployeeCompanies(a).length;
      }

      return 0;
    });

    return sorted;
  }, [employees, search, departmentFilter, statusFilter, sortBy]);

  const employeeStats = useMemo(() => {
    const active = employees.filter((employee) =>
      getEmployeeCompanies(employee).some(
        (company) => String(company.status || '').toLowerCase() === 'ativo'
      )
    ).length;

    const multiCompany = employees.filter(
      (employee) => getEmployeeCompanies(employee).length > 1
    ).length;

    const activeCompanies = new Set(
      employees.flatMap((employee) =>
        getEmployeeCompanies(employee).map((company) => company.companyName)
      )
    ).size;

    return {
      total: employees.length,
      active,
      multiCompany,
      activeCompanies,
    };
  }, [employees]);

  const selectedEmployeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];

    return [...uniformHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [uniformHistory, selectedEmployee]);

  const selectedEmployeeCertificates = useMemo(() => {
    if (!selectedEmployee) return [];

    return [...certificatesHistory].sort((a, b) => {
      return (
        new Date(b.startDate || b.createdAt || 0) -
        new Date(a.startDate || a.createdAt || 0)
      );
    });
  }, [certificatesHistory, selectedEmployee]);

  const selectedEmployeeWarnings = useMemo(() => {
    if (!selectedEmployee) return [];

    return [...warningsHistory].sort((a, b) => {
      return (
        new Date(b.warningDate || b.createdAt || 0) -
        new Date(a.warningDate || a.createdAt || 0)
      );
    });
  }, [warningsHistory, selectedEmployee]);

  const selectedEmployeeSchedules = useMemo(() => {
    if (!selectedEmployee) return [];

    return [...workSchedulesHistory].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [workSchedulesHistory, selectedEmployee]);

  const employeeHistorySummary = useMemo(() => {
    if (!selectedEmployee) {
      return {
        totalUniforms: 0,
        lastDeliveryDate: '-',
        totalCertificates: 0,
        totalWarnings: 0,
        totalSchedules: 0,
      };
    }

    const totalUniforms = selectedEmployeeHistory.reduce(
      (acc, item) => acc + Number(item.quantity || 0),
      0
    );

    return {
      totalUniforms,
      lastDeliveryDate:
        selectedEmployeeHistory.length > 0
          ? formatDate(selectedEmployeeHistory[0].date)
          : '-',
      totalCertificates: selectedEmployeeCertificates.length,
      totalWarnings: selectedEmployeeWarnings.length,
      totalSchedules: selectedEmployeeSchedules.length,
    };
  }, [
    selectedEmployee,
    selectedEmployeeHistory,
    selectedEmployeeCertificates,
    selectedEmployeeWarnings,
    selectedEmployeeSchedules,
  ]);

  const resetDrawer = () => {
    setEditingEmployee(null);
    setFormData(createInitialForm());
    setIsEmployeeDrawerOpen(false);
  };

  const openCreateDrawer = () => {
    setEditingEmployee(null);
    setFormData(createInitialForm());
    setIsEmployeeDrawerOpen(true);
  };

  const openEditDrawer = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.name || employee.fullName || '',
      cpf: employee.cpf || '',
      birthDate: employee.birthDate ? employee.birthDate.slice(0, 10) : '',
      maritalStatus: employee.maritalStatus || '',
      email: employee.email || '',
      phone: employee.phone || '',
      shirtSize: employee.shirtSize || '',
      pantsSize: employee.pantsSize || '',
      bootSize: employee.bootSize || '',
      notes: employee.notes || '',
      companyLinks: getEmployeeCompanies(employee).map((company) => ({
        companyId: String(company.companyId),
        registrationNumber: company.registrationNumber || '',
        role: company.role || '',
        department: company.department || '',
        admissionDate: company.admissionDate
          ? company.admissionDate.slice(0, 10)
          : '',
        status: company.status || 'ativo',
        contractType: company.contractType || 'CLT',
        salaryBase:
          company.salaryBase !== null && company.salaryBase !== undefined
            ? String(company.salaryBase)
            : '',
        notes: company.notes || '',
      })),
    });
    setIsEmployeeDrawerOpen(true);
  };

  const openHistoryDrawer = (employee) => {
    setSelectedEmployee(employee);
    setHistoryTab('summary');
    setIsHistoryDrawerOpen(true);
    fetchEmployeeHistory(employee.id);
  };

  const closeHistoryDrawer = () => {
    setSelectedEmployee(null);
    setIsHistoryDrawerOpen(false);
    setHistoryTab('summary');
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Deseja realmente excluir este colaborador?'
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/employees/${id}`, {
        params: {
          scope: 'all',
        },
      });
      fetchEmployees();
    } catch (err) {
      console.error('Erro ao excluir colaborador:', err);
      alert(err.response?.data?.message || 'Erro ao excluir colaborador.');
    }
  };

  const handleGlobalChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleCompanySelection = (companyId) => {
    setFormData((prev) => {
      const exists = prev.companyLinks.some(
        (link) => Number(link.companyId) === Number(companyId)
      );

      if (exists) {
        return {
          ...prev,
          companyLinks: prev.companyLinks.filter(
            (link) => Number(link.companyId) !== Number(companyId)
          ),
        };
      }

      return {
        ...prev,
        companyLinks: [...prev.companyLinks, createEmptyCompanyLink(companyId)],
      };
    });
  };

  const handleCompanyLinkChange = (companyId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      companyLinks: prev.companyLinks.map((link) =>
        Number(link.companyId) === Number(companyId)
          ? {
              ...link,
              [field]: value,
            }
          : link
      ),
    }));
  };

  const moveCompanyLinkToPrimary = (companyId) => {
    setFormData((prev) => {
      const selected = prev.companyLinks.find(
        (link) => Number(link.companyId) === Number(companyId)
      );

      if (!selected) return prev;

      const others = prev.companyLinks.filter(
        (link) => Number(link.companyId) !== Number(companyId)
      );

      return {
        ...prev,
        companyLinks: [selected, ...others],
      };
    });
  };

  const validateForm = () => {
    if (
      !formData.fullName ||
      !formData.cpf ||
      !formData.birthDate ||
      !formData.maritalStatus ||
      !formData.email ||
      !formData.phone
    ) {
      alert('Preencha os dados globais obrigatórios do colaborador.');
      return false;
    }

    if (formData.companyLinks.length === 0) {
      alert('Selecione pelo menos uma empresa para vincular o colaborador.');
      return false;
    }

    const invalidCompanyLink = formData.companyLinks.find(
      (link) => !link.role || !link.department || !link.admissionDate
    );

    if (invalidCompanyLink) {
      alert(
        'Preencha cargo, departamento e data de admissão em todos os vínculos da empresa.'
      );
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    name: formData.fullName,
    cpf: formData.cpf,
    birthDate: formData.birthDate,
    maritalStatus: formData.maritalStatus,
    email: formData.email,
    phone: formData.phone,
    shirtSize: formData.shirtSize || '',
    pantsSize: formData.pantsSize || '',
    bootSize: formData.bootSize || '',
    notes: formData.notes || '',
    companyLinks: formData.companyLinks.map((link) => ({
      companyId: Number(link.companyId),
      registrationNumber: link.registrationNumber || '',
      role: link.role,
      department: link.department,
      admissionDate: link.admissionDate,
      status: (link.status || 'ativo').toLowerCase(),
      contractType: link.contractType || 'CLT',
      salaryBase: link.salaryBase ? Number(link.salaryBase) : null,
      notes: link.notes || '',
    })),
  });

  const handleSaveEmployee = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingEmployee?.id) {
        await api.put(`/employees/${editingEmployee.id}`, payload, {
          params: { scope: 'all' },
        });
      } else {
        await api.post('/employees', payload);
      }

      resetDrawer();
      fetchEmployees();
    } catch (err) {
      console.error('Erro ao salvar colaborador:', err);
      alert(err.response?.data?.message || 'Erro ao salvar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  function formatDate(date) {
    if (!date) return '-';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString('pt-BR');
  }

  const formatPhone = (phone) => {
    if (!phone) return '-';

    const numbers = String(phone).replace(/\D/g, '');

    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return phone;
  };

  const formatCpf = (cpf) => {
    if (!cpf) return '-';

    const numbers = String(cpf).replace(/\D/g, '');

    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    return cpf;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';

    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) return '-';

    return parsedValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getStatusClasses = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'ativo') {
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (normalized === 'inativo') {
      return 'border border-red-200 bg-red-50 text-red-700';
    }

    if (normalized === 'férias') {
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border border-slate-200 bg-slate-100 text-slate-700';
  };

  const getCompanyBadgeClasses = (companyCode) => {
    if (companyCode === 'NEXO_TI') {
      return 'border border-blue-200 bg-blue-50 text-blue-700';
    }

    if (companyCode === 'NEXO_INSTALADORA') {
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    return 'border border-slate-200 bg-slate-100 text-slate-700';
  };

  const renderCompanyBadges = (employee) => {
    const employeeCompanies = getEmployeeCompanies(employee);

    if (employeeCompanies.length === 0) {
      return <span className='text-xs text-slate-400'>Sem vínculo</span>;
    }

    return (
      <div className='flex flex-wrap gap-2'>
        {employeeCompanies.map((company) => (
          <span
            key={`${employee.id}-${company.companyId}`}
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCompanyBadgeClasses(
              company.companyCode
            )}`}
          >
            {company.companyName}
            {company.isPrimary ? ' • principal' : ''}
          </span>
        ))}
      </div>
    );
  };

  const renderHistorySummary = () => {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
          <StatCard title='Uniformes recebidos' value={employeeHistorySummary.totalUniforms} />
          <StatCard title='Última entrega' value={employeeHistorySummary.lastDeliveryDate} compact />
          <StatCard title='Atestados' value={employeeHistorySummary.totalCertificates} />
          <StatCard title='Advertências' value={employeeHistorySummary.totalWarnings} />
          <StatCard title='Escalas' value={employeeHistorySummary.totalSchedules} />
        </div>

        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-5'>
            <h3 className='text-lg font-semibold text-slate-800'>Dados globais</h3>
            <p className='mt-1 text-sm text-slate-500'>
              Informações pessoais compartilhadas entre os vínculos.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <InfoItem label='Nome' value={getEmployeeName(selectedEmployee)} />
            <InfoItem label='CPF' value={formatCpf(selectedEmployee.cpf)} />
            <InfoItem label='E-mail' value={selectedEmployee.email || '-'} />
            <InfoItem label='Telefone' value={formatPhone(selectedEmployee.phone)} />
            <InfoItem
              label='Nascimento'
              value={formatDate(selectedEmployee.birthDate)}
            />
            <InfoItem
              label='Estado civil'
              value={selectedEmployee.maritalStatus || '-'}
            />
            <InfoItem
              label='Camisa'
              value={getEmployeeShirtSize(selectedEmployee)}
            />
            <InfoItem
              label='Calça'
              value={getEmployeePantsSize(selectedEmployee)}
            />
            <InfoItem
              label='Bota'
              value={getEmployeeBootSize(selectedEmployee)}
            />
          </div>
        </section>

        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-5'>
            <h3 className='text-lg font-semibold text-slate-800'>
              Vínculos por empresa
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              Estrutura operacional do colaborador em cada empresa.
            </p>
          </div>

          <div className='space-y-4'>
            {getEmployeeCompanies(selectedEmployee).map((company) => (
              <div
                key={company.companyId}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
              >
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h4 className='text-lg font-bold text-slate-800'>
                        {company.companyName}
                      </h4>
                      {company.isPrimary ? (
                        <span className='rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700'>
                          Vínculo principal
                        </span>
                      ) : null}
                    </div>

                    <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
                      <InfoItem label='Cargo' value={company.role || '-'} />
                      <InfoItem
                        label='Departamento'
                        value={company.department || '-'}
                      />
                      <InfoItem
                        label='Admissão'
                        value={formatDate(company.admissionDate)}
                      />
                      <InfoItem
                        label='Status'
                        value={
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              company.status
                            )}`}
                          >
                            {company.status || '-'}
                          </span>
                        }
                      />
                      <InfoItem
                        label='Matrícula'
                        value={company.registrationNumber || '-'}
                      />
                      <InfoItem
                        label='Contrato'
                        value={company.contractType || '-'}
                      />
                      <InfoItem
                        label='Salário/base'
                        value={formatCurrency(company.salaryBase)}
                      />
                    </div>

                    {company.notes ? (
                      <p className='mt-4 text-sm text-slate-600'>{company.notes}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderUniformsHistory = () => (
    <HistorySection
      title='Histórico de fardamento'
      subtitle='Entregas vinculadas a este colaborador.'
      items={selectedEmployeeHistory}
      emptyText='Nenhuma entrega de fardamento encontrada para este colaborador.'
      renderItem={(item) => (
        <div
          key={item.id}
          className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
        >
          <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <p className='text-lg font-bold text-slate-800'>{item.itemLabel}</p>
              <p className='mt-1 text-sm text-slate-500'>Quantidade: {item.quantity}</p>
              <p className='text-sm text-slate-500'>Setor: {item.sector || '-'}</p>
              {item.notes ? (
                <p className='mt-2 text-sm text-slate-600'>Obs: {item.notes}</p>
              ) : null}
            </div>

            <span className='inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
              {formatDate(item.date)}
            </span>
          </div>
        </div>
      )}
    />
  );

  const renderCertificatesHistory = () => (
    <HistorySection
      title='Atestados'
      subtitle='Registros reais vinculados a este colaborador.'
      items={selectedEmployeeCertificates}
      emptyText='Nenhum atestado encontrado para este colaborador.'
      renderItem={(item) => (
        <HistoryRecordCard
          key={item.id || `${item.date}-${item.title}`}
          title={item.title || item.type || 'Atestado'}
          lines={[
            `Dias: ${item.days || item.daysOff || item.quantityDays || '-'}`,
            `Status: ${item.status || 'Registrado'}`,
          ]}
          notes={item.note || item.notes || item.description}
          date={formatDate(item.date || item.createdAt)}
          dateTone='emerald'
        />
      )}
    />
  );

  const renderWarningsHistory = () => (
    <HistorySection
      title='Advertências'
      subtitle='Registros reais vinculados a este colaborador.'
      items={selectedEmployeeWarnings}
      emptyText='Nenhuma advertência encontrada para este colaborador.'
      renderItem={(item) => (
        <HistoryRecordCard
          key={item.id || `${item.date}-${item.title}`}
          title={item.title || item.type || 'Advertência'}
          lines={[`Status: ${item.status || 'Registrada'}`]}
          notes={item.note || item.notes || item.description}
          date={formatDate(item.date || item.createdAt)}
          dateTone='amber'
        />
      )}
    />
  );

  const renderSchedulesHistory = () => (
    <HistorySection
      title='Escalas'
      subtitle='Escalas reais vinculadas a este colaborador.'
      items={selectedEmployeeSchedules}
      emptyText='Nenhuma escala encontrada para este colaborador.'
      renderItem={(item) => (
        <HistoryRecordCard
          key={item.id}
          title={item.scheduleType || '-'}
          lines={[
            `Modelo: ${item.workModel || '-'}`,
            `Categoria: ${item.categoryType || '-'}`,
            `Cargo de confiança: ${item.isTrustPosition ? 'Sim' : 'Não'}`,
            `Trabalha em feriados: ${item.worksOnHolidays ? 'Sim' : 'Não'}`,
          ]}
          notes={item.observations}
          date={formatDate(item.createdAt)}
          dateTone='violet'
        />
      )}
    />
  );

  const renderHistoryTabContent = () => {
    if (!selectedEmployee) return null;

    if (historyLoading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando histórico do colaborador...
        </div>
      );
    }

    if (historyTab === 'summary') return renderHistorySummary();
    if (historyTab === 'uniforms') return renderUniformsHistory();
    if (historyTab === 'certificates') return renderCertificatesHistory();
    if (historyTab === 'warnings') return renderWarningsHistory();
    if (historyTab === 'schedules') return renderSchedulesHistory();

    return null;
  };

  const renderOverviewTab = () => {
    if (loading) {
      return (
        <EmptyState message='Carregando colaboradores...' />
      );
    }

    if (error) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-red-600 shadow-sm'>
          {error}
        </div>
      );
    }

    if (filteredEmployees.length === 0) {
      return <EmptyState message='Nenhum colaborador encontrado.' />;
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className='rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
          >
            <div className='flex flex-col gap-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-700'>
                    {getEmployeeName(employee).charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className='text-xl font-bold text-slate-800'>
                      {getEmployeeName(employee)}
                    </h3>
                    <p className='text-sm text-slate-500'>
                      {getEmployeeRole(employee)}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    getEmployeeStatus(employee)
                  )}`}
                >
                  {getEmployeeStatus(employee)}
                </span>
              </div>

              <div>{renderCompanyBadges(employee)}</div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox label='Departamento' value={getEmployeeDepartment(employee)} />
                <InfoBox
                  label='Admissão principal'
                  value={formatDate(getEmployeeAdmissionDate(employee))}
                />
                <InfoBox label='Matrícula' value={getEmployeeRegistrationNumber(employee)} />
                <InfoBox label='Contrato' value={getEmployeeContractType(employee)} />
                <InfoBox label='E-mail' value={employee.email || '-'} breakWords />
                <InfoBox label='Telefone' value={formatPhone(employee.phone)} />
                <InfoBox label='Camisa' value={getEmployeeShirtSize(employee)} />
                <InfoBox label='Calça' value={getEmployeePantsSize(employee)} />
                <InfoBox
                  label='Bota'
                  value={getEmployeeBootSize(employee)}
                  fullWidth
                />
              </div>

              <div className='flex flex-wrap gap-2 pt-2'>
                <ActionButton
                  label='Editar'
                  tone='amber'
                  onClick={() => openEditDrawer(employee)}
                />
                <ActionButton
                  label='Histórico'
                  tone='blue'
                  onClick={() => openHistoryDrawer(employee)}
                />
                <ActionButton
                  label='Excluir'
                  tone='red'
                  onClick={() => handleDelete(employee.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListTab = () => {
    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Lista de colaboradores
          </h3>
        </div>

        {loading ? (
          <div className='px-6 py-10 text-slate-500'>Carregando colaboradores...</div>
        ) : error ? (
          <div className='px-6 py-10 text-red-600'>{error}</div>
        ) : filteredEmployees.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead className='bg-slate-50'>
                <tr className='text-left'>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Colaborador
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Empresas
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Cargo principal
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Departamento
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Matrícula
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Admissão
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5'>
                      <div className='flex items-center gap-3'>
                        <div className='flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700'>
                          {getEmployeeName(employee).charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className='font-semibold text-slate-800'>
                            {getEmployeeName(employee)}
                          </p>
                          <p className='text-sm text-slate-500'>
                            {formatCpf(employee.cpf)} • {formatPhone(employee.phone)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className='px-6 py-5'>
                      {renderCompanyBadges(employee)}
                    </td>

                    <td className='px-6 py-5 text-sm font-medium text-slate-700'>
                      {getEmployeeRole(employee)}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {getEmployeeDepartment(employee)}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {getEmployeeRegistrationNumber(employee)}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {formatDate(getEmployeeAdmissionDate(employee))}
                    </td>

                    <td className='px-6 py-5'>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          getEmployeeStatus(employee)
                        )}`}
                      >
                        {getEmployeeStatus(employee)}
                      </span>
                    </td>

                    <td className='px-6 py-5'>
                      <div className='flex flex-wrap items-center justify-center gap-2'>
                        <MiniActionButton
                          label='Editar'
                          tone='amber'
                          onClick={() => openEditDrawer(employee)}
                        />
                        <MiniActionButton
                          label='Histórico'
                          tone='blue'
                          onClick={() => openHistoryDrawer(employee)}
                        />
                        <MiniActionButton
                          label='Excluir'
                          tone='red'
                          onClick={() => handleDelete(employee.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <h1 className='text-3xl font-bold text-slate-800'>Colaboradores</h1>
            <p className='mt-1 text-slate-500'>
              Estruture a base global de pessoas e os vínculos por empresa com clareza,
              controle e escalabilidade.
            </p>
          </div>

          <button
            onClick={openCreateDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo colaborador
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <SummaryCard title='Colaboradores' value={employeeStats.total} />
          <SummaryCard title='Ativos' value={employeeStats.active} accent='emerald' />
          <SummaryCard
            title='Multivínculo'
            value={employeeStats.multiCompany}
            accent='violet'
          />
          <SummaryCard
            title='Empresas ativas'
            value={employeeStats.activeCompanies}
            accent='blue'
          />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-5'>
            <div className='xl:col-span-2'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                placeholder='Buscar por nome, CPF, cargo, departamento, matrícula ou empresa'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Empresa
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                disabled={loadingCompanies}
              >
                {companyFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Departamento
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='Todos'>Todos</option>
                <option value='ativo'>Ativo</option>
                <option value='inativo'>Inativo</option>
                <option value='férias'>Férias</option>
              </select>
            </div>
          </div>

          <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Ordenação
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='name-asc'>Nome A → Z</option>
                <option value='name-desc'>Nome Z → A</option>
                <option value='admission-newest'>Admissão mais recente</option>
                <option value='admission-oldest'>Admissão mais antiga</option>
                <option value='companies-desc'>Mais vínculos primeiro</option>
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

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'list' && renderListTab()}
      </div>

      {isEmployeeDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={resetDrawer}
          />

          <div className='relative flex h-full w-full max-w-[920px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
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
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      {editingEmployee ? 'Edição de colaborador' : 'Cadastro de colaborador'}
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingEmployee ? 'Editar colaborador' : 'Novo colaborador'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Separe dados globais da pessoa e os vínculos operacionais por empresa.
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

            <form onSubmit={handleSaveEmployee} className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>Dados globais</h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Informações pessoais compartilhadas entre Nexo Ti e Nexo Instaladora.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Nome completo
                        </label>
                        <input
                          type='text'
                          name='fullName'
                          value={formData.fullName}
                          onChange={handleGlobalChange}
                          placeholder='Digite o nome completo'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          CPF
                        </label>
                        <input
                          type='text'
                          name='cpf'
                          value={formData.cpf}
                          onChange={handleGlobalChange}
                          placeholder='Digite o CPF'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de nascimento
                        </label>
                        <input
                          type='date'
                          name='birthDate'
                          value={formData.birthDate}
                          onChange={handleGlobalChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Estado civil
                        </label>
                        <select
                          name='maritalStatus'
                          value={formData.maritalStatus}
                          onChange={handleGlobalChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        >
                          <option value=''>Selecione</option>
                          <option value='Solteiro(a)'>Solteiro(a)</option>
                          <option value='Casado(a)'>Casado(a)</option>
                          <option value='Divorciado(a)'>Divorciado(a)</option>
                          <option value='Viúvo(a)'>Viúvo(a)</option>
                          <option value='União estável'>União estável</option>
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          E-mail
                        </label>
                        <input
                          type='email'
                          name='email'
                          value={formData.email}
                          onChange={handleGlobalChange}
                          placeholder='email@empresa.com'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
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
                          onChange={handleGlobalChange}
                          placeholder='(00) 00000-0000'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tamanho da camisa
                        </label>
                        <select
                          name='shirtSize'
                          value={formData.shirtSize}
                          onChange={handleGlobalChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        >
                          <option value=''>Selecione</option>
                          {shirtSizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tamanho da calça
                        </label>
                        <select
                          name='pantsSize'
                          value={formData.pantsSize}
                          onChange={handleGlobalChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        >
                          <option value=''>Selecione</option>
                          {pantsSizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tamanho da bota
                        </label>
                        <select
                          name='bootSize'
                          value={formData.bootSize}
                          onChange={handleGlobalChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        >
                          <option value=''>Selecione</option>
                          {bootSizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observações globais
                        </label>
                        <textarea
                          name='notes'
                          value={formData.notes}
                          onChange={handleGlobalChange}
                          rows='4'
                          placeholder='Observações pessoais ou administrativas compartilhadas.'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>Empresas vinculadas</h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione uma ou mais empresas e preencha os dados operacionais de cada vínculo.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
                      {companies.map((company) => {
                        const selectedLink = formData.companyLinks.find(
                          (link) => Number(link.companyId) === Number(company.id)
                        );
                        const isSelected = Boolean(selectedLink);
                        const isPrimary =
                          isSelected &&
                          Number(formData.companyLinks[0]?.companyId) === Number(company.id);

                        return (
                          <div
                            key={company.id}
                            className={`rounded-2xl border p-4 transition ${
                              isSelected
                                ? 'border-slate-300 bg-slate-50 shadow-sm'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-4'>
                              <div>
                                <div className='flex items-center gap-2'>
                                  <h4 className='text-lg font-bold text-slate-800'>
                                    {company.name}
                                  </h4>
                                  {isPrimary ? (
                                    <span className='rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700'>
                                      Principal
                                    </span>
                                  ) : null}
                                </div>
                                <p className='mt-1 text-sm text-slate-500'>
                                  Código: {company.code}
                                </p>
                              </div>

                              <div className='flex flex-wrap gap-2'>
                                <button
                                  type='button'
                                  onClick={() => toggleCompanySelection(company.id)}
                                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    isSelected
                                      ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                      : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  }`}
                                >
                                  {isSelected ? 'Remover vínculo' : 'Vincular empresa'}
                                </button>

                                {isSelected && !isPrimary ? (
                                  <button
                                    type='button'
                                    onClick={() => moveCompanyLinkToPrimary(company.id)}
                                    className='rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100'
                                  >
                                    Tornar principal
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            {isSelected ? (
                              <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Matrícula
                                  </label>
                                  <input
                                    type='text'
                                    value={selectedLink.registrationNumber}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'registrationNumber',
                                        event.target.value
                                      )
                                    }
                                    placeholder='Ex: NXTI-001'
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>

                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Status
                                  </label>
                                  <select
                                    value={selectedLink.status}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'status',
                                        event.target.value
                                      )
                                    }
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  >
                                    <option value='ativo'>Ativo</option>
                                    <option value='inativo'>Inativo</option>
                                    <option value='férias'>Férias</option>
                                  </select>
                                </div>

                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Cargo
                                  </label>
                                  <input
                                    type='text'
                                    value={selectedLink.role}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'role',
                                        event.target.value
                                      )
                                    }
                                    placeholder='Ex: Técnico N2'
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>

                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Departamento
                                  </label>
                                  <input
                                    type='text'
                                    value={selectedLink.department}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'department',
                                        event.target.value
                                      )
                                    }
                                    placeholder='Ex: Suporte'
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>

                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Data de admissão
                                  </label>
                                  <input
                                    type='date'
                                    value={selectedLink.admissionDate}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'admissionDate',
                                        event.target.value
                                      )
                                    }
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>

                                <div>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Tipo de contrato
                                  </label>
                                  <select
                                    value={selectedLink.contractType}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'contractType',
                                        event.target.value
                                      )
                                    }
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  >
                                    {contractTypeOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className='md:col-span-2'>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Salário/base
                                  </label>
                                  <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={selectedLink.salaryBase}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'salaryBase',
                                        event.target.value
                                      )
                                    }
                                    placeholder='Ex: 3500.00'
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>

                                <div className='md:col-span-2'>
                                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                                    Observações internas do vínculo
                                  </label>
                                  <textarea
                                    value={selectedLink.notes}
                                    onChange={(event) =>
                                      handleCompanyLinkChange(
                                        company.id,
                                        'notes',
                                        event.target.value
                                      )
                                    }
                                    rows='3'
                                    placeholder='Ex: Atua em campo, responde ao coordenador X.'
                                    className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className='mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                                Ative este vínculo para registrar dados operacionais específicos da empresa.
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                      ? editingEmployee
                        ? 'Salvando...'
                        : 'Cadastrando...'
                      : editingEmployee
                        ? 'Salvar alterações'
                        : 'Cadastrar colaborador'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHistoryDrawerOpen && selectedEmployee && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeHistoryDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeHistoryDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div className='flex items-start gap-4'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700'>
                      {getEmployeeName(selectedEmployee).charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className='mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'>
                        Histórico do colaborador
                      </div>
                      <h2 className='text-2xl font-bold text-slate-800'>
                        {getEmployeeName(selectedEmployee)}
                      </h2>
                      <p className='mt-1 text-sm text-slate-500'>
                        {getEmployeeRole(selectedEmployee)} • {getEmployeeDepartment(selectedEmployee)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeHistoryDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='border-b border-slate-200 bg-white px-6 py-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                <InfoSummaryCard
                  label='Status'
                  value={
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        getEmployeeStatus(selectedEmployee)
                      )}`}
                    >
                      {getEmployeeStatus(selectedEmployee)}
                    </span>
                  }
                />
                <InfoSummaryCard
                  label='Empresas'
                  value={getEmployeeCompanies(selectedEmployee).length}
                />
                <InfoSummaryCard
                  label='Admissão principal'
                  value={formatDate(getEmployeeAdmissionDate(selectedEmployee))}
                />
                <InfoSummaryCard
                  label='Uniformes recebidos'
                  value={employeeHistorySummary.totalUniforms}
                />
              </div>
            </div>

            <div className='border-b border-slate-200 bg-white p-3'>
              <div className='flex flex-wrap gap-2 px-3'>
                {[
                  ['summary', 'Resumo'],
                  ['uniforms', 'Fardamento'],
                  ['certificates', 'Atestados'],
                  ['warnings', 'Advertências'],
                  ['schedules', 'Escalas'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => setHistoryTab(value)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      historyTab === value
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-6'>
              {renderHistoryTabContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SummaryCard = ({ title, value, accent = 'slate' }) => {
  const accentMap = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    blue: 'text-blue-600',
  };

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <p className='text-sm text-slate-500'>{title}</p>
      <h2 className={`mt-2 text-3xl font-bold ${accentMap[accent]}`}>{value}</h2>
    </div>
  );
};

const StatCard = ({ title, value, compact = false }) => (
  <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
    <p className='text-sm text-slate-500'>{title}</p>
    <h3 className={`${compact ? 'text-xl' : 'text-3xl'} font-bold leading-none text-slate-800`}>
      {value}
    </h3>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className='text-sm text-slate-500'>{label}</p>
    <div className='mt-1 font-semibold text-slate-800'>{value}</div>
  </div>
);

const InfoBox = ({ label, value, breakWords = false, fullWidth = false }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${
      fullWidth ? 'md:col-span-2' : ''
    }`}
  >
    <p className='text-sm text-slate-500'>{label}</p>
    <p
      className={`mt-1 font-semibold text-slate-800 ${
        breakWords ? 'break-all' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

const ActionButton = ({ label, tone, onClick }) => {
  const classes = {
    amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${classes[tone]}`}
    >
      {label}
    </button>
  );
};

const MiniActionButton = ({ label, tone, onClick }) => {
  const classes = {
    amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${classes[tone]}`}
    >
      {label}
    </button>
  );
};

const EmptyState = ({ message }) => (
  <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
    {message}
  </div>
);

const HistorySection = ({ title, subtitle, items, emptyText, renderItem }) => (
  <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
    <div className='border-b border-slate-200 px-6 py-5'>
      <h3 className='text-xl font-semibold text-slate-800'>{title}</h3>
      <p className='mt-1 text-sm text-slate-500'>{subtitle}</p>
    </div>

    {items.length === 0 ? (
      <div className='px-6 py-10 text-slate-500'>{emptyText}</div>
    ) : (
      <div className='space-y-4 p-6'>{items.map((item) => renderItem(item))}</div>
    )}
  </section>
);

const HistoryRecordCard = ({ title, lines, notes, date, dateTone }) => {
  const toneMap = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <p className='text-lg font-bold text-slate-800'>{title}</p>
          {lines.map((line) => (
            <p key={line} className='mt-1 text-sm text-slate-500'>
              {line}
            </p>
          ))}
          {notes ? <p className='mt-2 text-sm text-slate-600'>{notes}</p> : null}
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            toneMap[dateTone]
          }`}
        >
          {date}
        </span>
      </div>
    </div>
  );
};

const InfoSummaryCard = ({ label, value }) => (
  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
    <p className='text-sm text-slate-500'>{label}</p>
    <div className='mt-2 font-bold text-slate-800'>{value}</div>
  </div>
);

export default Employees;
