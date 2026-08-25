import prisma from '../prisma/client.js';
import {
  dispatchOnboardingWelcomeFlow,
} from '../services/onboardingAutomationService.js';
import { buildEmployeeAccessWhere } from '../utils/employeeCompanyAccess.js';

const normalizeBoolean = (value) => Boolean(value);

const normalizeNullableDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
};

const resolveCompletedAt = ({ status, completedAt, startDate, existing }) => {
  const normalizedStartDate =
    normalizeNullableDate(startDate) || existing?.startDate || null;
  const normalizedCompletedAt = normalizeNullableDate(completedAt);

  if (status === 'CONCLUIDO') {
    const resolvedCompletedAt =
      normalizedCompletedAt || existing?.completedAt || new Date();

    if (
      normalizedStartDate &&
      resolvedCompletedAt.getTime() < normalizedStartDate.getTime()
    ) {
      throw new Error(
        'A data de conclusao nao pode ser menor que a data de inicio.'
      );
    }

    return resolvedCompletedAt;
  }

  return null;
};

const buildSystemsTemplate = (employee) => {
  const name = employee?.name || 'usuario';
  const first = name.split(' ')[0]?.toLowerCase() || 'usuario';

  return [
    {
      systemName: 'E-mail Corporativo',
      accessLink: 'https://mail.google.com',
      username: `${first}@empresa.com.br`,
      temporaryPassword: `Temp@${first}123`,
      notes: 'Ajustar dominio real da empresa',
    },
    {
      systemName: 'ERP / Sistema Interno',
      accessLink: 'https://erp.empresa.com.br',
      username: first,
      temporaryPassword: `Erp@${first}123`,
      notes: 'Criar acesso inicial',
    },
    {
      systemName: 'Portal RH / Ponto',
      accessLink: 'https://rh.empresa.com.br',
      username: first,
      temporaryPassword: `Rh@${first}123`,
      notes: 'Liberar acesso com senha provisoria',
    },
  ];
};

export const createOnboarding = async (req, res) => {
  try {
    const {
      employeeId,
      status,
      welcomeSent,
      accessCreated,
      startDate,
      completedAt,
      notes,
    } = req.body;

    const companyId = req.user.companyId;

    if (!employeeId) {
      return res.status(400).json({
        message: 'Selecione o colaborador',
      });
    }

    const employee = await prisma.employee.findFirst({
      where: buildEmployeeAccessWhere(employeeId, companyId),
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Colaborador nao encontrado',
      });
    }

    const existing = await prisma.onboarding.findUnique({
      where: {
        employeeId: Number(employeeId),
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Onboarding ja existe',
      });
    }

    const resolvedStartDate = normalizeNullableDate(startDate) || new Date();
    const resolvedCompletedAt = resolveCompletedAt({
      status: status || 'PENDENTE',
      completedAt,
      startDate: resolvedStartDate,
    });

    const onboarding = await prisma.onboarding.create({
      data: {
        employeeId: Number(employeeId),
        companyId,
        status: status || 'PENDENTE',
        welcomeSent: normalizeBoolean(welcomeSent),
        accessCreated: normalizeBoolean(accessCreated),
        startDate: resolvedStartDate,
        completedAt: resolvedCompletedAt,
        notes: notes || null,
      },
      include: {
        employee: true,
      },
    });

    return res.status(201).json({
      message: 'Onboarding criado com sucesso',
      onboarding,
    });
  } catch (error) {
    console.error('CREATE ONBOARDING ERROR:', error);
    return res.status(500).json({
      message: error.message || 'Erro ao criar onboarding',
      error: error.message,
    });
  }
};

export const getOnboardings = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const onboardings = await prisma.onboarding.findMany({
      where: {
        companyId,
      },
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      onboardings,
    });
  } catch (error) {
    console.error('GET ONBOARDINGS ERROR:', error);
    return res.status(500).json({
      message: 'Erro ao buscar onboardings',
      error: error.message,
    });
  }
};

export const getOnboardingByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user.companyId;

    const onboarding = await prisma.onboarding.findFirst({
      where: {
        employeeId: Number(employeeId),
        companyId,
      },
      include: {
        employee: true,
      },
    });

    if (!onboarding) {
      return res.status(404).json({
        message: 'Onboarding nao encontrado',
      });
    }

    return res.json({
      onboarding,
    });
  } catch (error) {
    console.error('GET ONBOARDING BY EMPLOYEE ERROR:', error);
    return res.status(500).json({
      message: 'Erro ao buscar onboarding',
      error: error.message,
    });
  }
};

export const updateOnboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const existing = await prisma.onboarding.findFirst({
      where: {
        id: Number(id),
        companyId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Onboarding nao encontrado',
      });
    }

    const resolvedStatus =
      req.body.status !== undefined ? req.body.status : existing.status;
    const resolvedStartDate =
      req.body.startDate !== undefined
        ? normalizeNullableDate(req.body.startDate) || existing.startDate
        : existing.startDate;
    const resolvedCompletedAt = resolveCompletedAt({
      status: resolvedStatus,
      completedAt: req.body.completedAt,
      startDate: resolvedStartDate,
      existing,
    });

    const onboarding = await prisma.onboarding.update({
      where: {
        id: Number(id),
      },
      data: {
        ...(req.body.status !== undefined ? { status: resolvedStatus } : {}),
        ...(req.body.welcomeSent !== undefined
          ? { welcomeSent: normalizeBoolean(req.body.welcomeSent) }
          : {}),
        ...(req.body.accessCreated !== undefined
          ? { accessCreated: normalizeBoolean(req.body.accessCreated) }
          : {}),
        ...(req.body.startDate !== undefined
          ? { startDate: resolvedStartDate }
          : {}),
        completedAt: resolvedCompletedAt,
        ...(req.body.notes !== undefined
          ? { notes: req.body.notes || null }
          : {}),
      },
      include: {
        employee: true,
      },
    });

    return res.json({
      message: 'Onboarding atualizado com sucesso',
      onboarding,
    });
  } catch (error) {
    console.error('UPDATE ONBOARDING ERROR:', error);
    return res.status(500).json({
      message: error.message || 'Erro ao atualizar onboarding',
      error: error.message,
    });
  }
};

export const sendWelcomeOnboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const onboarding = await prisma.onboarding.findFirst({
      where: {
        id: Number(id),
        companyId,
      },
      include: {
        employee: true,
      },
    });

    if (!onboarding) {
      return res.status(404).json({
        message: 'Onboarding nao encontrado',
      });
    }

    if (!onboarding.employee?.email) {
      return res.status(400).json({
        message: 'Colaborador nao possui e-mail cadastrado',
      });
    }

    const result = await dispatchOnboardingWelcomeFlow(onboarding);

    return res.json({
      message: 'Boas-vindas e acessos enviados com sucesso',
      onboarding: result.onboarding,
      accessTemplate: result.accessTemplate,
    });
  } catch (error) {
    console.error('SEND WELCOME ERROR:', error);
    return res.status(500).json({
      message: 'Erro ao enviar boas-vindas e acessos',
      error: error.message,
    });
  }
};

export const generateAccessTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const onboarding = await prisma.onboarding.findFirst({
      where: {
        id: Number(id),
        companyId,
      },
      include: {
        employee: true,
      },
    });

    if (!onboarding) {
      return res.status(404).json({
        message: 'Onboarding nao encontrado',
      });
    }

    const systems = buildSystemsTemplate(onboarding.employee);

    const updated = await prisma.onboarding.update({
      where: {
        id: Number(id),
      },
      data: {
        accessCreated: true,
        status:
          onboarding.status === 'PENDENTE' ? 'EM_ANDAMENTO' : onboarding.status,
      },
      include: {
        employee: true,
      },
    });

    return res.json({
      message: 'Acessos gerados',
      onboarding: updated,
      accessTemplate: {
        employee: onboarding.employee.name,
        systems,
      },
    });
  } catch (error) {
    console.error('GENERATE ACCESS ERROR:', error);
    return res.status(500).json({
      message: 'Erro ao gerar acessos',
      error: error.message,
    });
  }
};
