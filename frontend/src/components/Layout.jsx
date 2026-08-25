import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BadgeAlert,
  BadgeHelp,
  BriefcaseBusiness,
  CalendarDays,
  ChartColumnBig,
  CircleGauge,
  Clock3,
  FileBadge2,
  FileClock,
  FileSearch,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GraduationCap,
  HandCoins,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  Settings2,
  Shield,
  ShieldCheck,
  SquareChartGantt,
  UserCog,
  UserRoundCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { useAuthSession } from '../contexts/AuthSessionContext';
import logoSymbol from '../assets/logo-symbol.png';

const FloatingAssistant = lazy(() => import('./help/FloatingAssistant'));
const PageHelpCard = lazy(() => import('./help/PageHelpCard'));

const SIDEBAR_COLLAPSED_WIDTH = 70;
const SIDEBAR_EXPANDED_WIDTH = 248;
const ICON_BUTTON_SIZE = 46;

const iconProps = {
  size: 19,
  strokeWidth: 1.85,
};

const navigationGroups = [
  {
    key: 'administracao',
    title: 'Administracao',
    items: [
      { key: 'users', label: 'Usuarios', icon: UserCog, permission: 'users.read' },
      {
        key: 'rolesPermissions',
        label: 'Perfis e Permissoes',
        icon: ShieldCheck,
        permission: 'profiles.read',
      },
      { key: 'audit', label: 'Auditoria', icon: ScanSearch, permission: 'audit.read' },
    ],
  },
  {
    key: 'pessoas',
    title: 'Pessoas',
    items: [
      {
        key: 'employees',
        label: 'Colaboradores',
        icon: Users,
        permission: 'employees.read',
      },
      {
        key: 'preadmission',
        label: 'Pre-Admissao',
        icon: NotebookPen,
        permission: 'preadmission.read',
      },
      {
        key: 'onboarding',
        label: 'Integracao (Onboarding)',
        icon: UserRoundCheck,
        permission: 'onboarding.read',
      },
      {
        key: 'benefits',
        label: 'Beneficios',
        icon: HandCoins,
        permission: 'benefits.read',
      },
      {
        key: 'stock',
        label: 'Fardamento',
        icon: PackageCheck,
        permission: 'uniforms.read',
      },
    ],
  },
  {
    key: 'compliance',
    title: 'Compliance',
    items: [
      {
        key: 'documents',
        label: 'Documentos / Arquivos',
        icon: FolderKanban,
        badgeKey: 'documents',
        permission: 'documents.read',
      },
      {
        key: 'certificates',
        label: 'Atestados',
        icon: HeartPulse,
        badgeKey: 'certificates',
        permission: 'documents.read',
      },
      {
        key: 'warnings',
        label: 'Advertencias',
        icon: BadgeAlert,
        badgeKey: 'warnings',
        permission: 'warnings.read',
      },
      {
        key: 'suspensions',
        label: 'Suspensoes',
        icon: Shield,
        permission: 'suspensions.read',
      },
      {
        key: 'leave',
        label: 'Afastamentos',
        icon: FileClock,
        badgeKey: 'leave',
        permission: 'leave.read',
      },
    ],
  },
  {
    key: 'jornada',
    title: 'Jornada',
    items: [
      {
        key: 'timesheet',
        label: 'Folha de Ponto',
        icon: Clock3,
        permission: 'time.read',
      },
      {
        key: 'bankHours',
        label: 'Banco de Horas',
        icon: CircleGauge,
        permission: 'time.bank_hours.read',
      },
      {
        key: 'workSchedules',
        label: 'Escala',
        icon: SquareChartGantt,
        permission: 'work_schedules.read',
      },
    ],
  },
  {
    key: 'departamentoPessoal',
    title: 'Departamento Pessoal',
    items: [
      {
        key: 'payroll',
        label: 'Folha de Pagamento',
        icon: WalletCards,
        permission: 'payroll.read',
      },
      {
        key: 'payslips',
        label: 'Holerites',
        icon: FileBadge2,
        permission: 'payroll.payslip.read',
      },
      {
        key: 'payrollEvents',
        label: 'Eventos da Folha',
        icon: ChartColumnBig,
        permission: 'payroll.event.read',
      },
    ],
  },
  {
    key: 'gestao',
    title: 'Gestao',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.read',
      },
      {
        key: 'reports',
        label: 'Relatorios',
        icon: FileSpreadsheet,
        permission: 'reports.read',
      },
      {
        key: 'trainings',
        label: 'Treinamentos',
        icon: GraduationCap,
        permission: 'trainings.read',
      },
      {
        key: 'recruitment',
        label: 'Recrutamento e Selecao',
        icon: BriefcaseBusiness,
        permission: 'recruitment.read',
      },
      {
        key: 'performance',
        label: 'Desempenho',
        icon: Activity,
        permission: 'performance.read',
      },
      {
        key: 'vacations',
        label: 'Ferias',
        icon: CalendarDays,
        badgeKey: 'vacations',
        permission: 'vacations.read',
      },
      {
        key: 'calendar',
        label: 'Calendario',
        icon: CalendarDays,
        permission: 'calendar.read',
      },
      {
        key: 'help',
        label: 'Central de Ajuda',
        icon: BadgeHelp,
        public: true,
      },
    ],
  },
  {
    key: 'configuracoes',
    title: 'Configuracoes',
    items: [
      {
        key: 'integrations',
        label: 'Integracoes',
        icon: Activity,
        permission: 'integrations.read',
      },
      {
        key: 'settings',
        label: 'Configuracoes',
        icon: Settings2,
        permission: 'settings.read',
      },
    ],
  },
];

const pageTitles = {
  dashboard: 'Visao Geral',
  reports: 'Relatorios',
  employees: 'Colaboradores',
  users: 'Usuarios',
  rolesPermissions: 'Perfis e Permissoes',
  audit: 'Central de Auditoria',
  integrations: 'Integracoes',
  settings: 'Configuracoes',
  preadmission: 'Pre-Admissao',
  stock: 'Fardamento',
  documents: 'Documentos / Arquivos',
  trainings: 'Treinamentos',
  benefits: 'Beneficios',
  onboarding: 'Integracao (Onboarding)',
  recruitment: 'Recrutamento e Selecao',
  performance: 'Desempenho',
  leave: 'Afastamentos',
  suspensions: 'Suspensoes',
  calendar: 'Calendario',
  payroll: 'Folha de Pagamento',
  payslips: 'Holerites',
  payrollEvents: 'Eventos da Folha',
  payrollCharges: 'Encargos',
  timesheet: 'Folha de Ponto',
  bankHours: 'Banco de Horas',
  workSchedules: 'Escala',
  certificates: 'Atestados',
  warnings: 'Advertencias',
  vacations: 'Ferias',
  help: 'Central de Ajuda',
};

function Tooltip({ label, expanded }) {
  if (expanded) return null;

  return (
    <div className='pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-700/80 bg-slate-950/96 px-3 py-2 text-xs font-medium text-slate-100 opacity-0 shadow-[0_14px_30px_rgba(2,6,23,0.5)] transition duration-150 group-hover:opacity-100'>
      {label}
    </div>
  );
}

function SidebarItem({
  item,
  expanded,
  active,
  onNavigate,
  badgeValue = 0,
}) {
  const Icon = item.icon;

  return (
    <div className='group relative flex justify-center'>
      <button
        type='button'
        onClick={() => onNavigate(item.key)}
        aria-label={item.label}
        title={expanded ? undefined : item.label}
        className={`relative flex w-full items-center overflow-hidden rounded-2xl transition ${
          expanded
            ? 'justify-start gap-3 px-3 py-2.5'
            : 'justify-center px-0 py-0'
        } ${
          active
            ? 'bg-gradient-to-r from-blue-500/18 via-blue-400/10 to-cyan-400/5 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.12),0_10px_22px_rgba(37,99,235,0.22)]'
            : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100'
        }`}
        style={!expanded ? { width: ICON_BUTTON_SIZE, height: ICON_BUTTON_SIZE } : undefined}
      >
        {active ? (
          <span className='absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.6)]' />
        ) : null}

        <span
          className={`relative flex items-center justify-center rounded-xl ${
            active ? 'text-blue-100' : ''
          }`}
        >
          <Icon {...iconProps} />
        </span>

        {expanded ? (
          <span className='truncate text-sm font-medium'>{item.label}</span>
        ) : null}

        {badgeValue > 0 ? (
          <span
            className={`absolute flex min-w-[18px] items-center justify-center rounded-full border border-red-300/30 bg-red-500 px-1.5 text-[10px] font-bold text-white ${
              expanded ? 'right-2.5 top-2.5 h-[18px]' : 'right-0 top-0 h-[17px]'
            }`}
          >
            {badgeValue}
          </span>
        ) : null}
      </button>

      <Tooltip label={item.label} expanded={expanded} />
    </div>
  );
}

function Layout({
  children,
  onLogout,
  onNavigate,
  currentPage,
  pendingCertificates = 0,
  warningCount = 0,
}) {
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [canUseHoverSidebar, setCanUseHoverSidebar] = useState(false);
  const { user: currentUser, hasPermission } = useAuthSession();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (min-width: 1024px)'
    );

    const syncHoverCapability = (event) => {
      setCanUseHoverSidebar(event.matches);
      if (!event.matches) {
        setIsHoverExpanded(false);
      }
    };

    syncHoverCapability(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncHoverCapability);
      return () =>
        mediaQuery.removeEventListener('change', syncHoverCapability);
    }

    mediaQuery.addListener(syncHoverCapability);
    return () => mediaQuery.removeListener(syncHoverCapability);
  }, []);

  const isExpanded = isPinnedExpanded || (canUseHoverSidebar && isHoverExpanded);
  const sidebarWidth = isExpanded
    ? SIDEBAR_EXPANDED_WIDTH
    : SIDEBAR_COLLAPSED_WIDTH;

  const dynamicBadges = {
    certificates: pendingCertificates,
    warnings: warningCount,
    documents: pendingCertificates > 0 ? pendingCertificates : 0,
    leave: 0,
    vacations: 0,
  };

  const visibleGroups = useMemo(
    () =>
      navigationGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => item.public || hasPermission(item.permission)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission]
  );

  const currentPageTitle = pageTitles[currentPage] || 'Painel';
  const activeGroupKey = useMemo(
    () =>
      visibleGroups.find((group) =>
        group.items.some((item) => item.key === currentPage)
      )?.key || null,
    [currentPage, visibleGroups]
  );

  return (
    <div className='relative flex min-h-screen w-full overflow-x-hidden bg-[#f3f6fb]'>
      <div
        aria-hidden='true'
        className='shrink-0'
        style={{
          width: sidebarWidth + 20,
          minWidth: sidebarWidth + 20,
          maxWidth: sidebarWidth + 20,
        }}
      />

      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className='fixed inset-y-3 left-3 z-40 flex overflow-hidden rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,#061124_0%,#08152c_45%,#0b1732_100%)] shadow-[0_24px_70px_rgba(2,6,23,0.42)]'
        onMouseEnter={() => {
          if (!isPinnedExpanded && canUseHoverSidebar) {
            setIsHoverExpanded(true);
          }
        }}
        onMouseLeave={() => {
          if (!isPinnedExpanded && canUseHoverSidebar) {
            setIsHoverExpanded(false);
          }
        }}
      >
        <div className='flex min-h-full w-full flex-col px-2.5 py-3 text-slate-100'>
          <div className='mb-5 flex items-center justify-center'>
            <div className='group relative flex w-full items-center justify-center'>
              <button
                type='button'
                onClick={() => {
                  setIsPinnedExpanded((prev) => !prev);
                  setIsHoverExpanded(false);
                }}
                aria-label={
                  isExpanded ? 'Recolher navegacao lateral' : 'Expandir navegacao lateral'
                }
                title={
                  isExpanded ? 'Recolher navegacao lateral' : 'Expandir navegacao lateral'
                }
                className='flex h-11 w-11 items-center justify-center rounded-2xl transition hover:bg-white/[0.05]'
              >
                <img
                  src={logoSymbol}
                  alt='Elo'
                  className='h-10 w-10 object-contain drop-shadow-[0_0_14px_rgba(236,72,153,0.18)]'
                />
              </button>
              <Tooltip label='EloSystem' expanded={isExpanded} />
            </div>
          </div>

          <nav className='no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-visible pb-3'>
            {visibleGroups.map((group) => {
              const isGroupActive = activeGroupKey === group.key;

              return (
                <section
                  key={group.key}
                  className='relative'
                >
                  {isExpanded ? (
                    <div className='mb-2 flex items-center gap-2 px-2'>
                      <span className='h-px flex-1 rounded-full bg-white/8' />
                      <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500'>
                        {group.title}
                      </p>
                    </div>
                  ) : (
                    <div className='mb-1 flex justify-center'>
                      <span
                        className={`h-px rounded-full ${
                          isGroupActive ? 'w-7 bg-cyan-400/40' : 'w-5 bg-white/10'
                        }`}
                      />
                    </div>
                  )}

                  <div
                    className={`flex ${
                      isExpanded ? 'flex-col gap-1.5' : 'flex-col items-center gap-2.5'
                    }`}
                  >
                    {group.items.map((item) => (
                      <SidebarItem
                        key={item.key}
                        item={item}
                        expanded={isExpanded}
                        active={currentPage === item.key}
                        onNavigate={onNavigate}
                        badgeValue={dynamicBadges[item.badgeKey] || 0}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </nav>

          <div className='mt-3 border-t border-white/8 pt-3'>
            <div className='group relative mb-2 flex justify-center'>
              <button
                type='button'
                onClick={() => {
                  setIsPinnedExpanded((prev) => !prev);
                  setIsHoverExpanded(false);
                }}
                aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
                title={isExpanded ? undefined : 'Expandir menu'}
                className={`flex w-full items-center rounded-2xl border border-transparent text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100 ${
                  isExpanded ? 'justify-start gap-3 px-3.5 py-2.5' : 'justify-center'
                }`}
                style={!isExpanded ? { width: ICON_BUTTON_SIZE, height: 38, margin: '0 auto' } : undefined}
              >
                {isExpanded ? (
                  <PanelLeftClose size={17} strokeWidth={1.9} />
                ) : (
                  <PanelLeftOpen size={17} strokeWidth={1.9} />
                )}
                {isExpanded ? <span className='text-sm font-medium'>Menu</span> : null}
              </button>
              <Tooltip label={isExpanded ? 'Recolher menu' : 'Expandir menu'} expanded={isExpanded} />
            </div>
            <div className='group relative flex justify-center'>
              <button
                type='button'
                onClick={onLogout}
                aria-label='Sair'
                title={isExpanded ? undefined : 'Sair'}
                className={`flex w-full items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-red-300/20 hover:bg-red-500/10 hover:text-red-100 ${
                  isExpanded
                    ? 'justify-start gap-3 px-3.5 py-3'
                    : 'justify-center'
                }`}
                style={!isExpanded ? { width: ICON_BUTTON_SIZE, height: ICON_BUTTON_SIZE, margin: '0 auto' } : undefined}
              >
                <LogOut size={18} strokeWidth={1.9} />
                {isExpanded ? <span className='text-sm font-medium'>Sair</span> : null}
              </button>
              <Tooltip label='Sair' expanded={isExpanded} />
            </div>
          </div>
        </div>
      </motion.aside>

      <main className='min-w-0 flex-1 overflow-x-hidden p-6 lg:p-8'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='mb-6 flex flex-wrap items-center justify-between gap-4'
        >
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>
              EloSystem
            </p>
            <h1 className='mt-1 text-3xl font-bold text-slate-950'>
              {currentPageTitle}
            </h1>
          </div>

          <div className='flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white'>
              {String(currentUser?.name || currentUser?.email || 'A')
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <p className='text-sm font-semibold text-slate-900'>
                {currentUser?.name || 'Usuario interno'}
              </p>
              <p className='text-xs text-slate-500'>
                {currentUser?.role || 'Acesso interno'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className='min-h-[calc(100vh-7.5rem)] rounded-[30px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:px-8 lg:py-8'
        >
          <Suspense fallback={null}>
            <PageHelpCard currentPage={currentPage} onOpenHelp={() => onNavigate('help')} />
          </Suspense>
          {children}
        </motion.div>
      </main>

      <Suspense fallback={null}>
        <FloatingAssistant currentPage={currentPage} onNavigate={onNavigate} />
      </Suspense>
    </div>
  );
}

export default Layout;
