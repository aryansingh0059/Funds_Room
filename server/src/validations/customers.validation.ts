import { z } from 'zod';

const phoneRegex = /^\+?[0-9][\d\s\-\(\)]{6,18}[0-9]$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(200, 'Customer name must be at most 200 characters'),
  companyName: z.string().trim().max(200, 'Company name too long').optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid phone/mobile number'),
  address: z.string().trim().max(500, 'Address too long').optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(gstinRegex, 'GSTIN must be a valid 15-character GST Identification Number')
    .optional()
    .or(z.literal('')),
  creditLimit: z.coerce
    .number({ invalid_type_error: 'Credit limit must be a number' })
    .min(0, 'Credit limit cannot be negative')
    .max(100_000_000, 'Credit limit too large')
    .optional()
    .default(0),
  customerType: z.enum(['LEAD', 'PROSPECT', 'RETAILER', 'WHOLESALER', 'DISTRIBUTOR'], {
    errorMap: () => ({ message: 'Please select a valid customer type' }),
  }),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'BLOCKED'], {
      errorMap: () => ({ message: 'Please select a valid status' }),
    })
    .optional()
    .default('ACTIVE'),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(200, 'Customer name must be at most 200 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid phone/mobile number')
    .optional(),
});

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  customerType: z
    .enum(['LEAD', 'PROSPECT', 'RETAILER', 'WHOLESALER', 'DISTRIBUTOR'])
    .optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'outstandingBalance', 'creditLimit', 'companyName'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createFollowupSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'SITE_VISIT', 'WHATSAPP'], {
    errorMap: () => ({ message: 'Please select a valid follow-up type' }),
  }),
  status: z
    .enum(['PENDING', 'COMPLETED', 'CANCELLED'], {
      errorMap: () => ({ message: 'Please select a valid status' }),
    })
    .optional()
    .default('PENDING'),
  followupDate: z.string().min(1, 'Follow-up date is required'),
  notes: z
    .string()
    .trim()
    .min(1, 'Notes are required')
    .max(2000, 'Notes cannot exceed 2000 characters'),
  outcome: z.string().trim().max(1000, 'Outcome cannot exceed 1000 characters').optional().or(z.literal('')),
});

export const updateFollowupSchema = createFollowupSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
export type UpdateFollowupInput = z.infer<typeof updateFollowupSchema>;
