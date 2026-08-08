import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validations/products.validation';
import { sendSuccess, sendError } from '../utils/response';

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = productQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      sendError(res, 'Invalid query parameters', parseResult.error.format(), 400);
      return;
    }

    const { search, page, limit, category, lowStock, sortBy, sortOrder } = parseResult.data;
    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: Prisma.ProductWhereInput = {};

    if (search && search.length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category.length > 0) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    // Low stock filter
    if (lowStock) {
      // In Postgres, filter where currentStock <= minStockAlert using raw SQL or query
      const lowStockProducts = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "products"
        WHERE "currentStock" <= "minStockAlert"
      `;
      const lowStockIds = lowStockProducts.map((p) => p.id);
      where.id = { in: lowStockIds };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              stockMovements: true,
              challanItems: true,
            },
          },
        },
      }),
    ]);

    // Also get distinct categories for filter dropdown
    const categories = await prisma.product.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    sendSuccess(res, 'Products retrieved successfully', {
      products,
      categories: categories.map((c) => c.category).filter(Boolean),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to retrieve products', (error as Error).message, 500);
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        _count: {
          select: {
            stockMovements: true,
            challanItems: true,
          },
        },
      },
    });

    if (!product) {
      sendError(res, 'Product not found', null, 404);
      return;
    }

    sendSuccess(res, 'Product retrieved successfully', { product });
  } catch (error) {
    sendError(res, 'Failed to retrieve product', (error as Error).message, 500);
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    // Check duplicate SKU explicitly
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      sendError(res, `Duplicate SKU: A product with SKU "${data.sku}" already exists.`, null, 409);
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description || null,
        category: data.category || null,
        unit: data.unit ?? 'PCS',
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        currentStock: data.currentStock ?? 0,
        minStockAlert: data.minStockAlert ?? 10,
        isActive: data.isActive ?? true,
      },
    });

    sendSuccess(res, 'Product created successfully', { product }, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      sendError(res, 'A product with this SKU already exists', null, 409);
      return;
    }
    sendError(res, 'Failed to create product', (error as Error).message, 500);
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Product not found', null, 404);
      return;
    }

    const parseResult = updateProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors.map((e) => e.message).join('; ');
      sendError(res, message, parseResult.error.format(), 400);
      return;
    }

    const data = parseResult.data;

    // If SKU is changing, verify no duplicate
    if (data.sku && data.sku !== existing.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (skuConflict) {
        sendError(
          res,
          `Duplicate SKU: A product with SKU "${data.sku}" already exists.`,
          null,
          409,
        );
        return;
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
    if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
    if (data.minStockAlert !== undefined) updateData.minStockAlert = data.minStockAlert;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, 'Product updated successfully', { product: updated });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      sendError(res, 'A product with this SKU already exists', null, 409);
      return;
    }
    sendError(res, 'Failed to update product', (error as Error).message, 500);
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Product not found', null, 404);
      return;
    }

    await prisma.product.delete({ where: { id } });

    sendSuccess(res, 'Product deleted successfully', null);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      sendError(
        res,
        'Cannot delete product with existing stock movements or challan items. Deactivate the product instead.',
        null,
        409,
      );
      return;
    }
    sendError(res, 'Failed to delete product', (error as Error).message, 500);
  }
};
