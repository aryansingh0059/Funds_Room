import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  createFollowupSchema,
  updateFollowupSchema,
} from '../validations/customers.validation';
import { sendSuccess, sendError } from '../utils/response';

export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = customerQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      sendError(res, 'Invalid query parameters', parseResult.error.format(), 400);
      return;
    }

    const { search, page, limit, status, customerType, sortBy, sortOrder } = parseResult.data;

    const where: Prisma.CustomerWhereInput = {};

    if (search && search.length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (customerType) where.customerType = customerType;

    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              followups: true,
              salesChallans: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, 'Customers retrieved successfully', {
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve customers', (error as Error).message, 500);
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followups: {
          orderBy: { followupDate: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            followups: true,
            salesChallans: true,
          },
        },
      },
    });

    if (!customer) {
      sendError(res, 'Customer not found', null, 404);
      return;
    }

    sendSuccess(res, 'Customer retrieved successfully', { customer });
  } catch (error) {
    sendError(res, 'Failed to retrieve customer', (error as Error).message, 500);
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        companyName: data.companyName ?? null,
        email: data.email || null,
        phone: data.phone,
        address: data.address ?? null,
        gstin: data.gstin || null,
        creditLimit: data.creditLimit ?? 0,
        customerType: data.customerType,
        status: data.status ?? 'ACTIVE',
      },
    });

    sendSuccess(res, 'Customer created successfully', { customer }, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      sendError(res, 'A customer with these details already exists', null, 409);
      return;
    }
    sendError(res, 'Failed to create customer', (error as Error).message, 500);
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      sendError(res, 'Customer not found', null, 404);
      return;
    }

    const parseResult = updateCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    const updateData: Prisma.CustomerUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.companyName !== undefined) updateData.companyName = data.companyName ?? null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.gstin !== undefined) updateData.gstin = data.gstin || null;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.customerType !== undefined) updateData.customerType = data.customerType;
    if (data.status !== undefined) updateData.status = data.status;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, 'Customer updated successfully', { customer });
  } catch (error) {
    sendError(res, 'Failed to update customer', (error as Error).message, 500);
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      sendError(res, 'Customer not found', null, 404);
      return;
    }

    await prisma.customer.delete({ where: { id } });

    sendSuccess(res, 'Customer deleted successfully', null);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      sendError(
        res,
        'Cannot delete customer with existing orders or followups. Block the customer instead.',
        null,
        409,
      );
      return;
    }
    sendError(res, 'Failed to delete customer', (error as Error).message, 500);
  }
};

export const listFollowups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) {
      sendError(res, 'Customer not found', null, 404);
      return;
    }

    const followups = await prisma.customerFollowup.findMany({
      where: { customerId: id },
      orderBy: { followupDate: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    sendSuccess(res, 'Followups retrieved successfully', { followups });
  } catch (error) {
    sendError(res, 'Failed to retrieve followups', (error as Error).message, 500);
  }
};

export const createFollowup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'Unauthorized', null, 401);
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) {
      sendError(res, 'Customer not found', null, 404);
      return;
    }

    const parseResult = createFollowupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    const followup = await prisma.customerFollowup.create({
      data: {
        customerId: id,
        userId: req.user.userId,
        type: data.type,
        status: data.status ?? 'PENDING',
        followupDate: new Date(data.followupDate),
        notes: data.notes,
        outcome: data.outcome || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    sendSuccess(res, 'Followup created successfully', { followup }, 201);
  } catch (error) {
    sendError(res, 'Failed to create followup', (error as Error).message, 500);
  }
};

export const updateFollowup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, followupId } = req.params;

    const followup = await prisma.customerFollowup.findFirst({
      where: { id: followupId, customerId: id },
    });

    if (!followup) {
      sendError(res, 'Followup not found', null, 404);
      return;
    }

    const parseResult = updateFollowupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.customerFollowup.update({
      where: { id: followupId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
        ...(data.outcome !== undefined && { outcome: data.outcome || null }),
        ...(data.type && { type: data.type }),
        ...(data.followupDate && { followupDate: new Date(data.followupDate) }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    sendSuccess(res, 'Followup updated successfully', { followup: updated });
  } catch (error) {
    sendError(res, 'Failed to update followup', (error as Error).message, 500);
  }
};
