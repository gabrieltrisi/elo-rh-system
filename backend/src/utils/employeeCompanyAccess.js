export const buildEmployeeAccessWhere = (employeeId, companyId) => ({
  id: Number(employeeId),
  OR: [
    {
      companyId: Number(companyId),
    },
    {
      employeeCompanies: {
        some: {
          companyId: Number(companyId),
        },
      },
    },
  ],
});

export const buildEmployeeRelationCompanyWhere = (companyId) => ({
  OR: [
    {
      companyId: Number(companyId),
    },
    {
      employeeCompanies: {
        some: {
          companyId: Number(companyId),
        },
      },
    },
  ],
});
