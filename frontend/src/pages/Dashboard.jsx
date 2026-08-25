import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api from '../services/api';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ChevronRight,
  Minus,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
} from 'lucide-react';

const DashboardCharts = lazy(
  () => import('../components/dashboard/DashboardCharts')
);

const DashboardChartSkeleton = ({ title, description, height = 340 }) => (
  <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
    <h2 className='text-xl font-bold text-slate-900'>{title}</h2>
    <p className='mt-1 text-sm text-slate-500'>{description}</p>
    <div
      className='mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5'
      style={{ minHeight: height }}
    >
      <div className='flex h-full items-end gap-3'>
        {[42, 58, 66, 50, 74, 61].map((size, index) => (
          <div key={`chart-skeleton-${index}`} className='flex-1'>
            <div
              className='w-full animate-pulse rounded-t-2xl bg-slate-200'
              style={{ height: `${size}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const getEmployeeDisplayName = (employee) =>
  employee?.fullName || employee?.name || 'Colaborador';

const getEmployeeInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'CL';

  return parts.map((part) => part[0]?.toUpperCase()).join('');
};

const normalizeTone = (tone = 'slate') => {
  const allowedTones = ['blue', 'amber', 'emerald', 'red', 'violet', 'slate'];

  return allowedTones.includes(tone) ? tone : 'slate';
};

const getRiskLabel = (score) => {
  if (score >= 70) return { label: 'ALTO', tone: 'red' };
  if (score >= 40) return { label: 'MEDIO', tone: 'amber' };
  return { label: 'BAIXO', tone: 'emerald' };
};

const formatPercentage = (value, fallback = 0) => {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
};

const getTrendIcon = (direction) => {
  if (direction === 'up') {
    return ArrowUpRight;
  }

  if (direction === 'down') {
    return ArrowDownRight;
  }

  return Minus;
};

const getTrendText = (trend) => {
  if (trend?.insufficientData) {
    return 'Dados insuficientes';
  }

  if (!Number.isFinite(Number(trend?.delta))) {
    return 'Sem leitura comparativa';
  }

  const delta = Number(trend.delta);

  if (delta === 0) {
    return 'Estavel';
  }

  return `${delta > 0 ? '+' : ''}${delta}%`;
};

function Dashboard({ onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [uniforms, setUniforms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [benefits, setBenefits] = useState([]);

  const [filter, setFilter] = useState('atestados');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [employeeEvaluationSearch, setEmployeeEvaluationSearch] = useState('');
  const [activeEmployeeId, setActiveEmployeeId] = useState(null);

  const [dashboardSummary, setDashboardSummary] = useState({
    employees: 0,
    vacations: 0,
    leaves: 0,
    activeLeaves: 0,
    uniformsDelivered: 0,
    stockLow: 0,
    pendingCertificates: 0,
    pendingDocuments: 0,
    incompleteOnboardings: 0,
    upcomingVacations: 0,
    returningFromVacation: 0,
    birthdaysThisMonth: 0,
    alerts: [],
    executiveMetrics: {
      riskOperational: { score: 0, level: 'BAIXO', tone: 'emerald' },
      criticalPending: { count: 0 },
      complianceRh: { value: 100 },
      slaTreatments: { value: 100 },
    },
    attentionCenter: [],
    trends: [],
    riskByDepartment: [],
    topRiskEmployees: [],
    insights: [],
    quickActionBadges: {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  const mapCertificateFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employee?.name || '',
    title: item.title || '',
    type: item.type || 'Atestado medico',
    cid: item.cid || '',
    date: item.startDate || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    days: item.days || 0,
    status: item.status || 'Registrado',
    description: item.managerNotes || '',
    attachmentName: item.fileUrl || '',
    attachmentData: item.fileUrl || '',
    createdAt: item.createdAt || '',
  });

  const mapWarningFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employee?.name || '',
    title: item.title || '',
    type: item.type || 'Advertencia verbal',
    date: item.warningDate || '',
    warningDate: item.warningDate || '',
    status: item.status || 'Registrada',
    description: item.description || '',
    createdAt: item.createdAt || '',
  });

  const mapDocumentFromApi = (item) => ({
    id: item.id,
    title: item.title || '',
    description: item.description || '',
    category: item.category || '',
    fileName: item.fileName || '',
    fileUrl: item.fileUrl || '',
    employeeId: item.employeeId || null,
    employeeName: item.employee?.name || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    status: item.status || '',
  });

  const mapLeaveFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employee?.name || item.employeeName || '',
    type: item.type || 'INSS',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    status: item.status || 'Ativo',
    description: item.description || '',
    createdAt: item.createdAt || '',
  });

  const mapSuspensionFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    employeeName: item.employee?.name || item.employeeName || '',
    title: item.title || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    status: item.status || 'Registrada',
    description: item.description || '',
    createdAt: item.createdAt || '',
  });

  const mapOnboardingFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    employeeName: item.employee?.name || item.employeeName || '',
    status: item.status || 'PENDENTE',
    welcomeSent: Boolean(item.welcomeSent),
    accessCreated: Boolean(item.accessCreated),
    startDate: item.startDate || '',
    completedAt: item.completedAt || '',
  });

  const mapUniformFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    employeeName: item.employee?.name || '',
    quantity: Number(item.quantity || 0),
    deliveryDate: item.deliveryDate || '',
    notes: item.notes || '',
  });

  const mapBenefitFromApi = (item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    employeeName: item.employee?.name || '',
    healthPlan: Boolean(item.healthPlan),
    dentalPlan: Boolean(item.dentalPlan),
    mealVoucher: Boolean(item.mealVoucher),
    transportVoucher: Boolean(item.transportVoucher),
  });

  const fetchData = async () => {
    try {
      const [
        emp,
        vac,
        dash,
        cert,
        warn,
        docs,
        leaveRes,
        suspensionRes,
        onboardingRes,
        uniformsRes,
        benefitsRes,
      ] = await Promise.all([
        api.get('/employees'),
        api.get('/vacations'),
        api.get('/dashboard'),
        api.get('/certificates'),
        api.get('/warnings'),
        api.get('/documents'),
        api.get('/leaves'),
        api.get('/suspensions'),
        api.get('/onboarding'),
        api.get('/uniform-deliveries'),
        api.get('/benefits'),
      ]);

      setEmployees(emp.data?.employees || emp.data || []);
      setVacations(vac.data?.vacations || vac.data || []);
      setDashboardSummary(
        dash.data?.dashboard || {
          employees: 0,
          vacations: 0,
          leaves: 0,
          activeLeaves: 0,
          uniformsDelivered: 0,
          stockLow: 0,
          pendingCertificates: 0,
          pendingDocuments: 0,
          incompleteOnboardings: 0,
          upcomingVacations: 0,
          returningFromVacation: 0,
          birthdaysThisMonth: 0,
          alerts: [],
          executiveMetrics: {
            riskOperational: { score: 0, level: 'BAIXO', tone: 'emerald' },
            criticalPending: { count: 0 },
            complianceRh: { value: 100 },
            slaTreatments: { value: 100 },
          },
          attentionCenter: [],
          trends: [],
          riskByDepartment: [],
          topRiskEmployees: [],
          insights: [],
          quickActionBadges: {},
        }
      );

      const apiCertificates = cert.data?.certificates || [];
      const apiWarnings = warn.data?.warnings || [];
      const apiDocuments = docs.data?.documents || [];
      const apiLeaves = leaveRes.data?.leaves || [];
      const apiSuspensions = suspensionRes.data?.suspensions || [];
      const apiOnboarding = onboardingRes.data?.onboardings || [];
      const apiUniforms = uniformsRes.data?.deliveries || [];
      const apiBenefits = benefitsRes.data?.benefits || [];

      setCertificates(apiCertificates.map(mapCertificateFromApi));
      setWarnings(apiWarnings.map(mapWarningFromApi));
      setDocuments(apiDocuments.map(mapDocumentFromApi));
      setLeaves(apiLeaves.map(mapLeaveFromApi));
      setSuspensions(apiSuspensions.map(mapSuspensionFromApi));
      setOnboarding(apiOnboarding.map(mapOnboardingFromApi));
      setUniforms(apiUniforms.map(mapUniformFromApi));
      setBenefits(apiBenefits.map(mapBenefitFromApi));
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    }
  };

  const generatePDF = async () => {
    try {
      setGeneratingPdf(true);

      const element = document.getElementById('dashboard-report');

      if (!element) {
        alert('Nao foi possivel localizar o dashboard para exportacao.');
        return;
      }

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

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

  const activeEmployee = useMemo(() => {
    if (!activeEmployeeId) return null;

    return (
      employees.find((employee) => Number(employee.id) === Number(activeEmployeeId)) ||
      null
    );
  }, [activeEmployeeId, employees]);

  const activeEmployeeName = activeEmployee
    ? getEmployeeDisplayName(activeEmployee)
    : '';

  const scopedCertificates = useMemo(() => {
    if (!activeEmployeeId) return certificates;

    return certificates.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, certificates]);

  const scopedWarnings = useMemo(() => {
    if (!activeEmployeeId) return warnings;

    return warnings.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, warnings]);

  const scopedLeaves = useMemo(() => {
    if (!activeEmployeeId) return leaves;

    return leaves.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, leaves]);

  const scopedOnboarding = useMemo(() => {
    if (!activeEmployeeId) return onboarding;

    return onboarding.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, onboarding]);

  const scopedUniforms = useMemo(() => {
    if (!activeEmployeeId) return uniforms;

    return uniforms.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, uniforms]);

  const scopedDocuments = useMemo(() => {
    if (!activeEmployeeId) return documents;

    return documents.filter(
      (item) => Number(item.employeeId) === Number(activeEmployeeId)
    );
  }, [activeEmployeeId, documents]);

  const scopedVacations = useMemo(() => {
    if (!activeEmployeeId) return vacations;

    return vacations.filter((item) => {
      const employeeId = item.employeeId || item.employee?.id;
      return Number(employeeId) === Number(activeEmployeeId);
    });
  }, [activeEmployeeId, vacations]);

  const scopedSuspensions = useMemo(() => {
    if (!activeEmployeeId) return suspensions;

    return suspensions.filter((item) => {
      const employeeId = item.employeeId || item.employee?.id;

      if (employeeId) {
        return Number(employeeId) === Number(activeEmployeeId);
      }

      return (
        String(item.employeeName || item.fullName || item.employee || '')
          .trim()
          .toLowerCase() === activeEmployeeName.trim().toLowerCase()
      );
    });
  }, [activeEmployeeId, activeEmployeeName, suspensions]);

  const pendingDocuments = useMemo(() => {
    return scopedDocuments.filter((doc) => {
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
  }, [scopedDocuments]);

  const activeLeavesScoped = useMemo(() => {
    const today = new Date();

    return scopedLeaves.filter((item) => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return false;
      }

      return today >= startDate && today <= endDate;
    });
  }, [scopedLeaves]);

  const leaveReturningSoon = useMemo(() => {
    const today = new Date();

    return scopedLeaves
      .map((item) => {
        const endDate = new Date(item.endDate);

        if (Number.isNaN(endDate.getTime())) return null;

        const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        return {
          ...item,
          daysUntilReturn: diff,
        };
      })
      .filter(
        (item) => item && item.daysUntilReturn >= 0 && item.daysUntilReturn <= 7
      )
      .sort((a, b) => a.daysUntilReturn - b.daysUntilReturn);
  }, [scopedLeaves]);

  const upcomingVacationItems = useMemo(() => {
    const today = new Date();

    return scopedVacations
      .map((item) => {
        const startDate = new Date(item.startDate);

        if (Number.isNaN(startDate.getTime())) return null;

        const diff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));

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
      .slice(0, 4);
  }, [scopedVacations]);

  const upcomingDocumentItems = useMemo(() => {
    return pendingDocuments.slice(0, 3).map((item, index) => ({
      id: item.id || `doc-${index}`,
      title: item.title || item.documentName || 'Documento pendente',
      employeeLabel:
        item.employeeName || item.fullName || item.employee || 'Colaborador',
    }));
  }, [pendingDocuments]);

  const nextEvents = useMemo(() => {
    const events = [];

    upcomingVacationItems.forEach((item, index) => {
      events.push({
        id: `vac-${item.id || index}`,
        title:
          item.daysUntilStart === 0
            ? `${item.employeeLabel} inicia ferias hoje`
            : `${item.employeeLabel} inicia ferias em ${item.daysUntilStart} dia(s)`,
        subtitle: item.acquisitionPeriod || 'Ferias programadas',
        tone: item.daysUntilStart <= 3 ? 'blue' : 'slate',
      });
    });

    leaveReturningSoon.slice(0, 2).forEach((item, index) => {
      const employeeName = item.employeeName || 'Colaborador';

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
        title: `${item.employeeLabel} possui pendencia documental`,
        subtitle: item.title,
        tone: 'red',
      });
    });

    return events.slice(0, 4);
  }, [leaveReturningSoon, upcomingDocumentItems, upcomingVacationItems]);

  const employeeEvaluations = useMemo(() => {
    const normalizedSearch = employeeEvaluationSearch.trim().toLowerCase();

    return employees
      .map((employee) => {
        const employeeName = getEmployeeDisplayName(employee);
        const employeeDocuments = documents.filter(
          (doc) => Number(doc.employeeId) === Number(employee.id)
        );
        const deliveredDocuments = employeeDocuments.filter((doc) => {
          const status = String(doc?.status || '')
            .trim()
            .toUpperCase();

          return ![
            'PENDENTE',
            'PENDENTE_ENVIO',
            'PENDENTE_VALIDACAO',
            'PENDENTE_VALIDADOR',
          ].includes(status);
        });
        const employeeWarnings = warnings.filter(
          (item) => Number(item.employeeId) === Number(employee.id)
        );
        const employeeLeaves = leaves.filter(
          (item) => Number(item.employeeId) === Number(employee.id)
        );
        const employeeOnboarding = onboarding.find(
          (item) => Number(item.employeeId) === Number(employee.id)
        );
        const employeeUniforms = uniforms.filter(
          (item) => Number(item.employeeId) === Number(employee.id)
        );
        const employeeBenefit = benefits.find(
          (item) => Number(item.employeeId) === Number(employee.id)
        );

        const criteria = [
          {
            label: 'Cadastro base',
            done: Boolean(
              employeeName &&
                employee.email &&
                employee.phone &&
                employee.cpf &&
                employee.department &&
                employee.role
            ),
          },
          {
            label: 'Onboarding criado',
            done: Boolean(employeeOnboarding),
          },
          {
            label: 'Boas-vindas',
            done: Boolean(employeeOnboarding?.welcomeSent),
          },
          {
            label: 'Acessos',
            done: Boolean(employeeOnboarding?.accessCreated),
          },
          {
            label: 'Documentos',
            done: deliveredDocuments.length > 0,
          },
          {
            label: 'Beneficios',
            done: Boolean(employeeBenefit),
          },
          {
            label: 'Fardamento',
            done: employeeUniforms.some(
              (item) => Boolean(item.deliveryDate) || item.quantity > 0
            ),
          },
        ];

        const completedCriteria = criteria.filter((item) => item.done).length;
        const percentage = Math.round(
          (completedCriteria / Math.max(criteria.length, 1)) * 100
        );
        const riskScore = employeeWarnings.length * 2 + employeeLeaves.length * 2;

        return {
          id: employee.id,
          name: employeeName,
          role: employee.role || 'Sem cargo',
          department: employee.department || 'Sem departamento',
          status: employee.status || 'ativo',
          initials: getEmployeeInitials(employeeName),
          percentage,
          completedCriteria,
          totalCriteria: criteria.length,
          riskScore,
          missingItems: criteria
            .filter((item) => !item.done)
            .map((item) => item.label),
          onboardingStatus: employeeOnboarding?.status || 'Sem onboarding',
        };
      })
      .filter((item) => {
        if (!normalizedSearch) return true;

        return `
          ${item.name}
          ${item.role}
          ${item.department}
          ${item.status}
          ${item.onboardingStatus}
        `
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name))
      .slice(0, normalizedSearch ? 8 : 6);
  }, [
    benefits,
    documents,
    employeeEvaluationSearch,
    employees,
    leaves,
    onboarding,
    uniforms,
    warnings,
  ]);

  const activeEmployeeEvaluation = useMemo(() => {
    if (!activeEmployeeId) return null;

    return (
      employeeEvaluations.find(
        (item) => Number(item.id) === Number(activeEmployeeId)
      ) || null
    );
  }, [activeEmployeeId, employeeEvaluations]);

  const smartFrontendAlerts = useMemo(() => {
    const extraAlerts = [];

    if (pendingDocuments.length > 0) {
      extraAlerts.push({
        id: 'pending-documents-alert',
        type: 'documents_pending',
        priority: pendingDocuments.length >= 3 ? 'high' : 'medium',
        title: 'Documentos pendentes',
        description: `${pendingDocuments.length} documento(s) aguardando envio ou validacao`,
        page: 'documents',
        tone: pendingDocuments.length >= 3 ? 'red' : 'amber',
      });
    }

    return extraAlerts;
  }, [pendingDocuments]);

  const stats = {
    employees: activeEmployeeId ? 1 : dashboardSummary.employees || employees.length,
    certificates: activeEmployeeId
      ? scopedCertificates.length
      : dashboardSummary.pendingCertificates || scopedCertificates.length,
    vacations: activeEmployeeId
      ? scopedVacations.length
      : dashboardSummary.vacations || vacations.length,
    warnings: scopedWarnings.length,
    suspensions: scopedSuspensions.length,
    leaves: activeEmployeeId
      ? scopedLeaves.length
      : dashboardSummary.leaves || leaves.length,
    activeLeaves: activeEmployeeId
      ? activeLeavesScoped.length
      : dashboardSummary.activeLeaves || activeLeavesScoped.length,
    onboarding: scopedOnboarding.length,
    uniforms: scopedUniforms.length,
    documents: scopedDocuments.length,
    pendingDocuments: pendingDocuments.length,
    upcomingVacations: activeEmployeeId
      ? upcomingVacationItems.length
      : dashboardSummary.upcomingVacations || 0,
    returningFromVacation: activeEmployeeId
      ? leaveReturningSoon.length
      : dashboardSummary.returningFromVacation || 0,
    stockLow: activeEmployeeId ? 0 : dashboardSummary.stockLow || 0,
  };

  const ranking = useMemo(() => {
    const map = {};

    const add = (name, field) => {
      if (!name) return;
      if (!map[name]) map[name] = { name };
      map[name][field] = (map[name][field] || 0) + 1;
    };

    scopedCertificates.forEach((c) => add(c.employeeName, 'atestados'));
    scopedWarnings.forEach((w) => add(w.employeeName, 'advertencias'));
    scopedSuspensions.forEach((s) =>
      add(s.employeeName || s.fullName || s.employee?.name, 'suspensoes')
    );
    scopedLeaves.forEach((l) => add(l.employeeName, 'afastamentos'));
    scopedOnboarding.forEach((o) => add(o.employeeName, 'onboarding'));
    scopedUniforms.forEach((u) => add(u.employeeName, 'fardamento'));
    scopedDocuments.forEach((d) => add(d.employeeName, 'documentos'));
    scopedVacations.forEach((v) =>
      add(v.employee?.name || v.employee?.fullName, 'ferias')
    );

    return Object.values(map);
  }, [
    scopedCertificates,
    scopedDocuments,
    scopedLeaves,
    scopedOnboarding,
    scopedSuspensions,
    scopedUniforms,
    scopedVacations,
    scopedWarnings,
  ]);

  const chartData = useMemo(() => {
    return ranking
      .map((item) => {
        const rawValue =
          filter === 'atestados'
            ? item.atestados || 0
            : filter === 'advertencias'
              ? item.advertencias || 0
              : filter === 'ferias'
                ? item.ferias || 0
                : filter === 'suspensoes'
                  ? item.suspensoes || 0
                  : filter === 'afastamentos'
                    ? item.afastamentos || 0
                    : filter === 'onboarding'
                      ? item.onboarding || 0
                      : filter === 'documentos'
                        ? item.documentos || 0
                        : item.fardamento || 0;

        return {
          name: item.name,
          rawValue,
          value: rawValue === 0 ? 0.1 : rawValue,
        };
      })
      .sort((a, b) => b.rawValue - a.rawValue || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [filter, ranking]);

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

    scopedCertificates.forEach((item) => {
      const baseDate = item.date || item.startDate;
      const parsed = new Date(baseDate);

      if (Number.isNaN(parsed.getTime())) return;

      months[parsed.getMonth()].value += 1;
    });

    return months.map((item) => ({
      ...item,
      plotValue: item.value === 0 ? 0.1 : item.value,
    }));
  }, [scopedCertificates]);

  const localRiskData = useMemo(() => {
    const map = {};

    const add = (employeeName, increment, department = 'Sem departamento', source) => {
      if (!employeeName) return;

      if (!map[employeeName]) {
        map[employeeName] = {
          name: employeeName,
          department,
          score: 0,
          modules: [],
        };
      }

      map[employeeName].score += increment;

      if (source && !map[employeeName].modules.includes(source)) {
        map[employeeName].modules.push(source);
      }
    };

    scopedCertificates.forEach((item) =>
      add(
        item.employeeName,
        String(item.status || '').toUpperCase() === 'PENDENTE' ? 4 : 1,
        employees.find((employee) => Number(employee.id) === Number(item.employeeId))
          ?.department || 'Sem departamento',
        'Atestados'
      )
    );
    scopedWarnings.forEach((item) =>
      add(
        item.employeeName,
        6,
        employees.find((employee) => Number(employee.id) === Number(item.employeeId))
          ?.department || 'Sem departamento',
        'Advertencias'
      )
    );
    scopedSuspensions.forEach((item) =>
      add(
        item.employeeName || item.fullName || item.employee?.name,
        10,
        employees.find((employee) => Number(employee.id) === Number(item.employeeId))
          ?.department || 'Sem departamento',
        'Suspensoes'
      )
    );
    scopedLeaves.forEach((item) =>
      add(
        item.employeeName,
        8,
        employees.find((employee) => Number(employee.id) === Number(item.employeeId))
          ?.department || 'Sem departamento',
        'Afastamentos'
      )
    );
    pendingDocuments.forEach((item) =>
      add(
        item.employeeName,
        4,
        employees.find((employee) => Number(employee.id) === Number(item.employeeId))
          ?.department || 'Sem departamento',
        'Documentos'
      )
    );
    scopedOnboarding
      .filter((item) => !item.completedAt)
      .forEach((item) =>
        add(
          item.employeeName,
          5,
          employees.find((employee) => Number(employee.id) === Number(item.employeeId))
            ?.department || 'Sem departamento',
          'Onboarding'
        )
      );

    return Object.values(map)
      .map((item) => {
        const level = getRiskLabel(Math.min(item.score * 3, 100));

        return {
          ...item,
          level: level.label,
          tone: level.tone,
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [
    employees,
    pendingDocuments,
    scopedCertificates,
    scopedLeaves,
    scopedOnboarding,
    scopedSuspensions,
    scopedWarnings,
  ]);

  const riskData = useMemo(() => {
    if (!activeEmployeeId && dashboardSummary.topRiskEmployees?.length > 0) {
      return dashboardSummary.topRiskEmployees.map((item) => ({
        ...item,
        tone: normalizeTone(item.tone),
      }));
    }

    return localRiskData;
  }, [activeEmployeeId, dashboardSummary.topRiskEmployees, localRiskData]);

  const topCritical = useMemo(() => {
    return [...riskData].sort((a, b) => b.score - a.score).slice(0, 4);
  }, [riskData]);

  const alerts = activeEmployeeId
    ? [...smartFrontendAlerts]
    : [...(dashboardSummary.alerts || []), ...smartFrontendAlerts];

  const executiveCards = useMemo(() => {
    if (activeEmployeeId) {
      const employeeRisk = riskData[0] || { score: 0, level: 'BAIXO', tone: 'emerald' };
      const criticalPendingCount =
        pendingDocuments.length +
        scopedCertificates.filter(
          (item) => String(item.status || '').toUpperCase() === 'PENDENTE'
        ).length +
        scopedOnboarding.filter((item) => !item.completedAt).length +
        activeLeavesScoped.length;

      return [
        {
          title: 'Risco operacional',
          value: employeeRisk.level,
          subtitle: `Score consolidado ${employeeRisk.score || 0}`,
          tone: employeeRisk.tone,
          icon: AlertTriangle,
        },
        {
          title: 'Pendencias criticas',
          value: criticalPendingCount,
          subtitle:
            criticalPendingCount > 0
              ? 'Itens pessoais exigem acao'
              : 'Sem fila critica no momento',
          tone: criticalPendingCount > 0 ? 'amber' : 'emerald',
          icon: Sparkles,
        },
        {
          title: 'Compliance RH',
          value: formatPercentage(activeEmployeeEvaluation?.percentage || 0),
          subtitle: 'Leitura do fluxo individual',
          tone:
            (activeEmployeeEvaluation?.percentage || 0) >= 70
              ? 'emerald'
              : 'amber',
          icon: ShieldCheck,
        },
        {
          title: 'SLA de tratativas',
          value: criticalPendingCount > 0 ? 'Em curso' : '100%',
          subtitle:
            criticalPendingCount > 0
              ? 'Acompanhamento individual ativo'
              : 'Sem atrasos visiveis',
          tone: criticalPendingCount > 0 ? 'blue' : 'emerald',
          icon: TimerReset,
        },
      ];
    }

    const metrics = dashboardSummary.executiveMetrics || {};

    return [
      {
        title: 'Risco operacional',
        value: metrics.riskOperational?.level || 'BAIXO',
        subtitle: `Score consolidado ${metrics.riskOperational?.score || 0}`,
        tone: normalizeTone(metrics.riskOperational?.tone || 'emerald'),
        icon: AlertTriangle,
      },
      {
        title: 'Pendencias criticas',
        value: metrics.criticalPending?.count || 0,
        subtitle:
          (metrics.criticalPending?.count || 0) > 0
            ? 'Itens exigem acao imediata'
            : 'Operacao sem fila critica',
        tone:
          (metrics.criticalPending?.count || 0) >= 5
            ? 'red'
            : (metrics.criticalPending?.count || 0) > 0
              ? 'amber'
              : 'emerald',
        icon: Sparkles,
      },
      {
        title: 'Compliance RH',
        value: formatPercentage(metrics.complianceRh?.value, 100),
        subtitle: 'Conformidade geral do ciclo',
        tone:
          (metrics.complianceRh?.value || 100) >= 80
            ? 'emerald'
            : (metrics.complianceRh?.value || 100) >= 60
              ? 'amber'
              : 'red',
        icon: ShieldCheck,
      },
      {
        title: 'SLA de tratativas',
        value: formatPercentage(metrics.slaTreatments?.value, 100),
        subtitle: 'Acoes tratadas no prazo',
        tone:
          (metrics.slaTreatments?.value || 100) >= 80
            ? 'blue'
            : (metrics.slaTreatments?.value || 100) >= 60
              ? 'amber'
              : 'red',
        icon: TimerReset,
      },
    ];
  }, [
    activeEmployeeEvaluation,
    activeEmployeeId,
    activeLeavesScoped.length,
    dashboardSummary.executiveMetrics,
    pendingDocuments.length,
    riskData,
    scopedCertificates,
    scopedOnboarding,
  ]);

  const attentionCenterItems = useMemo(() => {
    if (activeEmployeeId) {
      return [
        {
          id: 'focused-leave',
          label: 'Afastamentos ativos',
          value: activeLeavesScoped.length,
          description:
            activeLeavesScoped.length > 0
              ? 'Existe afastamento em andamento para este colaborador'
              : 'Sem afastamento ativo neste perfil',
          page: 'leave',
          tone: activeLeavesScoped.length > 0 ? 'amber' : 'emerald',
        },
        {
          id: 'focused-vacation',
          label: 'Ferias proximas',
          value: upcomingVacationItems.length,
          description:
            upcomingVacationItems.length > 0
              ? 'Existe agenda de ferias nos proximos dias'
              : 'Sem ferias proximas neste perfil',
          page: 'vacations',
          tone: upcomingVacationItems.length > 0 ? 'blue' : 'emerald',
        },
        {
          id: 'focused-documents',
          label: 'Pendencias documentais',
          value: pendingDocuments.length,
          description:
            pendingDocuments.length > 0
              ? 'Ha documentacao aguardando regularizacao'
              : 'Documentacao regularizada',
          page: 'documents',
          tone: pendingDocuments.length > 0 ? 'red' : 'emerald',
        },
        {
          id: 'focused-onboarding',
          label: 'Onboarding incompleto',
          value: scopedOnboarding.filter((item) => !item.completedAt).length,
          description:
            scopedOnboarding.filter((item) => !item.completedAt).length > 0
              ? 'Fluxo de integracao ainda aberto'
              : 'Integracao concluida',
          page: 'onboarding',
          tone:
            scopedOnboarding.filter((item) => !item.completedAt).length > 0
              ? 'amber'
              : 'emerald',
        },
      ];
    }

    return (dashboardSummary.attentionCenter || []).map((item) => ({
      ...item,
      tone: normalizeTone(item.tone),
    }));
  }, [
    activeEmployeeId,
    activeLeavesScoped.length,
    dashboardSummary.attentionCenter,
    pendingDocuments.length,
    scopedOnboarding,
    upcomingVacationItems.length,
  ]);

  const trendItems = useMemo(() => {
    if (activeEmployeeId) {
      return [
        {
          key: 'warnings',
          label: 'Advertencias',
          current: scopedWarnings.length,
          previous: 0,
          delta: 0,
          direction: 'neutral',
          summary: 'Comparativo individual em estruturacao',
          insufficientData: true,
        },
        {
          key: 'certificates',
          label: 'Atestados',
          current: scopedCertificates.length,
          previous: 0,
          delta: 0,
          direction: 'neutral',
          summary: 'Comparativo individual em estruturacao',
          insufficientData: true,
        },
        {
          key: 'documents',
          label: 'Documentos',
          current: pendingDocuments.length,
          previous: 0,
          delta: 0,
          direction: 'neutral',
          summary: 'Comparativo individual em estruturacao',
          insufficientData: true,
        },
        {
          key: 'onboarding',
          label: 'Onboarding',
          current: scopedOnboarding.filter((item) => !item.completedAt).length,
          previous: 0,
          delta: 0,
          direction: 'neutral',
          summary: 'Comparativo individual em estruturacao',
          insufficientData: true,
        },
      ];
    }

    return dashboardSummary.trends || [];
  }, [
    activeEmployeeId,
    dashboardSummary.trends,
    pendingDocuments.length,
    scopedCertificates.length,
    scopedOnboarding,
    scopedWarnings.length,
  ]);

  const sectorRiskRanking = useMemo(() => {
    if (activeEmployeeId && activeEmployee) {
      const employeeRisk = riskData[0] || { score: 0, level: 'BAIXO', tone: 'emerald' };
      return [
        {
          department: activeEmployee.department || 'Sem setor',
          score: Math.min((employeeRisk.score || 0) * 3, 100),
          employeeCount: 1,
          level: employeeRisk.level || 'BAIXO',
          tone: normalizeTone(employeeRisk.tone || 'emerald'),
        },
      ];
    }

    return (dashboardSummary.riskByDepartment || []).map((item) => ({
      ...item,
      tone: normalizeTone(item.tone),
    }));
  }, [activeEmployee, activeEmployeeId, dashboardSummary.riskByDepartment, riskData]);

  const operationalInsights = useMemo(() => {
    if (activeEmployeeId) {
      return [
        {
          id: 'focused-risk',
          title: 'Leitura de risco individual',
          description:
            riskData.length > 0
              ? `${riskData[0].name} concentra ocorrencias em ${riskData[0].modules?.join(', ') || 'modulos monitorados'}.`
              : 'Sem sinais relevantes de risco para este perfil.',
          tone: riskData.length > 0 ? riskData[0].tone : 'emerald',
        },
        {
          id: 'focused-pending',
          title: 'Pendencia dominante',
          description:
            activeEmployeeEvaluation?.missingItems?.length > 0
              ? `Foco atual em ${activeEmployeeEvaluation.missingItems[0].toLowerCase()}.`
              : 'Fluxo pessoal completo para acompanhamento do gestor.',
          tone:
            activeEmployeeEvaluation?.missingItems?.length > 0
              ? 'amber'
              : 'emerald',
        },
      ];
    }

    return (dashboardSummary.insights || []).map((item) => ({
      ...item,
      tone: normalizeTone(item.tone),
    }));
  }, [
    activeEmployeeEvaluation?.missingItems,
    activeEmployeeId,
    dashboardSummary.insights,
    riskData,
  ]);

  const quickActions = useMemo(() => {
    const badges = dashboardSummary.quickActionBadges || {};

    return [
      {
        title: 'Colaboradores',
        subtitle: 'Base ativa e dados cadastrais',
        micro: `${stats.employees} pessoa(s) monitorada(s)`,
        badge: badges.employees ?? stats.employees,
        icon: '👥',
        page: 'employees',
        tone: 'slate',
      },
      {
        title: 'Atestados',
        subtitle: 'Pendencias medicas e revisao',
        micro:
          (badges.certificates ?? stats.certificates) > 0
            ? `${badges.certificates ?? stats.certificates} exigem analise`
            : 'Fila medica controlada',
        badge: badges.certificates ?? stats.certificates,
        icon: '🩺',
        page: 'certificates',
        tone: 'amber',
      },
      {
        title: 'Advertencias',
        subtitle: 'Ocorrencias disciplinares recentes',
        micro:
          (badges.warnings ?? stats.warnings) > 0
            ? `${badges.warnings ?? stats.warnings} registro(s) recente(s)`
            : 'Sem pressao operacional',
        badge: badges.warnings ?? stats.warnings,
        icon: '⚠️',
        page: 'warnings',
        tone: 'red',
      },
      {
        title: 'Afastamentos',
        subtitle: 'Licencas ativas e retornos',
        micro:
          (badges.leave ?? stats.activeLeaves) > 0
            ? `${badges.leave ?? stats.activeLeaves} caso(s) ativo(s)`
            : 'Sem afastamentos ativos',
        badge: badges.leave ?? stats.activeLeaves,
        icon: '📅',
        page: 'leave',
        tone: 'blue',
      },
      {
        title: 'Ferias',
        subtitle: 'Planejamento e proximos inicios',
        micro:
          (badges.vacations ?? stats.upcomingVacations) > 0
            ? `${badges.vacations ?? stats.upcomingVacations} inicio(s) proximos`
            : 'Agenda equilibrada',
        badge: badges.vacations ?? stats.upcomingVacations,
        icon: '🌴',
        page: 'vacations',
        tone: 'emerald',
      },
      {
        title: 'Documentos',
        subtitle: 'Pendencias e regularizacao',
        micro:
          (badges.documents ?? stats.pendingDocuments) > 0
            ? `${badges.documents ?? stats.pendingDocuments} item(ns) aguardando`
            : 'Arquivo operacional em dia',
        badge: badges.documents ?? stats.pendingDocuments,
        icon: '📂',
        page: 'documents',
        tone: 'violet',
      },
    ];
  }, [dashboardSummary.quickActionBadges, stats]);

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
                Dashboard estrategico do RH
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Visualize risco, tendencia, prioridades e acoes executivas em um
                painel unico para apoiar decisao e resposta rapida.
              </p>
            </div>

            <div className='flex flex-wrap gap-3 xl:max-w-[760px] xl:justify-end'>
              {quickActions.map((action) => (
                <button
                  key={`hero-${action.page}`}
                  type='button'
                  onClick={() => onNavigate(action.page)}
                  className='rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/20'
                >
                  {action.title}
                  {action.badge > 0 ? (
                    <span className='ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold'>
                      {action.badge}
                    </span>
                  ) : null}
                </button>
              ))}

              <button
                type='button'
                onClick={generatePDF}
                disabled={generatingPdf}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {generatingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
              </button>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 md:flex-row xl:flex-col'>
          <button
            type='button'
            onClick={() => onNavigate('calendar')}
            className='flex min-w-[260px] items-center gap-4 rounded-3xl border border-blue-100 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
          >
            <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm'>
              <CalendarDays className='h-7 w-7' />
            </div>

            <div className='text-left'>
              <p className='text-lg font-semibold text-slate-900'>Calendario</p>
              <p className='text-sm text-slate-500'>Google / Outlook</p>
            </div>
          </button>

          <button
            type='button'
            onClick={() => onNavigate('calendar')}
            className='min-w-[260px] rounded-3xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
          >
            <div className='flex items-start gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700'>
                <BellRing className='h-7 w-7' />
              </div>

              <div className='min-w-0 flex-1'>
                <p className='text-lg font-semibold text-slate-900'>
                  Proximos eventos
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

          <div className='min-w-[260px] rounded-3xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm'>
            <div>
              <p className='text-lg font-semibold text-slate-900'>
                Avaliacao por colaborador
              </p>
              <p className='text-sm text-slate-500'>
                Pesquise e aplique foco no dashboard por pessoa.
              </p>
            </div>

            <div className='mt-4'>
              <input
                type='text'
                value={employeeEvaluationSearch}
                onChange={(e) => setEmployeeEvaluationSearch(e.target.value)}
                placeholder='Buscar colaborador, cargo ou departamento'
                className='w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:bg-white'
              />
            </div>

            <div className='mt-4 space-y-3 xl:max-h-[360px] xl:overflow-y-auto xl:pr-1'>
              {employeeEvaluations.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Nenhum colaborador encontrado para essa busca.
                </div>
              ) : (
                employeeEvaluations.map((employee) => (
                  <button
                    type='button'
                    key={employee.id}
                    onClick={() =>
                      setActiveEmployeeId((current) =>
                        Number(current) === Number(employee.id)
                          ? null
                          : Number(employee.id)
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      Number(activeEmployeeId) === Number(employee.id)
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-700 text-sm font-bold text-white shadow-sm'>
                        {employee.initials}
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-bold text-slate-900'>
                              {employee.name}
                            </p>
                            <p className='truncate text-xs text-slate-500'>
                              {employee.role} - {employee.department}
                            </p>
                          </div>

                          <span className='rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700'>
                            {employee.percentage}%
                          </span>
                        </div>

                        <div className='mt-3 h-2 overflow-hidden rounded-full bg-slate-200'>
                          <div
                            className='h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all'
                            style={{ width: `${employee.percentage}%` }}
                          />
                        </div>

                        <div className='mt-3 flex flex-wrap items-center gap-2 text-xs'>
                          <span className='rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700'>
                            {employee.completedCriteria}/{employee.totalCriteria}{' '}
                            etapas
                          </span>
                          <span className='rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700'>
                            {employee.onboardingStatus}
                          </span>
                          {Number(activeEmployeeId) === Number(employee.id) ? (
                            <span className='rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 font-semibold text-blue-700'>
                              Filtro ativo
                            </span>
                          ) : null}
                        </div>

                        <p className='mt-3 text-xs text-slate-500'>
                          {employee.missingItems.length > 0
                            ? `Pendencias: ${employee.missingItems.join(', ')}`
                            : 'Fluxo completo para acompanhamento do gestor.'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div id='dashboard-report' className='space-y-8'>
        {activeEmployee ? (
          <div className='flex flex-col gap-3 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm md:flex-row md:items-center md:justify-between'>
            <div>
              <p className='text-sm font-semibold uppercase tracking-[0.2em] text-blue-600'>
                Modo focado
              </p>
              <h2 className='mt-1 text-2xl font-bold'>{activeEmployeeName}</h2>
              <p className='mt-1 text-sm text-blue-700'>
                O dashboard esta exibindo leitura estrategica concentrada neste
                colaborador.
              </p>
            </div>

            <button
              type='button'
              onClick={() => setActiveEmployeeId(null)}
              className='rounded-full border border-blue-300 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
            >
              Limpar filtro
            </button>
          </div>
        ) : null}

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {executiveCards.map((card) => (
            <ExecutiveMetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              tone={card.tone}
              icon={card.icon}
            />
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[1.18fr_0.82fr]'>
          <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <p className='text-sm font-medium uppercase tracking-[0.2em] text-slate-300'>
                    Modulo inteligente
                  </p>
                  <h2 className='mt-2 text-2xl font-bold'>Previsao de risco</h2>
                  <p className='mt-2 max-w-2xl text-sm text-slate-300'>
                    Score consolidado por ocorrencias, pendencias e sinais
                    operacionais que exigem leitura proativa do RH.
                  </p>
                </div>

                {!activeEmployeeId ? (
                  <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-sm'>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
                      Score geral
                    </p>
                    <p className='mt-1 text-3xl font-bold'>
                      {dashboardSummary.executiveMetrics?.riskOperational?.score || 0}
                    </p>
                    <p className='text-sm text-slate-300'>
                      {dashboardSummary.executiveMetrics?.riskOperational?.level ||
                        'BAIXO'}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className='grid gap-4 p-6 lg:grid-cols-2'>
              {topCritical.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 lg:col-span-2'>
                  Ainda nao ha sinais suficientes para analise de risco.
                </div>
              ) : (
                topCritical.map((item) => (
                  <div
                    key={`${item.name}-${item.score}`}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-lg font-bold text-slate-900'>
                          {item.name}
                        </p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {item.department || 'Sem setor definido'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getToneBadgeClasses(
                          item.tone
                        )}`}
                      >
                        {item.level} ({item.score})
                      </span>
                    </div>

                    <div className='mt-4 h-2 overflow-hidden rounded-full bg-slate-200'>
                      <div
                        className={`h-full rounded-full ${getProgressBarClasses(
                          item.tone
                        )}`}
                        style={{ width: `${Math.min(item.score * 6, 100)}%` }}
                      />
                    </div>

                    <div className='mt-4 flex flex-wrap gap-2'>
                      {(item.modules || []).slice(0, 3).map((moduleName) => (
                        <span
                          key={`${item.name}-${moduleName}`}
                          className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600'
                        >
                          {moduleName}
                        </span>
                      ))}
                    </div>

                    <div className='mt-4 flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => onNavigate('employees')}
                        className='rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100'
                      >
                        Ver colaborador
                      </button>
                      <button
                        type='button'
                        onClick={() => onNavigate('warnings')}
                        className='rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100'
                      >
                        Ver ocorrencias
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Prioridade operacional'
              title='Central de atencao do dia'
              description='O que exige acao agora com leitura direta e contexto executivo.'
            />

            <div className='mt-5 space-y-3'>
              {attentionCenterItems.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Nenhuma atencao prioritaria identificada no momento.
                </div>
              ) : (
                attentionCenterItems.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => item.page && onNavigate(item.page)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${getTonePanelClasses(
                      item.tone
                    )}`}
                  >
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-3'>
                        <span className='text-lg font-bold'>{item.value}</span>
                        <p className='text-sm font-semibold'>{item.label}</p>
                      </div>
                      <p className='mt-1 text-sm opacity-90'>{item.description}</p>
                    </div>

                    <ChevronRight className='h-5 w-5 shrink-0 opacity-70' />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {trendItems.map((trend) => (
            <TrendCard key={trend.key || trend.label} trend={trend} />
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[0.94fr_1.06fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Visao gerencial'
              title='Risco por setor'
              description='Ranking executivo das areas com maior exposicao operacional.'
            />

            <div className='mt-6 space-y-4'>
              {sectorRiskRanking.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Ainda nao ha setores com sinalizacao relevante de risco.
                </div>
              ) : (
                sectorRiskRanking.map((item) => (
                  <div
                    key={item.department}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-base font-bold text-slate-900'>
                          {item.department}
                        </p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {item.employeeCount || 0} colaborador(es) no radar
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getToneBadgeClasses(
                          item.tone
                        )}`}
                      >
                        {item.level}
                      </span>
                    </div>

                    <div className='mt-4 h-2 overflow-hidden rounded-full bg-slate-200'>
                      <div
                        className={`h-full rounded-full ${getProgressBarClasses(
                          item.tone
                        )}`}
                        style={{ width: `${Math.max(item.score || 0, 6)}%` }}
                      />
                    </div>

                    <div className='mt-3 flex items-center justify-between text-xs text-slate-500'>
                      <span>Score executivo</span>
                      <span className='font-semibold text-slate-700'>
                        {item.score || item.rawScore || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Inteligencia operacional'
              title='Leituras que orientam a gestao'
              description='Insights discretos e acionaveis para acelerar priorizacao e resposta.'
            />

            <div className='mt-6 grid gap-4 md:grid-cols-2'>
              {operationalInsights.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 md:col-span-2'>
                  Ainda nao ha insights suficientes para este recorte.
                </div>
              ) : (
                operationalInsights.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${getTonePanelClasses(
                      item.tone
                    )}`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70'>
                        <Sparkles className='h-5 w-5' />
                      </div>
                      <div>
                        <p className='text-sm font-bold'>{item.title}</p>
                        <p className='mt-1 text-sm opacity-90'>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-700 text-white'>
                  <TrendingUp className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-900'>
                    Sintese executiva
                  </p>
                  <p className='mt-1 text-sm text-slate-600'>
                    {alerts.length > 0
                      ? `${alerts.length} alerta(s) relevantes seguem ativos para monitoramento prioritario.`
                      : 'Nenhum alerta critico no momento. O painel segue em zona de estabilidade.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[1.12fr_0.88fr]'>
          <DeferredSection
            fallback={
              <DashboardChartSkeleton
                title='Indicadores por colaborador'
                description='A leitura analitica dos graficos sera carregada quando esta area entrar em foco.'
              />
            }
          >
            <Suspense
              fallback={
                <DashboardChartSkeleton
                  title='Indicadores por colaborador'
                  description='Carregando leitura analitica do dashboard...'
                />
              }
            >
              <DashboardCharts
                chartData={chartData}
                filter={filter}
                monthlyData={monthlyData}
                setFilter={setFilter}
                variant='employeeIndicators'
              />
            </Suspense>
          </DeferredSection>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Radar de pessoas'
              title='Ranking de prontidao'
              description='Leitura de completude, onboarding e pendencias por pessoa.'
            />

            <div className='mt-5 space-y-3'>
              {employeeEvaluations.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Nenhum colaborador encontrado para esta leitura.
                </div>
              ) : (
                employeeEvaluations.map((employee) => (
                  <button
                    type='button'
                    key={`ranking-${employee.id}`}
                    onClick={() =>
                      setActiveEmployeeId((current) =>
                        Number(current) === Number(employee.id)
                          ? null
                          : Number(employee.id)
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      Number(activeEmployeeId) === Number(employee.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-700 text-sm font-bold text-white'>
                        {employee.initials}
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-bold text-slate-900'>
                              {employee.name}
                            </p>
                            <p className='truncate text-xs text-slate-500'>
                              {employee.role} - {employee.department}
                            </p>
                          </div>

                          <span className='rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700'>
                            {employee.percentage}%
                          </span>
                        </div>

                        <div className='mt-3 h-2 overflow-hidden rounded-full bg-slate-200'>
                          <div
                            className='h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500'
                            style={{ width: `${employee.percentage}%` }}
                          />
                        </div>

                        <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                          <span className='rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700'>
                            {employee.completedCriteria}/{employee.totalCriteria}{' '}
                            etapas
                          </span>
                          <span className='rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700'>
                            Risco {employee.riskScore}
                          </span>
                        </div>

                        <p className='mt-3 text-xs text-slate-500'>
                          {employee.missingItems.length > 0
                            ? `Top pendencias: ${employee.missingItems.join(', ')}`
                            : 'Fluxo completo para acompanhamento do gestor.'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[0.96fr_1.04fr]'>
          <DeferredSection
            fallback={
              <DashboardChartSkeleton
                title='Evolucao mensal de atestados'
                description='O historico do periodo sera carregado sob demanda para manter o dashboard mais leve.'
                height={300}
              />
            }
          >
            <Suspense
              fallback={
                <DashboardChartSkeleton
                  title='Evolucao mensal de atestados'
                  description='Carregando historico consolidado do periodo...'
                  height={300}
                />
              }
            >
              <DashboardCharts
                chartData={chartData}
                filter={filter}
                monthlyData={monthlyData}
                setFilter={setFilter}
                variant='monthlyCertificates'
              />
            </Suspense>
          </DeferredSection>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Acoes rapidas'
              title='Atalhos inteligentes'
              description='Navegue com contexto operacional, badge de fila e proxima acao sugerida.'
            />

            <div className='mt-5 grid gap-4 md:grid-cols-2'>
              {quickActions.map((item) => (
                <button
                  key={item.page}
                  type='button'
                  onClick={() => onNavigate(item.page)}
                  className='group rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
                >
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white transition group-hover:bg-blue-600'>
                      {item.icon}
                    </div>

                    {item.badge > 0 ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getToneBadgeClasses(item.tone)}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </div>

                  <h3 className='text-lg font-bold text-slate-900'>{item.title}</h3>
                  <p className='mt-1 text-sm text-slate-500'>{item.subtitle}</p>
                  <p className='mt-3 text-xs font-medium text-slate-600'>
                    {item.micro}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Monitoramento'
              title='Alertas inteligentes'
              description='Pendencias e eventos importantes para otimizar o tempo da gestao.'
            />

            <div className='mt-5 space-y-3'>
              {alerts.length === 0 ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500'>
                  Nenhum alerta relevante no momento.
                </div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type='button'
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

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <SectionHeader
              eyebrow='Leitura adicional'
              title='Resumo tatico do periodo'
              description='Complemento executivo com pontos operacionais que seguem relevantes.'
            />

            <div className='mt-5 grid gap-4 md:grid-cols-2'>
              <MiniAlertCard
                title='Retornos de ferias'
                value={stats.returningFromVacation}
                subtitle='Proximos 7 dias'
                tone='blue'
              />
              <MiniAlertCard
                title='Afastamentos ativos'
                value={stats.activeLeaves}
                subtitle='Licencas em andamento'
                tone='amber'
              />
              <MiniAlertCard
                title='Docs pendentes'
                value={stats.pendingDocuments}
                subtitle='Aguardando acao'
                tone='red'
              />
              <MiniAlertCard
                title='Estoque critico'
                value={stats.stockLow}
                subtitle='Fardamento sob pressao'
                tone='violet'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow ? (
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
          {eyebrow}
        </p>
      ) : null}
      <h2 className='mt-2 text-xl font-bold text-slate-900'>{title}</h2>
      <p className='mt-1 text-sm text-slate-500'>{description}</p>
    </div>
  );
}

function ExecutiveMetricCard({ title, value, subtitle, tone, icon: Icon }) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${getToneContainerClasses(
        tone
      )}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-medium opacity-85'>{title}</p>
          <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
          <p className='mt-2 text-sm opacity-85'>{subtitle}</p>
        </div>

        <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm'>
          <Icon className='h-5 w-5' />
        </div>
      </div>
    </div>
  );
}

function MiniAlertCard({ title, value, subtitle, tone }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${getToneContainerClasses(tone)}`}>
      <p className='text-sm font-medium opacity-80'>{title}</p>
      <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
      <p className='mt-2 text-sm opacity-80'>{subtitle}</p>
    </div>
  );
}

function TrendCard({ trend }) {
  const direction = trend?.direction || 'neutral';
  const tone =
    direction === 'up'
      ? 'amber'
      : direction === 'down'
        ? 'emerald'
        : 'slate';
  const Icon = getTrendIcon(direction);

  return (
    <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-900'>{trend.label}</p>
          <p className='mt-1 text-xs text-slate-500'>
            {trend.current} no periodo atual
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${getToneSoftClasses(
            tone
          )}`}
        >
          <Icon className='h-5 w-5' />
        </div>
      </div>

      <div className='mt-4 flex items-end justify-between gap-3'>
        <p className='text-2xl font-bold text-slate-900'>{getTrendText(trend)}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getToneBadgeClasses(tone)}`}>
          {trend.previous || 0} antes
        </span>
      </div>

      <p className='mt-3 text-sm text-slate-500'>{trend.summary}</p>
    </div>
  );
}

function getToneContainerClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-800';
  }

  if (normalized === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (normalized === 'emerald') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (normalized === 'red') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  if (normalized === 'violet') {
    return 'border-violet-200 bg-violet-50 text-violet-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function getTonePanelClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'emerald') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'red') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'violet') {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getToneSoftClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'blue') {
    return 'bg-blue-100 text-blue-700';
  }

  if (normalized === 'amber') {
    return 'bg-amber-100 text-amber-700';
  }

  if (normalized === 'emerald') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (normalized === 'red') {
    return 'bg-red-100 text-red-700';
  }

  if (normalized === 'violet') {
    return 'bg-violet-100 text-violet-700';
  }

  return 'bg-slate-100 text-slate-700';
}

function getToneBadgeClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'blue') {
    return 'border border-blue-200 bg-blue-100 text-blue-700';
  }

  if (normalized === 'amber') {
    return 'border border-amber-200 bg-amber-100 text-amber-700';
  }

  if (normalized === 'emerald') {
    return 'border border-emerald-200 bg-emerald-100 text-emerald-700';
  }

  if (normalized === 'red') {
    return 'border border-red-200 bg-red-100 text-red-700';
  }

  if (normalized === 'violet') {
    return 'border border-violet-200 bg-violet-100 text-violet-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-700';
}

function getProgressBarClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'blue') {
    return 'bg-gradient-to-r from-blue-500 to-indigo-600';
  }

  if (normalized === 'amber') {
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  }

  if (normalized === 'emerald') {
    return 'bg-gradient-to-r from-emerald-500 to-green-600';
  }

  if (normalized === 'red') {
    return 'bg-gradient-to-r from-red-500 to-rose-600';
  }

  if (normalized === 'violet') {
    return 'bg-gradient-to-r from-violet-500 to-fuchsia-600';
  }

  return 'bg-gradient-to-r from-slate-500 to-slate-700';
}

function getAlertClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'red') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'violet') {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function getEventClasses(tone) {
  const normalized = normalizeTone(tone);

  if (normalized === 'red') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'blue') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default Dashboard;

function DeferredSection({ children, fallback, rootMargin = '220px' }) {
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || shouldRender) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return <div ref={containerRef}>{shouldRender ? children : fallback}</div>;
}
