import { Request, Response } from 'express';
import { MovementType, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  createStockMovementSchema,
  stockMovementQuerySchema,
} from '../validations/stock.validation';
import { sendSuccess, sendError } from '../utils/response';

export const listStockMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = stockMovementQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      sendError(res, 'Invalid query parameters', parseResult.error.format(), 400);
      return;
    }

    const { productId, type, search, page, limit, sortBy, sortOrder } = parseResult.data;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      const typeMapping: Record<string, MovementType> = {
        IN: MovementType.INWARD,
        OUT: MovementType.OUTWARD,
        INWARD: MovementType.INWARD,
        OUTWARD: MovementType.OUTWARD,
        ADJUSTMENT: MovementType.ADJUSTMENT,
        RETURN: MovementType.RETURN,
        DISPATCH: MovementType.DISPATCH,
      };
      where.type = typeMapping[type] ?? (type as MovementType);
    }

    if (search && search.length > 0) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: true,
              currentStock: true,
              minStockAlert: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, 'Stock movements retrieved successfully', {
      movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve stock movements', (error as Error).message, 500);
  }
};

export const createStockMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', null, 401);
      return;
    }

    const parseResult = createStockMovementSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const { productId, quantity, movementType, reason, referenceId } = parseResult.data;

    // 1. Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      sendError(res, `Product with ID "${productId}" not found.`, null, 404);
      return;
    }

    // Map input type to Prisma enum
    const isOutward = movementType === 'OUT' || movementType === 'OUTWARD' || movementType === 'DISPATCH';
    const isInward = movementType === 'IN' || movementType === 'INWARD' || movementType === 'RETURN';

    let prismaMovementType: MovementType;
    if (movementType === 'IN' || movementType === 'INWARD') {
      prismaMovementType = MovementType.INWARD;
    } else if (movementType === 'OUT' || movementType === 'OUTWARD') {
      prismaMovementType = MovementType.OUTWARD;
    } else {
      prismaMovementType = movementType as MovementType;
    }

    const previousStock = product.currentStock;
    let newStock: number;

    if (isOutward) {
      newStock = previousStock - quantity;
      // 4. Block if it would make currentStock negative
      if (newStock < 0) {
        sendError(
          res,
          `Insufficient stock: Cannot remove ${quantity} ${product.unit} of "${product.name}". Current stock is only ${previousStock} ${product.unit}. Transaction rejected.`,
          {
            requestedQuantity: quantity,
            availableStock: previousStock,
            deficit: Math.abs(newStock),
          },
          400,
        );
        return;
      }
    } else if (isInward) {
      newStock = previousStock + quantity;
    } else {
      // ADJUSTMENT
      newStock = previousStock + quantity;
    }

    // 7. Atomic transaction for stock update and audit log creation
    const [updatedProduct, movementRecord] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          userId: req.user.userId,
          type: prismaMovementType,
          quantity,
          previousStock,
          newStock,
          reason,
          referenceId: referenceId || null,
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, currentStock: true },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    sendSuccess(
      res,
      `Stock ${isOutward ? 'deducted' : 'added'} successfully: ${quantity} ${product.unit} of ${product.name} (New Stock: ${newStock})`,
      {
        movement: movementRecord,
        product: updatedProduct,
      },
      201,
    );
  } catch (error) {
    sendError(res, 'Failed to process stock movement transaction', (error as Error).message, 500);
  }
};

export const getLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const lowStock = await prisma.$queryRaw`
      SELECT * FROM "products" WHERE "currentStock" <= "minStockAlert"
    `;
    sendSuccess(res, 'Low stock alerts retrieved', { lowStock });
  } catch (error) {
    sendError(res, 'Failed to retrieve low stock alerts', (error as Error).message, 500);
  }
};
