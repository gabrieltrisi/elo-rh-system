import { z } from 'zod';

export const uniformSchema = z.object({
  employeeId: z.number().int().positive('ID do colaborador inválido'),
  size: z.string().min(1, 'Tamanho é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});
