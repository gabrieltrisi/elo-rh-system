import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { buildEmployeeRelationCompanyWhere } from '../../utils/employeeCompanyAccess.js';
import {
  PERFORMANCE_WEIGHT_DEFAULTS,
  getPerformanceWeightsSettingsService,
} from '../../services/settingsService.js';
import { getTrainingValiditySnapshot } from '../../utils/trainingStatus.js';

const DEFAULT_WEIGHTS = PERFORMANCE_WEIGHT_DEFAULTS;

const weightsToFactors = (weights = DEFAULT_WEIGHTS) =>
  Object.entries(DEFAULT_WEIGHTS).reduce((acc, [key, fallback]) => {
    acc[key] = Number(weights[key] ?? fallback) / 100;
    return acc;
  }, {});

const normalizeScore = (value, fallback = 0) => {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 100);
};

const normalizeRatingScore = (value) => normalizeScore(Number(value) * 20);

const average = (values, fallback = 0) => {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (!validValues.length) return fallback;
  return validValues.reduce((acc, value) => acc + value, 0) / validValues.length;
};

const roundScore = (value) => Math.round(Number(value || 0) * 10) / 10;

const resolveClassification = (score) => {
  if (score >= 85) return 'EXCELENTE';
  if (score >= 70) return 'BOM';
  if (score >= 50) return 'ATENCAO';
  return 'CRITICO';
};

const getClassificationTone = (classification) => {
  const tones = {
    EXCELENTE: 'green',
    BOM: 'blue',
    ATENCAO: 'amber',
    CRITICO: 'rose',
  };

  return tones[classification] || 'slate';
};

const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const getDefaultPeriod = () => {
  const now = new Date();
  return {
    periodStart: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
    periodEnd: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
};

const buildEmployeeWhere = (companyId, employeeId = null) => ({
  ...buildEmployeeRelationCompanyWhere(companyId),
  ...(employeeId ? { id: Number(employeeId) } : {}),
});

const getEmployeeContext = async (companyId, employeeId = null) => {
  const employees = await prisma.employee.findMany({
    where: buildEmployeeWhere(companyId, employeeId),
    include: {
      employeeCompanies: {
        where: {
          companyId,
        },
        select: {
          role: true,
          department: true,
          registrationNumber: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return employees.map((employee) => {
    const companyLink = employee.employeeCompanies?.[0];

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      status: employee.status,
      role: companyLink?.role || employee.role || '-',
      department: companyLink?.department || employee.department || '-',
      registrationNumber: companyLink?.registrationNumber || '',
    };
  });
};

const buildPeriodFilters = (filters = {}) => {
  const defaultPeriod = getDefaultPeriod();
  const periodStart = parseDate(filters.periodStart, defaultPeriod.periodStart);
  const periodEnd = parseDate(filters.periodEnd, defaultPeriod.periodEnd);

  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    periodStart,
    periodEnd,
  };
};

const loadPerformanceData = async ({ companyId, employeeId, periodStart, periodEnd }) => {
  const startMonth = periodStart.getUTCMonth() + 1;
  const startYear = periodStart.getUTCFullYear();
  const endMonth = periodEnd.getUTCMonth() + 1;
  const endYear = periodEnd.getUTCFullYear();
  const summaryPeriodWhere =
    startYear === endYear
      ? {
          referenceYear: startYear,
          referenceMonth: {
            gte: startMonth,
            lte: endMonth,
          },
        }
      : {
          OR: [
            {
              referenceYear: startYear,
              referenceMonth: {
                gte: startMonth,
              },
            },
            {
              referenceYear: endYear,
              referenceMonth: {
                lte: endMonth,
              },
            },
            {
              referenceYear: {
                gt: startYear,
                lt: endYear,
              },
            },
          ],
        };

  const [
    timeSummaries,
    trainings,
    evaluations,
    peerFeedbacks,
    externalFeedbacks,
    warnings,
    suspensions,
  ] = await Promise.all([
    prisma.timeSummary.findMany({
      where: {
        companyId,
        employeeId,
        ...summaryPeriodWhere,
      },
      orderBy: [{ referenceYear: 'asc' }, { referenceMonth: 'asc' }],
    }),
    prisma.employeeTraining.findMany({
      where: {
        companyId,
        employeeId,
      },
      include: {
        training: true,
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.performanceEvaluation.findMany({
      where: {
        companyId,
        employeeId,
        periodEnd: {
          gte: periodStart,
        },
        periodStart: {
          lte: periodEnd,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.performancePeerFeedback.findMany({
      where: {
        companyId,
        employeeId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        reviewerEmployee: {
          select: {
            id: true,
            name: true,
            department: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.performanceExternalFeedback.findMany({
      where: {
        companyId,
        employeeId,
        feedbackDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: {
        feedbackDate: 'desc',
      },
    }),
    prisma.warning.findMany({
      where: {
        companyId,
        employeeId,
        warningDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: {
        warningDate: 'desc',
      },
    }),
    prisma.suspension.findMany({
      where: {
        companyId,
        employeeId,
        startDate: {
          lte: periodEnd,
        },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      orderBy: {
        startDate: 'desc',
      },
    }),
  ]);

  return {
    timeSummaries,
    trainings,
    evaluations,
    peerFeedbacks,
    externalFeedbacks,
    warnings,
    suspensions,
  };
};

const calculateTrainingScore = (trainings = []) => {
  const completed = trainings.filter((item) => item.status === 'CONCLUIDO').length;
  const pending = trainings.filter((item) =>
    ['PENDENTE', 'EM_ANDAMENTO', 'RECICLAGEM'].includes(item.status)
  ).length;
  const mandatory = trainings.filter((item) => item.training?.isMandatory).length;

  if (!trainings.length) return 70;

  const completionScore = (completed / Math.max(trainings.length, 1)) * 100;
  const mandatoryBonus = mandatory > 0 ? Math.min(completed * 5, 10) : 0;
  const pendingPenalty = Math.min(pending * 4, 20);

  return normalizeScore(completionScore + mandatoryBonus - pendingPenalty, 70);
};

const calculateScore = (data, weights = DEFAULT_WEIGHTS) => {
  const workedMinutes = data.timeSummaries.reduce(
    (acc, item) => acc + (item.workedMinutes || 0),
    0
  );
  const delayMinutes = data.timeSummaries.reduce(
    (acc, item) => acc + (item.delayMinutes || 0),
    0
  );
  const absenceMinutes = data.timeSummaries.reduce(
    (acc, item) => acc + (item.absenceMinutes || 0),
    0
  );
  const overtimeMinutes = data.timeSummaries.reduce(
    (acc, item) => acc + (item.overtimeMinutes || 0),
    0
  );

  const latestEvaluation = data.evaluations[0] || null;
  const punctuality = normalizeScore(100 - Math.min(delayMinutes / 15, 35), 75);
  const attendance = normalizeScore(
    100 - Math.min(absenceMinutes / 60 * 4, 45) - data.suspensions.length * 5,
    75
  );
  const efficiency = normalizeScore(
    latestEvaluation?.efficiencyScore || latestEvaluation?.managerScore,
    75
  );
  const behavior = normalizeScore(
    latestEvaluation?.behaviorScore || latestEvaluation?.managerScore,
    75
  );
  const peerFeedback = average(
    data.peerFeedbacks.map((item) => normalizeRatingScore(item.score)),
    75
  );
  const externalFeedback = average(
    data.externalFeedbacks.map((item) => normalizeRatingScore(item.score)),
    75
  );
  const trainings = calculateTrainingScore(data.trainings);

  const criteria = {
    punctuality: roundScore(punctuality),
    attendance: roundScore(attendance),
    efficiency: roundScore(efficiency),
    behavior: roundScore(behavior),
    peerFeedback: roundScore(peerFeedback),
    externalFeedback: roundScore(externalFeedback),
    trainings: roundScore(trainings),
  };

  const finalScore = roundScore(
    Object.entries(weightsToFactors(weights)).reduce(
      (acc, [key, weight]) => acc + criteria[key] * weight,
      0
    )
  );
  const classification = resolveClassification(finalScore);

  return {
    finalScore,
    classification,
    classificationTone: getClassificationTone(classification),
    criteria,
    weights,
    operationalBase: {
      workedMinutes,
      overtimeMinutes,
      delayMinutes,
      absenceMinutes,
      warningCount: data.warnings.length,
      suspensionCount: data.suspensions.length,
      trainingCount: data.trainings.length,
      completedTrainings: data.trainings.filter((item) => item.status === 'CONCLUIDO').length,
      pendingTrainings: data.trainings.filter((item) => item.status !== 'CONCLUIDO').length,
      peerFeedbackCount: data.peerFeedbacks.length,
      externalFeedbackCount: data.externalFeedbacks.length,
    },
  };
};

const formatFeedback = (feedback) => ({
  id: feedback.id,
  employeeId: feedback.employeeId,
  reviewerEmployeeId: feedback.reviewerEmployeeId,
  reviewerName: feedback.reviewerEmployee?.name || '',
  score: feedback.score,
  category: feedback.category,
  comment: feedback.comment || '',
  createdAt: feedback.createdAt,
});

const formatExternalFeedback = (feedback) => ({
  id: feedback.id,
  employeeId: feedback.employeeId,
  companyName: feedback.companyName,
  score: feedback.score,
  comment: feedback.comment || '',
  serviceContext: feedback.serviceContext || '',
  feedbackDate: feedback.feedbackDate,
});

const toMonthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return '-';
  const [year, month] = monthKey.split('-');
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  return parsed.toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const buildProfileSnapshot = (profile) => {
  const latestEvaluation = profile.evaluations[0] || null;
  const previousEvaluation = profile.evaluations[1] || null;
  const deltaFromPrevious = latestEvaluation && previousEvaluation
    ? roundScore(latestEvaluation.finalScore - previousEvaluation.finalScore)
    : 0;

  return {
    employeeId: profile.employee.id,
    name: profile.employee.name,
    department: profile.employee.department || '-',
    role: profile.employee.role || '-',
    finalScore: profile.score.finalScore,
    classification: profile.score.classification,
    classificationTone: profile.score.classificationTone,
    completedTrainings: profile.score.operationalBase.completedTrainings,
    pendingTrainings: profile.score.operationalBase.pendingTrainings,
    delayMinutes: profile.score.operationalBase.delayMinutes,
    absenceMinutes: profile.score.operationalBase.absenceMinutes,
    peerFeedbackCount: profile.score.operationalBase.peerFeedbackCount,
    externalFeedbackCount: profile.score.operationalBase.externalFeedbackCount,
    deltaFromPrevious,
    latestTrainingAt:
      profile.trainings.find((training) => training.completedAt)?.completedAt || null,
  };
};

const buildDistribution = (profiles = []) => {
  const total = profiles.length || 1;
  const counts = profiles.reduce(
    (acc, profile) => {
      acc[profile.score.classification] += 1;
      return acc;
    },
    {
      EXCELENTE: 0,
      BOM: 0,
      ATENCAO: 0,
      CRITICO: 0,
    }
  );

  return Object.entries(counts).map(([classification, count]) => ({
    classification,
    count,
    percentage: roundScore((count / total) * 100),
    tone: getClassificationTone(classification),
  }));
};

const buildDepartmentRanking = (profiles = []) =>
  Object.values(
    profiles.reduce((acc, profile) => {
      const key = profile.employee.department || 'Sem setor';

      if (!acc[key]) {
        acc[key] = {
          department: key,
          scores: [],
          employees: 0,
        };
      }

      acc[key].scores.push(profile.score.finalScore);
      acc[key].employees += 1;
      return acc;
    }, {})
  )
    .map((item) => ({
      department: item.department,
      averageScore: roundScore(average(item.scores, 0)),
      employees: item.employees,
    }))
    .sort((left, right) => right.averageScore - left.averageScore)
    .slice(0, 5);

const buildEvaluationSeries = (evaluations = []) => {
  const grouped = evaluations.reduce((acc, evaluation) => {
    const monthKey = toMonthKey(evaluation.periodEnd || evaluation.createdAt);
    if (!monthKey) return acc;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthKey,
        scores: [],
      };
    }

    acc[monthKey].scores.push(Number(evaluation.finalScore || 0));
    return acc;
  }, {});

  return Object.values(grouped)
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
    .map((item) => ({
      monthKey: item.monthKey,
      label: formatMonthLabel(item.monthKey),
      averageScore: roundScore(average(item.scores, 0)),
      evaluations: item.scores.length,
    }));
};

const buildCriteriaEvolution = (profiles = []) => {
  const criteriaKeys = [
    ['punctuality', 'Pontualidade'],
    ['attendance', 'Assiduidade'],
    ['efficiency', 'Eficiencia'],
    ['behavior', 'Comportamento'],
    ['peerFeedback', 'Feedback interno'],
    ['externalFeedback', 'Feedback externo'],
    ['trainings', 'Treinamentos'],
  ];

  return criteriaKeys.map(([key, label]) => ({
    key,
    label,
    averageScore: roundScore(
      average(profiles.map((profile) => profile.score.criteria[key]), 0)
    ),
  }));
};

const buildTrainingInsights = (profiles = []) => {
  const lowScorePendingTraining = profiles.filter(
    (profile) =>
      profile.score.finalScore < 70 &&
      profile.score.operationalBase.pendingTrainings > 0
  );
  const improvedAfterTraining = profiles.filter((profile) => {
    const latestTraining = profile.trainings.find((training) => training.completedAt);
    const latestEvaluation = profile.evaluations[0];
    const previousEvaluation = profile.evaluations[1];

    if (!latestTraining?.completedAt || !latestEvaluation || !previousEvaluation) {
      return false;
    }

    const completedAt = new Date(latestTraining.completedAt);
    const evaluationDate = new Date(latestEvaluation.createdAt || latestEvaluation.periodEnd);

    return (
      completedAt <= evaluationDate &&
      latestEvaluation.finalScore > previousEvaluation.finalScore
    );
  });

  const categoryRanking = Object.values(
    profiles.reduce((acc, profile) => {
      profile.trainings
        .filter((training) => training.status === 'CONCLUIDO')
        .forEach((training) => {
          const key = training.category || 'Capacitacao';

          if (!acc[key]) {
            acc[key] = {
              category: key,
              employees: new Set(),
              scores: [],
            };
          }

          acc[key].employees.add(profile.employee.id);
          acc[key].scores.push(profile.score.finalScore);
        });

      return acc;
    }, {})
  )
    .map((item) => ({
      category: item.category,
      employees: item.employees.size,
      averageScore: roundScore(average(item.scores, 0)),
    }))
    .sort((left, right) => right.averageScore - left.averageScore)
    .slice(0, 5);

  return {
    pendingRelevantCount: lowScorePendingTraining.length,
    improvedAfterTrainingCount: improvedAfterTraining.length,
    lowScorePendingTraining: lowScorePendingTraining
      .map(buildProfileSnapshot)
      .sort((left, right) => left.finalScore - right.finalScore)
      .slice(0, 5),
    topTrainingCategories: categoryRanking,
  };
};

export const buildPerformanceProfile = async ({
  companyId,
  employeeId,
  periodStart,
  periodEnd,
}) => {
  const [employee] = await getEmployeeContext(companyId, employeeId);

  if (!employee) {
    throw new AppError('Colaborador nao encontrado para este contexto', 404);
  }

  const data = await loadPerformanceData({
    companyId,
    employeeId,
    periodStart,
    periodEnd,
  });
  const weights = await getPerformanceWeightsSettingsService(companyId);
  const score = calculateScore(data, weights);

  return {
    employee,
    period: {
      periodStart,
      periodEnd,
      label: `${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')}`,
    },
    score,
    evaluations: data.evaluations,
    peerFeedbacks: data.peerFeedbacks.map(formatFeedback),
    externalFeedbacks: data.externalFeedbacks.map(formatExternalFeedback),
    trainings: data.trainings.map((item) => ({
      ...(getTrainingValiditySnapshot({
        status: item.status,
        completedAt: item.completedAt,
        expiresAt: item.expiresAt,
        warningDays: item.training?.renewalDays || 30,
      })),
      id: item.id,
      status: item.status,
      completedAt: item.completedAt,
      expiresAt: item.expiresAt,
      title: item.training?.title || 'Treinamento',
      category: item.training?.category || '-',
      isMandatory: Boolean(item.training?.isMandatory),
    })),
    timeline: [
      ...data.evaluations.map((item) => ({
        id: `evaluation-${item.id}`,
        type: 'Avaliacao da gestora',
        title: item.classification,
        description: item.notes || item.recommendation || 'Avaliacao registrada',
        date: item.createdAt,
      })),
      ...data.peerFeedbacks.map((item) => ({
        id: `peer-${item.id}`,
        type: 'Feedback interno',
        title: item.category,
        description: item.comment || 'Feedback registrado',
        date: item.createdAt,
      })),
      ...data.externalFeedbacks.map((item) => ({
        id: `external-${item.id}`,
        type: 'Feedback externo',
        title: item.companyName,
        description: item.comment || item.serviceContext || 'Feedback externo registrado',
        date: item.feedbackDate,
      })),
      ...data.trainings
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: `training-${item.id}`,
          type: 'Treinamento concluido',
          title: item.training?.title || 'Treinamento',
          description: item.training?.category || 'Capacitacao',
          date: item.completedAt,
        })),
    ].sort((left, right) => new Date(right.date) - new Date(left.date)),
    developmentPlan: data.evaluations[0]
      ? {
          strengths: data.evaluations[0].strengths || '',
          attentionPoints: data.evaluations[0].attentionPoints || '',
          developmentPlan: data.evaluations[0].developmentPlan || '',
          recommendation: data.evaluations[0].recommendation || '',
        }
      : null,
  };
};

export const getPerformancePdfPayloadService = async (
  companyId,
  employeeId,
  filters = {}
) => {
  const { periodStart, periodEnd } = buildPeriodFilters(filters);
  const [company, profile] = await Promise.all([
    prisma.company.findUnique({
      where: {
        id: Number(companyId),
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        legalName: true,
      },
    }),
    buildPerformanceProfile({
      companyId,
      employeeId,
      periodStart,
      periodEnd,
    }),
  ]);

  return {
    company,
    profile,
    period: {
      periodStart,
      periodEnd,
    },
  };
};

export const getPerformanceOptionsService = async (companyId) => {
  const employees = await getEmployeeContext(companyId);
  const departments = [
    ...new Set(employees.map((employee) => employee.department).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'pt-BR'));

  return {
    employees,
    departments,
    classifications: [
      { value: '', label: 'Todas as classificacoes' },
      { value: 'EXCELENTE', label: 'Excelente' },
      { value: 'BOM', label: 'Bom' },
      { value: 'ATENCAO', label: 'Atencao' },
      { value: 'CRITICO', label: 'Critico' },
    ],
    trainingStatuses: [
      { value: '', label: 'Todos os status de treinamento' },
      { value: 'EM_DIA', label: 'Em dia' },
      { value: 'PENDENTE', label: 'Com pendencias' },
      { value: 'SEM_TREINAMENTO', label: 'Sem treinamentos' },
    ],
    periods: [
      { value: 'month', label: 'Mes atual' },
      { value: 'quarter', label: 'Trimestre' },
      { value: 'semester', label: 'Semestre' },
      { value: 'custom', label: 'Personalizado' },
    ],
  };
};

export const getPerformanceDashboardService = async (companyId, filters = {}) => {
  const { periodStart, periodEnd } = buildPeriodFilters(filters);
  const employees = await getEmployeeContext(companyId);

  const employeesInDepartment = filters.department
    ? employees.filter((employee) => employee.department === filters.department)
    : employees;

  if (!employeesInDepartment.length) {
    return {
      employees,
      profile: null,
      summary: {
        totalEmployees: 0,
        evaluatedEmployees: 0,
        averageScore: 0,
        attentionCount: 0,
      },
      executive: {
        distribution: [],
        rankings: {
          topPerformers: [],
          mostImproved: [],
          attentionList: [],
          departments: [],
        },
        evolution: {
          overall: [],
          criteria: [],
          selectedEmployee: [],
        },
        trainingInsights: {
          pendingRelevantCount: 0,
          improvedAfterTrainingCount: 0,
          lowScorePendingTraining: [],
          topTrainingCategories: [],
        },
      },
    };
  }

  const profiles = await Promise.all(
    employeesInDepartment.map((employee) =>
      buildPerformanceProfile({
        companyId,
        employeeId: employee.id,
        periodStart,
        periodEnd,
      })
    )
  );

  const filteredProfiles = profiles.filter((profile) => {
    const matchesClassification = filters.classification
      ? profile.score.classification === filters.classification
      : true;

    const matchesTrainingStatus = (() => {
      if (!filters.trainingStatus) return true;
      if (filters.trainingStatus === 'PENDENTE') {
        return profile.score.operationalBase.pendingTrainings > 0;
      }
      if (filters.trainingStatus === 'EM_DIA') {
        return (
          profile.score.operationalBase.trainingCount > 0 &&
          profile.score.operationalBase.pendingTrainings === 0
        );
      }
      if (filters.trainingStatus === 'SEM_TREINAMENTO') {
        return profile.score.operationalBase.trainingCount === 0;
      }
      return true;
    })();

    return matchesClassification && matchesTrainingStatus;
  });

  const selectedEmployeeId = Number(
    filters.employeeId || filteredProfiles[0]?.employee.id || profiles[0]?.employee.id || 0
  );
  const profile =
    filteredProfiles.find(
      (item) => Number(item.employee.id) === Number(selectedEmployeeId)
    ) ||
    profiles.find((item) => Number(item.employee.id) === Number(selectedEmployeeId)) ||
    filteredProfiles[0] ||
    null;

  const relevantEmployeeIds = filteredProfiles.length
    ? filteredProfiles.map((item) => item.employee.id)
    : employeesInDepartment.map((item) => item.id);

  const periodEvaluations = await prisma.performanceEvaluation.findMany({
    where: {
      companyId,
      employeeId: {
        in: relevantEmployeeIds,
      },
      periodEnd: {
        gte: periodStart,
      },
      periodStart: {
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      employeeId: true,
      finalScore: true,
      classification: true,
      periodEnd: true,
      createdAt: true,
    },
    orderBy: {
      periodEnd: 'asc',
    },
  });

  const profilesForExecutive = filteredProfiles.length ? filteredProfiles : profiles;
  const distribution = buildDistribution(profilesForExecutive);
  const snapshots = profilesForExecutive.map(buildProfileSnapshot);
  const overallEvolution = buildEvaluationSeries(periodEvaluations);
  const criteriaEvolution = buildCriteriaEvolution(profilesForExecutive);
  const trainingInsights = buildTrainingInsights(profilesForExecutive);
  const selectedEmployeeEvolution = buildEvaluationSeries(profile?.evaluations || []);
  const averageScore = roundScore(
    average(
      profilesForExecutive.map((item) => item.score.finalScore),
      profile?.score.finalScore || 0
    )
  );

  return {
    employees,
    profile,
    executive: {
      distribution,
      rankings: {
        topPerformers: [...snapshots]
          .sort((left, right) => right.finalScore - left.finalScore)
          .slice(0, 5),
        mostImproved: [...snapshots]
          .sort((left, right) => right.deltaFromPrevious - left.deltaFromPrevious)
          .filter((item) => item.deltaFromPrevious > 0)
          .slice(0, 5),
        attentionList: [...snapshots]
          .filter((item) => ['ATENCAO', 'CRITICO'].includes(item.classification))
          .sort((left, right) => left.finalScore - right.finalScore)
          .slice(0, 5),
        departments: buildDepartmentRanking(profilesForExecutive),
      },
      evolution: {
        overall: overallEvolution,
        criteria: criteriaEvolution,
        selectedEmployee: selectedEmployeeEvolution,
      },
      trainingInsights,
    },
    summary: {
      totalEmployees: employeesInDepartment.length,
      employeesInScope: profilesForExecutive.length,
      evaluatedEmployees: new Set(periodEvaluations.map((item) => item.employeeId)).size,
      averageScore,
      attentionCount: profilesForExecutive.filter((item) =>
        ['ATENCAO', 'CRITICO'].includes(item.score.classification)
      ).length,
      totalEvaluations: periodEvaluations.length,
      pendingEvaluations: Math.max(
        profilesForExecutive.length -
          new Set(periodEvaluations.map((item) => item.employeeId)).size,
        0
      ),
      excellentCount: distribution.find((item) => item.classification === 'EXCELENTE')?.count || 0,
      goodCount: distribution.find((item) => item.classification === 'BOM')?.count || 0,
      attentionBucketCount:
        distribution.find((item) => item.classification === 'ATENCAO')?.count || 0,
      criticalCount: distribution.find((item) => item.classification === 'CRITICO')?.count || 0,
      pendingRelevantTrainings: trainingInsights.pendingRelevantCount,
      improvedAfterTrainingCount: trainingInsights.improvedAfterTrainingCount,
    },
  };
};

export const createPerformanceEvaluationService = async ({
  companyId,
  userId,
  data,
}) => {
  const employeeId = Number(data.employeeId);
  if (!employeeId) {
    throw new AppError('Selecione o colaborador avaliado', 400);
  }

  const { periodStart, periodEnd } = buildPeriodFilters(data);
  const efficiencyScore = normalizeScore(data.efficiencyScore);
  const behaviorScore = normalizeScore(data.behaviorScore);
  const managerScore = normalizeScore(data.managerScore || average([efficiencyScore, behaviorScore]));

  const currentProfile = await buildPerformanceProfile({
    companyId,
    employeeId,
    periodStart,
    periodEnd,
  });

  const criteria = {
    ...currentProfile.score.criteria,
    efficiency: efficiencyScore,
    behavior: behaviorScore,
  };
  const finalScore = roundScore(
    Object.entries(weightsToFactors(currentProfile.score.weights)).reduce(
      (acc, [key, weight]) => acc + criteria[key] * weight,
      0
    )
  );
  const classification = resolveClassification(finalScore);

  return prisma.performanceEvaluation.create({
    data: {
      companyId,
      employeeId,
      periodStart,
      periodEnd,
      efficiencyScore,
      behaviorScore,
      managerScore,
      finalScore,
      classification,
      notes: data.notes || null,
      strengths: data.strengths || null,
      attentionPoints: data.attentionPoints || null,
      developmentPlan: data.developmentPlan || null,
      recommendation: data.recommendation || null,
      createdByUserId: userId || null,
    },
  });
};

export const createPerformancePeerFeedbackService = async ({
  companyId,
  userId,
  data,
}) => {
  const employeeId = Number(data.employeeId);

  if (!employeeId) {
    throw new AppError('Selecione o colaborador avaliado', 400);
  }

  await buildPerformanceProfile({
    companyId,
    employeeId,
    ...buildPeriodFilters(data),
  });

  return prisma.performancePeerFeedback.create({
    data: {
      companyId,
      employeeId,
      reviewerEmployeeId: data.reviewerEmployeeId
        ? Number(data.reviewerEmployeeId)
        : null,
      score: Math.min(Math.max(Number(data.score || 0), 1), 5),
      category: String(data.category || 'GERAL').trim().toUpperCase(),
      comment: data.comment || null,
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      createdByUserId: userId || null,
    },
  });
};

export const createPerformanceExternalFeedbackService = async ({
  companyId,
  userId,
  data,
}) => {
  const employeeId = Number(data.employeeId);
  const companyName = String(data.companyName || '').trim();

  if (!employeeId) {
    throw new AppError('Selecione o colaborador avaliado', 400);
  }

  if (!companyName) {
    throw new AppError('Informe a empresa ou cliente do feedback', 400);
  }

  await buildPerformanceProfile({
    companyId,
    employeeId,
    ...buildPeriodFilters(data),
  });

  return prisma.performanceExternalFeedback.create({
    data: {
      companyId,
      employeeId,
      companyName,
      score: Math.min(Math.max(Number(data.score || 0), 1), 5),
      comment: data.comment || null,
      serviceContext: data.serviceContext || null,
      feedbackDate: data.feedbackDate ? new Date(data.feedbackDate) : new Date(),
      createdByUserId: userId || null,
    },
  });
};
