import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Generate a deterministic warehouse location rack tag from product metadata
 */
export const getWarehouseLocation = (product: { category: string | null; sku: string }): string => {
  const zone = (product.category || 'GEN').toUpperCase().slice(0, 3);
  const rackNumber = (product.sku.charCodeAt(product.sku.length - 1) % 8) + 1;
  const aisle = String.fromCharCode(65 + (product.sku.charCodeAt(0) % 6));
  return `WH-Zone ${zone} / Bay ${aisle}-${rackNumber}`;
};

export const getInventoryOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const lowStockOnly = req.query.lowStock === 'true';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const sortBy = (req.query.sortBy as string) || 'currentStock';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (lowStockOnly) {
      const lowStockIds = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "products" WHERE "currentStock" <= "minStockAlert"
      `;
      where.id = { in: lowStockIds.map((p) => p.id) };
    }

    const skip = (page - 1) * limit;

    const [total, products, allActiveProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: { stockMovements: true, challanItems: true },
          },
        },
      }),
      // Fetch all for summary calculations
      prisma.product.findMany({
        select: {
          id: true,
          currentStock: true,
          minStockAlert: true,
          costPrice: true,
          category: true,
        },
      }),
    ]);

    // Calculate aggregated inventory KPIs
    let totalInventoryUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoriesSet = new Set<string>();

    for (const p of allActiveProducts) {
      totalInventoryUnits += p.currentStock;
      totalValuation += p.currentStock * Number(p.costPrice);
      if (p.currentStock <= p.minStockAlert) lowStockCount++;
      if (p.currentStock === 0) outOfStockCount++;
      if (p.category) categoriesSet.add(p.category);
    }

    const items = products.map((p) => {
      const cost = Number(p.costPrice);
      const selling = Number(p.sellingPrice);
      const isLowStock = p.currentStock <= p.minStockAlert;
      const isOutOfStock = p.currentStock === 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        minStockAlert: p.minStockAlert,
        isActive: p.isActive,
        isLowStock,
        isOutOfStock,
        stockStatus: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'HEALTHY',
        valuation: (p.currentStock * cost).toFixed(2),
        margin: cost > 0 ? (((selling - cost) / cost) * 100).toFixed(1) : '0.0',
        warehouseLocation: getWarehouseLocation(p),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    sendSuccess(res, 'Inventory overview retrieved successfully', {
      items,
      summary: {
        totalSKUs: allActiveProducts.length,
        totalUnits: totalInventoryUnits,
        totalValuation: totalValuation.toFixed(2),
        lowStockCount,
        outOfStockCount,
        healthyCount: allActiveProducts.length - lowStockCount,
      },
      categories: Array.from(categoriesSet),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve inventory overview', (error as Error).message, 500);
  }
};

export const getLowStockInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const lowStockProducts = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        sku: string;
        category: string | null;
        unit: string;
        costPrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
        currentStock: number;
        minStockAlert: number;
        isActive: boolean;
        updatedAt: Date;
      }>
    >`
      SELECT "id", "name", "sku", "category", "unit", "costPrice", "sellingPrice", "currentStock", "minStockAlert", "isActive", "updatedAt"
      FROM "products"
      WHERE "currentStock" <= "minStockAlert"
      ORDER BY "currentStock" ASC
    `;

    const items = lowStockProducts.map((p) => {
      const deficit = Math.max(0, p.minStockAlert - p.currentStock);
      const reorderQty = Math.max(deficit * 2, p.minStockAlert);
      const reorderCost = (reorderQty * Number(p.costPrice)).toFixed(2);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        minStockAlert: p.minStockAlert,
        deficit,
        suggestedReorderQuantity: reorderQty,
        estimatedReorderCost: reorderCost,
        warehouseLocation: getWarehouseLocation(p),
        isOutOfStock: p.currentStock === 0,
        updatedAt: p.updatedAt,
      };
    });

    sendSuccess(res, 'Low stock items retrieved successfully', {
      items,
      count: items.length,
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve low stock inventory', (error as Error).message, 500);
  }
};
