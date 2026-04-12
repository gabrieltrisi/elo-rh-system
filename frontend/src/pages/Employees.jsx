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

const initialForm = {
  fullName: '',
  cpf: '',
  birthDate: '',
  maritalStatus: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  admissionDate: '',
  status: 'ativo',
  shirtSize: '',
  pantsSize: '',
  bootSize: '',
  notes: '',
};

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('name-asc');
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uniformHistory, setUniformHistory] = useState([]);
  const [certificatesHistory, setCertificatesHistory] = useState([]);
  const [warningsHistory, setWarningsHistory] = useState([]);
  const [workSchedulesHistory, setWorkSchedulesHistory] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [historyTab, setHistoryTab] = useState('summary');

  useEffect(() => {
    fetchEmployees();
    loadUniformHistory();
    loadCertificatesHistory();
    loadWarningsHistory();
    loadWorkSchedulesHistory();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/employees');

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

  const loadUniformHistory = () => {
    const savedHistory = localStorage.getItem('uniformDeliveries');
    setUniformHistory(savedHistory ? JSON.parse(savedHistory) : []);
  };

  const loadCertificatesHistory = () => {
    const possibleKeys = [
      'certificates',
      'medicalCertificates',
      'certificateHistory',
      'employeeCertificates',
    ];

    let foundData = [];

    for (const key of possibleKeys) {
      const saved = localStorage.getItem(key);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            foundData = parsed;
            break;
          }
        } catch (error) {
          console.error(`Erro ao ler ${key} do localStorage:`, error);
        }
      }
    }

    setCertificatesHistory(foundData);
  };

  const loadWarningsHistory = () => {
    const possibleKeys = [
      'warnings',
      'employeeWarnings',
      'warningHistory',
      'disciplinaryWarnings',
    ];

    let foundData = [];

    for (const key of possibleKeys) {
      const saved = localStorage.getItem(key);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            foundData = parsed;
            break;
          }
        } catch (error) {
          console.error(`Erro ao ler ${key} do localStorage:`, error);
        }
      }
    }

    setWarningsHistory(foundData);
  };

  const loadWorkSchedulesHistory = async () => {
    try {
      const response = await api.get('/work-schedules');
      setWorkSchedulesHistory(response.data?.schedules || response.data || []);
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
      setWorkSchedulesHistory([]);
    }
  };

  const getEmployeeName = (emp) => emp.fullName || emp.name || '-';
  const getEmployeeRole = (emp) => emp.position || emp.role || '-';
  const getEmployeeStatus = (emp) => emp.status || 'ativo';

  const getEmployeeShirtSize = (emp) =>
    emp.shirtSize || emp.uniformSize || emp.uniform_shirt_size || '-';

  const getEmployeePantsSize = (emp) =>
    emp.pantsSize || emp.uniformPantsSize || emp.uniform_pants_size || '-';

  const getEmployeeBootSize = (emp) =>
    emp.bootSize || emp.uniformBootSize || emp.uniform_boot_size || '-';

  const departments = useMemo(() => {
    return [
      'Todos',
      ...new Set(
        employees.map((emp) => (emp.department || '').trim()).filter(Boolean)
      ),
    ].sort((a, b) => {
      if (a === 'Todos') return -1;
      if (b === 'Todos') return 1;
      return a.localeCompare(b);
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      const textMatch = `
        ${emp.fullName || ''}
        ${emp.name || ''}
        ${emp.cpf || ''}
        ${emp.birthDate || ''}
        ${emp.maritalStatus || ''}
        ${emp.email || ''}
        ${emp.phone || ''}
        ${emp.position || ''}
        ${emp.role || ''}
        ${emp.department || ''}
        ${emp.status || ''}
        ${emp.shirtSize || ''}
        ${emp.pantsSize || ''}
        ${emp.bootSize || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const departmentMatch =
        departmentFilter === 'Todos' ||
        (emp.department || '').toLowerCase() === departmentFilter.toLowerCase();

      const statusMatch =
        statusFilter === 'Todos' ||
        (getEmployeeStatus(emp) || '').toLowerCase() ===
          statusFilter.toLowerCase();

      return textMatch && departmentMatch && statusMatch;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return getEmployeeName(a).localeCompare(getEmployeeName(b));
      }

      if (sortBy === 'name-desc') {
        return getEmployeeName(b).localeCompare(getEmployeeName(a));
      }

      if (sortBy === 'admission-newest') {
        return new Date(b.admissionDate || 0) - new Date(a.admissionDate || 0);
      }

      if (sortBy === 'admission-oldest') {
        return new Date(a.admissionDate || 0) - new Date(b.admissionDate || 0);
      }

      return 0;
    });

    return sorted;
  }, [employees, search, departmentFilter, statusFilter, sortBy]);

  const employeeStats = useMemo(() => {
    const active = employees.filter(
      (emp) => (getEmployeeStatus(emp) || '').toLowerCase() === 'ativo'
    ).length;

    const inactive = employees.filter(
      (emp) => (getEmployeeStatus(emp) || '').toLowerCase() === 'inativo'
    ).length;

    const departmentsCount = new Set(
      employees.map((emp) => (emp.department || '').trim()).filter(Boolean)
    ).size;

    return {
      total: employees.length,
      active,
      inactive,
      departments: departmentsCount,
    };
  }, [employees]);

  const selectedEmployeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];

    return uniformHistory
      .filter((item) => {
        if (item.employeeId && selectedEmployee.id) {
          return Number(item.employeeId) === Number(selectedEmployee.id);
        }

        return (
          (item.employeeName || '').toLowerCase() ===
          getEmployeeName(selectedEmployee).toLowerCase()
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [uniformHistory, selectedEmployee]);

  const selectedEmployeeCertificates = useMemo(() => {
    if (!selectedEmployee) return [];

    return certificatesHistory
      .filter((item) => {
        const employeeIdMatch =
          item.employeeId && selectedEmployee.id
            ? Number(item.employeeId) === Number(selectedEmployee.id)
            : false;

        const employeeNameMatch =
          (item.employeeName || item.fullName || item.employee || '')
            .toLowerCase()
            .trim() === getEmployeeName(selectedEmployee).toLowerCase().trim();

        return employeeIdMatch || employeeNameMatch;
      })
      .sort((a, b) => {
        return (
          new Date(b.date || b.createdAt || 0) -
          new Date(a.date || a.createdAt || 0)
        );
      });
  }, [certificatesHistory, selectedEmployee]);

  const selectedEmployeeWarnings = useMemo(() => {
    if (!selectedEmployee) return [];

    return warningsHistory
      .filter((item) => {
        const employeeIdMatch =
          item.employeeId && selectedEmployee.id
            ? Number(item.employeeId) === Number(selectedEmployee.id)
            : false;

        const employeeNameMatch =
          (item.employeeName || item.fullName || item.employee || '')
            .toLowerCase()
            .trim() === getEmployeeName(selectedEmployee).toLowerCase().trim();

        return employeeIdMatch || employeeNameMatch;
      })
      .sort((a, b) => {
        return (
          new Date(b.date || b.createdAt || 0) -
          new Date(a.date || a.createdAt || 0)
        );
      });
  }, [warningsHistory, selectedEmployee]);

  const selectedEmployeeSchedules = useMemo(() => {
    if (!selectedEmployee) return [];

    return workSchedulesHistory
      .filter((item) => {
        const employeeIdMatch =
          item.employeeId && selectedEmployee.id
            ? Number(item.employeeId) === Number(selectedEmployee.id)
            : false;

        const employeeNameMatch =
          (item.employee?.name || item.employeeName || '')
            .toLowerCase()
            .trim() === getEmployeeName(selectedEmployee).toLowerCase().trim();

        return employeeIdMatch || employeeNameMatch;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [workSchedulesHistory, selectedEmployee]);

  const employeeHistorySummary = useMemo(() => {
    if (!selectedEmployee) {
      return {
        totalUniforms: 0,
        lastDeliveryDate: '-',
        mostRecentItem: '-',
        totalCertificates: 0,
        totalWarnings: 0,
        totalSchedules: 0,
      };
    }

    const totalUniforms = selectedEmployeeHistory.reduce(
      (acc, item) => acc + Number(item.quantity || 0),
      0
    );

    const lastDeliveryDate =
      selectedEmployeeHistory.length > 0
        ? selectedEmployeeHistory[0].date
        : null;

    const mostRecentItem =
      selectedEmployeeHistory.length > 0
        ? selectedEmployeeHistory[0].itemLabel
        : '-';

    return {
      totalUniforms,
      lastDeliveryDate: lastDeliveryDate ? formatDate(lastDeliveryDate) : '-',
      mostRecentItem,
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

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Deseja realmente excluir este colaborador?'
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      console.error('Erro ao excluir colaborador:', err);
      alert(err.response?.data?.message || 'Erro ao excluir colaborador.');
    }
  };

  const openCreateModal = () => {
    setFormData(initialForm);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setFormData(initialForm);
    setIsCreateModalOpen(false);
  };

  const openHistoryDrawer = (employee) => {
    loadUniformHistory();
    loadCertificatesHistory();
    loadWarningsHistory();
    loadWorkSchedulesHistory();
    setSelectedEmployee(employee);
    setHistoryTab('summary');
    setIsHistoryDrawerOpen(true);
  };

  const closeHistoryDrawer = () => {
    setSelectedEmployee(null);
    setIsHistoryDrawerOpen(false);
    setHistoryTab('summary');
  };

  const handleEdit = (employee) => {
    alert(`Editar colaborador: ${getEmployeeName(employee)}`);
  };

  const handleHistory = (employee) => {
    openHistoryDrawer(employee);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.cpf ||
      !formData.birthDate ||
      !formData.maritalStatus ||
      !formData.email ||
      !formData.phone ||
      !formData.position ||
      !formData.department ||
      !formData.admissionDate
    ) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const payload = {
      name: formData.fullName,
      cpf: formData.cpf,
      birthDate: formData.birthDate,
      maritalStatus: formData.maritalStatus,
      email: formData.email,
      phone: formData.phone,
      role: formData.position,
      department: formData.department,
      admissionDate: formData.admissionDate,
      status: (formData.status || 'ativo').toLowerCase(),
      shirtSize: formData.shirtSize || '',
      pantsSize: formData.pantsSize || '',
      bootSize: formData.bootSize || '',
      notes: formData.notes || '',
    };

    try {
      setSaving(true);

      await api.post('/employees', payload);

      closeCreateModal();
      fetchEmployees();
    } catch (err) {
      console.error('Erro ao criar colaborador:', err);
      alert(err.response?.data?.message || 'Erro ao cadastrar colaborador.');
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

  const getStatusClasses = (status) => {
    const normalized = (status || '').toLowerCase();

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

  const renderHistorySummary = () => {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
          <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Uniformes recebidos</p>
            <h3 className='text-3xl font-bold leading-none text-slate-800'>
              {employeeHistorySummary.totalUniforms}
            </h3>
          </div>

          <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Última entrega</p>
            <h3 className='text-xl font-semibold text-slate-800'>
              {employeeHistorySummary.lastDeliveryDate}
            </h3>
          </div>

          <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Atestados</p>
            <h3 className='text-3xl font-bold leading-none text-slate-800'>
              {employeeHistorySummary.totalCertificates}
            </h3>
          </div>

          <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Advertências</p>
            <h3 className='text-3xl font-bold leading-none text-slate-800'>
              {employeeHistorySummary.totalWarnings}
            </h3>
          </div>

          <div className='flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Escalas</p>
            <h3 className='text-3xl font-bold leading-none text-slate-800'>
              {employeeHistorySummary.totalSchedules}
            </h3>
          </div>
        </div>

        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-5'>
            <h3 className='text-lg font-semibold text-slate-800'>
              Dados do colaborador
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              Informações principais do cadastro.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <p className='text-sm text-slate-500'>Nome</p>
              <p className='font-semibold text-slate-800'>
                {getEmployeeName(selectedEmployee)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>CPF</p>
              <p className='font-semibold text-slate-800'>
                {formatCpf(selectedEmployee.cpf)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Cargo</p>
              <p className='font-semibold text-slate-800'>
                {getEmployeeRole(selectedEmployee)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Departamento</p>
              <p className='font-semibold text-slate-800'>
                {selectedEmployee.department || '-'}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>E-mail</p>
              <p className='font-semibold text-slate-800'>
                {selectedEmployee.email || '-'}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Telefone</p>
              <p className='font-semibold text-slate-800'>
                {formatPhone(selectedEmployee.phone)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Admissão</p>
              <p className='font-semibold text-slate-800'>
                {formatDate(selectedEmployee.admissionDate)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Status</p>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  getEmployeeStatus(selectedEmployee)
                )}`}
              >
                {getEmployeeStatus(selectedEmployee)}
              </span>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Tamanho da camisa</p>
              <p className='font-semibold text-slate-800'>
                {getEmployeeShirtSize(selectedEmployee)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Tamanho da calça</p>
              <p className='font-semibold text-slate-800'>
                {getEmployeePantsSize(selectedEmployee)}
              </p>
            </div>

            <div>
              <p className='text-sm text-slate-500'>Tamanho da bota</p>
              <p className='font-semibold text-slate-800'>
                {getEmployeeBootSize(selectedEmployee)}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderUniformsHistory = () => {
    return (
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Histórico de fardamento
          </h3>
          <p className='mt-1 text-sm text-slate-500'>
            Entregas vinculadas a este colaborador.
          </p>
        </div>

        {selectedEmployeeHistory.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma entrega de fardamento encontrada para este colaborador.
          </div>
        ) : (
          <div className='space-y-4 p-6'>
            {selectedEmployeeHistory.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
              >
                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <p className='text-lg font-bold text-slate-800'>
                      {item.itemLabel}
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Quantidade: {item.quantity}
                    </p>
                    <p className='text-sm text-slate-500'>
                      Setor: {item.sector}
                    </p>
                    {item.notes ? (
                      <p className='mt-2 text-sm text-slate-600'>
                        Obs: {item.notes}
                      </p>
                    ) : null}
                  </div>

                  <span className='inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderCertificatesHistory = () => {
    return (
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>Atestados</h3>
          <p className='mt-1 text-sm text-slate-500'>
            Registros reais vinculados a este colaborador.
          </p>
        </div>

        {selectedEmployeeCertificates.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhum atestado encontrado para este colaborador.
          </div>
        ) : (
          <div className='space-y-4 p-6'>
            {selectedEmployeeCertificates.map((item) => (
              <div
                key={item.id || item._id || `${item.date}-${item.title}`}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
              >
                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <p className='text-lg font-bold text-slate-800'>
                      {item.title || item.type || 'Atestado'}
                    </p>

                    <p className='mt-1 text-sm text-slate-500'>
                      Dias:{' '}
                      {item.days || item.daysOff || item.quantityDays || '-'}
                    </p>

                    <p className='text-sm text-slate-500'>
                      Status: {item.status || 'Registrado'}
                    </p>

                    {(item.note || item.notes || item.description) && (
                      <p className='mt-2 text-sm text-slate-600'>
                        {item.note || item.notes || item.description}
                      </p>
                    )}
                  </div>

                  <span className='inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                    {formatDate(item.date || item.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderWarningsHistory = () => {
    return (
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>Advertências</h3>
          <p className='mt-1 text-sm text-slate-500'>
            Registros reais vinculados a este colaborador.
          </p>
        </div>

        {selectedEmployeeWarnings.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma advertência encontrada para este colaborador.
          </div>
        ) : (
          <div className='space-y-4 p-6'>
            {selectedEmployeeWarnings.map((item) => (
              <div
                key={item.id || item._id || `${item.date}-${item.title}`}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
              >
                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <p className='text-lg font-bold text-slate-800'>
                      {item.title || item.type || 'Advertência'}
                    </p>

                    <p className='mt-1 text-sm text-slate-500'>
                      Status: {item.status || 'Registrada'}
                    </p>

                    {(item.note || item.notes || item.description) && (
                      <p className='mt-2 text-sm text-slate-600'>
                        {item.note || item.notes || item.description}
                      </p>
                    )}
                  </div>

                  <span className='inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'>
                    {formatDate(item.date || item.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderSchedulesHistory = () => {
    return (
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>Escalas</h3>
          <p className='mt-1 text-sm text-slate-500'>
            Escalas reais vinculadas a este colaborador.
          </p>
        </div>

        {selectedEmployeeSchedules.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma escala encontrada para este colaborador.
          </div>
        ) : (
          <div className='space-y-4 p-6'>
            {selectedEmployeeSchedules.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
              >
                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <p className='text-lg font-bold text-slate-800'>
                      {item.scheduleType || '-'}
                    </p>

                    <p className='mt-1 text-sm text-slate-500'>
                      Modelo: {item.workModel || '-'}
                    </p>

                    <p className='text-sm text-slate-500'>
                      Categoria: {item.categoryType || '-'}
                    </p>

                    <p className='text-sm text-slate-500'>
                      Cargo de confiança: {item.isTrustPosition ? 'Sim' : 'Não'}
                    </p>

                    <p className='text-sm text-slate-500'>
                      Trabalha em feriados:{' '}
                      {item.worksOnHolidays ? 'Sim' : 'Não'}
                    </p>

                    {item.observations ? (
                      <p className='mt-2 text-sm text-slate-600'>
                        Obs: {item.observations}
                      </p>
                    ) : null}
                  </div>

                  <span className='inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700'>
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderHistoryTabContent = () => {
    if (!selectedEmployee) return null;

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
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando colaboradores...
        </div>
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
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum colaborador encontrado.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className='rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
          >
            <div className='flex flex-col gap-4'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-700'>
                    {getEmployeeName(emp).charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className='text-xl font-bold text-slate-800'>
                      {getEmployeeName(emp)}
                    </h3>
                    <p className='text-sm text-slate-500'>
                      {getEmployeeRole(emp)}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    getEmployeeStatus(emp)
                  )}`}
                >
                  {getEmployeeStatus(emp)}
                </span>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Departamento</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {emp.department || '-'}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Admissão</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {formatDate(emp.admissionDate)}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>E-mail</p>
                  <p className='mt-1 font-semibold text-slate-800 break-all'>
                    {emp.email || '-'}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Telefone</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {formatPhone(emp.phone)}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Camisa</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {getEmployeeShirtSize(emp)}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Calça</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {getEmployeePantsSize(emp)}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2'>
                  <p className='text-sm text-slate-500'>Bota</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {getEmployeeBootSize(emp)}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => handleEdit(emp)}
                  className='rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100'
                >
                  Editar
                </button>

                <button
                  type='button'
                  onClick={() => handleHistory(emp)}
                  className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
                >
                  Histórico
                </button>

                <button
                  type='button'
                  onClick={() => handleDelete(emp.id)}
                  className='rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100'
                >
                  Excluir
                </button>
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
          <div className='px-6 py-10 text-slate-500'>
            Carregando colaboradores...
          </div>
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
                    CPF
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Contato
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Cargo
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Departamento
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
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5'>
                      <div className='flex items-center gap-3'>
                        <div className='flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700'>
                          {getEmployeeName(emp).charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className='font-semibold text-slate-800'>
                            {getEmployeeName(emp)}
                          </p>
                          <p className='text-sm text-slate-500'>
                            Nascimento: {formatDate(emp.birthDate)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {formatCpf(emp.cpf)}
                    </td>

                    <td className='px-6 py-5'>
                      <div>
                        <p className='text-sm font-medium text-slate-700'>
                          {emp.email || '-'}
                        </p>
                        <p className='text-sm text-slate-500'>
                          {formatPhone(emp.phone)}
                        </p>
                      </div>
                    </td>

                    <td className='px-6 py-5 text-sm font-medium text-slate-700'>
                      {getEmployeeRole(emp)}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {emp.department || '-'}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {formatDate(emp.admissionDate)}
                    </td>

                    <td className='px-6 py-5'>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          getEmployeeStatus(emp)
                        )}`}
                      >
                        {getEmployeeStatus(emp)}
                      </span>
                    </td>

                    <td className='px-6 py-5'>
                      <div className='flex flex-wrap items-center justify-center gap-2'>
                        <button
                          onClick={() => handleEdit(emp)}
                          className='rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100'
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleHistory(emp)}
                          className='rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100'
                        >
                          Histórico
                        </button>

                        <button
                          onClick={() => handleDelete(emp.id)}
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
              Gerencie os colaboradores cadastrados no sistema.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo colaborador
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de colaboradores</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {employeeStats.total}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Ativos</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {employeeStats.active}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Departamentos</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {employeeStats.departments}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Busca rápida</p>
            <input
              type='text'
              placeholder='Buscar por nome, CPF, e-mail, telefone ou cargo'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
            />
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
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
                <option value='Ativo'>Ativo</option>
                <option value='Inativo'>Inativo</option>
                <option value='Férias'>Férias</option>
              </select>
            </div>

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

      {isCreateModalOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeCreateModal}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeCreateModal}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      Cadastro de colaborador
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Novo colaborador
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Preencha os dados abaixo para cadastrar um novo
                      colaborador no sistema.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeCreateModal}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateEmployee}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados pessoais
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Informações básicas do colaborador.
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Estado civil
                        </label>
                        <select
                          name='maritalStatus'
                          value={formData.maritalStatus}
                          onChange={handleChange}
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
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Contato
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Canais principais para comunicação.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          E-mail
                        </label>
                        <input
                          type='email'
                          name='email'
                          value={formData.email}
                          onChange={handleChange}
                          placeholder='Digite o e-mail'
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
                          onChange={handleChange}
                          placeholder='Digite o telefone'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados profissionais
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Informações internas da empresa.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Cargo
                        </label>
                        <input
                          type='text'
                          name='position'
                          value={formData.position}
                          onChange={handleChange}
                          placeholder='Digite o cargo'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Departamento
                        </label>
                        <input
                          type='text'
                          name='department'
                          value={formData.department}
                          onChange={handleChange}
                          placeholder='Digite o departamento'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de admissão
                        </label>
                        <input
                          type='date'
                          name='admissionDate'
                          value={formData.admissionDate}
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          Observações
                        </label>
                        <textarea
                          name='notes'
                          value={formData.notes}
                          onChange={handleChange}
                          rows='4'
                          placeholder='Observações adicionais'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
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
                    onClick={closeCreateModal}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={saving}
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {saving ? 'Salvando...' : 'Cadastrar colaborador'}
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
                      {getEmployeeName(selectedEmployee)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className='mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'>
                        Histórico do colaborador
                      </div>
                      <h2 className='text-2xl font-bold text-slate-800'>
                        {getEmployeeName(selectedEmployee)}
                      </h2>
                      <p className='mt-1 text-sm text-slate-500'>
                        {getEmployeeRole(selectedEmployee)} •{' '}
                        {selectedEmployee.department || '-'}
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
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Status</p>
                  <div className='mt-2'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        getEmployeeStatus(selectedEmployee)
                      )}`}
                    >
                      {getEmployeeStatus(selectedEmployee)}
                    </span>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Departamento</p>
                  <p className='mt-2 font-bold text-slate-800'>
                    {selectedEmployee.department || '-'}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Admissão</p>
                  <p className='mt-2 font-bold text-slate-800'>
                    {formatDate(selectedEmployee.admissionDate)}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Uniformes recebidos</p>
                  <p className='mt-2 text-2xl font-bold text-slate-800'>
                    {employeeHistorySummary.totalUniforms}
                  </p>
                </div>
              </div>
            </div>

            <div className='border-b border-slate-200 bg-white p-3'>
              <div className='flex flex-wrap gap-2 px-3'>
                <button
                  type='button'
                  onClick={() => setHistoryTab('summary')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    historyTab === 'summary'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Resumo
                </button>

                <button
                  type='button'
                  onClick={() => setHistoryTab('uniforms')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    historyTab === 'uniforms'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Fardamento
                </button>

                <button
                  type='button'
                  onClick={() => setHistoryTab('certificates')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    historyTab === 'certificates'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Atestados
                </button>

                <button
                  type='button'
                  onClick={() => setHistoryTab('warnings')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    historyTab === 'warnings'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Advertências
                </button>

                <button
                  type='button'
                  onClick={() => setHistoryTab('schedules')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    historyTab === 'schedules'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Escalas
                </button>
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

export default Employees;
