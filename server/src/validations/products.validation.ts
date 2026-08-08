import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters'),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU cannot exceed 50 characters')
    .toUpperCase(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().or(z.literal('')),
  category: z.string().trim().max(100, 'Category cannot exceed 100 characters').optional().or(z.literal('')),
  unit: z.string().trim().min(1, 'Unit is required').max(20).default('PCS'),
  costPrice: z.coerce
    .number({ invalid_type_error: 'Cost price must be a valid number' })
    .min(0, 'Cost price must be greater than or equal to 0')
    .max(10_000_000, 'Cost price is too large'),
  sellingPrice: z.coerce
    .number({ invalid_type_error: 'Selling price must be a valid number' })
    .min(0, 'Selling price must be greater than or equal to 0')
    .max(10_000_000, 'Selling price is too large'),
  currentStock: z.coerce
    .number({ invalid_type_error: 'Current stock must be a whole number' })
    .int('Current stock must be an integer')
    .min(0, 'Current stock must be greater than or equal to 0')
    .default(0),
  minStockAlert: z.coerce
    .number({ invalid_type_error: 'Minimum stock alert must be a whole number' })
    .int('Minimum stock alert must be an integer')
    .min(0, 'Minimum stock alert must be greater than or equal to 0')
    .default(10),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .or(z.boolean())
    .optional(),
  sortBy: z
    .enum(['name', 'sku', 'currentStock', 'costPrice', 'sellingPrice', 'createdAt', 'category'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
