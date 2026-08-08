import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  getInventoryOverview,
  getLowStockInventory,
} from '../controllers/inventory.controller';
import {
  listStockMovements,
  createStockMovement,
} from '../controllers/stock.controller';

const inventoryRouter = Router();

// Inventory overview & low-stock reads: accessible to all 4 authenticated roles
inventoryRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), getInventoryOverview);
inventoryRouter.get('/low-stock', authenticateJWT, requireRole(...ROLES.ALL), getLowStockInventory);

// Stock movement log: all roles can view
inventoryRouter.get('/movements', authenticateJWT, requireRole(...ROLES.ALL), listStockMovements);

// Manual stock movements / adjustments: ADMIN & WAREHOUSE only (SALES & ACCOUNTS blocked with 403)
inventoryRouter.post(
  '/movements',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  createStockMovement,
);

export default inventoryRouter;
