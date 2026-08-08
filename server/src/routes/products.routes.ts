import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/products.controller';

const productsRouter = Router();

// Product reads: all roles
productsRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), listProducts);
productsRouter.get('/:id', authenticateJWT, requireRole(...ROLES.ALL), getProductById);

// Product writes: ADMIN + WAREHOUSE only (SALES cannot create/modify products)
productsRouter.post(
  '/',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  createProduct,
);
productsRouter.patch(
  '/:id',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  updateProduct,
);
productsRouter.delete(
  '/:id',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  deleteProduct,
);

export default productsRouter;
