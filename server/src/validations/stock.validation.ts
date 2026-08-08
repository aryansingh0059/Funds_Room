import { z } from 'zod';

export const createStockMovementSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .positive('Quantity must be a positive number greater than 0')
    .max(1_000_000, 'Quantity exceeds maximum transaction limit'),
  movementType: z.enum(
    ['IN', 'OUT', 'INWARD', 'OUTWARD', 'ADJUSTMENT', 'RETURN', 'DISPATCH'],
    {
      errorMap: () => ({ message: 'Movement type must be IN or OUT' }),
    },
  ),
  reason: z
    .string()
    .trim()
    .min(2, 'Reason must be at least 2 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  referenceId: z.string().trim().max(100).optional().or(z.literal('')),
});

export const stockMovementQuerySchema = z.object({
  productId: z.string().trim().optional(),
  type: z
    .enum(['IN', 'OUT', 'INWARD', 'OUTWARD', 'ADJUSTMENT', 'RETURN', 'DISPATCH'])
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'quantity', 'newStock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>;
