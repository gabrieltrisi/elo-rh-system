import { z } from 'zod';

export const uniformStockSchema = z.object({
  sector: z.string().min(1, 'Setor obrigatório'),
  itemType: z.string().min(1, 'Tipo obrigatório'),
  color: z.string().optional(),
  size: z.string().min(1, 'Tamanho obrigatório'),
  totalQuantity: z.number().int().positive('Quantidade inválida'),
  notes: z.string().optional(),
});
