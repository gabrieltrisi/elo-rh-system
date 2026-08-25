export const TRAINING_VALIDITY_STATUS = {
  VALIDO: 'VALIDO',
  VENCENDO: 'VENCENDO',
  VENCIDO: 'VENCIDO',
  PENDENTE: 'PENDENTE',
  SEM_VALIDADE: 'SEM_VALIDADE',
};

export const getTrainingValiditySnapshot = ({
  status,
  completedAt,
  expiresAt,
  warningDays = 30,
} = {}) => {
  const normalizedStatus = String(status || 'PENDENTE').toUpperCase();
  const completedDate = completedAt ? new Date(completedAt) : null;
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();

  if (
    normalizedStatus === 'PENDENTE' ||
    normalizedStatus === 'EM_ANDAMENTO' ||
    !completedDate
  ) {
    return {
      status: TRAINING_VALIDITY_STATUS.PENDENTE,
      label: 'Pendente',
      expiringInDays: null,
    };
  }

  if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
    return {
      status: TRAINING_VALIDITY_STATUS.SEM_VALIDADE,
      label: 'Sem validade',
      expiringInDays: null,
    };
  }

  const expiringInDays = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (expiringInDays < 0 || normalizedStatus === 'VENCIDO') {
    return {
      status: TRAINING_VALIDITY_STATUS.VENCIDO,
      label: 'Vencido',
      expiringInDays,
    };
  }

  if (expiringInDays <= warningDays || normalizedStatus === 'RECICLAGEM') {
    return {
      status: TRAINING_VALIDITY_STATUS.VENCENDO,
      label: 'Vencendo',
      expiringInDays,
    };
  }

  return {
    status: TRAINING_VALIDITY_STATUS.VALIDO,
    label: 'Valido',
    expiringInDays,
  };
};
