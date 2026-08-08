import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  listStockMovements,
  createStockMovement,
  getLowStockAlerts,
} from '../controllers/stock.controller';

const stockRouter = Router();

// Stock reads: all roles can view inventory & movements
stockRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), listStockMovements);
stockRouter.get('/alerts', authenticateJWT, requireRole(...ROLES.ALL), getLowStockAlerts);

// Manual stock adjustments: ADMIN + WAREHOUSE only
// SALES explicitly cannot create stock movements
stockRouter.post(
  '/',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  createStockMovement,
);

export default stockRouter;
