import prisma from '../prisma/client.js';

export const DEFAULT_COMPANIES = [
  {
    code: 'NEXO_TI',
    name: 'Nexo Ti',
  },
  {
    code: 'NEXO_INSTALADORA',
    name: 'Nexo Instaladora',
  },
];

const normalizeCompanyKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

const defaultCompanyByName = DEFAULT_COMPANIES.reduce((acc, company) => {
  acc[normalizeCompanyKey(company.name)] = company;
  return acc;
}, {});

export const ensureDefaultCompaniesService = async () => {
  const existingCompanies = await prisma.company.findMany({
    orderBy: {
      id: 'asc',
    },
  });

  for (const defaultCompany of DEFAULT_COMPANIES) {
    const companyByCode = existingCompanies.find(
      (company) => company.code === defaultCompany.code
    );

    if (companyByCode) {
      if (companyByCode.name !== defaultCompany.name) {
        await prisma.company.update({
          where: {
            id: companyByCode.id,
          },
          data: {
            name: defaultCompany.name,
          },
        });
      }

      continue;
    }

    const legacyCompany = existingCompanies.find(
      (company) =>
        !company.code &&
        normalizeCompanyKey(company.name) ===
          normalizeCompanyKey(defaultCompany.name)
    );

    if (legacyCompany) {
      await prisma.company.update({
        where: {
          id: legacyCompany.id,
        },
        data: {
          code: defaultCompany.code,
          name: defaultCompany.name,
        },
      });

      continue;
    }

    await prisma.company.create({
      data: defaultCompany,
    });
  }
};

export const getAllCompaniesService = async () => {
  await ensureDefaultCompaniesService();

  const companies = await prisma.company.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  const dedupedCompanies = [];
  const seenKeys = new Set();

  for (const company of companies) {
    const matchedDefault =
      (company.code &&
        DEFAULT_COMPANIES.find((item) => item.code === company.code)) ||
      defaultCompanyByName[normalizeCompanyKey(company.name)] ||
      null;

    const dedupeKey = matchedDefault?.code || company.code || normalizeCompanyKey(company.name);

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    dedupedCompanies.push({
      ...company,
      code: matchedDefault?.code || company.code || null,
      name: matchedDefault?.name || company.name,
    });
  }

  return dedupedCompanies;
};
