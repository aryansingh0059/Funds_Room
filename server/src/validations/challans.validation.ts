import { z } from 'zod';

export const challanItemInputSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0'),
  unitPrice: z.coerce
    .number({ invalid_type_error: 'Unit price must be a number' })
    .min(0, 'Unit price cannot be negative')
    .optional(),
  taxRate: z.coerce
    .number({ invalid_type_error: 'Tax rate must be a number' })
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .optional()
    .default(0),
});

export const createChallanSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().or(z.literal('')),
  discountAmount: z.coerce
    .number({ invalid_type_error: 'Discount must be a number' })
    .min(0, 'Discount cannot be negative')
    .optional()
    .default(0),
  taxAmount: z.coerce
    .number({ invalid_type_error: 'Tax must be a number' })
    .min(0, 'Tax cannot be negative')
    .optional()
    .default(0),
  dispatchDate: z.string().optional().or(z.literal('')),
  items: z
    .array(challanItemInputSchema)
    .min(1, 'A sales challan must contain at least one line item'),
});

export const updateChallanSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  dispatchDate: z.string().optional().or(z.literal('')),
  items: z.array(challanItemInputSchema).min(1).optional(),
});

export const challanQuerySchema = z.object({
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'DISPATCHED',
      'DELIVERED',
      'CANCELLED',
      'INVOICED',
    ])
    .optional(),
  customerId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'challanNumber', 'netAmount', 'totalAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
export type ChallanQueryInput = z.infer<typeof challanQuerySchema>;
