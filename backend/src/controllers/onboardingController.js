import prisma from '../prisma/client.js';
import { sendWelcomeEmail } from '../services/emailService.js';

const normalizeBoolean = (value) => Boolean(value);

const normalizeNullableDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const buildSystemsTemplate = (employee) => {
  const name = employee?.name || 'usuario';
  const first = name.split(' ')[0].toLowerCase();

  return [
    {
      systemName: 'E-mail Corporativo',
      accessLink: 'https://mail.google.com',
      username: `${first}@empresa.com.br`,
      notes: 'Ajustar domínio',
    },
    {
      systemName: 'ERP',
      accessLink: 'https://erp.empresa.com.br',
      username: first,
      notes: 'Criar acesso inicial',
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

    const employee = await prisma.employee.findFirst({
      where: { id: Number(employeeId), companyId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado' });
    }

    const exists = await prisma.onboarding.findUnique({
      where: { employeeId: Number(employeeId) },
    });

    if (exists) {
      return res.status(400).json({ message: 'Onboarding já existe' });
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
        notes,
      },
      include: { employee: true },
    });

    res.status(201).json({ onboarding });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar onboarding' });
  }
};

export const getOnboardings = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const onboardings = await prisma.onboarding.findMany({
      where: { companyId },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ onboardings });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar onboardings' });
  }
};

export const updateOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    const onboarding = await prisma.onboarding.update({
      where: { id: Number(id) },
      data: req.body,
      include: { employee: true },
    });

    res.json({ onboarding });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar' });
  }
};

export const sendWelcomeOnboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const onboarding = await prisma.onboarding.findFirst({
      where: { id: Number(id), companyId },
      include: { employee: true },
    });

    if (!onboarding) {
      return res.status(404).json({ message: 'Não encontrado' });
    }

    await sendWelcomeEmail({
      to: onboarding.employee.email,
      name: onboarding.employee.name,
    });

    const updated = await prisma.onboarding.update({
      where: { id: Number(id) },
      data: { welcomeSent: true },
      include: { employee: true },
    });

    res.json({
      message: 'Email enviado com sucesso 🚀',
      onboarding: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar email' });
  }
};

export const generateAccessTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const onboarding = await prisma.onboarding.findFirst({
      where: { id: Number(id), companyId },
      include: { employee: true },
    });

    if (!onboarding) {
      return res.status(404).json({ message: 'Não encontrado' });
    }

    const systems = buildSystemsTemplate(onboarding.employee);

    await prisma.onboarding.update({
      where: { id: Number(id) },
      data: { accessCreated: true },
    });

    res.json({
      message: 'Acessos gerados',
      accessTemplate: {
        employee: onboarding.employee.name,
        systems,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao gerar acessos' });
  }
};
