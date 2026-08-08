import { Request, Response } from 'express';
import { ChallanStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  createChallanSchema,
  updateChallanSchema,
  challanQuerySchema,
} from '../validations/challans.validation';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Generate sequential challan number: SC-<YEAR>-<SEQUENCE_PAD_4>
 * e.g. SC-2026-0001, SC-2026-0002
 */
const generateChallanNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;

  const latestChallan = await prisma.salesChallan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: 'desc' },
    select: { challanNumber: true },
  });

  let sequence = 1;
  if (latestChallan?.challanNumber) {
    const parts = latestChallan.challanNumber.split('-');
    if (parts.length >= 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

export const listChallans = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = challanQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      sendError(res, 'Invalid query parameters', parseResult.error.format(), 400);
      return;
    }

    const { status, customerId, search, page, limit, sortBy, sortOrder } = parseResult.data;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesChallanWhereInput = {};

    if (status) {
      where.status = status as ChallanStatus;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search && search.length > 0) {
      where.OR = [
        { challanNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, challans] = await Promise.all([
      prisma.salesChallan.count({ where }),
      prisma.salesChallan.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              companyName: true,
              phone: true,
              gstin: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    sendSuccess(res, 'Sales challans retrieved successfully', {
      challans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve sales challans', (error as Error).message, 500);
  }
};

export const getChallanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
      },
    });

    if (!challan) {
      sendError(res, 'Sales challan not found', null, 404);
      return;
    }

    sendSuccess(res, 'Sales challan retrieved successfully', { challan });
  } catch (error) {
    sendError(res, 'Failed to retrieve sales challan', (error as Error).message, 500);
  }
};

export const createChallan = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', null, 401);
      return;
    }

    const parseResult = createChallanSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const { customerId, notes, discountAmount, taxAmount, dispatchDate, items } = parseResult.data;

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    });
    if (!customer) {
      sendError(res, `Customer with ID "${customerId}" not found.`, null, 404);
      return;
    }

    // Validate all products exist
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      sendError(res, 'One or more selected products do not exist in the catalog.', null, 404);
      return;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Generate unique sequential challan number
    const challanNumber = await generateChallanNumber();

    // Prepare line item snapshots & compute running totals
    let totalAmount = 0;
    const lineItemData: Prisma.SalesChallanItemCreateWithoutSalesChallanInput[] = [];

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;

      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : Number(prod.sellingPrice);
      const taxRate = item.taxRate ?? 0;
      const lineTotal = unitPrice * item.quantity;
      totalAmount += lineTotal;

      lineItemData.push({
        product: { connect: { id: prod.id } },
        productNameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        unitPriceSnapshot: new Prisma.Decimal(unitPrice),
        taxRateSnapshot: new Prisma.Decimal(taxRate),
        quantity: item.quantity,
        totalPrice: new Prisma.Decimal(lineTotal),
      });
    }

    const netAmount = Math.max(0, totalAmount - (discountAmount ?? 0) + (taxAmount ?? 0));

    // Create DRAFT challan with snapshotted line items (Stock is completely untouched!)
    const challan = await prisma.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        createdById: req.user.userId,
        status: ChallanStatus.DRAFT,
        totalAmount: new Prisma.Decimal(totalAmount),
        discountAmount: new Prisma.Decimal(discountAmount ?? 0),
        taxAmount: new Prisma.Decimal(taxAmount ?? 0),
        netAmount: new Prisma.Decimal(netAmount),
        notes: notes || null,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
        items: {
          create: lineItemData,
        },
      },
      include: {
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: true,
      },
    });

    sendSuccess(
      res,
      `Draft sales challan ${challan.challanNumber} created successfully`,
      { challan },
      201,
    );
  } catch (error) {
    sendError(res, 'Failed to create sales challan', (error as Error).message, 500);
  }
};

export const updateChallan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      sendError(res, 'Sales challan not found', null, 404);
      return;
    }

    // A challan can only be modified while still in DRAFT status
    if (existing.status !== ChallanStatus.DRAFT) {
      sendError(
        res,
        `Cannot edit challan in "${existing.status}" status. Only DRAFT challans can be edited.`,
        null,
        400,
      );
      return;
    }

    const parseResult = updateChallanSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const { customerId, notes, discountAmount, taxAmount, dispatchDate, items } = parseResult.data;

    let totalAmount = Number(existing.totalAmount);
    let currentDiscount = discountAmount !== undefined ? discountAmount : Number(existing.discountAmount);
    let currentTax = taxAmount !== undefined ? taxAmount : Number(existing.taxAmount);

    // If new items are provided, replace existing items and compute new snapshots
    if (items && items.length > 0) {
      const productIds = items.map((i) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        sendError(res, 'One or more selected products do not exist.', null, 404);
        return;
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      totalAmount = 0;

      const lineItemData: Prisma.SalesChallanItemCreateWithoutSalesChallanInput[] = [];

      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) continue;

        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : Number(prod.sellingPrice);
        const taxRate = item.taxRate ?? 0;
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        lineItemData.push({
          product: { connect: { id: prod.id } },
          productNameSnapshot: prod.name,
          skuSnapshot: prod.sku,
          unitPriceSnapshot: new Prisma.Decimal(unitPrice),
          taxRateSnapshot: new Prisma.Decimal(taxRate),
          quantity: item.quantity,
          totalPrice: new Prisma.Decimal(lineTotal),
        });
      }

      const netAmount = Math.max(0, totalAmount - currentDiscount + currentTax);

      // Replace items atomically in transaction
      const updated = await prisma.$transaction(async (tx) => {
        await tx.salesChallanItem.deleteMany({ where: { salesChallanId: id } });
        return tx.salesChallan.update({
          where: { id },
          data: {
            ...(customerId && { customerId }),
            ...(notes !== undefined && { notes: notes || null }),
            discountAmount: new Prisma.Decimal(currentDiscount),
            taxAmount: new Prisma.Decimal(currentTax),
            totalAmount: new Prisma.Decimal(totalAmount),
            netAmount: new Prisma.Decimal(netAmount),
            ...(dispatchDate !== undefined && {
              dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
            }),
            items: { create: lineItemData },
          },
          include: { customer: true, items: true, createdBy: true },
        });
      });

      sendSuccess(res, 'Sales challan updated successfully', { challan: updated });
      return;
    }

    // Updating non-item fields only
    const netAmount = Math.max(0, totalAmount - currentDiscount + currentTax);
    const updated = await prisma.salesChallan.update({
      where: { id },
      data: {
        ...(customerId && { customerId }),
        ...(notes !== undefined && { notes: notes || null }),
        discountAmount: new Prisma.Decimal(currentDiscount),
        taxAmount: new Prisma.Decimal(currentTax),
        netAmount: new Prisma.Decimal(netAmount),
        ...(dispatchDate !== undefined && {
          dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
        }),
      },
      include: { customer: true, items: true, createdBy: true },
    });

    sendSuccess(res, 'Sales challan updated successfully', { challan: updated });
  } catch (error) {
    sendError(res, 'Failed to update sales challan', (error as Error).message, 500);
  }
};

export const updateChallanStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: ChallanStatus };

    const existing = await prisma.salesChallan.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Sales challan not found', null, 404);
      return;
    }

    const updated = await prisma.salesChallan.update({
      where: { id },
      data: { status },
      include: { customer: true, items: true },
    });

    sendSuccess(res, `Challan status updated to ${status}`, { challan: updated });
  } catch (error) {
    sendError(res, 'Failed to update challan status', (error as Error).message, 500);
  }
};

export const cancelChallan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.salesChallan.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Sales challan not found', null, 404);
      return;
    }

    const updated = await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: { customer: true },
    });

    sendSuccess(res, 'Challan cancelled successfully', { challan: updated });
  } catch (error) {
    sendError(res, 'Failed to cancel sales challan', (error as Error).message, 500);
  }
};
