import prisma from '../prisma/client.js';

export const createOnboarding = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const companyId = req.user.companyId;

    const existing = await prisma.onboarding.findUnique({
      where: { employeeId },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Onboarding já existe para este colaborador',
      });
    }

    const onboarding = await prisma.onboarding.create({
      data: {
        employeeId,
        companyId,
      },
    });

    return res.status(201).json({ onboarding });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar onboarding' });
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

    res.json({ onboardings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar onboardings' });
  }
};

export const getOnboardingByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const onboarding = await prisma.onboarding.findUnique({
      where: { employeeId: Number(employeeId) },
      include: {
        employee: true,
      },
    });

    res.json({ onboarding });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar onboarding' });
  }
};

export const updateOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    const onboarding = await prisma.onboarding.update({
      where: { id: Number(id) },
      data: req.body,
    });

    res.json({ onboarding });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar onboarding' });
  }
};
