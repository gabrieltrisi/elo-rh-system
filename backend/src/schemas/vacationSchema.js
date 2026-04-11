import { z } from 'zod';

export const vacationSchema = z.object({
  employeeId: z.number().int().positive('ID do colaborador inválido'),
  acquisitionPeriod: z.string().min(1, 'Período aquisitivo é obrigatório'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória'),
  days: z.number().int().positive('Quantidade de dias inválida'),
  status: z.string().optional(),
});
