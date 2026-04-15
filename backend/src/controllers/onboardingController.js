import prisma from '../prisma/client.js';

const normalizeBoolean = (value) => Boolean(value);

const normalizeNullableDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
};

const buildSystemsTemplate = (employee) => {
  const employeeName = employee?.name || 'Colaborador';
  const firstName = employeeName.split(' ')[0]?.toLowerCase() || 'usuario';

  return [
    {
      systemName: 'E-mail Corporativo',
      accessLink: 'https://mail.google.com',
      username: `${firstName}@empresa.com.br`,
      notes: 'Ajustar domínio real da empresa',
    },
    {
      systemName: 'Microsoft Teams / Google Meet',
      accessLink: 'https://teams.microsoft.com',
      username: `${firstName}@empresa.com.br`,
      notes: 'Definir plataforma oficial',
    },
    {
      systemName: 'ERP / Sistema Interno',
      accessLink: 'https://erp.empresa.com.br',
      username: firstName,
      notes: 'Cadastrar acesso inicial',
    },
    {
      systemName: 'Portal RH / Ponto',
      accessLink: 'https://rh.empresa.com.br',
      username: firstName,
      notes: 'Liberar acesso com senha provisória',
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
      where: {
        id: Number(employeeId),
        companyId,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Colaborador não encontrado para esta empresa',
      });
    }

    const existing = await prisma.onboarding.findUnique({
      where: { employeeId: Number(employeeId) },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Onboarding já existe para este colaborador',
      });
    }

    const onboarding = await prisma.onboarding.create({
      data: {
        employeeId: Number(employeeId),
        companyId,
        status: status || 'PENDENTE',
        welcomeSent: normalizeBoolean(welcomeSent),
        accessCreated: normalizeBoolean(accessCreated),
        startDate: normalizeNullableDate(startDate) || new Date(),
        completedAt: normalizeNullableDate(completedAt),
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
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao criar onboarding',
    });
  }
};

export const getOnboardings = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const onboardings = await prisma.onboarding.findMany({
      where: { companyId },
      include: {
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ onboardings });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao buscar onboardings',
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
        message: 'Onboarding não encontrado',
      });
    }

    return res.json({ onboarding });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao buscar onboarding',
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
        message: 'Onboarding não encontrado',
      });
    }

    const data = {
      ...(req.body.status !== undefined ? { status: req.body.status } : {}),
      ...(req.body.welcomeSent !== undefined
        ? { welcomeSent: normalizeBoolean(req.body.welcomeSent) }
        : {}),
      ...(req.body.accessCreated !== undefined
        ? { accessCreated: normalizeBoolean(req.body.accessCreated) }
        : {}),
      ...(req.body.startDate !== undefined
        ? {
            startDate:
              normalizeNullableDate(req.body.startDate) || existing.startDate,
          }
        : {}),
      ...(req.body.completedAt !== undefined
        ? { completedAt: normalizeNullableDate(req.body.completedAt) }
        : {}),
      ...(req.body.notes !== undefined
        ? { notes: req.body.notes || null }
        : {}),
    };

    const onboarding = await prisma.onboarding.update({
      where: { id: Number(id) },
      data,
      include: {
        employee: true,
      },
    });

    return res.json({
      message: 'Onboarding atualizado com sucesso',
      onboarding,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao atualizar onboarding',
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
        message: 'Onboarding não encontrado',
      });
    }

    const updated = await prisma.onboarding.update({
      where: { id: Number(id) },
      data: {
        welcomeSent: true,
        status:
          onboarding.status === 'PENDENTE' ? 'EM_ANDAMENTO' : onboarding.status,
      },
      include: {
        employee: true,
      },
    });

    return res.json({
      message: 'Boas-vindas marcadas como enviadas com sucesso',
      onboarding: updated,
      welcomePreview: {
        employeeName: onboarding.employee?.name || 'Colaborador',
        email: onboarding.employee?.email || '',
        phone: onboarding.employee?.phone || '',
        channels: ['email', 'whatsapp'],
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao enviar boas-vindas',
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
        message: 'Onboarding não encontrado',
      });
    }

    const systems = buildSystemsTemplate(onboarding.employee);

    const updated = await prisma.onboarding.update({
      where: { id: Number(id) },
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
      message: 'Modelo de acessos gerado com sucesso',
      onboarding: updated,
      accessTemplate: {
        employeeName: onboarding.employee?.name || 'Colaborador',
        employeeEmail: onboarding.employee?.email || '',
        generatedAt: new Date().toISOString(),
        systems,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao gerar acessos',
    });
  }
};
