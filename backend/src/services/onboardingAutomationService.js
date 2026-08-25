import prisma from '../prisma/client.js';
import {
  sendWelcomeEmail,
  sendWelcomeAccessEmail,
} from './emailService.js';

const ONBOARDING_TIME_UTC_HOUR = 11;

export const buildSystemsTemplate = (employee) => {
  const name = employee?.name || 'usuario';
  const first = name.split(' ')[0]?.toLowerCase() || 'usuario';

  return [
    {
      systemName: 'E-mail Corporativo',
      accessLink: 'https://mail.google.com',
      username: `${first}@empresa.com.br`,
      temporaryPassword: `Temp@${first}123`,
      notes: 'Ajustar domínio real da empresa',
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
      notes: 'Liberar acesso com senha provisória',
    },
  ];
};

const buildOnboardingDispatchDate = (startDate) => {
  const baseDate = new Date(startDate);

  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      ONBOARDING_TIME_UTC_HOUR,
      0,
      0,
      0
    )
  );
};

export const dispatchOnboardingWelcomeFlow = async (onboarding) => {
  if (!onboarding?.employee?.email) {
    throw new Error('Colaborador não possui e-mail cadastrado');
  }

  const systems = buildSystemsTemplate(onboarding.employee);

  await sendWelcomeEmail({
    to: onboarding.employee.email,
    name: onboarding.employee.name,
  });

  await sendWelcomeAccessEmail({
    to: onboarding.employee.email,
    name: onboarding.employee.name,
    systems,
  });

  const updated = await prisma.onboarding.update({
    where: {
      id: Number(onboarding.id),
    },
    data: {
      welcomeSent: true,
      accessCreated: true,
      status:
        onboarding.status === 'PENDENTE' ? 'EM_ANDAMENTO' : onboarding.status,
      notes: onboarding.notes
        ? `${onboarding.notes}\nBoas-vindas automáticas e planilha de acessos enviadas por e-mail.`
        : 'Boas-vindas automáticas e planilha de acessos enviadas por e-mail.',
    },
    include: {
      employee: true,
    },
  });

  return {
    onboarding: updated,
    accessTemplate: {
      employee: onboarding.employee.name,
      systems,
    },
  };
};

export const processScheduledOnboardings = async () => {
  const onboardings = await prisma.onboarding.findMany({
    where: {
      welcomeSent: false,
    },
    include: {
      employee: true,
    },
  });

  if (!onboardings.length) {
    return { processed: 0 };
  }

  const now = new Date();
  let processed = 0;

  for (const onboarding of onboardings) {
    try {
      const scheduledAt = buildOnboardingDispatchDate(onboarding.startDate);

      if (now < scheduledAt) {
        continue;
      }

      await dispatchOnboardingWelcomeFlow(onboarding);
      processed += 1;
    } catch (error) {
      console.error(
        `ONBOARDING SCHEDULER ERROR [${onboarding.id}]:`,
        error
      );
    }
  }

  return { processed };
};
