import { z } from 'zod';

export const workScheduleSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  scheduleType: z.string().min(1, 'Tipo de escala é obrigatório'),
  workModel: z.string().optional().nullable(),
  categoryType: z.string().optional().nullable(),
  isTrustPosition: z.boolean().optional(),
  worksOnHolidays: z.boolean().optional(),
  observations: z.string().optional().nullable(),
});
