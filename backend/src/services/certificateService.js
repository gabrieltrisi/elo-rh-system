import prisma from '../prisma/client.js';

export const createCertificate = async (data) => {
  return await prisma.certificate.create({
    data: {
      employeeId: Number(data.employeeId),
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: Number(data.days),
      fileUrl: data.fileUrl || null,
      status: 'PENDENTE',
    },
  });
};

export const getCertificates = async () => {
  return await prisma.certificate.findMany({
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const updateCertificateStatus = async (id, status, managerNotes) => {
  return await prisma.certificate.update({
    where: {
      id: Number(id),
    },
    data: {
      status,
      managerNotes: managerNotes || null,
    },
  });
};
